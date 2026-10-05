import Link from "next/link";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
      {/* warm ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-cover bg-top opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        style={{ backgroundImage: "url('/auth-bg.png')" }}
      />
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-primary/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 top-40 h-96 w-96 rounded-full bg-warning/10 blur-[110px]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---- copy ---- */}
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
              The commerce operations workspace
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-6 text-[2.6rem] font-bold leading-[1.06] tracking-tight text-foreground sm:text-[3.4rem]">
              Every tool you juggle to run your store,{" "}
              <span className="relative inline-block whitespace-nowrap">
                finally in one place.
                <svg
                  className="squiggle absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 220 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M3 9c40-6 80-6 118-2 34 3 66 2 96-3"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Research products, price them with real margin math, keep inventory
              honest across channels and fulfil orders — without living in
              fourteen browser tabs and three spreadsheets.
            </p>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="btn-shine rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_-12px_rgba(199,91,58,.85)] transition-all hover:bg-primary-hover active:scale-[0.98]"
              >
                Start free — no card needed
              </Link>
              <a
                href="#workflow"
                className="group flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-surface-secondary active:scale-[0.98]"
              >
                See how it works
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-y-0.5">
                  <path d="M12 5v14m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </Reveal>

          <Reveal delay={340}>
            <div className="mt-9 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["#C75B3A", "#B8863B", "#527A5A", "#A9472E"].map((c) => (
                  <span
                    key={c}
                    className="h-8 w-8 rounded-full ring-2 ring-background"
                    style={{ background: `linear-gradient(135deg, ${c}, #ffffff66)` }}
                  />
                ))}
              </div>
              <span>
                Built with — and for — real multi-channel sellers.
              </span>
            </div>
          </Reveal>
        </div>

        {/* ---- product window mock ---- */}
        <Reveal delay={200} className="relative">
          <div className="tilt relative mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_40px_90px_-30px_rgba(124,50,32,.35)]">
              {/* window bar */}
              <div className="flex items-center gap-1.5 border-b border-border bg-surface-secondary px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-3 rounded-md bg-surface px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  ecomly · dashboard
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* stat row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Revenue", "₨ 482k", "+18%"],
                    ["Orders", "1,204", "+9%"],
                    ["Margin", "31.4%", "+2.1"],
                  ].map(([label, value, delta]) => (
                    <div key={label} className="rounded-xl border border-border bg-background p-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="mt-1 text-base font-bold text-foreground">{value}</p>
                      <p className="text-[10px] font-semibold text-success">{delta}</p>
                    </div>
                  ))}
                </div>

                {/* sparkline */}
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Last 30 days</p>
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">on track</span>
                  </div>
                  <svg viewBox="0 0 300 70" className="h-16 w-full" fill="none">
                    <path
                      d="M0 55 C30 50 45 38 70 40 C95 42 110 26 140 28 C170 30 185 16 215 18 C245 20 265 8 300 10"
                      stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"
                    />
                    <path
                      d="M0 55 C30 50 45 38 70 40 C95 42 110 26 140 28 C170 30 185 16 215 18 C245 20 265 8 300 10 L300 70 L0 70 Z"
                      fill="url(#heroFill)" opacity="0.18"
                    />
                    <defs>
                      <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* inventory rows */}
                <div className="space-y-2">
                  {[
                    ["Wireless Earbuds Pro", "SKU-1042", 82, "bg-success"],
                    ["Smart Watch S2", "SKU-2210", 34, "bg-warning"],
                    ["USB-C Hub 7-in-1", "SKU-3308", 6, "bg-danger"],
                  ].map(([name, sku, pct, color]) => (
                    <div key={sku as string} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{sku}</p>
                      </div>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* floating chips */}
            <div className="float-a absolute -left-8 top-16 hidden rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(124,50,32,.4)] sm:block">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Low stock</p>
              <p className="text-xs font-semibold text-danger">USB-C Hub · 6 left</p>
            </div>
            <div className="float-b absolute -right-6 bottom-20 hidden rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(124,50,32,.4)] sm:block">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Est. margin</p>
              <p className="text-xs font-semibold text-success">+31.4% before you buy</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
