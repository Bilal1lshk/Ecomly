import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Customer } from "@/lib/models/customer";
import { Order } from "@/lib/models/order";
import { badRequest, notFound, requireOrg, serverErrorOnDuplicate } from "@/lib/api";
import { optionalStr, str, strArray, toObjectId } from "@/lib/validate";

interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

/**
 * Parses the addresses array. Addresses arrive as an array of flat objects from
 * the client; a partially filled address is dropped rather than rejected so one
 * blank row does not block saving the contact itself.
 */
function parseAddresses(value: unknown): AddressInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];

  const parsed: AddressInput[] = [];

  for (const entry of value) {
    const address = entry as Record<string, unknown>;
    const line1 = str(address.line1);
    const city = str(address.city);

    if (!line1 || !city) continue;

    parsed.push({
      label: optionalStr(address.label),
      line1,
      line2: optionalStr(address.line2),
      city,
      state: optionalStr(address.state),
      postalCode: optionalStr(address.postalCode),
      country: str(address.country).toUpperCase() || "PK",
      isDefault: address.isDefault === true,
    });
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const q = str(request.nextUrl.searchParams.get("q"));
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 200);

  await connectDB();

  const filter: Record<string, unknown> = { organizationId: org.orgId };
  if (q) filter.$text = { $search: q };

  const [customers, orderCounts] = await Promise.all([
    Customer.find(filter)
      .select("fullName email phone notes tags addresses external createdAt")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean(),
    Order.aggregate<{ _id: Types.ObjectId; count: number; spend: number }>([
      { $match: { organizationId: org.orgId } },
      {
        $group: {
          _id: "$customerId",
          count: { $sum: 1 },
          spend: { $sum: { $ifNull: ["$total", 0] } },
        },
      },
    ]),
  ]);

  const statsByCustomer = new Map(
    orderCounts.map((row) => [
      String(row._id),
      { orderCount: row.count, lifetimeValue: Math.round(row.spend * 100) / 100 },
    ])
  );

  return Response.json({
    customers: customers.map((customer) => ({
      id: String(customer._id),
      fullName: customer.fullName,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
      tags: customer.tags ?? [],
      addresses: (customer.addresses ?? []).map((address) => ({
        label: address.label ?? "",
        line1: address.line1,
        line2: address.line2 ?? "",
        city: address.city,
        state: address.state ?? "",
        postalCode: address.postalCode ?? "",
        country: address.country ?? "PK",
        isDefault: address.isDefault === true,
      })),
      imported: Boolean(customer.external?.externalId),
      createdAt: customer.createdAt,
      ...(statsByCustomer.get(String(customer._id)) ?? { orderCount: 0, lifetimeValue: 0 }),
    })),
  });
}

export async function POST(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const fullName = str(body?.fullName);

  if (!fullName) {
    return badRequest("Contact name is required", { fullName: "Required" });
  }

  const email = optionalStr(body?.email)?.toLowerCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("That email address looks invalid", { email: "Invalid email" });
  }

  const addresses = parseAddresses(body?.addresses) ?? [];

  if (addresses.length > 1) {
    for (let index = 1; index < addresses.length; index++) {
      addresses[index].isDefault = false;
    }
  }

  await connectDB();

  try {
    const customer = await Customer.create({
      organizationId: org.orgId,
      fullName,
      email,
      phone: optionalStr(body?.phone),
      notes: optionalStr(body?.notes),
      tags: strArray(body?.tags),
      addresses,
    });

    return Response.json(
      {
        customer: {
          id: String(customer._id),
          fullName: customer.fullName,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return serverErrorOnDuplicate("create customer", error, "Could not create that contact");
  }
}

export async function PATCH(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Contact id is required");

  await connectDB();

  const existing = await Customer.findOne({ _id: id, organizationId: org.orgId }).lean();
  if (!existing) return notFound("Contact");

  const update: Record<string, unknown> = {};

  if (body?.fullName !== undefined) {
    const fullName = str(body.fullName);
    if (!fullName) return badRequest("Contact name is required", { fullName: "Required" });
    update.fullName = fullName;
  }

  if (body?.email !== undefined) {
    const email = optionalStr(body.email)?.toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest("That email address looks invalid", { email: "Invalid email" });
    }
    update.email = email;
  }

  if (body?.phone !== undefined) update.phone = optionalStr(body.phone);
  if (body?.notes !== undefined) update.notes = optionalStr(body.notes);
  if (body?.tags !== undefined) update.tags = strArray(body.tags);

  if (body?.addresses !== undefined) {
    const addresses = parseAddresses(body.addresses) ?? [];
    const defaults = addresses.filter((address) => address.isDefault).length;

    if (defaults > 1) {
      return badRequest("Only one address can be the default", {
        addresses: "Choose a single default address",
      });
    }

    update.addresses = addresses;
  }

  try {
    await Customer.updateOne({ _id: id, organizationId: org.orgId }, { $set: update });
  } catch (error) {
    return serverErrorOnDuplicate("update customer", error, "Could not save that contact");
  }

  return Response.json({ ok: true, id });
}

export async function DELETE(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Contact id is required");

  await connectDB();

  const oid = new Types.ObjectId(id);
  const existing = await Customer.findOne({ _id: oid, organizationId: org.orgId })
    .select("_id")
    .lean();

  if (!existing) return notFound("Contact");

  const orderCount = await Order.countDocuments({ organizationId: org.orgId, customerId: oid });

  if (orderCount > 0) {
    return badRequest(
      `${orderCount} order${orderCount === 1 ? "" : "s"} reference this contact. Remove them first.`
    );
  }

  await Customer.deleteOne({ _id: oid, organizationId: org.orgId });

  return Response.json({ ok: true, id });
}