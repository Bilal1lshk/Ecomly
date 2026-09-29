import EbayAuthToken, { EbayTokenResponse } from "ebay-oauth-nodejs-client";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Integration } from "@/lib/models/integration"; // adjust if the file name differs
import { encrypt, decrypt } from "@/lib/crypto";

// ---------- Setup ----------
export const ebayAuth = new EbayAuthToken({
  clientId: process.env.EBAY_CLIENT_ID!,
  clientSecret: process.env.EBAY_CLIENT_SECRET!,
  redirectUri: process.env.EBAY_RUNAME!, // RuName, not a URL
});

export const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.account",
].join(" ");

// JSON.stringify'd, then encrypted into Integration.credentialsEncrypted
export interface EbayCredentials {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;  // ms timestamp
  refreshExpiresAt: number; // ms timestamp
}

type OrgId = string | Types.ObjectId;

const parse = (body: string): EbayTokenResponse => JSON.parse(body) as EbayTokenResponse;

// ---------- Token (auto-refresh) ----------
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

  // still valid (60s buffer)
  if (creds.accessExpiresAt > Date.now() + 60_000) return creds.accessToken;

  // expired: refresh
  const t = parse(
    await ebayAuth.getAccessToken("PRODUCTION", creds.refreshToken, EBAY_SCOPES)
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

// ---------- API wrapper ----------
export async function ebayFetch(
  organizationId: OrgId,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getEbayToken(organizationId);

  return fetch(`https://api.ebay.com${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}