import { NextResponse } from "next/server";
import { ebayAuth, EBAY_ENV, EBAY_API } from "@/lib/ebay";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }

  const env = {
    EBAY_ENV,
    hasClientId: !!process.env.EBAY_CLIENT_ID,
    hasClientSecret: !!process.env.EBAY_CLIENT_SECRET,
    hasCertId: !!process.env.Cert_ID,
    hasRuName: !!process.env.EBAY_RUNAME,
  };
  if (!env.hasClientId || !env.hasClientSecret) {
    return NextResponse.json({ ok: false, step: "env", env });
  }

  let token: { access_token?: string; expires_in?: number };
  try {
    const raw = await ebayAuth.getApplicationToken(EBAY_ENV);
    token = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: "token",
      env,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  if (!token?.access_token) {
    return NextResponse.json({ ok: false, step: "token", env });
  }

  const r = await fetch(
    `${EBAY_API}/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=EBAY_US`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    }
  );
  const body = await r.json().catch(() => null);

  return NextResponse.json({
    ok: r.ok,
    step: "api-call",
    env,
    expiresIn: token.expires_in,
    status: r.status,
    body,
  });
}