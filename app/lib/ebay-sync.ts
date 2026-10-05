import { ebayFetch, type OrgId } from "@/lib/Ebay/ebay";

const MAX_PAGES = 50;
const ORDER_PAGE = 50;
const INVENTORY_PAGE = 100;
const LISTING_PAGE = 50;

export interface EbayMoney {
  value: number;
  currency: string;
}

export interface EbayOrderLine {
  lineItemId: string;
  title: string;
  sku?: string;
  quantity: number;
  unitPrice: EbayMoney;
  discount: EbayMoney;
  shipping: EbayMoney;
  lineTotal: EbayMoney;
}

export interface EbayShippingAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface EbayOrder {
  orderId: string;
  orderStatus: string;
  fulfillmentStatus?: string;
  createdDate?: string;
  paidDate?: string;
  buyerUsername?: string;
  shippingAddress?: EbayShippingAddress;
  orderItems: EbayOrderLine[];
  pricingSummary?: {
    subtotal?: EbayMoney;
    shipping?: EbayMoney;
    discount?: EbayMoney;
    tax?: EbayMoney;
    total?: EbayMoney;
  };
}

export interface EbayInventoryItem {
  inventoryItemId: string;
  sku?: string;
  condition?: string;
  description?: string;
  availability?: { channel?: string; quantity?: number };
  product?: {
    title?: string;
    brand?: string;
    mpn?: string;
    aspects?: Record<string, string>;
    imageUrls?: string[];
  };
  packageDetails?: {
    packageWeightAndSize?: { weight?: { value?: number; unit?: string } };
  };
}

export interface EbayListing {
  listingId: string;
  status?: string;
  title: string;
  sku?: string;
  quantity?: number;
  price?: EbayMoney;
  lastModifiedDate?: string;
}

/**
 * eBay returns every monetary field as a decimal string. Anything unparseable
 * collapses to 0 so a single malformed field cannot abort a whole sync.
 */
function money(raw: unknown): EbayMoney {
  if (raw && typeof raw === "object") {
    const o = raw as { value?: unknown; currency?: unknown };
    const parsed = Number(o.value);
    return {
      value: Number.isFinite(parsed) ? parsed : 0,
      currency: typeof o.currency === "string" && o.currency ? o.currency : "USD",
    };
  }
  const parsed = Number(raw);
  return { value: Number.isFinite(parsed) ? parsed : 0, currency: "USD" };
}

/**
 * eBay paginates with an absolute `next` URL. We keep only path + query so the
 * call is re-issued against the configured host (sandbox vs production)
 * rather than whatever host the token was minted on.
 */
function nextPath(next: unknown): string {
  if (typeof next !== "string" || !next) return "";
  try {
    const u = new URL(next, "https://api.ebay.com");
    return u.pathname + u.search;
  } catch {
    return "";
  }
}

