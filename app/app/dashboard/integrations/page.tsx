import { Card, PageHeader } from "../components/ui";

const COMING_SOON = ["Amazon", "Walmart", "Shopify"];

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect marketplaces to import data and keep stock synchronised."
      />

      <Card className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary text-lg font-bold text-foreground ring-1 ring-border">
            e<span className="text-danger">B</span>ay
          </span>
          <div>
            <h3 className="text-base font-bold text-foreground">eBay</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              OAuth connect, import listings & orders, sync basic stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            Not connected
          </span>
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_26px_-10px_rgba(199,91,58,.8)] transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            Connect eBay
          </button>
        </div>
      </Card>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Coming after MVP
        </h3>
        <div className="grid gap-5 sm:grid-cols-3">
          {COMING_SOON.map((name) => (
            <Card key={name} className="flex items-center justify-between p-5 opacity-70">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                Roadmap
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
