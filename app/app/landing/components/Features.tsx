import Reveal from "./Reveal";

function Icon({ d }: { d: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Everything in one workspace</p>
        <h2 className="mt-3 max-w-2xl text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">
          The eight things you do every day, minus the tab-switching.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Ecomly replaces the patchwork of dashboards, spreadsheets and AI tools
          with a single connected workspace built around how sellers actually work.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-6">
        {/* Research — large */}
        <Reveal className="md:col-span-4">
          <article className="group h-full rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" />
                <h3 className="mt-5 text-lg font-bold text-foreground">Product research</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Save products you&apos;re evaluating and see estimated profit and
                  margin instantly — so you know the numbers before you spend a rupee.
                </p>
              </div>
              {/* mini margin calc */}
              <div className="hidden w-44 shrink-0 rounded-xl border border-border bg-background p-4 sm:block">
                {[
                  ["Cost", "₨ 1,200", "w-1/3", "bg-muted-foreground/40"],
                  ["Fees", "₨ 300", "w-1/4", "bg-warning"],
                  ["Profit", "₨ 700", "w-1/2", "bg-success"],
                ].map(([label, val, w, c]) => (
                  <div key={label as string} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-semibold text-foreground">{val}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-border">
                      <div className={`h-full rounded-full ${c} ${w}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </Reveal>

        {/* Inventory */}
        <Reveal delay={80} className="md:col-span-2">
          <article className="group h-full rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <Icon d="M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            <h3 className="mt-5 text-lg font-bold text-foreground">Live inventory</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Stock in/out, low-stock thresholds and a full movement history per variant.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-1 text-[11px] font-semibold text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" /> 3 items below reorder
            </span>
          </article>
        </Reveal>

        {/* Catalog */}
        <Reveal className="md:col-span-2">
          <article className="group h-full rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <Icon d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11h6" />
            <h3 className="mt-5 text-lg font-bold text-foreground">Catalog & variants</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SKUs, pricing, categories, images and status — organised the way you sell.
            </p>
          </article>
        </Reveal>

        {/* Orders */}
        <Reveal delay={80} className="md:col-span-2">
          <article className="group h-full rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <Icon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Zm0 7 2 2 4-4" />
            <h3 className="mt-5 text-lg font-bold text-foreground">Orders that sync stock</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Confirm an order and inventory decreases automatically. No double-entry, no drift.
            </p>
          </article>
        </Reveal>

        {/* Dashboard */}
        <Reveal delay={160} className="md:col-span-2">
          <article className="group h-full rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <Icon d="M3 3v18h18M8 17V9m5 8V5m5 12v-6" />
            <h3 className="mt-5 text-lg font-bold text-foreground">One dashboard</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Products, inventory, orders, revenue and profit at a glance — finally centralised.
            </p>
          </article>
        </Reveal>

        {/* eBay */}
        <Reveal className="md:col-span-3">
          <article className="group flex h-full items-start gap-5 rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <Icon d="M12 3a9 9 0 1 0 9 9h-9V3Z M14 3.5A9 9 0 0 1 20.5 10H14V3.5Z" />
            <div>
              <h3 className="text-lg font-bold text-foreground">eBay, connected</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                OAuth-connect your store, import marketplace data and sync basic stock
                across channels from one place.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Synced 2 min ago
              </span>
            </div>
          </article>
        </Reveal>

        {/* AI */}
        <Reveal delay={80} className="md:col-span-3">
          <article className="group flex h-full items-start gap-5 rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_60px_-24px_rgba(124,50,32,.35)]">
            <Icon d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9L19 17Z" />
            <div>
              <h3 className="text-lg font-bold text-foreground">AI listing drafts</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Generate titles, descriptions and bullet points from your product info —
                then review and edit before anything goes live.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" /> You always approve
              </span>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
