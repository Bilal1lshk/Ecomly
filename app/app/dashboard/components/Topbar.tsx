"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { sectionLabel } from "./nav";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/85 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        onClick={onMenu}
        aria-label="Open navigation"
        className="rounded-lg border border-border bg-surface p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground">
          {sectionLabel(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Workspace active
        </span>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-danger/30 hover:bg-danger-bg hover:text-danger active:scale-[0.98]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
