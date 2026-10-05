import Reveal from "./Reveal";

const STEPS = [
  {
    title: "Log in & create your workspace",
    body: "Sign up, name your organisation and invite your team with roles that match how you work.",
  },
  {
    title: "Research a product",
    body: "Drop in cost, price and fees. Ecomly shows estimated profit and margin before you commit.",
  },
  {
    title: "Save it to catalog & inventory",
    body: "One click turns a researched idea into a live product with variants, SKUs and stock levels.",
  },
  {
    title: "Receive an order",
    body: "Confirm the order and inventory decreases automatically across every connected channel.",
  },
  {
    title: "Watch it all on the dashboard",
    body: "Revenue, profit, orders and stock health — the whole business in a single glance.",
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="relative border-y border-border bg-surface-secondary/60 py-24">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* sticky intro */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">The journey</p>
            <h2 className="mt-3 text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.4rem]">
              From &ldquo;should I sell this?&rdquo; to &ldquo;it just sold.&rdquo;
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              This is the exact path every Ecomly seller walks — no spreadsheets,
              no copy-pasting between dashboards, no guessing your margin.
            </p>
            <a
              href="#features"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              Explore every feature
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </Reveal>
        </div>

        {/* steps */}
        <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-border">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <li className="relative flex gap-5 rounded-2xl border border-transparent p-4 transition-all hover:border-border hover:bg-surface">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-lg font-bold text-primary shadow-[0_8px_20px_-8px_rgba(199,91,58,.5)]">
                  {i + 1}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
