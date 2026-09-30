import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Integration, IntegrationSyncLog } from "@/lib/models/integration";
import { fetchEbayOrders, fetchEbayInventory } from "@/lib/ebay-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const integ = await Integration.findOne({ organizationId: orgId, provider: "ebay" });
  if (!integ) return NextResponse.json({ error: "eBay not connected" }, { status: 400 });

  const log = await IntegrationSyncLog.create({
    organizationId: orgId,
    integrationId: integ._id,
    direction: "inbound",
    entityType: "orders+inventory",
  });

  try {
    const since = integ.lastSyncedAt?.toISOString();
    const [orders, items] = await Promise.all([
      fetchEbayOrders(orgId, since),
      fetchEbayInventory(orgId),
    ]);

    log.status = "success";
    log.recordsSynced = orders.length + items.length;
    log.finishedAt = new Date();
    await log.save();
    integ.lastSyncedAt = new Date();
    await integ.save();

    return NextResponse.json({
      ok: true,
      orders: orders.length,
      inventoryItems: items.length,
      preview: { order: orders[0] ?? null, item: items[0] ?? null },
    });
  } catch (e) {
    log.status = "failed";
    log.errorMessage = e instanceof Error ? e.message : String(e);
    log.finishedAt = new Date();
    await log.save();
    return NextResponse.json({ ok: false, error: log.errorMessage }, { status: 500 });
  }
}
