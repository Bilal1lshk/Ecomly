import Link from "next/link";
import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Order } from "@/lib/models/order";
import { getDashboardStats, money } from "@/lib/dashboard-stats";
import { Card, EmptyState, PageHeader, StatCard } from "../components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-warning/10 text-warning",
  processing: "bg-surface-secondary text-muted-foreground",
  shipped: "bg-surface-secondary text-muted-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
  returned: "bg-danger/10 text-danger",
};

function formatDate(value: Date | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function OrdersPage() {
  const orgId = await getOrgId();
  const stats = await getDashboardStats(orgId);

  const orders = orgId
    ? await (async () => {
        await connectDB();
        return Order.find({ organizationId: orgId })
          .select("orderNumber status paymentStatus channel items total currency placedAt external")
          .sort({ placedAt: -1 })
          .limit(PAGE_SIZE)
          .lean();
      })()
    : [];

  const ebayCount = orders.filter((order) => Boolean(order.external?.externalId)).length;
  const needsAttention = orders.filter((order) =>
    ["pending", "confirmed"].includes(order.status ?? "")
  ).length;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order in one place. Confirming an order automatically reduces inventory."
      />

      {orgId && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <StatCard
            label="Open orders"
            value={String(stats.openOrders)}
            hint={needsAttention > 0 ? `${needsAttention} awaiting confirmation` : "Pending or processing"}
            tone={stats.openOrders > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label="Fulfilled (30d)"
            value={String(stats.fulfilled30d)}
            hint="Shipped or delivered"
          />
          <StatCard
            label="Order value (30d)"
            value={money(stats.revenue30d, stats.currency)}
            hint={`${stats.orders30d} orders`}
          />
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Zm0 7 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="No orders yet"
          description="When your first order arrives — manually or synced from eBay — it will show up here ready to confirm and fulfil."
          action={
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_26px_-10px_rgba(199,91,58,.8)] transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              Connect a channel
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14m0 0-6-6m6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {orders.length} order{orders.length === 1 ? "" : "s"}
              {orders.length >= PAGE_SIZE ? ` (showing first ${PAGE_SIZE})` : ""}
            </p>
            {ebayCount > 0 && (
              <p className="text-xs text-muted-foreground">{ebayCount} synced from eBay</p>
            )}
          </div>

          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li
                key={String(order._id)}
                className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {order.orderNumber}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatDate(order.placedAt)} ·{" "}
                    {order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} item
                    {(order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0) === 1
                      ? ""
                      : "s"}
                    {order.channel && order.channel !== "manual"
                      ? ` · via ${order.channel}`
                      : ""}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    STATUS_TONE[order.status ?? "pending"] ?? STATUS_TONE.pending
                  }`}
                >
                  {order.status ?? "pending"}
                </span>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    order.paymentStatus === "paid"
                      ? "bg-success/10 text-success"
                      : "bg-surface-secondary text-muted-foreground"
                  }`}
                >
                  {order.paymentStatus ?? "unpaid"}
                </span>

                <span className="w-28 shrink-0 text-right text-sm font-semibold text-foreground">
                  {money(order.total ?? 0, order.currency ?? stats.currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}