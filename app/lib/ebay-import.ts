import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { Product } from "@/lib/models/product";
import { Order } from "@/lib/models/order";
import { InventoryLevel, Location, StockMovement } from "@/lib/models/inventory";
import type { OrgId } from "@/lib/Ebay/ebay";
import type { EbayInventoryItem, EbayListing, EbayOrder } from "@/lib/ebay-sync";

export interface SyncOutcome {
  created: number;
  updated: number;
  skipped: number;
}

export interface CatalogSyncResult extends SyncOutcome {
  stockUnits: number;
}

function emptyOutcome(): SyncOutcome {
  return { created: 0, updated: 0, skipped: 0 };
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "product";
}

/**
 * Product slugs are unique per organisation, so a synced title that collides with
 * an existing manual product gets a short discriminator rather than failing the
 * upsert with a duplicate-key error. `taken` is threaded through so collisions
 * within a single sync batch are resolved too.
 */
function claimSlug(taken: Set<string>, name: string, seed: string): string {
  const base = slugify(name);
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  const shortSeed = slugify(seed).slice(-8) || "ebay";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? `${base}-${shortSeed}` : `${base}-${shortSeed}-${attempt + 1}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }

  const fallback = `${base}-${shortSeed}-${Date.now().toString(36)}`;
  taken.add(fallback);
  return fallback;
}

/**
 * InventoryLevel requires a location. Rather than making the seller configure one
 * before their first sync, the first sync provisions a default for them.
 */
async function ensureDefaultLocation(orgId: Types.ObjectId): Promise<Types.ObjectId> {
  const existing = await Location.findOne({ organizationId: orgId }).sort({ createdAt: 1 }).select("_id");
  if (existing) return existing._id;

  const created = await Location.create({
    organizationId: orgId,
    name: "eBay",
    city: "Online",
    isDefault: true,
    isActive: true,
  });
  return created._id;
}

function isActiveListing(listing: EbayListing): boolean {
  const status = listing.status?.toUpperCase();
  return status === "ACTIVE" || status === "READY";
}

function unitToGrams(value: number | undefined, unit: string | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  switch (unit?.toLowerCase()) {
    case "gram":
    case "g":
      return Math.round(value);
    case "kilogram":
    case "kg":
      return Math.round(value * 1000);
    case "ounce":
    case "oz":
      return Math.round(value * 28.3495);
    case "pound":
    case "lb":
      return Math.round(value * 453.592);
    default:
      return Math.round(value);
  }
}

interface PreparedProduct {
  externalId: string;
  sku: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  status: "active" | "draft";
  brand?: string;
  description?: string;
  images: string[];
  weightGrams?: number;
}

/**
 * A listing is the commercial record (title, price, active state); the matching
 * inventory item is the descriptive record (description, images, brand, weight).
 * Listings are authoritative for anything both could answer, because a seller can
 * have inventory for something they never listed.
 */
function prepareListings(
  listings: EbayListing[],
  inventoryBySku: Map<string, EbayInventoryItem>
): PreparedProduct[] {
  return listings.map((listing) => {
    const sku =
      listing.sku ?? inventoryBySku.get(listing.listingId)?.sku ?? `EBAY-${listing.listingId}`;
    const inventory = inventoryBySku.get(sku);
    const description = inventory?.description?.trim();

    return {
      externalId: listing.listingId,
      sku,
      name: listing.title,
      price: listing.price?.value ?? 0,
      currency: listing.price?.currency ?? "USD",
      quantity: listing.quantity ?? inventory?.availability?.quantity ?? 0,
      status: isActiveListing(listing) ? "active" : "draft",
      brand: inventory?.product?.brand,
      description: description || undefined,
      images: (inventory?.product?.imageUrls ?? []).slice(0, 8),
      weightGrams: unitToGrams(
        inventory?.packageDetails?.packageWeightAndSize?.weight?.value,
        inventory?.packageDetails?.packageWeightAndSize?.weight?.unit
      ),
    };
  });
}

/**
 * Inventory items that have no listing still deserve a catalog entry, otherwise
 * a seller syncing only inventory sees an empty catalog.
 */
function prepareInventoryOnly(
  inventory: EbayInventoryItem[],
  listedIds: Set<string>
): PreparedProduct[] {
  return inventory
    .filter((item) => !listedIds.has(item.inventoryItemId))
    .filter((item) => Boolean(item.product?.title || item.sku))
    .map((item) => ({
      externalId: item.inventoryItemId,
      sku: item.sku ?? `EBAY-${item.inventoryItemId}`,
      name: item.product?.title ?? item.sku ?? `eBay item ${item.inventoryItemId}`,
      price: 0,
      currency: "USD",
      quantity: item.availability?.quantity ?? 0,
      status: "draft" as const,
      brand: item.product?.brand,
      description: item.description?.trim() || undefined,
      images: (item.product?.imageUrls ?? []).slice(0, 8),
      weightGrams: unitToGrams(
        item.packageDetails?.packageWeightAndSize?.weight?.value,
        item.packageDetails?.packageWeightAndSize?.weight?.unit
      ),
    }));
}

/**
 * Writes listings and inventory items into the catalog and pushes their stock
 * levels through.
 *
 * Variants are only ever written on insert. Rewriting the array on every sync
 * would regenerate the variant `_id`s and silently orphan every InventoryLevel
 * that points at them, so price is patched in place by SKU instead.
 */
export async function syncEbayCatalog(
  orgId: OrgId,
  integrationId: Types.ObjectId,
  listings: EbayListing[],
  inventory: EbayInventoryItem[]
): Promise<CatalogSyncResult> {
  await connectDB();

  const oid = new Types.ObjectId(String(orgId));
  const outcome = emptyOutcome();

  const inventoryBySku = new Map<string, EbayInventoryItem>();
  for (const item of inventory) {
    if (item.sku) inventoryBySku.set(item.sku, item);
  }

  // Listings keyed by listingId too: some sellers omit the SKU on the listing
  // and only set it on the inventory item.
  for (const item of inventory) {
    if (item.sku) inventoryBySku.set(item.inventoryItemId, item);
  }

  const prepared = [
    ...prepareListings(listings, inventoryBySku),
    ...prepareInventoryOnly(inventory, new Set(listings.map((l) => l.listingId))),
  ];

  if (prepared.length === 0) return { ...outcome, stockUnits: 0 };

  const existingExternalIds = new Set(
    (
      await Product.find({
        organizationId: oid,
        "external.integrationId": integrationId,
        "external.externalId": { $in: prepared.map((p) => p.externalId) },
      })
        .select("external.externalId")
        .lean()
    ).flatMap((doc) => {
      const externalId = doc.external?.externalId;
      return typeof externalId === "string" ? [externalId] : [];
    })
  );

  // Slugs are written only on insert and must be unique per organisation, so the
  // whole existing set is claimed up front and new rows take a free slug.
  const takenSlugs = new Set(
    (await Product.find({ organizationId: oid }).select("slug").lean()).flatMap((doc) =>
      typeof doc.slug === "string" ? [doc.slug] : []
    )
  );

  const operations = prepared.map((item) => {
    const isInsert = !existingExternalIds.has(item.externalId);

    return {
      updateOne: {
        filter: {
          organizationId: oid,
          "external.integrationId": integrationId,
          "external.externalId": item.externalId,
        },
        update: {
          $set: {
            name: item.name,
            status: item.status,
            brand: item.brand,
            description: item.description,
            images: item.images.map((url) => ({ url })),
          },
          $setOnInsert: isInsert
            ? {
                organizationId: oid,
                external: { integrationId, externalId: item.externalId },
                slug: claimSlug(takenSlugs, item.name, item.sku),
                tags: ["ebay"],
                variants: [
                  {
                    sku: item.sku,
                    title: "Default",
                    price: item.price,
                    weightGrams: item.weightGrams,
                    reorderLevel: 5,
                    isActive: true,
                  },
                ],
              }
            : {},
        },
        upsert: true,
      },
    };
  });

  await Product.bulkWrite(operations, { ordered: false });

  outcome.created = prepared.length - existingExternalIds.size;
  outcome.updated = existingExternalIds.size;

  // Patch variant pricing in place so variant _ids (and their stock levels)
  // survive repeat syncs.
  const priceOps = prepared
    .filter((item) => existingExternalIds.has(item.externalId) && item.price > 0)
    .map((item) => ({
      updateOne: {
        filter: {
          organizationId: oid,
          "external.integrationId": integrationId,
          "external.externalId": item.externalId,
          "variants.sku": item.sku,
        },
        update: { $set: { "variants.$[v].price": item.price } },
        arrayFilters: [{ "v.sku": item.sku }],
      },
    }));

  if (priceOps.length > 0) {
    await Product.bulkWrite(priceOps, { ordered: false });
  }

  const stockUnits = await syncStockLevels(oid, integrationId, inventory, prepared);

  return { ...outcome, stockUnits };
}

/**
 * Pushes eBay availability onto InventoryLevel for the default location.
 *
 * Only genuine changes produce a StockMovement, so the movements feed shows the
 * real history of the catalogue rather than one row per sync.
 */
async function syncStockLevels(
  orgId: Types.ObjectId,
  integrationId: Types.ObjectId,
  inventory: EbayInventoryItem[],
  prepared: PreparedProduct[]
): Promise<number> {
  const quantityByExternalId = new Map<string, number>();
  for (const item of inventory) {
    quantityByExternalId.set(item.inventoryItemId, item.availability?.quantity ?? 0);
  }

  const desired = new Map<string, number>();
  for (const item of prepared) {
    const quantity = quantityByExternalId.get(item.externalId);
    if (quantity !== undefined) desired.set(item.externalId, quantity);
  }

  if (desired.size === 0) return 0;

  const products = await Product.find({
    organizationId: orgId,
    "external.integrationId": integrationId,
    "external.externalId": { $in: [...desired.keys()] },
  })
    .select("_id external.externalId variants._id variants.sku")
    .lean();

  if (products.length === 0) return 0;

  const locationId = await ensureDefaultLocation(orgId);

  const targets: { productId: Types.ObjectId; variantId: Types.ObjectId; quantity: number }[] = [];
  for (const product of products) {
    const externalId = product.external?.externalId;
    if (!externalId) continue;
    const quantity = desired.get(externalId);
    if (quantity === undefined) continue;
    const variant = product.variants?.[0];
    if (!variant?._id) continue;
    targets.push({ productId: product._id, variantId: variant._id, quantity });
  }

  if (targets.length === 0) return 0;

  const variantIds = targets.map((t) => t.variantId);
  const current = await InventoryLevel.find({ variantId: { $in: variantIds } })
    .select("variantId quantity")
    .lean();
  const currentByVariant = new Map(current.map((level) => [String(level.variantId), level.quantity ?? 0]));

  await InventoryLevel.bulkWrite(
    targets.map((target) => ({
      updateOne: {
        filter: { variantId: target.variantId, locationId },
        update: {
          $set: {
            organizationId: orgId,
            productId: target.productId,
            quantity: target.quantity,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const movements = targets
    .map((target) => ({
      target,
      previous: currentByVariant.get(String(target.variantId)),
    }))
    .filter((entry): entry is { target: (typeof targets)[number]; previous: number } =>
      entry.previous !== undefined && entry.previous !== entry.target.quantity
    )
    .map(({ target, previous }) => ({
      organizationId: orgId,
      productId: target.productId,
      variantId: target.variantId,
      locationId,
      type: "adjustment" as const,
      quantityChange: target.quantity - previous,
      referenceType: "ebay",
      note: `eBay inventory sync (${previous} → ${target.quantity})`,
    }));

  if (movements.length > 0) {
    await StockMovement.insertMany(movements, { ordered: false });
  }

  return targets.reduce((sum, target) => sum + target.quantity, 0);
}

function mapOrderStatus(order: EbayOrder): IOrderStatus {
  const status = order.orderStatus.toUpperCase();
  const fulfilment = order.fulfillmentStatus?.toUpperCase();

  if (status === "CANCELLED") return "cancelled";
  if (status === "RETURNED" || status === "REFUNDED") return "returned";
  if (status === "COMPLETED") return "delivered";
  if (status === "FULFILLED" || fulfilment === "FULFILLED") return "shipped";
  if (status === "PARTIALLY_FULFILLED") return "processing";
  if (status === "PROCESSING") return "processing";
  if (status === "AWAITING_FULFILLMENT") return "confirmed";
  return "pending";
}

type IOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

/**
 * Imports eBay orders. Each eBay order becomes one local order whose
 * `orderNumber` embeds the eBay id, so re-syncing updates rather than
 * duplicates via the external-id index.
 *
 * Orders with no line items are skipped: the Order schema requires at least one
 * and eBay does occasionally return cancelled orders stripped of items.
 */
export async function syncEbayOrders(
  orgId: OrgId,
  integrationId: Types.ObjectId,
  orders: EbayOrder[]
): Promise<SyncOutcome> {
  await connectDB();

  const outcome = emptyOutcome();
  if (orders.length === 0) return outcome;

  const oid = new Types.ObjectId(String(orgId));

  const skus = [
    ...new Set(
      orders.flatMap((order) =>
        order.orderItems
          .map((item) => item.sku)
          .filter((sku): sku is string => typeof sku === "string" && sku.length > 0)
      )
    ),
  ];
  const products = skus.length
    ? await Product.find({
        organizationId: oid,
        "variants.sku": { $in: skus },
      })
        .select("_id variants._id variants.sku")
        .lean()
    : [];

  const productBySku = new Map<string, { productId: Types.ObjectId; variantId: Types.ObjectId }>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (variant.sku && variant._id) {
        productBySku.set(variant.sku, { productId: product._id, variantId: variant._id });
      }
    }
  }

  const existing = new Set(
    (
      await Order.find({
        organizationId: oid,
        "external.integrationId": integrationId,
        "external.externalId": { $in: orders.map((o) => o.orderId) },
      })
        .select("external.externalId")
        .lean()
    ).flatMap((doc) => {
      const externalId = doc.external?.externalId;
      return typeof externalId === "string" ? [externalId] : [];
    })
  );

  const importable = orders.filter((order) => order.orderItems.length > 0);

  const operations = importable.map((order) => {
    const pricing = order.pricingSummary;
    const currency = pricing?.total?.currency ?? "USD";
    const subtotal = order.orderItems.reduce(
      (sum, item) => sum + item.lineTotal.value,
      0
    );
    const shipping = pricing?.shipping?.value ?? 0;
    const discount = pricing?.discount?.value ?? 0;
    const tax = pricing?.tax?.value ?? 0;
    const total = pricing?.total?.value ?? subtotal + shipping + tax - discount;
    const paidDate = order.paidDate ? new Date(order.paidDate) : undefined;
    const placedAt = order.createdDate ? new Date(order.createdDate) : new Date();

    return {
      updateOne: {
        filter: {
          organizationId: oid,
          "external.integrationId": integrationId,
          "external.externalId": order.orderId,
        },
        update: {
          $set: {
            status: mapOrderStatus(order),
            paymentStatus: paidDate ? ("paid" as const) : ("unpaid" as const),
            items: order.orderItems.map((item) => {
              const match = item.sku ? productBySku.get(item.sku) : undefined;
              return {
                productId: match?.productId,
                variantId: match?.variantId,
                productName: item.title,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice.value,
                discount: item.discount.value,
                lineTotal: item.lineTotal.value,
              };
            }),
            shippingAddress: order.shippingAddress
              ? {
                  name: order.shippingAddress.name,
                  phone: order.shippingAddress.phone,
                  line1: order.shippingAddress.line1,
                  line2: order.shippingAddress.line2,
                  city: order.shippingAddress.city,
                  state: order.shippingAddress.state,
                  postalCode: order.shippingAddress.postalCode,
                  country: order.shippingAddress.country ?? "PK",
                }
              : undefined,
            subtotal,
            shippingTotal: shipping,
            discountTotal: discount,
            taxTotal: tax,
            total,
            currency,
            channel: "ebay",
            placedAt,
            paidAt: paidDate,
          },
          $setOnInsert: {
            organizationId: oid,
            orderNumber: `EBY-${order.orderId}`,
            external: { integrationId, externalId: order.orderId },
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    await Order.bulkWrite(operations, { ordered: false });
  }

  outcome.skipped = orders.length - importable.length;
  outcome.updated = importable.filter((o) => existing.has(o.orderId)).length;
  outcome.created = importable.length - outcome.updated;

  return outcome;
}

/** Resolves the org's eBay integration, or null when it is not connected. */
export async function getConnectedEbayIntegration(orgId: OrgId) {
  await connectDB();
  return Integration.findOne({ organizationId: orgId, provider: "ebay" });
}