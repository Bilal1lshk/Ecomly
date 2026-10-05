import { Types } from "mongoose";
import { connectDB } from "@/lib/database/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { InventoryLevel, StockMovement } from "@/lib/models/inventory";
import { Integration } from "@/lib/models/integration";

export interface DashboardStats {
  currency: string;
  revenue30d: number;
  orders30d: number;
  openOrders: number;
  fulfilled30d: number;
  productCount: number;
  activeProductCount: number;
  importedProductCount: number;
  unitsOnHand: number;
  lowStockCount: number;
  movements30d: number;
  ebayConnected: boolean;
  ebayLastSyncedAt: Date | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
}

/**
 * A seller can hold stock in several currencies; the dashboard reports one
 * figure, so the dominant currency among recent orders wins and the amount is
 * labelled with it rather than silently assumed.
 */
function dominantCurrency(counts: Map<string, number>): string {
  let best = "PKR";
  let bestCount = 0;
  for (const [currency, count] of counts) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Single source of truth for the overview and the per-section pages.
 *
 * A caller with no organisation resolves to zeroes rather than throwing, so the
 * dashboard still renders for a brand new signup.
 */
export async function getDashboardStats(orgId: string | null): Promise<DashboardStats> {
  const empty: DashboardStats = {
    currency: "PKR",
    revenue30d: 0,
    orders30d: 0,
    openOrders: 0,
    fulfilled30d: 0,
    productCount: 0,
    activeProductCount: 0,
    importedProductCount: 0,
    unitsOnHand: 0,
    lowStockCount: 0,
    movements30d: 0,
    ebayConnected: false,
    ebayLastSyncedAt: null,
  };

  if (!orgId || !Types.ObjectId.isValid(orgId)) return empty;

  await connectDB();
  const oid = new Types.ObjectId(orgId);
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [
    recentOrders,
    openOrders,
    fulfilled30d,
    productCounts,
    levels,
    reorderLevels,
    movements30d,
    integration,
  ] = await Promise.all([
    Order.find({ organizationId: oid, placedAt: { $gte: since } })
      .select("total currency")
      .lean(),
    Order.countDocuments({
      organizationId: oid,
      status: { $in: ["pending", "confirmed", "processing"] },
    }),
    Order.countDocuments({
      organizationId: oid,
      status: { $in: ["shipped", "delivered"] },
      placedAt: { $gte: since },
    }),
    Product.aggregate<{ _id: null; total: number; active: number; imported: number }>([
      { $match: { organizationId: oid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          imported: {
            $sum: {
              $cond: [{ $ne: [{ $type: "$external.externalId" }, "missing"] }, 1, 0],
            },
          },
        },
      },
    ]),
    InventoryLevel.find({ organizationId: oid }).select("variantId quantity").lean(),
    Product.find({ organizationId: oid }).select("variants._id variants.reorderLevel").lean(),
    StockMovement.countDocuments({ organizationId: oid, createdAt: { $gte: since } }),
    Integration.findOne({ organizationId: oid, provider: "ebay" })
      .select("status lastSyncedAt")
      .lean(),
  ]);

  const currencyCounts = new Map<string, number>();
  for (const order of recentOrders) {
    if (order.currency) {
      currencyCounts.set(order.currency, (currencyCounts.get(order.currency) ?? 0) + 1);
    }
  }

  const reorderByVariant = new Map<string, number>();
  for (const product of reorderLevels) {
    for (const variant of product.variants ?? []) {
      if (variant?._id) {
        reorderByVariant.set(String(variant._id), variant.reorderLevel ?? 5);
      }
    }
  }

  let unitsOnHand = 0;
  let lowStockCount = 0;
  for (const level of levels) {
    const quantity = level.quantity ?? 0;
    unitsOnHand += quantity;
    if (quantity > 0 && quantity <= (reorderByVariant.get(String(level.variantId)) ?? 5)) {
      lowStockCount += 1;
    }
  }

  return {
    currency: dominantCurrency(currencyCounts),
    revenue30d: round(recentOrders.reduce((sum, order) => sum + (order.total ?? 0), 0)),
    orders30d: recentOrders.length,
    openOrders,
    fulfilled30d,
    productCount: productCounts[0]?.total ?? 0,
    activeProductCount: productCounts[0]?.active ?? 0,
    importedProductCount: productCounts[0]?.imported ?? 0,
    unitsOnHand,
    lowStockCount,
    movements30d,
    ebayConnected: integration?.status === "connected",
    ebayLastSyncedAt: integration?.lastSyncedAt ?? null,
  };
}

export { money };

export interface StockRow {
  id: string;
  name: string;
  sku?: string;
  reorderLevel: number;
  quantity: number;
  reserved: number;
}

export interface MovementRow {
  id: string;
  name: string;
  type: string;
  quantityChange: number;
  createdAt?: Date;
}

export interface InventoryOverview {
  rows: StockRow[];
  movements: MovementRow[];
}

/**
 * Stock levels and recent movements for the inventory page.
 *
 * Lives here rather than in the component because the cutoff window is derived
 * from the clock, which is not safe to evaluate during render.
 */
export async function getInventoryOverview(
  orgId: string | null
): Promise<InventoryOverview> {
  const empty: InventoryOverview = { rows: [], movements: [] };

  if (!orgId || !Types.ObjectId.isValid(orgId)) return empty;

  await connectDB();
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [levels, movements] = await Promise.all([
    InventoryLevel.find({ organizationId: orgId })
      .populate("productId", "name variants")
      .sort({ quantity: 1 })
      .limit(50)
      .lean(),
    StockMovement.find({ organizationId: orgId, createdAt: { $gte: since } })
      .populate("productId", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const rows: StockRow[] = levels.map((level) => {
    const product = level.productId as unknown as
      | {
          name?: string;
          variants?: { _id?: unknown; sku?: string; reorderLevel?: number }[];
        }
      | undefined;

    const variant =
      product?.variants?.find((v) => String(v._id) === String(level.variantId)) ??
      product?.variants?.[0];

    return {
      id: String(level._id),
      name: product?.name ?? "Unknown product",
      sku: variant?.sku,
      reorderLevel: variant?.reorderLevel ?? 5,
      quantity: level.quantity ?? 0,
      reserved: level.reserved ?? 0,
    };
  });

  const movementRows: MovementRow[] = movements.map((movement) => {
    const product = movement.productId as unknown as { name?: string } | undefined;
    return {
      id: String(movement._id),
      name: product?.name ?? "Unknown product",
      type: movement.type,
      quantityChange: movement.quantityChange,
      createdAt: movement.createdAt,
    };
  });

  return { rows, movements: movementRows };
}