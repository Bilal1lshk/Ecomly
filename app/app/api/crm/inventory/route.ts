import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Location, InventoryLevel, StockMovement } from "@/lib/models/inventory";
import { Product } from "@/lib/models/product";
import { badRequest, notFound, requireOrg, serverError } from "@/lib/api";
import { num, optionalStr, str, toObjectId } from "@/lib/validate";

const MOVEMENT_TYPES = [
  "purchase",
  "sale",
  "return",
  "adjustment",
  "transfer_in",
  "transfer_out",
] as const;

type MovementType = (typeof MOVEMENT_TYPES)[number];

/**
 * Stock rows for the inventory screen, joined to their product and location.
 *
 * Variants that exist but have no InventoryLevel document yet are included with
 * quantity 0, because a manually created product starts life with no stock
 * record and should still be adjustable.
 */
export async function GET(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const movementLimit = Math.min(
    Number(request.nextUrl.searchParams.get("movements")) || 20,
    100
  );

  await connectDB();

  const [levels, products, locations, movements] = await Promise.all([
    InventoryLevel.find({ organizationId: org.orgId })
      .populate("productId", "name variants images")
      .populate("locationId", "name")
      .sort({ quantity: 1 })
      .limit(200)
      .lean(),
    Product.find({ organizationId: org.orgId }).select("name variants images").lean(),
    Location.find({ organizationId: org.orgId }).sort({ name: 1 }).lean(),
    StockMovement.find({ organizationId: org.orgId })
      .populate("productId", "name")
      .sort({ createdAt: -1 })
      .limit(movementLimit)
      .lean(),
  ]);

  type PopulatedProduct = {
    _id?: unknown;
    name?: string;
    images?: { url?: string }[];
    variants?: {
      _id?: unknown;
      sku?: string;
      title?: string;
      reorderLevel?: number;
      price?: number;
    }[];
  };

  const rowMap = new Map<string, StockRow>();

  for (const level of levels) {
const populated = level.productId as unknown;
    const product = populated as PopulatedProduct;
    const productRef = populated as { _id?: unknown } | undefined;
    const locationRef = level.locationId as unknown;
    const locationDoc = locationRef as { _id?: unknown; name?: string } | undefined;

    const variant =
      product?.variants?.find(
        (candidate) =>
          candidate._id && String(candidate._id) === String(level.variantId)
      ) ?? product?.variants?.[0];

    if (!variant?._id) continue;

    rowMap.set(String(variant._id), {
      id: String(level._id),
      variantId: String(variant._id),
      productId: String(productRef?._id ?? populated),
      productName: product?.name ?? "Unknown product",
      sku: variant.sku ?? "",
      variantTitle: variant.title ?? "",
      reorderLevel: variant.reorderLevel ?? 5,
      quantity: level.quantity ?? 0,
      reserved: level.reserved ?? 0,
      locationId: String(locationDoc?._id ?? locationRef),
      locationName: locationDoc?.name ?? "Unassigned",
      price: variant.price ?? 0,
      imageUrl: product?.images?.[0]?.url ?? "",
    });
  }

  const knownLocations = new Set(locations.map((location) => String(location._id)));

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant?._id) continue;

      const variantId = String(variant._id);
      if (rowMap.has(variantId)) continue;

      const location = locations[0];

      rowMap.set(variantId, {
        id: "",
        variantId,
        productId: String(product._id),
        productName: product.name,
        sku: variant.sku ?? "",
        variantTitle: variant.title ?? "",
        reorderLevel: variant.reorderLevel ?? 5,
        quantity: 0,
        reserved: 0,
        locationId: location && knownLocations.has(String(location._id)) ? String(location._id) : "",
        locationName: location?.name ?? "No location yet",
        price: variant.price ?? 0,
        imageUrl: product.images?.[0]?.url ?? "",
      });
    }
  }

  const rows = [...rowMap.values()].sort((a, b) => a.quantity - b.quantity);

  return Response.json({
    rows,
    locations: locations.map((location) => ({
      id: String(location._id),
      name: location.name,
      address: location.address ?? "",
      city: location.city ?? "",
      isDefault: location.isDefault === true,
      isActive: location.isActive !== false,
    })),
    movements: movements.map((movement) => ({
      id: String(movement._id),
      productName: (movement.productId as unknown as { name?: string })?.name ?? "Unknown product",
      type: movement.type,
      quantityChange: movement.quantityChange,
      note: movement.note ?? "",
      createdAt: movement.createdAt,
    })),
  });
}

interface StockRow {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  variantTitle: string;
  reorderLevel: number;
  quantity: number;
  reserved: number;
  locationId: string;
  locationName: string;
  price: number;
  imageUrl: string;
}

