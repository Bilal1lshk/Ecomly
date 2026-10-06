import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Product } from "@/lib/models/product";
import { Category } from "@/lib/models/category";
import { Order } from "@/lib/models/order";
import { InventoryLevel, StockMovement } from "@/lib/models/inventory";
import {
  badRequest,
  notFound,
  requireOrg,
  serverError,
  serverErrorOnDuplicate,
} from "@/lib/api";
import { parseProduct, serializeProduct, toObjectIdOrUndefined } from "@/lib/crm/products";
import { str, toObjectId, uniqueSlug } from "@/lib/validate";

export async function GET(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const id = toObjectId(request.nextUrl.searchParams.get("id"));

  await connectDB();

  if (id) {
    const product = await Product.findOne({ _id: id, organizationId: org.orgId }).lean();
    if (!product) return notFound("Product");

    return Response.json({ product: serializeProduct(product) });
  }

  const q = str(request.nextUrl.searchParams.get("q"));
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 100, 200);

  const filter: Record<string, unknown> = { organizationId: org.orgId };
  if (q) filter.$text = { $search: q };

  const products = await Product.find(filter)
    .select("name slug status brand description tags images variants categoryId external")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  return Response.json({ products: products.map(serializeProduct) });
}

export async function POST(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const parsed = parseProduct(body);

  if (!parsed.ok) {
    return badRequest("Please fix the highlighted fields", parsed.fields);
  }

  const product = parsed.value;

  await connectDB();

  if (
    product.categoryId &&
    !(await Category.exists({ _id: product.categoryId, organizationId: org.orgId }))
  ) {
    return badRequest("Category not found", { categoryId: "Unknown category" });
  }

  const slug = await uniqueSlug(product.name, async (candidate) =>
    Boolean(await Product.exists({ organizationId: org.orgId, slug: candidate }))
  );

  try {
    const created = await Product.create({
      organizationId: org.orgId,
      name: product.name,
      slug,
      description: product.description,
      status: product.status,
      brand: product.brand,
      tags: product.tags,
      images: product.imageUrls.map((url) => ({ url })),
      categoryId: toObjectIdOrUndefined(product.categoryId),
      variants: product.variants,
    });

    return Response.json({ product: serializeProduct(created.toObject()) }, { status: 201 });
  } catch (error) {
    return serverErrorOnDuplicate(
      "create product",
      error,
      "A product with that SKU already exists"
    );
  }
}

export async function PATCH(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Product id is required");

  await connectDB();

  const existing = await Product.findOne({ _id: id, organizationId: org.orgId }).lean();
  if (!existing) return notFound("Product");

  const parsed = parseProduct(body);

  if (!parsed.ok) {
    return badRequest("Please fix the highlighted fields", parsed.fields);
  }

  const product = parsed.value;

  if (
    product.categoryId &&
    !(await Category.exists({ _id: product.categoryId, organizationId: org.orgId }))
  ) {
    return badRequest("Category not found", { categoryId: "Unknown category" });
  }

  // Keep the id of every variant that survived the edit, matched on SKU, so
  // stock levels, order items and supplier links keep pointing at the same
  // variant record instead of being orphaned by a re-save.
  const variants = product.variants.map((variant) => {
    const match = (existing.variants ?? []).find((candidate) => candidate.sku === variant.sku);
    return { ...variant, ...(match?._id ? { _id: match._id } : {}) };
  });

  try {
    await Product.updateOne(
      { _id: id, organizationId: org.orgId },
      {
        $set: {
          name: product.name,
          description: product.description,
          status: product.status,
          brand: product.brand,
          tags: product.tags,
          images: product.imageUrls.map((url) => ({ url })),
          categoryId: toObjectIdOrUndefined(product.categoryId),
          variants,
        },
      }
    );
  } catch (error) {
    return serverErrorOnDuplicate(
      "update product",
      error,
      "A product with that SKU already exists"
    );
  }

  // Variants dropped by this edit would otherwise leave orphaned stock levels
  // and movement history behind.
  const keptIds = new Set(variants.map((variant) => String(variant._id)).filter((v) => v !== "undefined"));
  const removedIds = (existing.variants ?? [])
    .filter((variant) => variant._id && !keptIds.has(String(variant._id)))
    .map((variant) => new Types.ObjectId(String(variant._id)));

  if (removedIds.length > 0) {
    await Promise.all([
      InventoryLevel.deleteMany({ organizationId: org.orgId, variantId: { $in: removedIds } }),
      StockMovement.deleteMany({ organizationId: org.orgId, variantId: { $in: removedIds } }),
    ]);
  }

  return Response.json({ ok: true, id, variantsRemoved: removedIds.length });
}

export async function DELETE(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Product id is required");

  await connectDB();

  const oid = new Types.ObjectId(id);
  const product = await Product.findOne({ _id: oid, organizationId: org.orgId })
    .select("variants external")
    .lean();

  if (!product) return notFound("Product");

  const orderCount = await Order.countDocuments({
    organizationId: org.orgId,
    "items.productId": oid,
  });

  if (orderCount > 0) {
    return badRequest(
      `${orderCount} order${orderCount === 1 ? "" : "s"} include this product. Archive it instead.`
    );
  }

  if (product.external?.externalId) {
    return badRequest(
      "This product came from a marketplace sync. Archive it instead so the next sync does not re-import it."
    );
  }

  const variantIds = (product.variants ?? [])
    .filter((variant) => variant._id)
    .map((variant) => new Types.ObjectId(String(variant._id)));

  try {
    await Product.deleteOne({ _id: oid, organizationId: org.orgId });

    const byProduct = [
      InventoryLevel.deleteMany({ organizationId: org.orgId, productId: oid }),
      StockMovement.deleteMany({ organizationId: org.orgId, productId: oid }),
    ];

    if (variantIds.length > 0) {
      byProduct.push(
        InventoryLevel.deleteMany({ organizationId: org.orgId, variantId: { $in: variantIds } }),
        StockMovement.deleteMany({ organizationId: org.orgId, variantId: { $in: variantIds } })
      );
    }

    await Promise.all(byProduct);
  } catch (error) {
    return serverError("delete product", error);
  }

  return Response.json({ ok: true, id });
}