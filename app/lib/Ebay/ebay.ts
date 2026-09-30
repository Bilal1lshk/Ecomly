import EbayAuthToken, { EbayTokenResponse } from "ebay-oauth-nodejs-client";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration";
import { encrypt, decrypt } from "@/lib/crypto";
import { EBAY_API, EBAY_ENV, EBAY_CLIENT_ID, EBAY_RUNAME } from "@/lib/ebay";

export const EBAY_OAUTH_ENV = EBAY_ENV === "production" ? "PRODUCTION" : "SANDBOX";

const SCOPE_BASE =
  EBAY_ENV === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

export const EBAY_IDENTITY_SCOPE = `${SCOPE_BASE}/oauth/api_scope`;

export const EBAY_SCOPES = [
  EBAY_IDENTITY_SCOPE,
  `${SCOPE_BASE}/oauth/api_scope/sell.inventory`,
  `${SCOPE_BASE}/oauth/api_scope/sell.fulfillment`,
  `${SCOPE_BASE}/oauth/api_scope/sell.account`,
].join(" ");

export function getEbayRedirectUri(): string {
  const explicit = process.env.EBAY_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base) throw new Error("Define EBAY_REDIRECT_URI or NEXT_PUBLIC_APP_URL");
  return `${base.replace(/\/+$/, "")}/api/ebay/callback`;
}

let client: EbayAuthToken | null = null;

export function getEbayClient(): EbayAuthToken {
  if (client) return client;

  if (!EBAY_CLIENT_ID) throw new Error("Missing EBAY_CLIENT_ID");
  if (!EBAY_RUNAME) throw new Error("Missing EBAY_RUNAME");
  if (!process.env.EBAY_CLIENT_SECRET) throw new Error("Missing EBAY_CLIENT_SECRET");

  client = new EbayAuthToken({
    clientId: EBAY_CLIENT_ID,
    clientSecret: process.env.EBAY_CLIENT_SECRET,
    env: EBAY_OAUTH_ENV,
    redirectUri: getEbayRedirectUri(),
  });

  return client;
}

export function generateConsentUrl(state: string): string {
  return getEbayClient().generateUserAuthorizationUrl(EBAY_OAUTH_ENV, EBAY_SCOPES.split(" "), {
    state,
  });
}

export async function exchangeCodeForTokens(code: string): Promise<EbayTokenResponse> {
  const raw = await getEbayClient().exchangeCodeForAccessToken(EBAY_OAUTH_ENV, code);
  return JSON.parse(raw) as EbayTokenResponse;
}

export async function fetchEbayUsername(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch(`${EBAY_API}/identity/v1/user/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const body = (await r.json().catch(() => null)) as { username?: string } | null;
    return body?.username ?? null;
  } catch {
    return null;
  }
}

export interface EbayCredentials {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

export type OrgId = string | Types.ObjectId;

const parse = (body: string): EbayTokenResponse => JSON.parse(body) as EbayTokenResponse;

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

  const t = parse(
    await getEbayClient().getAccessToken(EBAY_OAUTH_ENV, creds.refreshToken, EBAY_SCOPES.split(" "))
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
