import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { encrypt } from "@/lib/crypto";
import {
  EBAY_STATE_COOKIE,
  clearEbayStateCookie,
  verifyEbayStatePair,
} from "@/lib/ebay-state";
import { getOrgId, getSessionUserId } from "@/lib/org";
import {
  EBAY_OAUTH_ENV,
  exchangeCodeForTokens,
  fetchEbayIdentity,
  type EbayCredentials,
} from "@/lib/Ebay/ebay";

const REFRESH_TOKEN_HORIZON_MS = 730 * 24 * 60 * 60 * 1000;

function landing(status: string, detail?: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const url = new URL("/dashboard/integrations", base);
  url.searchParams.set("ebay", status);
  if (detail) url.searchParams.set("ebay_detail", detail);
  return NextResponse.redirect(url);
}

/** Maps an eBay token-endpoint failure onto a code we can show in the UI. */
function classifyTokenError(message: string): string {
  if (/invalid_grant/i.test(message)) return "code_expired_or_used";
  if (/invalid_client/i.test(message)) return "ebay_not_configured";
  if (/redirect_uri|redirecturi/i.test(message)) return "redirect_uri_mismatch";
  return "token_exchange_failed";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const oauthError = params.get("error");
  const queryState = params.get("state");
  const cookieState = request.cookies.get(EBAY_STATE_COOKIE)?.value ?? null;

  // The state cookie is single-use: consume it on every exit path so a
  // replayed callback cannot reuse it.
  const finish = (status: string, detail?: string) => clearEbayStateCookie(landing(status, detail));

  if (oauthError) return finish("error", oauthError);

  const stateOrgId = verifyEbayStatePair(queryState, cookieState);
  if (!stateOrgId) return finish("error", "invalid_state");

  const orgId = await getOrgId();
  if (!orgId) return finish("error", "no_organization");

  // Tenant isolation: the flow must have been started by a member of the org we
  // are about to write to, so a state captured from another tenant is refused.
  if (orgId !== stateOrgId) return finish("error", "invalid_state");

  const userId = await getSessionUserId();
  if (!userId) return finish("error", "unauthorized");

  if (!code) return finish("error", "missing_code");

  let creds: EbayCredentials;
  let identity: { userId: string | null; username: string | null };

  try {
    const token = await exchangeCodeForTokens(code);

    if (!token.access_token || !token.refresh_token || !token.expires_in) {
      return finish("error", "incomplete_token");
    }

    creds = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessExpiresAt: Date.now() + token.expires_in * 1000,
      refreshExpiresAt: Date.now() + REFRESH_TOKEN_HORIZON_MS,
    };

    identity = await fetchEbayIdentity(token.access_token);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[ebay] token exchange failed:", detail);

    return finish("error", classifyTokenError(detail));
  }

  try {
    await connectDB();

    await Integration.findOneAndUpdate(
      { organizationId: orgId, provider: "ebay" },
      {
        $set: {
          name: "eBay",
          status: "connected",
          credentialsEncrypted: encrypt(JSON.stringify(creds)),
          createdBy: userId,
          settings: {
            environment: EBAY_OAUTH_ENV,
            ebayUserId: identity.userId,
            ebayUsername: identity.username,
          },
        },
        $unset: { lastError: "", lastSyncedAt: "" },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return clearEbayStateCookie(landing("connected"));
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[ebay] failed to persist integration:", detail);

    return clearEbayStateCookie(landing("error", "save_failed"));
  }
}