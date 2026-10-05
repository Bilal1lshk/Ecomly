import Reveal from "./Reveal";

const STATS = [
  ["1", "workspace instead of a dozen tools"],
  ["8", "core operations, connected"],
  ["0", "spreadsheets left to maintain"],
  ["100%", "of your margin, visible upfront"],
];

export default function Stats() {
  return (
    <section className="relative overflow-hidden bg-primary py-16 text-white">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-[#5E2417]/40 blur-[90px]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(([value, label], i) => (
          <Reveal key={label} delay={i * 90}>
            <div className="text-center lg:text-left">
              <p className="text-[2.6rem] font-bold leading-none tracking-tight">{value}</p>
              <p className="mt-2 text-sm text-white/80">{label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
