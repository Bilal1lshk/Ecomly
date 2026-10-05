import { Types } from "mongoose";
import {
  num,
  optionalNum,
  optionalStr,
  str,
  strArray,
  toObjectId,
} from "@/lib/validate";

export interface ParsedVariant {
  sku: string;
  title?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  barcode?: string;
  weightGrams?: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface ParsedProduct {
  name: string;
  description?: string;
  status: "draft" | "active" | "archived";
  brand?: string;
  tags: string[];
  imageUrls: string[];
  categoryId: string | null;
  variants: ParsedVariant[];
}

export type ProductParseResult =
  | { ok: true; value: ParsedProduct }
  | { ok: false; fields: Record<string, string> };

/**
 * Validates a product payload from the create/edit form.
 *
 * Returns a field-keyed error map rather than throwing so the form can mark the
 * offending input; the route turns it into a 400 with `fields`.
 */
export function parseProduct(body: unknown): ProductParseResult {
  const input = (body ?? {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const name = str(input.name);
  if (!name) fields.name = "Required";
  else if (name.length > 140) fields.name = "Keep it under 140 characters";

  const status = str(input.status);
  if (status && !["draft", "active", "archived"].includes(status)) {
    fields.status = "Unknown status";
  }

  const categoryId = toObjectId(input.categoryId);

  const rawVariants = Array.isArray(input.variants) ? input.variants : [];
  const variants: ParsedVariant[] = [];
  const seenSkus = new Set<string>();

  rawVariants.forEach((entry, index) => {
    const source = (entry ?? {}) as Record<string, unknown>;

    // An untouched blank row in the variants editor should not fail the save.
    const isBlank = !str(source.sku) && !num(source.price, 0);
    if (isBlank) return;

    const sku = str(source.sku);
    if (!sku) fields[`variants.${index}.sku`] = "SKU is required";
    else if (seenSkus.has(sku)) fields[`variants.${index}.sku`] = "Duplicate SKU";
    else seenSkus.add(sku);

    const price = num(source.price, NaN);
    if (!Number.isFinite(price) || price < 0) {
      fields[`variants.${index}.price`] = "Enter a price of 0 or more";
    }

    const compareAtPrice = optionalNum(source.compareAtPrice);
    if (compareAtPrice !== undefined && compareAtPrice < 0) {
      fields[`variants.${index}.compareAtPrice`] = "Cannot be negative";
    }

    const costPrice = optionalNum(source.costPrice);
    if (costPrice !== undefined && costPrice < 0) {
      fields[`variants.${index}.costPrice`] = "Cannot be negative";
    }

    const weightGrams = optionalNum(source.weightGrams);
    if (weightGrams !== undefined && weightGrams < 0) {
      fields[`variants.${index}.weightGrams`] = "Cannot be negative";
    }

    const reorderLevel = optionalNum(source.reorderLevel);
    if (reorderLevel !== undefined && reorderLevel < 0) {
      fields[`variants.${index}.reorderLevel`] = "Cannot be negative";
    }

    variants.push({
      sku,
      title: optionalStr(source.title),
      price: Number.isFinite(price) ? price : 0,
      compareAtPrice,
      costPrice,
      barcode: optionalStr(source.barcode),
      weightGrams,
      reorderLevel: reorderLevel ?? 5,
      isActive: source.isActive !== false,
    });
  });

  if (variants.length === 0) fields.variants = "Add at least one variant";

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  return {
    ok: true,
    value: {
      name,
      description: optionalStr(input.description),
      status: (status || "draft") as ParsedProduct["status"],
      brand: optionalStr(input.brand),
      tags: strArray(input.tags),
      imageUrls: strArray(input.imageUrls),
      categoryId,
      variants,
    },
  };
}

export interface ProductVariantView {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  barcode: string;
  weightGrams: number | null;
  reorderLevel: number;
  isActive: boolean;
}

export interface ProductView {
  id: string;
  name: string;
  slug: string;
  status: string;
  brand: string;
  description: string;
  tags: string[];
  imageUrls: string[];
  categoryId: string;
  imported: boolean;
  variants: ProductVariantView[];
}

export function toObjectIdOrUndefined(value: string | null) {
  return value ? new Types.ObjectId(value) : undefined;
}

/**
 * Flattens a lean product into the shape the client forms bind to: ids as
 * strings, nullable numbers as real nulls, and images as a plain URL list.
 */
export function serializeProduct(product: {
  _id: unknown;
  name: string;
  slug?: string;
  status?: string;
  brand?: string;
  description?: string;
  tags?: string[];
  images?: { url?: string }[];
  categoryId?: unknown;
  variants?: {
    _id?: unknown;
    sku?: string;
    title?: string;
    price?: number;
    compareAtPrice?: number;
    costPrice?: number;
    barcode?: string;
    weightGrams?: number;
    reorderLevel?: number;
    isActive?: boolean;
  }[];
  external?: { externalId?: string };
}): ProductView {
  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug ?? "",
    status: product.status ?? "draft",
    brand: product.brand ?? "",
    description: product.description ?? "",
    tags: product.tags ?? [],
    imageUrls: (product.images ?? []).map((image) => image.url ?? "").filter(Boolean),
    categoryId: product.categoryId ? String(product.categoryId) : "",
    imported: Boolean(product.external?.externalId),
    variants: (product.variants ?? []).map((variant) => ({
      id: variant._id ? String(variant._id) : "",
      sku: variant.sku ?? "",
      title: variant.title ?? "",
      price: variant.price ?? 0,
      compareAtPrice: variant.compareAtPrice ?? null,
      costPrice: variant.costPrice ?? null,
      barcode: variant.barcode ?? "",
      weightGrams: variant.weightGrams ?? null,
      reorderLevel: variant.reorderLevel ?? 5,
      isActive: variant.isActive !== false,
    })),
  };
}