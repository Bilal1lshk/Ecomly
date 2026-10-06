import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Category } from "@/lib/models/category";
import {
  badRequest,
  notFound,
  requireOrg,
  serverErrorOnDuplicate,
} from "@/lib/api";
import { optionalStr, str, toObjectId, uniqueSlug } from "@/lib/validate";

export async function GET() {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  await connectDB();

  const categories = await Category.find({ organizationId: org.orgId })
    .select("name slug parentId")
    .sort({ name: 1 })
    .lean();

  return Response.json({
    categories: categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ? String(category.parentId) : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const name = str(body?.name);

  if (!name) {
    return badRequest("Category name is required", { name: "Required" });
  }

  const parentId = toObjectId(body?.parentId);

  if (parentId && !(await Category.exists({ _id: parentId, organizationId: org.orgId }))) {
    return badRequest("Parent category not found", { parentId: "Unknown category" });
  }

  await connectDB();

  const slug = await uniqueSlug(str(body?.slug) || name, async (candidate) =>
    Boolean(await Category.exists({ organizationId: org.orgId, slug: candidate }))
  );

  try {
    const category = await Category.create({
      organizationId: org.orgId,
      name,
      slug,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
    });

    return Response.json(
      {
        category: {
          id: String(category._id),
          name: category.name,
          slug: category.slug,
          parentId: category.parentId ? String(category.parentId) : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorOnDuplicate("create category", error, "A category with that name already exists");
  }
}

export async function PATCH(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Category id is required");

  await connectDB();

  const existing = await Category.findOne({ _id: id, organizationId: org.orgId }).lean();
  if (!existing) return notFound("Category");

  const name = body?.name === undefined ? existing.name : str(body.name);

  if (!name) return badRequest("Category name is required", { name: "Required" });

  let parentId = existing.parentId ? String(existing.parentId) : null;

  if (body?.parentId !== undefined) {
    parentId = toObjectId(body.parentId);
  }

  if (parentId) {
    if (parentId === id) {
      return badRequest("A category cannot be its own parent", {
        parentId: "Choose a different category",
      });
    }

    if (!(await Category.exists({ _id: parentId, organizationId: org.orgId }))) {
      return badRequest("Parent category not found", { parentId: "Unknown category" });
    }

    // Re-parenting under one's own descendant would orphan the whole subtree.
    const descendants = await collectDescendants(id, org.orgId);
    if (descendants.has(parentId)) {
      return badRequest("A category cannot be moved under one of its own subcategories", {
        parentId: "Would create a loop",
      });
    }
  }

  const update: Record<string, unknown> = {
    name,
    parentId: parentId ? new Types.ObjectId(parentId) : null,
  };

  const requestedSlug = optionalStr(body?.slug);
  if (requestedSlug && requestedSlug !== existing.slug) {
    update.slug = await uniqueSlug(requestedSlug, async (candidate) =>
      Boolean(
        await Category.exists({ organizationId: org.orgId, slug: candidate, _id: { $ne: id } })
      )
    );
  }

  try {
    await Category.updateOne({ _id: id, organizationId: org.orgId }, { $set: update });
  } catch (error) {
    return serverErrorOnDuplicate("update category", error, "That slug is already taken");
  }

  return Response.json({ id, name, slug: update.slug ?? existing.slug, parentId });
}

export async function DELETE(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Category id is required");

  await connectDB();

  const existing = await Category.findOne({ _id: id, organizationId: org.orgId }).select("_id").lean();
  if (!existing) return notFound("Category");

  const { Product } = await import("@/lib/models/product");
  const childCount = await Category.countDocuments({
    organizationId: org.orgId,
    parentId: new Types.ObjectId(id),
  });

  if (childCount > 0) {
    return badRequest("Move or delete its subcategories first");
  }

  const productCount = await Product.countDocuments({
    organizationId: org.orgId,
    categoryId: new Types.ObjectId(id),
  });

  if (productCount > 0) {
    return badRequest(
      `${productCount} product${productCount === 1 ? "" : "s"} still use this category. Reassign them first.`
    );
  }

  await Category.deleteOne({ _id: id, organizationId: org.orgId });

  return Response.json({ ok: true, id });
}

/** Ids of every category beneath `id`, breadth-first. */
async function collectDescendants(id: string, orgId: string): Promise<Set<string>> {
  const found = new Set<string>();
  let frontier = [id];

  while (frontier.length > 0) {
    const children = await Category.find({
      organizationId: orgId,
      parentId: { $in: frontier.map((parent) => new Types.ObjectId(parent)) },
    })
      .select("_id")
      .lean();

    frontier = children
      .map((child) => String(child._id))
      .filter((childId) => {
        if (found.has(childId) || childId === id) return false;
        found.add(childId);
        return true;
      });
  }

  return found;
}