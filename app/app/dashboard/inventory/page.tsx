import Link from "next/link";
import { getOrgId } from "@/lib/org";
import { getDashboardStats, getInventoryOverview } from "@/lib/dashboard-stats";
import { Card, EmptyState, PageHeader, StatCard } from "../components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function formatDate(value: Date | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function InventoryPage() {
  const orgId = await getOrgId();
  const stats = await getDashboardStats(orgId);
  const { rows, movements } = await getInventoryOverview(orgId);

  const lowStock = rows.filter((row) => row.quantity > 0 && row.quantity <= row.reorderLevel);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, low-stock alerts and a full movement history per variant."
      />

      {orgId && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <StatCard label="Units on hand" value={String(stats.unitsOnHand)} hint="Across all locations" />
          <StatCard
            label="Low stock"
            value={String(stats.lowStockCount)}
            tone={stats.lowStockCount > 0 ? "warning" : "success"}
            hint={stats.lowStockCount === 0 ? "Nothing below reorder level" : "At or below reorder level"}
          />
          <StatCard
            label="Movements (30d)"
            value={String(stats.movements30d)}
            hint="Stock in / out / adjustments"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="No stock to track yet"
          description="Connect eBay and sync to pull your listing quantities in as stock levels, or add products manually to track levels here."
          action={
            <Link
              href={stats.ebayConnected ? "/dashboard/products" : "/dashboard/integrations"}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_26px_-10px_rgba(199,91,58,.8)] transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              {stats.ebayConnected ? "Go to products" : "Connect eBay"}
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
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Stock levels
                {rows.length >= PAGE_SIZE ? ` (showing first ${PAGE_SIZE})` : ""}
              </p>
              {lowStock.length > 0 && (
                <p className="text-xs font-semibold text-warning">{lowStock.length} below reorder</p>
              )}
            </div>

            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const isLow = row.quantity > 0 && row.quantity <= row.reorderLevel;
                const isOut = row.quantity === 0;

                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.sku ? `SKU ${row.sku}` : "No SKU"} · reorder at {row.reorderLevel}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isOut
                          ? "bg-danger/10 text-danger"
                          : isLow
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                      }`}
                    >
                      {isOut ? "Out of stock" : isLow ? "Low" : "In stock"}
                    </span>

                    <span className="w-20 shrink-0 text-right text-sm font-semibold text-foreground">
                      {row.quantity}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Recent movements</p>
            </div>

            {movements.length === 0 ? (
              <p className="p-4 text-sm leading-relaxed text-muted-foreground">
                No stock movements in the last 30 days. Movements appear when a sync changes a
                quantity.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {movements.map((movement) => {
                  const up = movement.quantityChange > 0;

                  return (
                    <li key={movement.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-foreground">{movement.name}</p>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            up ? "text-success" : "text-danger"
                          }`}
                        >
                          {up ? "+" : ""}
                          {movement.quantityChange}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {movement.type.replace(/_/g, " ")} · {formatDate(movement.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}