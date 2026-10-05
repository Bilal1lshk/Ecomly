import Link from "next/link";
import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Product } from "@/lib/models/product";
import { Card, EmptyState, PageHeader, StatCard } from "../components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS_TONE: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-surface-secondary text-muted-foreground",
  archived: "bg-warning/10 text-warning",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const source = typeof params.source === "string" ? params.source : "";

  const orgId = await getOrgId();
  const hasCatalog = Boolean(orgId);

  const products = orgId
    ? await (async () => {
        await connectDB();
        const filter: Record<string, unknown> = { organizationId: orgId };
        if (source === "ebay") filter["external.integrationId"] = { $exists: true };
        if (q) filter.$text = { $search: q };

        return Product.find(filter)
          .select("name slug status brand variants images external")
          .sort({ createdAt: -1 })
          .limit(PAGE_SIZE)
          .lean();
      })()
    : [];

  const imported = products.filter((p) => Boolean(p.external?.externalId)).length;
  const active = products.filter((p) => p.status === "active").length;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your full catalog — variants, SKUs, pricing, categories and status."
      />

      {hasCatalog && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <StatCard
            label="Products"
            value={String(products.length)}
            hint={products.length >= PAGE_SIZE ? `Showing the first ${PAGE_SIZE}` : "In your catalog"}
          />
          <StatCard label="Active" value={String(active)} hint="Visible for sale" />
          <StatCard
            label="Imported"
            value={String(imported)}
            hint="Synced from a marketplace"
            tone={imported > 0 ? "success" : "neutral"}
          />
        </div>
      )}

      <form className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or SKU"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
        {source && (
          <input type="hidden" name="source" value={source} />
        )}
        <button
          type="submit"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-secondary"
        >
          Search
        </button>
        {(q || source) && (
          <Link
            href="/dashboard/products"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title={q ? "No products match that search" : "No products yet"}
          description={
            q
              ? "Try a different name or SKU, or clear the search to see everything."
              : "Connect eBay and sync to import your listings, or start from scratch with a research pick."
          }
          action={
            q ? (
              <Link
                href="/dashboard/products"
                className="inline-flex items-center rounded-xl border border-border bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground"
              >
                Clear search
              </Link>
            ) : (
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_26px_-10px_rgba(199,91,58,.8)] transition-all hover:bg-primary-hover active:scale-[0.98]"
              >
                Connect eBay
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14m0 0-6-6m6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {products.map((product) => {
              const variant = product.variants?.[0];
              const image = product.images?.[0]?.url;
              const isImported = Boolean(product.external?.externalId);

              return (
                <li
                  key={String(product._id)}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-secondary"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary text-xs font-bold text-muted-foreground ring-1 ring-border">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      product.name.slice(0, 2).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {variant?.sku ? `SKU ${variant.sku}` : "No SKU"}
                      {product.brand ? ` · ${product.brand}` : ""}
                      {` · ${product.variants?.length ?? 0} variant${
                        (product.variants?.length ?? 0) === 1 ? "" : "s"
                      }`}
                    </p>
                  </div>

                  {isImported && (
                    <span className="hidden shrink-0 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline">
                      eBay
                    </span>
                  )}

                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${
                      STATUS_TONE[product.status ?? "draft"] ?? STATUS_TONE.draft
                    }`}
                  >
                    {product.status ?? "draft"}
                  </span>

                  <span className="w-24 shrink-0 text-right text-sm font-semibold text-foreground">
                    {variant ? variant.price.toFixed(2) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}