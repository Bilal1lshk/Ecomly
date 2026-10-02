import Link from "next/link";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { getOrgId } from "@/lib/org";
import { Card, PageHeader } from "../components/ui";
import { disconnectEbay } from "./actions";

const COMING_SOON = ["Amazon", "Walmart", "Shopify"];

const ERROR_COPY: Record<string, string> = {
  access_denied: "You cancelled the eBay authorisation, so nothing was connected.",
  invalid_state:
    "That eBay sign-in request could not be verified. It may have expired — please try again.",
  missing_code: "eBay did not return an authorisation code. Please try again.",
  code_expired_or_used:
    "That eBay authorisation code had already expired or been used. Please start again.",
  incomplete_token: "eBay returned an incomplete token response. Please try again.",
  ebay_not_configured: "eBay OAuth is not configured on this server.",
  redirect_uri_mismatch:
    "The redirect URI registered with eBay does not match this server's configuration.",
  token_exchange_failed: "eBay rejected the authorisation. Please try again.",
  save_failed: "The eBay connection could not be saved. Please try again.",
  unauthorized: "Your session expired. Please sign in and try again.",
  no_organization: "You are not a member of an organisation, so there is nothing to connect eBay to.",
};

const CONNECT_CLASS =
  "inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_26px_-10px_rgba(199,91,58,.8)] transition-all hover:bg-primary-hover active:scale-[0.98]";

const DISCONNECT_CLASS =
  "inline-flex items-center rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-[0.98]";

function lastSyncedLabel(value: Date | null | undefined): string | null {
  if (!value) return null;

  return `Last synced ${value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const result = typeof params.ebay === "string" ? params.ebay : null;
  const detail = typeof params.ebay_detail === "string" ? params.ebay_detail : null;

  const orgId = await getOrgId();

  let integration: {
    status?: string;
    lastSyncedAt?: Date | null;
    lastError?: string | null;
    settings?: Record<string, unknown>;
  } | null = null;

  if (orgId) {
    await connectDB();

    integration = await Integration.findOne({ organizationId: orgId, provider: "ebay" })
      .select("status lastSyncedAt lastError settings")
      .lean();
  }

  const status = integration?.status ?? "disconnected";
  const isConnected = status === "connected";
  const hasError = status === "error";
  const seller =
    typeof integration?.settings?.ebayUsername === "string"
      ? integration.settings.ebayUsername
      : null;
  const syncedAt = lastSyncedLabel(integration?.lastSyncedAt);

  const statusPill = isConnected
    ? { label: "Connected", dot: "bg-success", className: "bg-success/10 text-success" }
    : hasError
      ? { label: "Needs attention", dot: "bg-danger", className: "bg-danger/10 text-danger" }
      : {
          label: "Not connected",
          dot: "bg-muted-foreground",
          className: "bg-surface-secondary text-muted-foreground",
        };

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect marketplaces to import data and keep stock synchronised."
      />

      {result === "connected" && (
        <p className="mb-6 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success ring-1 ring-success/20">
          eBay connected{seller ? ` as ${seller}` : ""}. You can now sync listings, orders and stock.
        </p>
      )}

      {result === "error" && (
        <p className="mb-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger ring-1 ring-danger/20">
          {ERROR_COPY[detail ?? ""] ?? "eBay could not be connected. Please try again."}
        </p>
      )}

      {!orgId && (
        <p className="mb-6 rounded-2xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning ring-1 ring-warning/20">
          You are not a member of an organisation yet. Integrations are stored per organisation, so
          ask an owner to invite you before connecting a marketplace.
        </p>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary text-lg font-bold text-foreground ring-1 ring-border">
            e<span className="text-danger">B</span>ay
          </span>
          <div>
            <h3 className="text-base font-bold text-foreground">eBay</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              OAuth connect, import listings & orders, sync basic stock.
            </p>
            {(seller || syncedAt) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[seller && `Seller: ${seller}`, syncedAt].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusPill.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusPill.dot}`} />
            {statusPill.label}
          </span>

          {isConnected || hasError ? (
            <form action={disconnectEbay}>
              <button type="submit" className={DISCONNECT_CLASS}>
                Disconnect
              </button>
            </form>
          ) : (
            <Link
              href="/api/ebay/connect"
              prefetch={false}
              aria-disabled={!orgId}
              className={`${CONNECT_CLASS} ${orgId ? "" : "pointer-events-none opacity-50"}`}
            >
              Connect eBay
            </Link>
          )}
        </div>
      </Card>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Coming after MVP
        </h3>
        <div className="grid gap-5 sm:grid-cols-3">
          {COMING_SOON.map((name) => (
            <Card key={name} className="flex items-center justify-between p-5 opacity-70">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                Roadmap
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}