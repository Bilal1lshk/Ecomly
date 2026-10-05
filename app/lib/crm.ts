import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Counter } from "@/lib/models/order";
import { slugify as ebaySlugify } from "@/lib/ebay-import";
import { getOrgId } from "@/lib/org";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatusInput = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatusInput = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
] as const;
export type PaymentStatusInput = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["cod", "card", "bank_transfer", "wallet"] as const;
export type PaymentMethodInput = (typeof PAYMENT_METHODS)[number];

export function slugify(value: string): string {
  return ebaySlugify(value);
}

export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

/**
 * Every write path in the manual CRM is org-scoped, so a valid session is not
 * enough — the caller must actually belong to a workspace. Resolved in one place
 * to keep the routes from each re-implementing the null check.
 */
export async function requireOrgId(): Promise<string | null> {
  return getOrgId();
}

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(readonly errors: FieldError[]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export function fail(errors: FieldError[]): never {
  throw new ValidationError(errors);
}

/**
 * Human-facing duplicate-key diagnosis. The unique indexes on Product/Category/
 * Order are what actually protect the data, so the caller only has to translate
 * the driver's complaint into something actionable in the form.
 */
export function duplicateKeyMessage(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    return "That value is already in use. Try a different one.";
  }
  return null;
}

/**
 * Reserves the next per-org order number.
 *
 * The eBay importer allocates numbers the same way, so manual and synced orders
 * share one increasing sequence and cannot collide on the
 * (organizationId, orderNumber) unique index.
 */
export async function nextOrderNumber(orgId: string): Promise<string> {
  await connectDB();

  const counter = await Counter.findOneAndUpdate(
    { organizationId: orgId, key: "order" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const seq = counter?.seq ?? 1;
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(seq).padStart(4, "0")}`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ParsedVariant {
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  barcode?: string;
  weightGrams?: number;
  reorderLevel: number;
  isActive: boolean;
  quantity?: number;
}

/**
 * Variants arrive from the form as loosely typed strings and, for the manual
 * entry flow, may be omitted entirely — a product with no explicit variant still
 * needs one, because both InventoryLevel and IOrderItem are variant-scoped.
 */
export function parseVariants(input: unknown, errors: FieldError[]): ParsedVariant[] {
  if (input === undefined || input === null) {
    return [];
  }

  if (!Array.isArray(input)) {
    errors.push({ field: "variants", message: "Variants must be a list." });
    return [];
  }

  const variants: ParsedVariant[] = [];
  const seenSkus = new Set<string>();

  input.forEach((raw, index) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const prefix = `variants.${index}`;
    const sku = String(row.sku ?? "").trim();

    if (!sku) {
      errors.push({ field: `${prefix}.sku`, message: "SKU is required." });
    } else if (seenSkus.has(sku.toLowerCase())) {
      errors.push({ field: `${prefix}.sku`, message: `Duplicate SKU "${sku}".` });
    } else {
      seenSkus.add(sku.toLowerCase());
    }

    const price = toNumber(row.price);
    if (price === null || price < 0) {
      errors.push({ field: `${prefix}.price`, message: "Price must be zero or more." });
    }

    const compareAtPrice = toNumber(row.compareAtPrice);
    const costPrice = toNumber(row.costPrice);
    const weightGrams = toNumber(row.weightGrams);
    const quantity = toNumber(row.quantity);

    variants.push({
      sku,
      title: String(row.title ?? "").trim() || "Default",
      price: price ?? 0,
      compareAtPrice: compareAtPrice ?? undefined,
      costPrice: costPrice ?? undefined,
      barcode: String(row.barcode ?? "").trim() || undefined,
      weightGrams: weightGrams ?? undefined,
      reorderLevel: toNumber(row.reorderLevel) ?? 5,
      isActive: row.isActive === undefined ? true : Boolean(row.isActive),
      quantity: quantity ?? undefined,
    });
  });

  return variants;
}

export function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ParsedOrderItem {
  productId?: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discount: number;
  lineTotal: number;
}

/**
 * Line totals are recomputed server-side from quantity and unit price rather than
 * trusted from the payload, so a tampered total cannot inflate an order.
 */
export function parseOrderItems(input: unknown, errors: FieldError[]): ParsedOrderItem[] {
  if (!Array.isArray(input) || input.length === 0) {
    errors.push({ field: "items", message: "Add at least one item." });
    return [];
  }

  const items: ParsedOrderItem[] = [];

  input.forEach((raw, index) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const prefix = `items.${index}`;
    const productName = String(row.productName ?? "").trim();

    if (!productName) {
      errors.push({ field: `${prefix}.productName`, message: "Item name is required." });
    }

    const quantity = toNumber(row.quantity) ?? 0;
    if (quantity < 1 || !Number.isInteger(quantity)) {
      errors.push({ field: `${prefix}.quantity`, message: "Quantity must be a whole number of at least 1." });
    }

    const unitPrice = toNumber(row.unitPrice) ?? 0;
    if (unitPrice < 0) {
      errors.push({ field: `${prefix}.unitPrice`, message: "Unit price must be zero or more." });
    }

    const discount = toNumber(row.discount) ?? 0;
    if (discount < 0) {
      errors.push({ field: `${prefix}.discount`, message: "Discount must be zero or more." });
    }

    const unitCost = toNumber(row.unitCost);
    const cappedDiscount = Math.min(discount, quantity * unitPrice);

    items.push({
      productId: isValidObjectId(row.productId) ? row.productId : undefined,
      variantId: isValidObjectId(row.variantId) ? row.variantId : undefined,
      productName,
      variantTitle: String(row.variantTitle ?? "").trim() || undefined,
      sku: String(row.sku ?? "").trim() || undefined,
      quantity,
      unitPrice,
      unitCost: unitCost ?? undefined,
      discount: round2(cappedDiscount),
      lineTotal: round2(quantity * unitPrice - cappedDiscount),
    });
  });

  return items;
}