async function readPage(orgId: OrgId, path: string) {
  const res = await ebayFetch(orgId, path);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`eBay ${path.split("?")[0]} responded ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function paginate<T>(
  orgId: OrgId,
  firstPath: string,
  key: string
): Promise<T[]> {
  const out: T[] = [];
  let path: string | undefined = firstPath;
  let pages = 0;

  while (path && pages < MAX_PAGES) {
    const data = await readPage(orgId, path);
    const batch = Array.isArray(data[key]) ? (data[key] as T[]) : [];
    out.push(...batch);
    path = nextPath(data.next);
    pages += 1;
  }

  return out;
}

function parseOrder(raw: Record<string, unknown>): EbayOrder | null {
  const orderId = typeof raw.orderId === "string" ? raw.orderId : null;
  if (!orderId) return null;

  const items = Array.isArray(raw.orderItems) ? raw.orderItems : [];

  return {
    orderId,
    orderStatus: String(raw.orderStatus ?? "UNKNOWN"),
    fulfillmentStatus:
      typeof raw.fulfillmentStatus === "string" ? raw.fulfillmentStatus : undefined,
    createdDate: typeof raw.createdDate === "string" ? raw.createdDate : undefined,
    paidDate: typeof raw.paidDate === "string" ? raw.paidDate : undefined,
    buyerUsername: typeof raw.buyerUsername === "string" ? raw.buyerUsername : undefined,
    shippingAddress: mapAddress(raw.shippingAddress),
    orderItems: items
      .map((entry, index) => mapOrderLine(entry as Record<string, unknown>, index))
      .filter((line): line is EbayOrderLine => line !== null),
    pricingSummary: mapPricingSummary(raw.pricingSummary),
  };
}

function mapOrderLine(
  raw: Record<string, unknown>,
  index: number
): EbayOrderLine | null {
  const title = typeof raw.title === "string" && raw.title ? raw.title : null;
  if (!title) return null;

  const lineTotal = money(raw.lineItemTotal);
  const quantity = Math.max(1, Math.trunc(Number(raw.quantity ?? 1)) || 1);

  return {
    lineItemId:
      typeof raw.lineItemId === "string"
        ? raw.lineItemId
        : typeof raw.legacyItemId === "string"
          ? raw.legacyItemId
          : `${index}`,
    title,
    sku: typeof raw.sku === "string" && raw.sku ? raw.sku : undefined,
    quantity,
    unitPrice: { value: lineTotal.value / quantity, currency: lineTotal.currency },
    discount: money(raw.discountAmount),
    shipping: money(raw.shippingCost),
    lineTotal,
  };
}

function mapAddress(raw: unknown): EbayShippingAddress | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const address: EbayShippingAddress = {
    name: typeof o.name === "string" ? o.name : undefined,
    phone: typeof o.phone === "string" ? o.phone : undefined,
    line1: typeof o.addressLine1 === "string" ? o.addressLine1 : undefined,
    line2: typeof o.addressLine2 === "string" ? o.addressLine2 : undefined,
    city: typeof o.city === "string" ? o.city : undefined,
    state: typeof o.stateOrProvince === "string" ? o.stateOrProvince : undefined,
    postalCode: typeof o.postalCode === "string" ? o.postalCode : undefined,
    country: typeof o.countryCode === "string" ? o.countryCode : undefined,
  };
  return Object.values(address).some(Boolean) ? address : undefined;
}

function mapPricingSummary(raw: unknown): EbayOrder["pricingSummary"] {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    subtotal: money(o.subtotal),
    shipping: money(o.shipping),
    discount: money(o.discount),
    tax: money(o.tax),
    total: money(o.total),
  };
}

function parseInventoryItem(raw: Record<string, unknown>): EbayInventoryItem | null {
  const inventoryItemId =
    typeof raw.inventoryItemId === "string" ? raw.inventoryItemId : null;
  if (!inventoryItemId) return null;

  const product =
    raw.product && typeof raw.product === "object"
      ? (raw.product as Record<string, unknown>)
      : {};

  const availability =
    raw.availability && typeof raw.availability === "object"
      ? (raw.availability as Record<string, unknown>)
      : {};

  const weightBlock =
    raw.packageDetails &&
    typeof raw.packageDetails === "object" &&
    (raw.packageDetails as Record<string, unknown>).packageWeightAndSize &&
    typeof (raw.packageDetails as Record<string, unknown>).packageWeightAndSize === "object"
      ? ((raw.packageDetails as Record<string, unknown>)
          .packageWeightAndSize as Record<string, unknown>)
      : {};

  const weight =
    weightBlock.weight && typeof weightBlock.weight === "object"
      ? (weightBlock.weight as Record<string, unknown>)
      : {};

  return {
    inventoryItemId,
    sku: typeof raw.sku === "string" && raw.sku ? raw.sku : undefined,
    condition: typeof raw.condition === "string" ? raw.condition : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    availability: {
      channel: typeof availability.channel === "string" ? availability.channel : undefined,
      quantity: Math.max(0, Math.trunc(Number(availability.quantity ?? 0)) || 0),
    },
    product: {
      title: typeof product.title === "string" ? product.title : undefined,
      brand: typeof product.brand === "string" ? product.brand : undefined,
      mpn: typeof product.mpn === "string" ? product.mpn : undefined,
      aspects:
        product.aspects && typeof product.aspects === "object"
          ? (product.aspects as Record<string, string>)
          : undefined,
      imageUrls: Array.isArray(product.imageUrls)
        ? product.imageUrls.filter((u): u is string => typeof u === "string")
        : undefined,
    },
    packageDetails: {
      packageWeightAndSize: {
        weight: {
          value: typeof weight.value === "number" ? weight.value : undefined,
          unit: typeof weight.unit === "string" ? weight.unit : undefined,
        },
      },
    },
  };
}

function parseListing(raw: Record<string, unknown>): EbayListing | null {
  const listingId = typeof raw.listingId === "string" ? raw.listingId : null;
  if (!listingId) return null;

  return {
    listingId,
    status: typeof raw.status === "string" ? raw.status : undefined,
    title: typeof raw.title === "string" && raw.title ? raw.title : `eBay listing ${listingId}`,
    sku: typeof raw.sku === "string" && raw.sku ? raw.sku : undefined,
    quantity: Math.max(0, Math.trunc(Number(raw.quantity ?? 0)) || 0),
    price: raw.price ? money(raw.price) : undefined,
    lastModifiedDate:
      typeof raw.lastModifiedDate === "string" ? raw.lastModifiedDate : undefined,
  };
}

/**
 * Orders created since `sinceISO`. The window is deliberately unbounded above
 * because "everything since my last sync" is the intent; a first sync walks up
 * to MAX_PAGES pages and stops.
 */
export async function fetchEbayOrders(orgId: OrgId, sinceISO?: string): Promise<EbayOrder[]> {
  const filter = sinceISO
    ? `&filter=${encodeURIComponent(`creationdate:[${sinceISO}..]`)}`
    : "";

  const raw = await paginate<Record<string, unknown>>(
    orgId,
    `/sell/fulfillment/v1/order?limit=${ORDER_PAGE}${filter}`,
    "orders"
  );

  return raw
    .map(parseOrder)
    .filter((order): order is EbayOrder => order !== null);
}

/**
 * A seller with no FBM inventory legitimately returns 404, so that is treated as
 * an empty result rather than a sync failure.
 */
export async function fetchEbayInventory(orgId: OrgId): Promise<EbayInventoryItem[]> {
  try {
    const raw = await paginate<Record<string, unknown>>(
      orgId,
      `/sell/inventory/v1/inventory_item?limit=${INVENTORY_PAGE}`,
      "inventoryItems"
    );
    return raw
      .map(parseInventoryItem)
      .filter((item): item is EbayInventoryItem => item !== null);
  } catch (e) {
    if (e instanceof Error && /\s404\s/.test(e.message)) return [];
    throw e;
  }
}

export async function fetchEbayListings(orgId: OrgId): Promise<EbayListing[]> {
  try {
    const raw = await paginate<Record<string, unknown>>(
      orgId,
      `/sell/listing/v1_beta/item?limit=${LISTING_PAGE}`,
      "itemListing"
    );
    return raw
      .map(parseListing)
      .filter((listing): listing is EbayListing => listing !== null);
  } catch (e) {
    if (e instanceof Error && /\s404\s/.test(e.message)) return [];
    throw e;
  }
}