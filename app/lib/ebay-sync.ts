import { ebayFetch, type OrgId } from "@/lib/Ebay/ebay";

const MAX_PAGES = 50;

function nextPath(next: string | undefined): string {
  if (!next) return "";
  const u = new URL(next);
  return u.pathname + u.search;
}

export async function fetchEbayOrders(orgId: OrgId, sinceISO?: string) {
  const orders: unknown[] = [];
  const filter = sinceISO ? `&filter=${encodeURIComponent(`creationdate:[${sinceISO}..]`)}` : "";
  let path: string | undefined = `/sell/fulfillment/v1/order?limit=50${filter}`;
  let pages = 0;

  while (path && pages < MAX_PAGES) {
    const r = await ebayFetch(orgId, path);
    if (!r.ok) throw new Error(`eBay orders ${r.status}: ${await r.text()}`);

    const data = (await r.json()) as { orders?: unknown[]; next?: string };
    orders.push(...(data.orders ?? []));
    path = nextPath(data.next);
    pages += 1;
  }

  return orders;
}

export async function fetchEbayInventory(orgId: OrgId) {
  const items: unknown[] = [];
  let path: string | undefined = "/sell/inventory/v1/inventory_item?limit=100";
  let pages = 0;

  while (path && pages < MAX_PAGES) {
    const r = await ebayFetch(orgId, path);
    if (r.status === 404) break;
    if (!r.ok) throw new Error(`eBay inventory ${r.status}: ${await r.text()}`);

    const data = (await r.json()) as { inventoryItems?: unknown[]; next?: string };
    items.push(...(data.inventoryItems ?? []));
    path = nextPath(data.next);
    pages += 1;
  }

  return items;
}
