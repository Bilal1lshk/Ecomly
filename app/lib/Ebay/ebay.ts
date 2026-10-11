import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  EBAY_API,
  EBAY_AUTHORIZE_URL,
  EBAY_CLIENT_ID,
  EBAY_CLIENT_SECRET,
  EBAY_ENV,
  EBAY_RUNAME,
  EBAY_SCOPE_BASE,
  EBAY_TOKEN_URL,
} from "@/lib/ebay";

export const EBAY_OAUTH_ENV = EBAY_ENV === "production" ? "PRODUCTION" : "SANDBOX";

export const EBAY_IDENTITY_SCOPE = EBAY_SCOPE_BASE;

export const EBAY_SCOPES = [
  EBAY_IDENTITY_SCOPE,
  `${EBAY_SCOPE_BASE}/sell.inventory`,
  `${EBAY_SCOPE_BASE}/sell.fulfillment`,
  `${EBAY_SCOPE_BASE}/sell.account`,
].join(" ");

function requireEbayConfig(): { clientId: string; clientSecret: string; ruName: string } {
  if (!EBAY_CLIENT_ID) throw new Error("Missing EBAY_CLIENT_ID");
  if (!EBAY_RUNAME) throw new Error("Missing EBAY_RUNAME");
  if (!EBAY_CLIENT_SECRET) throw new Error("Missing EBAY_CLIENT_SECRET");

  return { clientId: EBAY_CLIENT_ID, clientSecret: EBAY_CLIENT_SECRET, ruName: EBAY_RUNAME };
}

export function generateConsentUrl(state: string): string {
  const { clientId, ruName } = requireEbayConfig();
  const url = new URL(EBAY_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: ruName,
    response_type: "code",
    scope: EBAY_SCOPES,
    state,
  }).toString();
  return url.toString();
}

export interface EbayTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

async function requestToken(params: URLSearchParams): Promise<EbayTokenResponse> {
  const { clientId, clientSecret } = requireEbayConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as
    | (EbayTokenResponse & { error?: string; error_description?: string })
    | null;

  if (!response.ok || !body) {
    const detail = body?.error_description ?? body?.error ?? response.statusText;
    throw new Error(`eBay token request failed (${response.status}): ${detail}`);
  }
  return body;
}

export function exchangeCodeForTokens(code: string): Promise<EbayTokenResponse> {
  const { ruName } = requireEbayConfig();
  return requestToken(
    new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: ruName })
  );
}

export interface EbayIdentity {
  userId: string | null;
  username: string | null;
}

export interface EbayAccountStatus {
  sellerRegistrationCompleted: boolean | null;
  sellingLimit: { quantity: number | null; currency: string | null; value: string | null } | null;
}

/**
 * Resolves the seller account the token belongs to. Failure is non-fatal: the
 * tokens are still valid, so a null identity simply means we could not label
 * the integration in the UI.
 */
export async function fetchEbayIdentity(accessToken: string): Promise<EbayIdentity> {
  try {
    const r = await fetch(`${EBAY_API}/identity/v1/user/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!r.ok) return { userId: null, username: null };

    const body = (await r.json().catch(() => null)) as
      | { userId?: string; username?: string }
      | null;

    return {
      userId: body?.userId ?? null,
      username: body?.username ?? null,
    };
  } catch {
    return { userId: null, username: null };
  }
}

export interface EbayCredentials {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

export type OrgId = string | Types.ObjectId;

export async function getEbayToken(organizationId: OrgId): Promise<string> {
  await connectDB();

  const integ = await Integration.findOne({
    organizationId,
    provider: "ebay",
  }).select("+credentialsEncrypted");

  if (!integ || integ.status !== "connected" || !integ.credentialsEncrypted) {
    throw new Error("eBay not connected");
  }

  const creds: EbayCredentials = JSON.parse(decrypt(integ.credentialsEncrypted));

  if (creds.accessExpiresAt > Date.now() + 60_000) return creds.accessToken;

  const t = await requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refreshToken,
      scope: EBAY_SCOPES,
    })
  );

  if (!t.access_token || !t.expires_in) {
    integ.status = "error";
    integ.lastError = "eBay token refresh failed, reconnect needed";
    await integ.save();
    throw new Error("eBay token refresh failed");
  }

  creds.accessToken = t.access_token;
  creds.accessExpiresAt = Date.now() + t.expires_in * 1000;
  integ.credentialsEncrypted = encrypt(JSON.stringify(creds));
  await integ.save();

  return creds.accessToken;
}

export async function ebayFetch(
  organizationId: OrgId,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getEbayToken(organizationId);

  return fetch(`${EBAY_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Makes a lightweight authenticated Seller Account API request. This is used
 * when the integrations page opens to confirm the saved user token works.
 */
export async function getEbayAccountStatus(organizationId: OrgId): Promise<EbayAccountStatus> {
  const response = await ebayFetch(organizationId, "/sell/account/v1/privilege/");
  const payload = (await response.json().catch(() => null)) as
    | {
        sellerRegistrationCompleted?: boolean;
        sellingLimit?: { quantity?: number; amount?: { currency?: string; value?: string } };
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (!response.ok) {
    const detail = payload?.errors?.[0]?.message ?? response.statusText;
    console.error("[ebay] account check response", {
      status: response.status,
      body: payload,
    });
    throw new Error(`eBay account check failed (${response.status}): ${detail}`);
  }

  console.log("[ebay] account check response", {
    status: response.status,
    body: payload,
  });

  return {
    sellerRegistrationCompleted:
      typeof payload?.sellerRegistrationCompleted === "boolean"
        ? payload.sellerRegistrationCompleted
        : null,
    sellingLimit: payload?.sellingLimit
      ? {
          quantity: typeof payload.sellingLimit.quantity === "number" ? payload.sellingLimit.quantity : null,
          currency: payload.sellingLimit.amount?.currency ?? null,
          value: payload.sellingLimit.amount?.value ?? null,
        }
      : null,
  };
}
