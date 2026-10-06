import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Customer } from "@/lib/models/customer";
import { Order } from "@/lib/models/order";
import { CustomersScreen, type Customer as CustomerView } from "./CustomersScreen";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function CustomersPage() {
  const orgId = await getOrgId();

  const customers: CustomerView[] = orgId
    ? await (async () => {
        await connectDB();

        const rows = await Customer.find({ organizationId: orgId })
          .select("fullName email phone notes tags addresses external")
          .sort({ updatedAt: -1 })
          .limit(PAGE_SIZE)
          .lean();

        // Lifetime value is aggregated per customer rather than per contact
        // lookup, so the list stays a single round trip.
        const spend = await Order.aggregate<{
          _id: unknown;
          count: number;
          total: number;
        }>([
          { $match: { organizationId: orgId, customerId: { $ne: null } } },
          {
            $group: {
              _id: "$customerId",
              count: { $sum: 1 },
              total: { $sum: { $ifNull: ["$total", 0] } },
            },
          },
        ]);

        const statsByCustomer = new Map(
          spend.map((row) => [
            String(row._id),
            {
              orderCount: row.count,
              lifetimeValue: Math.round(row.total * 100) / 100,
            },
          ])
        );

        return rows.map((customer) => ({
          id: String(customer._id),
          fullName: customer.fullName,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          notes: customer.notes ?? "",
          tags: customer.tags ?? [],
          addresses: (customer.addresses ?? []).map((address) => ({
            label: address.label ?? "",
            phone: (address as { phone?: string }).phone ?? "",
            line1: address.line1,
            line2: address.line2 ?? "",
            city: address.city,
            state: address.state ?? "",
            postalCode: address.postalCode ?? "",
            country: address.country ?? "PK",
            isDefault: address.isDefault === true,
          })),
          imported: Boolean(customer.external?.externalId),
          ...(statsByCustomer.get(String(customer._id)) ?? {
            orderCount: 0,
            lifetimeValue: 0,
          }),
        }));
      })()
    : [];

  return <CustomersScreen initial={customers} />;
}