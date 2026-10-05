export type EbayEnv = "sandbox" | "production";

interface EbayEndpoints {
  api: string;
  token: string;
}

const ENDPOINTS: Record<EbayEnv, EbayEndpoints> = {
  sandbox: {
    api: "https://api.sandbox.ebay.com",
    token: "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
  },
  production: {
    api: "https://api.ebay.com",
    token: "https://api.ebay.com/identity/v1/oauth2/token",
  },
};

const rawEbayEnv = (process.env.EBAY_ENVIRONMENT ?? process.env.EBAY_ENV ?? "")
  .trim()
  .toLowerCase();

export const EBAY_ENV: EbayEnv = /^(prod|prd|production|live)/.test(rawEbayEnv)
  ? "production"
  : "sandbox";

export const EBAY_API = ENDPOINTS[EBAY_ENV].api;

export const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;

export const EBAY_CLIENT_SECRET =
  process.env.EBAY_CLIENT_SECRET ??
  process.env.EBAY_CERT_ID ??
  process.env.EBAY_CLIENT_SECRET_CERT ??
  process.env.Cert_ID;

export const EBAY_RUNAME = process.env.EBAY_RUNAME ?? process.env.RUN;

export interface EbayToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface EbayTokenError {
  error?: string;
  error_description?: string;
}

let cached: { env: EbayEnv; token: EbayToken; expiresAt: number } | null = null;

export const ebayAuth = {
  async getApplicationToken(env: EbayEnv = EBAY_ENV): Promise<EbayToken> {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      throw new Error("Missing EBAY_CLIENT_ID or eBay cert id");
    }

    if (cached && cached.env === env && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const endpoints = ENDPOINTS[env];
    const basic = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString("base64");

    const res = await fetch(endpoints.token, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: `${endpoints.api}/oauth/api_scope`,
      }),
      cache: "no-store",
    });

    const data = (await res
      .json()
      .catch(() => null)) as (EbayToken & EbayTokenError) | null;

    if (!res.ok || !data?.access_token) {
      const detail = data?.error_description || data?.error || res.statusText || "unknown";
      throw new Error(`eBay token request failed (${res.status}): ${detail}`);
    }

    cached = {
      env,
      token: data,
      expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000 - 60_000,
    };

    return data;
  },
};