import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Order } from "@/lib/models/order";
import type { IFulfilment, IShippingAddress } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { Customer } from "@/lib/models/customer";
import { Location } from "@/lib/models/inventory";
import { InventoryLevel, StockMovement } from "@/lib/models/inventory";
import { Organization } from "@/lib/models/organization";
import { badRequest, notFound, requireOrg, serverError } from "@/lib/api";
import { getSessionUserId } from "@/lib/org";
import { num, optionalStr, round2, str, toObjectId } from "@/lib/validate";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

const PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid", "refunded"] as const;
const PAYMENT_METHODS = ["cod", "card", "bank_transfer", "wallet"] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Statuses that consume stock. A cancelled or returned order puts the units
 * back, so each transition only applies its inventory effect once.
 */
const CONSUMES_STOCK: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];
const RETURNS_STOCK: OrderStatus[] = ["cancelled", "returned"];

export async function GET(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const id = toObjectId(request.nextUrl.searchParams.get("id"));
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 200);

  await connectDB();

  if (id) {
    const order = await Order.findOne({ _id: id, organizationId: org.orgId })
      .populate("customerId", "fullName email phone")
      .lean();

    if (!order) return notFound("Order");

    return Response.json({ order: serializeOrder(order) });
  }

  const orders = await Order.find({ organizationId: org.orgId })
    .populate("customerId", "fullName")
    .sort({ placedAt: -1 })
    .limit(limit)
    .lean();

  return Response.json({ orders: orders.map(serializeOrder) });
}

/**
 * Creates a manual order from the order composer.
 *
 * Totals are always recomputed server-side from the line items; the client's
 * figures are ignored so a tampered or stale total cannot be persisted.
 */
