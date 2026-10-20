import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Integration, IntegrationSyncLog } from "@/lib/models/integration";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { InventoryLevel, StockMovement } from "@/lib/models/inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPECTED_TOPIC = "MARKETPLACE_ACCOUNT_DELETION";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function logOutcome(notificationId: string, outcome: string): void {
  console.info("[ebay] account deletion notification", { notificationId, outcome });
}

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");
  if (!challengeCode) {
    return NextResponse.json({ error: "missing challenge_code" }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT;
  if (
    !verificationToken ||
    verificationToken.length < 32 ||
    verificationToken.length > 80 ||
    !endpoint
  ) {
    console.error(
      "[ebay] account deletion challenge configuration is missing or invalid; set EBAY_VERIFICATION_TOKEN (32-80 characters) and EBAY_DELETION_ENDPOINT"
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

  try {
    // TODO: Verify X-EBAY-SIGNATURE using eBay's public key.
    const { connectDB } = await import("@/lib/database/db");
    await connectDB();

    const integrations = await Integration.find({
      provider: "ebay",
      $or: [
        { "settings.ebayUserId": data.userId },
        {
          "settings.ebayUsername": {
            $regex: `^${escapeRegExp(data.username)}$`,
            $options: "i",
          },
        },
      ],
    })
      .select("_id")
      .lean();

    if (integrations.length === 0) {
      logOutcome(notificationId, "no_matching_account");
      return NextResponse.json({ ok: true });
    }

    const integrationIds = integrations.map((integration) => integration._id);
    const products = await Product.find({
      "external.integrationId": { $in: integrationIds },
    })
      .select("_id")
      .lean();
    const productIds = products.map((product) => product._id);

    await Order.deleteMany({ "external.integrationId": { $in: integrationIds } });
    if (productIds.length > 0) {
      await InventoryLevel.deleteMany({ productId: { $in: productIds } });
      await StockMovement.deleteMany({ productId: { $in: productIds } });
      await Product.deleteMany({ _id: { $in: productIds } });
    }
    await IntegrationSyncLog.deleteMany({ integrationId: { $in: integrationIds } });
    await Integration.deleteMany({ _id: { $in: integrationIds } });

    logOutcome(notificationId, "deleted");
    return NextResponse.json({ ok: true });
  } catch {
    logOutcome(notificationId, "failed");
    return NextResponse.json({ error: "account deletion processing failed" }, { status: 500 });
  }
}
