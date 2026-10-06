import { NextRequest } from "next/server";
import { connectDB } from "@/lib/database/db";
import { Location } from "@/lib/models/inventory";
import { badRequest, notFound, requireOrg } from "@/lib/api";
import { optionalStr, str, toObjectId } from "@/lib/validate";

/**
 * Stock locations.
 *
 * Every org needs at least one before stock can be recorded: InventoryLevel
 * requires a locationId and a variant cannot be given a quantity without one.
 * `ensureDefaultLocation` is called from the inventory page so a new workspace
 * is immediately usable instead of showing an empty locations list.
 */
export async function GET() {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  await connectDB();

  const locations = await Location.find({ organizationId: org.orgId }).sort({ name: 1 }).lean();

  return Response.json({
    locations: locations.map((location) => ({
      id: String(location._id),
      name: location.name,
      address: location.address ?? "",
      city: location.city ?? "",
      isDefault: location.isDefault === true,
      isActive: location.isActive !== false,
    })),
  });
}

export async function POST(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const name = str(body?.name);

  if (!name) return badRequest("Location name is required", { name: "Required" });

  await connectDB();

  const isDefault = body?.isDefault === true;

  // Only one location can be the default; promoting one demotes the previous.
  if (isDefault) {
    await Location.updateMany(
      { organizationId: org.orgId },
      { $set: { isDefault: false } }
    );
  }

  const count = await Location.countDocuments({ organizationId: org.orgId });

  const location = await Location.create({
    organizationId: org.orgId,
    name,
    address: optionalStr(body?.address),
    city: optionalStr(body?.city),
    isDefault: isDefault || count === 0,
    isActive: body?.isActive !== false,
  });

  return Response.json(
    {
      location: {
        id: String(location._id),
        name: location.name,
        address: location.address ?? "",
        city: location.city ?? "",
        isDefault: location.isDefault === true,
        isActive: location.isActive !== false,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Location id is required");

  await connectDB();

  const existing = await Location.findOne({ _id: id, organizationId: org.orgId }).lean();
  if (!existing) return notFound("Location");

  const update: Record<string, unknown> = {};

  if (body?.name !== undefined) {
    const name = str(body.name);
    if (!name) return badRequest("Location name is required", { name: "Required" });
    update.name = name;
  }

  if (body?.address !== undefined) update.address = optionalStr(body.address);
  if (body?.city !== undefined) update.city = optionalStr(body.city);
  if (body?.isActive !== undefined) update.isActive = body.isActive === true;
  if (body?.isDefault === true) update.isDefault = true;

  if (update.isDefault) {
    await Location.updateMany(
      { organizationId: org.orgId, _id: { $ne: id } },
      { $set: { isDefault: false } }
    );
  }

  await Location.updateOne({ _id: id, organizationId: org.orgId }, { $set: update });

  return Response.json({ ok: true, id });
}

export async function DELETE(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Location id is required");

  await connectDB();

  const count = await Location.countDocuments({ organizationId: org.orgId });

  if (count <= 1) {
    return badRequest("A workspace needs at least one stock location");
  }

  const existing = await Location.findOne({ _id: id, organizationId: org.orgId })
    .select("_id")
    .lean();

  if (!existing) return notFound("Location");

  const { InventoryLevel } = await import("@/lib/models/inventory");
  const stock = await InventoryLevel.countDocuments({ organizationId: org.orgId, locationId: id });

  if (stock > 0) {
    return badRequest(
      `${stock} stock level${stock === 1 ? "" : "s"} still sit at this location. Move or clear them first.`
    );
  }

  await Location.deleteOne({ _id: id, organizationId: org.orgId });

  return Response.json({ ok: true, id });
}