export async function POST(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);

  const rawItems = Array.isArray(body?.items) ? body.items : [];

  if (rawItems.length === 0) {
    return badRequest("Add at least one item to the order", { items: "Required" });
  }

  const customerId = toObjectId(body?.customerId);

  if (
    customerId &&
    !(await Customer.exists({ _id: customerId, organizationId: org.orgId }))
  ) {
    return badRequest("Customer not found", { customerId: "Unknown customer" });
  }

  await connectDB();

  const resolved: {
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    productName: string;
    variantTitle?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    discount: number;
    lineTotal: number;
  }[] = [];

  for (const [index, entry] of rawItems.entries()) {
    const source = (entry ?? {}) as Record<string, unknown>;

    const productId = toObjectId(source.productId);
    const quantity = Math.floor(num(source.quantity, NaN));

    if (!productId) {
      return badRequest(`Item ${index + 1}: choose a product`, {
        [`items.${index}.productId`]: "Required",
      });
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return badRequest(`Item ${index + 1}: quantity must be at least 1`, {
        [`items.${index}.quantity`]: "Invalid",
      });
    }

    const product = await Product.findOne({ _id: productId, organizationId: org.orgId })
      .select("name variants")
      .lean();

    if (!product) {
      return badRequest(`Item ${index + 1}: product not found`, {
        [`items.${index}.productId`]: "Unknown product",
      });
    }

    const variantId = toObjectId(source.variantId);
    const variant =
      product.variants?.find((v) => v._id && String(v._id) === variantId) ??
      product.variants?.[0];

    if (!variant?._id) {
      return badRequest(`Item ${index + 1}: that product has no variants`, {
        [`items.${index}.productId`]: "Cannot be ordered",
      });
    }

    const unitPrice = num(source.unitPrice, NaN);
    const price = Number.isFinite(unitPrice) ? unitPrice : variant.price ?? 0;
    const discount = Math.max(0, num(source.discount, 0));

    resolved.push({
      productId: product._id,
      variantId: variant._id,
      productName: product.name,
      variantTitle: variant.title,
      sku: variant.sku,
      quantity,
      unitPrice: round2(price),
      unitCost: variant.costPrice,
      discount: round2(discount),
      lineTotal: round2(Math.max(0, price * quantity - discount)),
    });
  }

  const subtotal = round2(resolved.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountTotal = round2(resolved.reduce((sum, item) => sum + item.discount, 0));
  const shippingTotal = round2(Math.max(0, num(body?.shippingTotal, 0)));
  const taxTotal = round2(Math.max(0, num(body?.taxTotal, 0)));
  const total = round2(subtotal + shippingTotal + taxTotal);

  const orgDoc = await Organization.findById(org.orgId).select("currency orderPrefix").lean();
  const currency = optionalStr(body?.currency)?.toUpperCase() ?? orgDoc?.currency ?? "PKR";

  const status = (str(body?.status) || "pending") as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) {
    return badRequest("Unknown order status", { status: "Invalid" });
  }

  const paymentStatus = (str(body?.paymentStatus) || "unpaid") as
    | (typeof PAYMENT_STATUSES)[number];
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    return badRequest("Unknown payment status", { paymentStatus: "Invalid" });
  }

  const paymentMethod = (str(body?.paymentMethod) || "cod") as
    | (typeof PAYMENT_METHODS)[number];
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return badRequest("Unknown payment method", { paymentMethod: "Invalid" });
  }

  const orderNumber = await nextOrderNumber(org.orgId, orgDoc?.orderPrefix);
  const userId = await getSessionUserId();

  try {
    const order = await Order.create({
      organizationId: org.orgId,
      orderNumber,
      customerId: customerId ? new Types.ObjectId(customerId) : undefined,
      status,
      paymentStatus,
      paymentMethod,
      channel: "manual",
      items: resolved,
      subtotal,
      discountTotal,
      shippingTotal,
      taxTotal,
      total,
      currency,
      shippingAddress: {
        name: optionalStr(body?.shippingAddress?.name),
        phone: optionalStr(body?.shippingAddress?.phone),
        line1: optionalStr(body?.shippingAddress?.line1),
        line2: optionalStr(body?.shippingAddress?.line2),
        city: optionalStr(body?.shippingAddress?.city),
        state: optionalStr(body?.shippingAddress?.state),
        postalCode: optionalStr(body?.shippingAddress?.postalCode),
        country: (optionalStr(body?.shippingAddress?.country) ?? "PK").toUpperCase(),
      },
      notes: optionalStr(body?.notes),
      placedAt: new Date(),
      paidAt: paymentStatus === "paid" ? new Date() : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    // A manually created order that is already confirmed should hold stock the
    // same way a synced one does, otherwise the two paths diverge.
    if (CONSUMES_STOCK.includes(status)) {
      await applyStockEffect(org.orgId, resolved, "out", order._id);
    }

    return Response.json({ order: serializeOrder(order.toObject()) }, { status: 201 });
  } catch (error) {
    return serverError("create order", error);
  }
}

export async function PATCH(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Order id is required");

  const status = str(body?.status) as OrderStatus;

  if (!ORDER_STATUSES.includes(status)) {
    return badRequest("Unknown order status", { status: "Invalid" });
  }

  await connectDB();

  const order = await Order.findOne({ _id: id, organizationId: org.orgId }).lean();
  if (!order) return notFound("Order");

  const previous = (order.status ?? "pending") as OrderStatus;
  const update: Record<string, unknown> = { status };

  if (status === "shipped" && !order.fulfilment?.shippedAt) {
    update.fulfilment = {
      ...(order.fulfilment ?? {}),
      courierName: optionalStr(body?.courierName) ?? order.fulfilment?.courierName,
      trackingNumber: optionalStr(body?.trackingNumber) ?? order.fulfilment?.trackingNumber,
      shippedAt: new Date(),
    };
  }

  if (status === "delivered") {
    update.fulfilment = { ...(order.fulfilment ?? {}), deliveredAt: new Date() };
    update.paidAt = order.paidAt ?? new Date();
  }

  if (status === "cancelled") update.cancelledAt = new Date();

  if (body?.paymentStatus !== undefined) {
    const paymentStatus = str(body.paymentStatus) as (typeof PAYMENT_STATUSES)[number];
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return badRequest("Unknown payment status", { paymentStatus: "Invalid" });
    }
    update.paymentStatus = paymentStatus;
    update.paidAt = paymentStatus === "paid" ? new Date() : order.paidAt;
  }

  if (body?.notes !== undefined) update.notes = optionalStr(body.notes);

  try {
    await Order.updateOne({ _id: id, organizationId: org.orgId }, { $set: update });

    const items = (order.items ?? []).filter(
      (item) => item.variantId && item.productId && item.quantity
    );

    // Stock moves exactly once per transition: entering a consuming status draws
    // stock down, entering a reversing status puts it back. Moving between two
    // statuses of the same kind (confirmed -> shipped) leaves stock alone.
    if (previous !== status) {
      if (RETURNS_STOCK.includes(status) && CONSUMES_STOCK.includes(previous)) {
        await applyStockEffect(org.orgId, items, "in", order._id);
      } else if (
        CONSUMES_STOCK.includes(status) &&
        (previous === "pending" || RETURNS_STOCK.includes(previous))
      ) {
        await applyStockEffect(org.orgId, items, "out", order._id);
      }
    }
  } catch (error) {
    return serverError("update order", error);
  }

  return Response.json({ ok: true, id, status });
}

