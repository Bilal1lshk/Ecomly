import crypto from "crypto";
import type { NextResponse } from "next/server";

const TTL_MS = 10 * 60 * 1000;
const TTL_SECONDS = Math.floor(TTL_MS / 1000);

export const EBAY_STATE_COOKIE = "ebay_oauth_state";

function getSecret(): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) throw new Error("Define ENCRYPTION_KEY or AUTH_SECRET");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function createEbayState(organizationId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ orgId: organizationId, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyEbayState(state: string | null): string | null {
  if (!state) return null;

  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      orgId?: string;
      exp?: number;
    };
    if (!parsed.orgId || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.orgId;
  } catch {
    return null;
  }
}

/**
 * Cookie attributes for the OAuth `state` cookie.
 *
 * `sameSite: "lax"` is required: the callback arrives as a cross-site top-level
 * GET from eBay, and `strict` would withhold the cookie on that navigation.
 * `httpOnly` keeps the value out of reach of any client-side script.
 */
export function ebayStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}

export function attachEbayStateCookie<T extends NextResponse>(res: T, state: string): T {
  res.cookies.set(EBAY_STATE_COOKIE, state, ebayStateCookieOptions());
  return res;
}

export function clearEbayStateCookie<T extends NextResponse>(res: T): T {
  res.cookies.set(EBAY_STATE_COOKIE, "", { ...ebayStateCookieOptions(), maxAge: 0 });
  return res;
}

/**
 * Double-submit check. The `state` returned in the callback query string must
 * match the value we stashed in the HTTP-only cookie (proving the callback was
 * initiated by a request that carried the user's own session), and that value
 * must carry a valid HMAC signature that has not expired.
 *
 * Returns the organisation the flow was started for, or null on any mismatch.
 */
export function verifyEbayStatePair(
  queryState: string | null,
  cookieState: string | null
): string | null {
  if (!queryState || !cookieState) return null;
  if (!constantTimeEquals(queryState, cookieState)) return null;
  return verifyEbayState(cookieState);
}