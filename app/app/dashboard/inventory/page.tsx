import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Product } from "@/lib/models/product";
import { InventoryLevel, Location, StockMovement } from "@/lib/models/inventory";
import { PageHeader } from "../components/ui";
import {
  InventoryManager,
  type MovementRow,
  type StockLocation,
  type StockRow,
} from "./InventoryManager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;
const MOVEMENT_LIMIT = 20;

interface PopulatedProduct {
  _id?: unknown;
  name?: string;
  images?: { url?: string }[];
  variants?: {
    _id?: unknown;
    sku?: string;
    title?: string;
    reorderLevel?: number;
    price?: number;
  }[];
}

interface PopulatedLocation {
  _id?: unknown;
  name?: string;
}

/**
 * Manual inventory management.
 *
 * Products are fetched alongside the InventoryLevel rows so a variant that has
 * never been given a quantity still appears with 0 in stock and can be adjusted
 * without a separate "create stock" step.
 */
export default async function InventoryPage() {
  const orgId = await getOrgId();

  if (!orgId) {
    return (
      <div>
        <PageHeader
          title="Inventory"
          description="Stock levels, low-stock alerts and a full movement history per variant."
        />
      </div>
    );
  }

  await connectDB();

  const [levels, products, locations, movements] = await Promise.all([
    InventoryLevel.find({ organizationId: orgId })
      .populate("productId", "name variants images")
      .populate("locationId", "name")
      .sort({ quantity: 1 })
      .limit(PAGE_SIZE)
      .lean(),
    Product.find({ organizationId: orgId })
      .select("name variants images")
      .limit(PAGE_SIZE)
      .lean(),
    Location.find({ organizationId: orgId }).sort({ name: 1 }).lean(),
    StockMovement.find({ organizationId: orgId })
      .populate("productId", "name")
      .sort({ createdAt: -1 })
      .limit(MOVEMENT_LIMIT)
      .lean(),
  ]);

  const rowMap = new Map<string, StockRow>();

  for (const level of levels) {
    const productRef = level.productId as unknown;
    const product = productRef as PopulatedProduct;
    const locationRef = level.locationId as unknown;
    const location = locationRef as PopulatedLocation;

    const variant =
      product?.variants?.find(
        (candidate) => candidate._id && String(candidate._id) === String(level.variantId)
      ) ?? product?.variants?.[0];

    if (!variant?._id) continue;

    rowMap.set(String(variant._id), {
      id: String(level._id),
      variantId: String(variant._id),
      productId: String(product?._id ?? productRef),
      productName: product?.name ?? "Unknown product",
      sku: variant.sku ?? "",
      variantTitle: variant.title ?? "",
      reorderLevel: variant.reorderLevel ?? 5,
      quantity: level.quantity ?? 0,
      reserved: level.reserved ?? 0,
      locationId: String(location?._id ?? locationRef),
      locationName: location?.name ?? "Unassigned",
      price: variant.price ?? 0,
      imageUrl: product?.images?.[0]?.url ?? "",
    });
  }

  const defaultLocation = locations.find((location) => location.isDefault) ?? locations[0];

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!variant?._id) continue;
      if (rowMap.has(String(variant._id))) continue;

      rowMap.set(String(variant._id), {
        id: "",
        variantId: String(variant._id),
        productId: String(product._id),
        productName: product.name,
        sku: variant.sku ?? "",
        variantTitle: variant.title ?? "",
        reorderLevel: variant.reorderLevel ?? 5,
        quantity: 0,
        reserved: 0,
        locationId: defaultLocation ? String(defaultLocation._id) : "",
        locationName: defaultLocation?.name ?? "No location yet",
        price: variant.price ?? 0,
        imageUrl: product.images?.[0]?.url ?? "",
      });
    }
  }

  const rows = [...rowMap.values()].sort((a, b) => a.quantity - b.quantity);

  const stockLocations: StockLocation[] = locations.map((location) => ({
    id: String(location._id),
    name: location.name,
    address: location.address ?? "",
    city: location.city ?? "",
    isDefault: location.isDefault === true,
    isActive: location.isActive !== false,
  }));

  const movementRows: MovementRow[] = movements.map((movement) => ({
    id: String(movement._id),
    productName: (movement.productId as unknown as { name?: string })?.name ?? "Unknown product",
    type: movement.type,
    quantityChange: movement.quantityChange,
    note: movement.note ?? "",
    createdAt: movement.createdAt,
  }));

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, low-stock alerts and a full movement history per variant."
      />

      <InventoryManager initial={rows} locations={stockLocations} movements={movementRows} />
    </div>
  );
}