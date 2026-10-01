import Link from "next/link";

const COLS: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Features", "#features"],
      ["How it works", "#workflow"],
      ["Reviews", "#reviews"],
    ],
  ],
  [
    "Account",
    [
      ["Log in", "/login"],
      ["Sign up", "/signup"],
    ],
  ],
  [
    "Company",
    [
      ["About", "#"],
      ["Contact", "#"],
      ["Privacy", "#"],
    ],
  ],
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/landing" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 0 0 5.414 17H17M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
                  stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">Ecomly</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The all-in-one workspace for e-commerce operations — research, catalog,
            inventory, orders and insights in one place.
          </p>
        </div>

        {COLS.map(([title, links]) => (
          <div key={title}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">{title}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Ecomly. All rights reserved.</span>
          <span>Made for sellers, by people who listen to sellers.</span>
        </div>
      </div>
    </footer>
  );
}
