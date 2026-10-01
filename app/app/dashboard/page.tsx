import Link from "next/link";
import { Card, PageHeader, StatCard } from "./components/ui";

const START_STEPS = [
  {
    href: "/dashboard/research",
    title: "Research a product",
    body: "Estimate profit and margin before you commit to stock.",
  },
  {
    href: "/dashboard/products",
    title: "Add your first product",
    body: "Create a catalog entry with variants, SKUs and pricing.",
  },
  {
    href: "/dashboard/integrations",
    title: "Connect eBay",
    body: "Import marketplace data and keep stock in sync.",
  },
];

export default function OverviewPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your whole business at a glance — revenue, orders, inventory and profit."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value="₨ 0" hint="No orders yet" />
        <StatCard label="Orders" value="0" hint="Awaiting first sale" />
        <StatCard label="Products" value="0" hint="Catalog is empty" />
        <StatCard label="Low stock" value="0" tone="success" hint="Nothing below reorder level" />
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Get started
        </h3>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {START_STEPS.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_50px_-24px_rgba(124,50,32,.35)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/20">
                {i + 1}
              </span>
              <h4 className="mt-4 text-base font-bold text-foreground group-hover:text-primary">
                {s.title}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Go
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Card className="mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Revenue, last 30 days</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity will chart here once your first orders come in.
            </p>
          </div>
          <span className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            No data yet
          </span>
        </div>
        <div className="mt-6 flex h-32 items-end gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-t bg-border/60" style={{ height: "6%" }} />
          ))}
        </div>
      </Card>
    </div>
  );
}
