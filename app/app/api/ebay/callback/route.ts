import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { encrypt } from "@/lib/crypto";
import { verifyEbayState } from "@/lib/ebay-state";
import { getSessionUserId } from "@/lib/org";
import {
  EBAY_OAUTH_ENV,
  exchangeCodeForTokens,
  fetchEbayUsername,
  type EbayCredentials,
} from "@/lib/Ebay/ebay";

export const dynamic = "force-dynamic";

const REFRESH_TOKEN_HORIZON_MS = 730 * 24 * 60 * 60 * 1000;

function landing(status: string, detail?: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const url = new URL(base);
  url.searchParams.set("ebay", status);
  if (detail) url.searchParams.set("ebay_detail", detail);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const error = params.get("error");
  const orgId = verifyEbayState(params.get("state"));

  if (error) return landing("error", error);
  if (!code) return landing("error", "missing_code");
  if (!orgId) return landing("error", "invalid_state");

  const userId = await getSessionUserId();
  if (!userId) return landing("error", "unauthorized");

  try {
    const token = await exchangeCodeForTokens(code);
    if (!token.access_token || !token.refresh_token || !token.expires_in) {
      return landing("error", "incomplete_token");
    }

    const username = await fetchEbayUsername(token.access_token);

    const creds: EbayCredentials = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessExpiresAt: Date.now() + token.expires_in * 1000,
      refreshExpiresAt: Date.now() + REFRESH_TOKEN_HORIZON_MS,
    };

    await connectDB();
    const integ = await Integration.findOneAndUpdate(
      { organizationId: orgId, provider: "ebay" },
      {
        $set: {
          status: "connected",
          credentialsEncrypted: encrypt(JSON.stringify(creds)),
          lastError: null,
          createdBy: userId,
          settings: { environment: EBAY_OAUTH_ENV, ebayUsername: username },
        },
      },
      { upsert: true, new: true }
    );

    return landing("connected", integ?.id?.toString());
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("eBay callback failed:", detail);
    return landing("error", detail.slice(0, 200));
  }
}
