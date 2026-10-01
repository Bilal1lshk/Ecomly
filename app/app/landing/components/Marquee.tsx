const ITEMS = [
  "Product research",
  "Margin calculator",
  "Catalog & variants",
  "Live inventory",
  "Order fulfilment",
  "eBay sync",
  "AI listings",
  "One dashboard",
];

export default function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-primary/20 bg-primary py-3.5">
      <div className="marquee flex w-max gap-10 whitespace-nowrap">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-10 text-sm font-semibold uppercase tracking-[0.16em] text-white/90">
            {item}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-white/50">
              <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
