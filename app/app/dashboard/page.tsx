import Link from "next/link";
import { getOrgId } from "@/lib/org";
import { getDashboardStats, money } from "@/lib/dashboard-stats";
import { Card, PageHeader, StatCard } from "./components/ui";

export const dynamic = "force-dynamic";

function syncedLabel(value: Date | null): string {
  if (!value) return "Never";
  return value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OverviewPage() {
  const orgId = await getOrgId();
  const stats = await getDashboardStats(orgId);

  const hasData = stats.orders30d > 0 || stats.productCount > 0;

  const startSteps = [
    {
      href: "/dashboard/research",
      title: "Research a product",
      body: "Estimate profit and margin before you commit to stock.",
    },
    {
      href: stats.ebayConnected ? "/dashboard/products" : "/dashboard/integrations",
      title: stats.ebayConnected ? "Review synced products" : "Connect eBay",
      body: stats.ebayConnected
        ? "Your marketplace listings have been imported. Check them over and set reorder levels."
        : "Import marketplace data and keep stock in sync.",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your whole business at a glance — revenue, orders, inventory and profit."
      />

      {!orgId && (
        <p className="mb-6 rounded-2xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning ring-1 ring-warning/20">
          You are not a member of an organisation yet, so there is no data to show. Ask an owner
          to invite you to one.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={money(stats.revenue30d, stats.currency)}
          hint={stats.orders30d === 0 ? "No orders yet" : `${stats.orders30d} orders in 30 days`}
        />
        <StatCard
          label="Open orders"
          value={String(stats.openOrders)}
          hint={stats.openOrders === 0 ? "Nothing awaiting action" : "Pending or processing"}
          tone={stats.openOrders > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Products"
          value={String(stats.productCount)}
          hint={
            stats.importedProductCount > 0
              ? `${stats.importedProductCount} imported from marketplaces`
              : stats.productCount === 0
                ? "Catalog is empty"
                : `${stats.activeProductCount} active`
          }
        />
        <StatCard
          label="Low stock"
          value={String(stats.lowStockCount)}
          tone={stats.lowStockCount > 0 ? "warning" : "success"}
          hint={
            stats.lowStockCount === 0
              ? "Nothing below reorder level"
              : "At or below reorder level"
          }
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Channel status</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Where your catalogue and orders are coming from.
              </p>
            </div>
            <Link
              href="/dashboard/integrations"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Manage integrations
            </Link>
          </div>

          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <dt className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-secondary text-sm font-bold text-foreground ring-1 ring-border">
                  e<span className="text-danger">B</span>ay
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">eBay</span>
                  <span className="block text-xs text-muted-foreground">
                    Last synced {syncedLabel(stats.ebayLastSyncedAt)}
                  </span>
                </span>
              </dt>
              <dd>
                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    stats.ebayConnected
                      ? "bg-success/10 text-success"
                      : "bg-surface-secondary text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      stats.ebayConnected ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                  {stats.ebayConnected ? "Connected" : "Not connected"}
                </span>
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">
                Orders fulfilled (30d)
              </dt>
              <dd className="text-sm font-semibold text-foreground">{stats.fulfilled30d}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Units on hand</dt>
              <dd className="text-sm font-semibold text-foreground">{stats.unitsOnHand}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted-foreground">Stock movements (30d)</dt>
              <dd className="text-sm font-semibold text-foreground">{stats.movements30d}</dd>
            </div>
          </dl>
        </Card>

        <div className="grid content-start gap-5">
          <Card className="p-6">
            <h3 className="text-base font-bold text-foreground">Revenue, last 30 days</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasData
                ? `${money(stats.revenue30d, stats.currency)} across ${stats.orders30d} orders.`
                : "Activity charts here once your first orders come in."}
            </p>
            <div className="mt-6 flex h-32 items-end gap-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${hasData ? "bg-primary/30" : "bg-border/60"}`}
                  style={{ height: "6%" }}
                />
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-bold text-foreground">Get started</h3>
            <ul className="mt-4 space-y-3">
              {startSteps.map((step) => (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-secondary"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-foreground group-hover:text-primary">
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {step.body}
                      </span>
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mt-1 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12h14m0 0-6-6m6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}