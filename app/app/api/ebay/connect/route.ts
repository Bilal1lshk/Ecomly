import { NextResponse } from "next/server";
import { getOrgId, getSessionUserId } from "@/lib/org";
import { attachEbayStateCookie, createEbayState } from "@/lib/ebay-state";
import { generateConsentUrl } from "@/lib/Ebay/ebay";

export async function GET() {
  const orgId = await getOrgId();

  if (!orgId) {
    const signedIn = await getSessionUserId();

    if (!signedIn) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "no_organization", detail: "Join an organisation before connecting eBay." },
      { status: 403 }
    );
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