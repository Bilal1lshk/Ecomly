"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { getOrgId } from "@/lib/org";

/**
 * Deactivates the org's eBay integration and drops the stored credentials.
 *
 * Scoped by `organizationId` (never by user), so a member can only disconnect
 * the integration belonging to the org they belong to.
 */
export async function disconnectEbay(): Promise<void> {
  const orgId = await getOrgId();
  if (!orgId) return;

  await connectDB();

  await Integration.updateOne(
    { organizationId: orgId, provider: "ebay" },
    {
      $set: { status: "disconnected", settings: {} },
      $unset: { credentialsEncrypted: "", lastError: "", lastSyncedAt: "" },
    }
  );

  revalidatePath("/dashboard/integrations");
}