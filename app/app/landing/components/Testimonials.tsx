import Reveal from "./Reveal";

const QUOTES = [
  {
    quote:
      "I used to keep margin in a sheet and stock in my head. Now the number I see before buying is the number I actually make.",
    name: "Hira M.",
    role: "eBay seller · Karachi",
    tilt: "-rotate-1",
  },
  {
    quote:
      "Confirming an order used to mean updating three places. It updates itself now, and my stock finally matches reality.",
    name: "Danish A.",
    role: "Multi-channel retailer · Lahore",
    tilt: "rotate-1",
  },
  {
    quote:
      "The AI drafts my listings and I just polish them. What took an evening now takes twenty minutes.",
    name: "Sana K.",
    role: "Home-goods brand · Islamabad",
    tilt: "-rotate-[0.5deg]",
  },
];

export default function Testimonials() {
  return (
    <section id="reviews" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">From the sellers</p>
        <h2 className="mt-3 max-w-2xl text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">
          People who stopped tab-hopping.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {QUOTES.map((q, i) => (
          <Reveal key={q.name} delay={i * 100}>
            <figure
              className={`${q.tilt} flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-7 shadow-[0_20px_50px_-24px_rgba(124,50,32,.3)] transition-all duration-300 hover:rotate-0 hover:-translate-y-1`}
            >
              <div>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-primary/30">
                  <path
                    d="M10 8H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v3M20 8h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v3"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
                <blockquote className="mt-4 text-[15px] leading-relaxed text-foreground">
                  {q.quote}
                </blockquote>
              </div>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--warning))" }}
                >
                  {q.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{q.name}</p>
                  <p className="text-xs text-muted-foreground">{q.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