export async function DELETE(request: NextRequest) {
  const org = await requireOrg();
  if (!org.ok) return org.response;

  const body = await request.json().catch(() => null);
  const id = toObjectId(body?.id);

  if (!id) return badRequest("Order id is required");

  await connectDB();

  const order = await Order.findOne({ _id: id, organizationId: org.orgId })
    .select("status external")
    .lean();

  if (!order) return notFound("Order");

  if (order.external?.externalId) {
    return badRequest(
      "This order was synced from a marketplace. Cancel it instead so the channel stays in step."
    );
  }

  if ((order.status ?? "pending") !== "pending") {
    return badRequest("Only a pending order can be deleted. Cancel it instead.");
  }

  await Order.deleteOne({ _id: id, organizationId: org.orgId });

  return Response.json({ ok: true, id });
}

/**
 * Atomically reserves the next order number for the org.
 *
 * The Order document carries a unique (organizationId, orderNumber) index, so a
 * find-then-increment would race under concurrent order creation. findOneAndUpdate
 * with $inc on the counter makes the sequence allocation atomic.
 */
async function nextOrderNumber(orgId: string, prefix?: string): Promise<string> {
  const { Counter } = await import("@/lib/models/order");

  const counter = await Counter.findOneAndUpdate(
    { organizationId: orgId, key: "order" },
    {
      $inc: { seq: 1 },
      $setOnInsert: { organizationId: orgId, key: "order" },
    },
    { upsert: true, new: true }
  ).lean();

  const base = prefix?.trim() ? prefix.trim() : "ORD";
  const seq = counter?.seq ?? 1;

  return `${base}-${String(seq).padStart(5, "0")}`;
}

interface StockLine {
  productId?: Types.ObjectId;
  variantId?: Types.ObjectId;
  quantity?: number;
}

/**
 * Applies (or reverses) the stock effect of an order's lines.
 *
 * Uses the default/first active location, matching where a seller's manual
 * adjustments land, and records a StockMovement so the inventory page's history
 * explains itself instead of showing a silent drop.
 */
async function applyStockEffect(
  orgId: string,
  items: StockLine[],
  direction: "in" | "out",
  orderId: Types.ObjectId
): Promise<void> {
  const location = await Location.findOne({ organizationId: orgId, isActive: true })
    .sort({ isDefault: -1 })
    .select("_id")
    .lean();

  if (!location) return;

  for (const item of items) {
    if (!item.productId || !item.variantId) continue;

    const magnitude = Math.max(0, Math.floor(item.quantity ?? 0));
    if (magnitude === 0) continue;

    const change = direction === "out" ? -magnitude : magnitude;

    await InventoryLevel.updateOne(
      {
        organizationId: orgId,
        productId: item.productId,
        variantId: item.variantId,
        locationId: location._id,
      },
      { $inc: { quantity: change }, $setOnInsert: { reserved: 0 } },
      { upsert: true }
    );

    await StockMovement.create({
      organizationId: orgId,
      productId: item.productId,
      variantId: item.variantId,
      locationId: location._id,
      type: direction === "out" ? "sale" : "return",
      quantityChange: change,
      referenceType: "order",
      referenceId: orderId,
    });
  }
}

/**
 * Structural view of a lean Order, with the refs left as whatever `.lean()`
 * produced so a populated `customerId` still satisfies it.
 */
interface SerializedOrder {
  _id: unknown;
  orderNumber: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  channel?: string;
  customerId?: unknown;
  items?: {
    productName: string;
    variantTitle?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal?: number;
  discountTotal?: number;
  shippingTotal?: number;
  taxTotal?: number;
  total?: number;
  currency?: string;
  shippingAddress?: IShippingAddress;
  fulfilment?: IFulfilment;
  notes?: string;
  placedAt?: Date;
  createdAt?: Date;
  external?: { externalId?: string };
}

function serializeOrder(order: SerializedOrder) {
  const customer = order.customerId as unknown as
    | { _id?: unknown; fullName?: string }
    | undefined;

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status ?? "pending",
    paymentStatus: order.paymentStatus ?? "unpaid",
    paymentMethod: order.paymentMethod ?? "cod",
    channel: order.channel ?? "manual",
    customerId: customer?._id ? String(customer._id) : "",
    customerName: customer?.fullName ?? "",
    items: (order.items ?? []).map((item) => ({
      productName: item.productName,
      variantTitle: item.variantTitle ?? "",
      sku: item.sku ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal ?? 0,
    discountTotal: order.discountTotal ?? 0,
    shippingTotal: order.shippingTotal ?? 0,
    taxTotal: order.taxTotal ?? 0,
    total: order.total ?? 0,
    currency: order.currency ?? "PKR",
    shippingAddress: order.shippingAddress ?? {},
    courierName: (order.fulfilment?.courierName as string) ?? "",
    trackingNumber: (order.fulfilment?.trackingNumber as string) ?? "",
    notes: order.notes ?? "",
    placedAt: order.placedAt ?? order.createdAt,
    imported: Boolean(order.external?.externalId),
  };
}