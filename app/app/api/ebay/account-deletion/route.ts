import { createHash, createVerify } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { ebayAuth, EBAY_API, EBAY_ENV } from "@/lib/ebay";
import { Integration, IntegrationSyncLog } from "@/lib/models/integration";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { InventoryLevel, StockMovement } from "@/lib/models/inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const EXPECTED_TOPIC = "MARKETPLACE_ACCOUNT_DELETION";
const PUBLIC_KEY_CACHE_TTL_MS = 60 * 60 * 1000;
const publicKeyCache = new Map<string, { key: string; expiresAt: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function logOutcome(notificationId: string, outcome: string): void {
  console.info("[ebay] account deletion notification", { notificationId, outcome });
}

function decodeSignatureHeader(header: string): { keyId: string; signature: string } | null {
  if (header.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(header)) return null;

  const decoded = Buffer.from(header, "base64");
  if (decoded.toString("base64").replace(/=+$/, "") !== header.replace(/=+$/, "")) return null;

  let value: unknown;
  try {
    value = JSON.parse(decoded.toString("utf8"));
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    !isNonEmptyString(value.kid) ||
    value.kid.length > 256 ||
    !isNonEmptyString(value.signature) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value.signature)
  ) {
    return null;
  }

  return { keyId: value.kid, signature: value.signature };
}

function publicKeyPem(key: string): string {
  const body = key
    .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body || !/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new Error("eBay returned an invalid public key");
  }

  const lines = body.match(/.{1,64}/g);
  if (!lines) throw new Error("eBay returned an invalid public key");

  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

async function getEbayPublicKey(keyId: string): Promise<string> {
  const cached = publicKeyCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) return cached.key;

  const token = await ebayAuth.getApplicationToken(EBAY_ENV);
  const response = await fetch(
    `${EBAY_API}/commerce/notification/v1/public_key/${encodeURIComponent(keyId)}`,
    {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!response.ok) throw new Error("eBay public key request failed");

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !isNonEmptyString(payload.key)) {
    throw new Error("eBay returned an invalid public key response");
  }

  const key = publicKeyPem(payload.key);
  if (publicKeyCache.size >= 100) {
    const oldestKey = publicKeyCache.keys().next().value;
    if (oldestKey) publicKeyCache.delete(oldestKey);
  }
  publicKeyCache.set(keyId, { key, expiresAt: Date.now() + PUBLIC_KEY_CACHE_TTL_MS });
  return key;
}

