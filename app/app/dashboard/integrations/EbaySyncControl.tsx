"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncResponse = {
  ok?: boolean;
  orders?: number;
  inventoryItems?: number;
  error?: string;
};

export function EbaySyncControl() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function syncEbay() {
    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/ebay/sync", { method: "POST" });
      const result = (await response.json().catch(() => null)) as SyncResponse | null;

      if (!response.ok || !result?.ok) {
        setMessage({
          kind: "error",
          text: result?.error ?? "eBay sync failed. Please try again.",
        });
        return;
      }

      setMessage({
        kind: "success",
        text: `Synced ${result.orders ?? 0} orders and ${result.inventoryItems ?? 0} inventory items.`,
      });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Could not reach the eBay sync service. Please try again." });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={syncEbay}
        disabled={isSyncing}
        aria-busy={isSyncing}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={isSyncing ? "animate-spin" : ""}
          aria-hidden="true"
        >
          <path
            d="M20 7v5h-5M4 17v-5h5m-4.1-3A8 8 0 0 1 18.7 6L20 7M4 17l1.3 1A8 8 0 0 0 19.1 15"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isSyncing ? "Syncing..." : "Sync now"}
      </button>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          aria-live={message.kind === "error" ? "assertive" : "polite"}
          className={`max-w-xs text-xs leading-relaxed ${
            message.kind === "error" ? "text-danger" : "text-success"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}