/**
 * Records a manual stock movement and applies it to the level.
 *
 * Every quantity change in the app funnels through here so InventoryLevel and
 * StockMovement can never disagree. `adjustment` takes the new absolute count
 * because that is what a seller means by "there are 7 left"; the other types
 * take a signed delta.
 */
export async function POST(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);

  const variantId = toObjectId(body?.variantId);
  const productId = toObjectId(body?.productId);

  if (!productId) return badRequest("Product is required", { productId: "Required" });

  const type = str(body?.type) as MovementType;
  if (!MOVEMENT_TYPES.includes(type)) {
    return badRequest("Choose a movement type", { type: "Unknown type" });
  }

  const requested = num(body?.quantityChange, NaN);

  if (!Number.isFinite(requested)) {
    return badRequest("Enter a quantity", { quantityChange: "Required" });
  }

  if (type === "adjustment" && requested < 0) {
    return badRequest("Stock count cannot be negative", {
      quantityChange: "Enter zero or more",
    });
  }

  if (type !== "adjustment" && requested === 0) {
    return badRequest("Quantity change cannot be zero", {
      quantityChange: "Enter a non-zero amount",
    });
  }

  await connectDB();

  const product = await Product.findOne({ _id: productId, organizationId: org.orgId })
    .select("name variants")
    .lean();

  if (!product) return notFound("Product");

  const matchedVariant =
    product.variants?.find((variant) => variant._id && String(variant._id) === variantId) ??
    (variantId ? undefined : product.variants?.[0]);

  if (!matchedVariant?._id) {
    return badRequest("Variant not found on this product", { variantId: "Unknown variant" });
  }

  let locationId = toObjectId(body?.locationId);

  if (locationId) {
    if (!(await Location.exists({ _id: locationId, organizationId: org.orgId }))) {
      return badRequest("Location not found", { locationId: "Unknown location" });
    }
  } else {
    const fallback = await Location.findOne({ organizationId: org.orgId, isActive: true })
      .sort({ isDefault: -1 })
      .select("_id")
      .lean();

    if (!fallback) {
      return badRequest("Create a stock location first", { locationId: "Required" });
    }

    locationId = String(fallback._id);
  }

  const oid = new Types.ObjectId(locationId);

  const filter = {
    organizationId: org.orgId,
    productId,
    variantId: matchedVariant._id,
    locationId: oid,
  };

  const before = await InventoryLevel.findOne(filter).select("quantity").lean();
  const previous = before?.quantity ?? 0;

  // `adjustment` carries the count the seller just counted ("there are 7 left"),
  // so it is turned into a delta here. The rest of the types are already deltas.
  const applied = type === "adjustment" ? requested - previous : requested;
  const finalQuantity = previous + applied;

  // Clamp rather than error: overselling briefly is normal when a sale lands
  // before the stock was adjusted, and a negative stock level is not useful.
  if (finalQuantity < 0) {
    return badRequest(
      `Only ${previous} in stock at this location. Reduce the amount or use a transfer.`,
      { quantityChange: `Max ${previous}` }
    );
  }

  try {
    await InventoryLevel.updateOne(
      filter,
      { $set: { quantity: finalQuantity }, $setOnInsert: { reserved: 0 } },
      { upsert: true }
    );

    await StockMovement.create({
      organizationId: org.orgId,
      productId,
      variantId: matchedVariant._id,
      locationId: oid,
      type,
      quantityChange: applied,
      note: optionalStr(body?.note),
    });
  } catch (error) {
    return serverError("record stock movement", error);
  }

  return Response.json(
    { ok: true, quantity: finalQuantity, previous, applied },
    { status: 201 }
  );
}

/**
 * Sets a reorder level on a variant.
 *
 * Stored on the variant rather than on the level so the alert threshold travels
 * with the SKU across locations.
 */
export async function PATCH(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const productId = toObjectId(body?.productId);
  const variantId = toObjectId(body?.variantId);

  if (!productId || !variantId) {
    return badRequest("Product and variant are required");
  }

  const reorderLevel = num(body?.reorderLevel, NaN);

  if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
    return badRequest("Reorder level must be zero or more", { reorderLevel: "Invalid" });
  }

  await connectDB();

  const result = await Product.updateOne(
    {
      organizationId: org.orgId,
      _id: productId,
      "variants._id": variantId,
    },
    { $set: { "variants.$.reorderLevel": Math.floor(reorderLevel) } }
  );

  if (result.matchedCount === 0) return notFound("Variant");

  return Response.json({ ok: true, reorderLevel: Math.floor(reorderLevel) });
}