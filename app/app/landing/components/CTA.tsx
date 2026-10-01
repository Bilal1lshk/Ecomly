import Link from "next/link";
import Reveal from "./Reveal";

export default function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface p-10 text-center shadow-[0_40px_90px_-30px_rgba(124,50,32,.35)] sm:p-16">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.22]"
            style={{ backgroundImage: "url('/auth-bg.png')" }}
          />
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-warning/15 blur-[80px]" />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.8rem]">
              Stop tab-hopping.{" "}
              <span className="text-primary">Start selling.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Set up your workspace in minutes. Research your first product today
              and know its margin before you spend anything.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="btn-shine rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_-12px_rgba(199,91,58,.85)] transition-all hover:bg-primary-hover active:scale-[0.98]"
              >
                Create your free workspace
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-border bg-surface px-7 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-surface-secondary active:scale-[0.98]"
              >
                I already have an account
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Free to start · No credit card · Cancel anytime
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