async function verifyEbaySignature(payload: unknown, header: string | null): Promise<boolean> {
  if (!header) return false;
  const parsed = decodeSignatureHeader(header);
  if (!parsed) return false;

  const publicKey = await getEbayPublicKey(parsed.keyId);
  const verifier = createVerify("ssl3-sha1");
  verifier.update(JSON.stringify(payload));
  verifier.end();

  try {
    return verifier.verify(publicKey, Buffer.from(parsed.signature, "base64"));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");
  if (!challengeCode) {
    return NextResponse.json({ error: "missing challenge_code" }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT;
  let endpointIsValid = false;
  try {
    const parsedEndpoint = new URL(endpoint ?? "");
    endpointIsValid =
      parsedEndpoint.protocol === "https:" &&
      !parsedEndpoint.pathname.endsWith("/") &&
      parsedEndpoint.search.length === 0 &&
      parsedEndpoint.hash.length === 0;
  } catch {
    endpointIsValid = false;
  }
  if (
    !verificationToken ||
    !/^[A-Za-z0-9_-]{32,80}$/.test(verificationToken) ||
    !endpointIsValid ||
    !endpoint
  ) {
    console.error(
      "[ebay] account deletion challenge configuration is missing or invalid; set a 32-80 character EBAY_VERIFICATION_TOKEN using only letters, numbers, underscores, or hyphens, and an HTTPS EBAY_DELETION_ENDPOINT without a trailing slash"
    );
    return NextResponse.json({ error: "challenge validation is not configured" }, { status: 500 });
  }

  const challengeResponse = createHash("sha256")
    .update(challengeCode + verificationToken + endpoint)
    .digest("hex");

  return NextResponse.json({ challengeResponse });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body) || !isRecord(body.metadata) || !isRecord(body.notification)) {
    return NextResponse.json({ error: "invalid notification body" }, { status: 400 });
  }

  const { metadata, notification } = body;
  const data = notification.data;
  if (
    metadata.topic !== EXPECTED_TOPIC ||
    !isNonEmptyString(notification.notificationId) ||
    notification.notificationId.length > 200 ||
    !isRecord(data) ||
    !isNonEmptyString(data.userId) ||
    !isNonEmptyString(data.username) ||
    !isNonEmptyString(data.eiasToken)
  ) {
    return NextResponse.json({ error: "invalid account deletion notification" }, { status: 400 });
  }

  const notificationId = notification.notificationId;
  const userId = data.userId;
  const username = data.username;

  try {
    const isValid = await verifyEbaySignature(body, request.headers.get("x-ebay-signature"));
    if (!isValid) {
      logOutcome(notificationId, "invalid_signature");
      return new NextResponse(null, { status: 412 });
    }
  } catch {
    logOutcome(notificationId, "signature_verification_unavailable");
    return NextResponse.json({ error: "notification verification unavailable" }, { status: 500 });
  }

  after(async () => {
    try {
      await processAccountDeletion(notificationId, userId, username);
    } catch {
      logOutcome(notificationId, "deletion_failed");
    }
  });

  return new NextResponse(null, { status: 202 });
}

async function processAccountDeletion(
  notificationId: string,
  userId: string,
  username: string
): Promise<void> {
  const { connectDB } = await import("@/lib/database/db");
  await connectDB();

  const integrations = await Integration.find({
    provider: "ebay",
    $or: [
      { "settings.ebayUserId": userId },
      {
        "settings.ebayUserId": { $in: [null, ""] },
        "settings.ebayUsername": {
          $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      },
    ],
  })
    .select("_id")
    .lean();
  const integrationIds = integrations.map((integration) => integration._id);

  const identifierCandidates = [...new Set([username.toLowerCase(), userId.toLowerCase()])];
  const affectedBuyerOrders = await Order.updateMany(
    { channel: "ebay", buyerEbayUsername: { $in: identifierCandidates } },
    { $unset: { buyerEbayUsername: "", shippingAddress: "" } }
  );

  let deletedSellerRecords = 0;
  if (integrationIds.length > 0) {
    const products = await Product.find({ "external.integrationId": { $in: integrationIds } })
      .select("_id")
      .lean();
    const productIds = products.map((product) => product._id);

    const [orders, logs] = await Promise.all([
      Order.deleteMany({ "external.integrationId": { $in: integrationIds } }),
      IntegrationSyncLog.deleteMany({ integrationId: { $in: integrationIds } }),
    ]);
    deletedSellerRecords += orders.deletedCount + logs.deletedCount;

    if (productIds.length > 0) {
      const [levels, movements, deletedProducts] = await Promise.all([
        InventoryLevel.deleteMany({ productId: { $in: productIds } }),
        StockMovement.deleteMany({ productId: { $in: productIds } }),
        Product.deleteMany({ _id: { $in: productIds } }),
      ]);
      deletedSellerRecords +=
        levels.deletedCount + movements.deletedCount + deletedProducts.deletedCount;
    }

    const deletedIntegrations = await Integration.deleteMany({ _id: { $in: integrationIds } });
    deletedSellerRecords += deletedIntegrations.deletedCount;
  }

  logOutcome(
    notificationId,
    deletedSellerRecords + affectedBuyerOrders.modifiedCount > 0
      ? "deleted_or_anonymized"
      : "no_matching_user_data"
  );
}
