import Link from "next/link";
import { connectDB } from "@/lib/database/db";
import { Integration, IntegrationSyncLog } from "@/lib/models/integration";
import { Product } from "@/lib/models/product";
import { Order } from "@/lib/models/order";
import { getOrgId } from "@/lib/org";
import { Card, PageHeader } from "../components/ui";
import { disconnectEbay } from "./actions";
import { EbaySyncControl } from "./EbaySyncControl";

export const dynamic = "force-dynamic";

const COMING_SOON = ["Amazon", "Walmart", "Shopify"];

const ERROR_COPY: Record<string, string> = {
  access_denied: "You cancelled the eBay authorisation, so nothing was connected.",
  invalid_state:
    "That eBay sign-in request could not be verified. It may have expired — please try again.",
  missing_code: "eBay did not return an authorisation code. Please try again.",
  code_expired_or_used:
    "That eBay authorisation code had already expired or been used. Please start again.",
  incomplete_token: "eBay returned an incomplete token response. Please try again.",
  ebay_not_configured:
    "eBay OAuth is not configured on this server. Check EBAY_CLIENT_ID, EBAY_CLIENT_SECRET and EBAY_RUNAME.",
  redirect_uri_mismatch:
    "The redirect URI registered with eBay does not match this server. Set EBAY_REDIRECT_URI to the full https://your-app.com/api/ebay/callback that matches the RuName in the eBay developer portal.",
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

function formatStamp(value: Date): string {
  return value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    _id: unknown;
    status?: string;
    lastSyncedAt?: Date | null;
    lastError?: string | null;
    settings?: Record<string, unknown>;
  } | null = null;

  let syncLogs: {
    _id: unknown;
    status?: string;
    recordsSynced?: number;
    errorMessage?: string;
    startedAt?: Date;
    finishedAt?: Date;
  }[] = [];

  let recordCounts: { products: number; orders: number } = { products: 0, orders: 0 };

  if (orgId) {
    await connectDB();

    integration = await Integration.findOne({ organizationId: orgId, provider: "ebay" })
      .select("_id status lastSyncedAt lastError settings")
      .lean();

    if (integration) {
      const integrationId = integration._id as unknown as string;

      [syncLogs, recordCounts] = await Promise.all([
        IntegrationSyncLog.find({ organizationId: orgId, integrationId })
          .select("status recordsSynced errorMessage startedAt finishedAt")
          .sort({ startedAt: -1 })
          .limit(8)
          .lean() as Promise<typeof syncLogs>,
        (async () => ({
          products: await Product.countDocuments({
            organizationId: orgId,
            "external.integrationId": integrationId,
          }),
          orders: await Order.countDocuments({
            organizationId: orgId,
            "external.integrationId": integrationId,
          }),
        }))(),
      ]);
    }
  }
  console.log(integration, syncLogs, recordCounts);

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
          eBay connected{seller ? ` as ${seller}` : ""}. Run your first sync to pull in listings,
          orders and stock.
        </p>
      )}

      {result === "error" && (
        <p className="mb-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium leading-relaxed text-danger ring-1 ring-danger/20">
          {ERROR_COPY[detail ?? ""] ?? "eBay could not be connected. Please try again."}
        </p>
      )}

      {!orgId && (
        <p className="mb-6 rounded-2xl bg-warning/10 px-4 py-3 text-sm font-medium text-warning ring-1 ring-warning/20">
          You are not a member of an organisation yet. Integrations are stored per organisation, so
          ask an owner to invite you before connecting a marketplace.
        </p>
      )}

      {hasError && integration?.lastError && (
        <p className="mb-6 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium leading-relaxed text-danger ring-1 ring-danger/20">
          The last eBay sync failed: {integration.lastError}
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
            <>
              {isConnected && <EbaySyncControl />}
              <form action={disconnectEbay}>
                <button type="submit" className={DISCONNECT_CLASS}>
                  Disconnect
                </button>
              </form>
            </>
          ) : (
            <>
              {orgId ? (
                /*
                 * A plain <a>, not next/link: the App Router client router does not
                 * follow a route handler's redirect off-origin, so <Link> makes this
                 * button do nothing. This has to stay a full document navigation.
                 */
                <a href="/api/ebay/connect" className={CONNECT_CLASS}>
                  Connect eBay
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Join an organisation before connecting eBay."
                  className={`${CONNECT_CLASS} cursor-not-allowed opacity-50`}
                >
                  Connect eBay
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      {isConnected && (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {[
              {
                label: "Products imported",
                value: recordCounts.products,
                hint: "In your catalog",
                href: "/dashboard/products?source=ebay",
              },
              {
                label: "Orders imported",
                value: recordCounts.orders,
                hint: "In your orders list",
                href: "/dashboard/orders",
              },
              {
                label: "Successful syncs",
                value: syncLogs.filter((log) => log.status === "success").length,
                hint: `Last ${syncLogs.length} attempts`,
                href: null,
              },
            ].map((stat) => {
              const content = (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                </>
              );

              return stat.href ? (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/30"
                >
                  {content}
                </Link>
              ) : (
                <Card key={stat.label} className="p-5">
                  {content}
                </Card>
              );
            })}
          </div>

          <Card className="mt-6 overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-bold text-foreground">Sync history</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Each run fetches listings, orders and inventory, then updates your catalog in place.
              </p>
            </div>

            {syncLogs.length === 0 ? (
              <p className="p-5 text-sm leading-relaxed text-muted-foreground">
                No syncs yet. Hit “Sync now” above to pull in your eBay listings, orders and stock
                levels.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {syncLogs.map((log) => (
                  <li key={String(log._id)} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        log.status === "success"
                          ? "bg-success/10 text-success"
                          : log.status === "running"
                            ? "bg-warning/10 text-warning"
                            : "bg-danger/10 text-danger"
                      }`}
                    >
                      {log.status ?? "running"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {log.errorMessage ?? `${log.recordsSynced ?? 0} records written`}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatStamp(log.finishedAt ?? log.startedAt ?? new Date())}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

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