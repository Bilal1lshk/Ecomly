import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Order } from "@/lib/models/order";
import { Product } from "@/lib/models/product";
import { Customer } from "@/lib/models/customer";
import { PageHeader } from "../components/ui";
import {
  OrdersManager,
  type CustomerOption,
  type OrderRow,
  type ProductOption,
} from "./OrdersManager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function OrdersPage() {
  const orgId = await getOrgId();

  if (!orgId) {
    return (
      <div>
        <PageHeader
          title="Orders"
          description="Every order in one place. Confirming an order automatically reduces inventory."
        />
      </div>
    );
  }

  await connectDB();

  const [rows, customers, products] = await Promise.all([
    Order.find({ organizationId: orgId })
      .populate("customerId", "fullName")
      .sort({ placedAt: -1 })
      .limit(PAGE_SIZE)
      .lean(),
    Customer.find({ organizationId: orgId })
      .select("fullName addresses")
      .sort({ fullName: 1 })
      .limit(500)
      .lean(),
    Product.find({ organizationId: orgId })
      .select("name variants")
      .sort({ name: 1 })
      .limit(500)
      .lean(),
  ]);

  const orders: OrderRow[] = rows.map((order) => {
    const customerRef = order.customerId as unknown;
    const customer = customerRef as { _id?: unknown; fullName?: string } | undefined;

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
      shippingAddress: (order.shippingAddress ?? {}) as Record<string, string | undefined>,
      courierName: order.fulfilment?.courierName ?? "",
      trackingNumber: order.fulfilment?.trackingNumber ?? "",
      notes: order.notes ?? "",
      placedAt: order.placedAt ?? order.createdAt,
      imported: Boolean(order.external?.externalId),
    };
  });

  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    id: String(customer._id),
    fullName: customer.fullName,
    addresses: (customer.addresses ?? []).map((address) => ({
      label: address.label ?? "",
      phone: (address as { phone?: string }).phone ?? "",
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state ?? "",
      postalCode: address.postalCode ?? "",
      country: address.country ?? "PK",
      isDefault: address.isDefault === true,
    })),
  }));

  const productOptions: ProductOption[] = products.map((product) => ({
    id: String(product._id),
    name: product.name,
    variants: (product.variants ?? []).map((variant) => ({
      id: variant._id ? String(variant._id) : "",
      sku: variant.sku ?? "",
      title: variant.title ?? "",
      price: variant.price ?? 0,
      costPrice: variant.costPrice ?? null,
    })),
  }));

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order in one place. Confirming an order automatically reduces inventory."
      />

      <OrdersManager
        initial={orders}
        customers={customerOptions}
        products={productOptions}
      />
    </div>
  );
}