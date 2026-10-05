import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Integration, IntegrationSyncLog } from "@/lib/models/integration";
import {
  fetchEbayInventory,
  fetchEbayListings,
  fetchEbayOrders,
} from "@/lib/ebay-sync";
import { syncEbayCatalog, syncEbayOrders } from "@/lib/ebay-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectDB();
  const integration = await Integration.findOne({ organizationId: orgId, provider: "ebay" });

  if (!integration || integration.status !== "connected") {
    return NextResponse.json(
      { error: "eBay is not connected. Connect it before syncing." },
      { status: 400 }
    );
  }

  const log = await IntegrationSyncLog.create({
    organizationId: orgId,
    integrationId: integration._id,
    direction: "inbound",
    entityType: "listings+orders+inventory",
  });

  try {
    const since = integration.lastSyncedAt?.toISOString();

    const [listings, orders, inventory] = await Promise.all([
      fetchEbayListings(orgId),
      fetchEbayOrders(orgId, since),
      fetchEbayInventory(orgId),
    ]);

    const catalog = await syncEbayCatalog(orgId, integration._id, listings, inventory);
    const importedOrders = await syncEbayOrders(orgId, integration._id, orders);

    const created = catalog.created + importedOrders.created;
    const updated = catalog.updated + importedOrders.updated;

    log.status = "success";
    log.recordsSynced = created + updated;
    log.finishedAt = new Date();
    await log.save();

    // Assigning undefined would be stripped by Mongoose and leave a stale error
    // on screen, so a recovered sync clears the field outright.
    await Integration.updateOne(
      { _id: integration._id },
      { $set: { lastSyncedAt: new Date() }, $unset: { lastError: "" } }
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/integrations");

    return NextResponse.json({
      ok: true,
      fetched: {
        listings: listings.length,
        orders: orders.length,
        inventoryItems: inventory.length,
      },
      created,
      updated,
      skipped: catalog.skipped + importedOrders.skipped,
      stockUnits: catalog.stockUnits,
      syncedAt: log.finishedAt.toISOString(),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[ebay] sync failed:", detail);

    log.status = "failed";
    log.errorMessage = detail;
    log.finishedAt = new Date();
    await log.save();

    // Guarded on `status: "connected"` so a token refresh that already flagged
    // the integration keeps its more specific diagnosis.
    await Integration.updateOne(
      { _id: integration._id, status: "connected" },
      { $set: { status: "error", lastError: detail } }
    );

    revalidatePath("/dashboard/integrations");

    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}