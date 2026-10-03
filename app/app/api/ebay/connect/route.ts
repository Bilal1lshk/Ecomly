import { NextResponse } from "next/server";
import { ensureOrgId } from "@/lib/org";
import { attachEbayStateCookie, createEbayState } from "@/lib/ebay-state";
import { generateConsentUrl } from "@/lib/Ebay/ebay";

export async function GET() {
  // Provisions a personal workspace on first connect, so sellers never hit an
  // org-setup wall before they can authorise eBay.
  const orgId = await ensureOrgId();

  if (!orgId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const state = createEbayState(orgId);
    const consentUrl = generateConsentUrl(state);

    return attachEbayStateCookie(NextResponse.redirect(consentUrl), state);
  } catch (e) {
    console.error("[ebay] authorize failed:", e instanceof Error ? e.message : String(e));

    return NextResponse.json(
      { error: "ebay_not_configured", detail: "eBay OAuth is not configured on this server." },
      { status: 500 }
    );
  }
}