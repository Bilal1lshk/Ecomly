import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/org";
import { createEbayState } from "@/lib/ebay-state";
import { generateConsentUrl } from "@/lib/Ebay/ebay";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = generateConsentUrl(createEbayState(orgId));
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
