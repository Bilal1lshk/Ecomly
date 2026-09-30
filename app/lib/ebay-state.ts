import crypto from "crypto";

const TTL_MS = 10 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) throw new Error("Define ENCRYPTION_KEY or AUTH_SECRET");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
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
