"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  FormMessage,
  Modal,
  Select,
  TextArea,
  TextInput,
} from "../components/form";
import { Card, EmptyState, StatCard } from "../components/ui";
import { useCrm } from "../components/useCrm";
import { formatDate, initials, money } from "@/lib/format";

export interface OrderItemView {
  productName: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  channel: string;
  customerId: string;
  customerName: string;
  items: OrderItemView[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  shippingAddress: Record<string, string | undefined>;
  courierName: string;
  trackingNumber: string;
  notes: string;
  placedAt?: string | Date;
  imported: boolean;
}

export interface CustomerOption {
  id: string;
  fullName: string;
  addresses: {
    label: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }[];
}

export interface ProductOption {
  id: string;
  name: string;
  variants: { id: string; sku: string; title: string; price: number; costPrice: number | null }[];
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-warning/10 text-warning",
  processing: "bg-surface-secondary text-muted-foreground",
  shipped: "bg-surface-secondary text-muted-foreground",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
  returned: "bg-danger/10 text-danger",
};

const STATUS_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

interface DraftItem {
  key: string;
  productId: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

function blankItem(): DraftItem {
  return {
    key: `i${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: "",
    variantId: "",
    quantity: "1",
    unitPrice: "",
    discount: "",
  };
}

const BLANK_ORDER = {
  customerId: "",
  shippingName: "",
  shippingPhone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "PK",
  shippingTotal: "",
  taxTotal: "",
  paymentStatus: "unpaid",
  paymentMethod: "cod",
  notes: "",
};

/**
 * Manual order entry and fulfilment.
 *
 * Totals shown here are a live preview; the server recomputes them from the line
 * items on save, so a stale client total can never be persisted.
 */
export function OrdersManager({
  initial,
  customers,
  products,
}: {
  initial: OrderRow[];
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const crm = useCrm();
  const [orders, setOrders] = useState<OrderRow[]>(initial);
  const [draft, setDraft] = useState({ ...BLANK_ORDER, items: [blankItem()] as DraftItem[] });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<OrderRow | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const stats = useMemo(() => {
    const open = orders.filter((order) =>
      ["pending", "confirmed", "processing"].includes(order.status)
    ).length;
    const attention = orders.filter((order) =>
      ["pending", "confirmed"].includes(order.status)
    ).length;
    const revenue = orders
      .filter((order) => order.status !== "cancelled" && order.status !== "returned")
      .reduce((sum, order) => sum + order.total, 0);
    const currency = orders[0]?.currency ?? "PKR";

    return { open, attention, revenue, currency };
  }, [orders]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (!needle) return true;

      return `${order.orderNumber} ${order.customerName} ${order.items
        .map((item) => item.productName)
        .join(" ")}`
        .toLowerCase()
        .includes(needle);
    });
  }, [orders, query, statusFilter]);

  const preview = useMemo(() => {
    const subtotal = draft.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      return sum + Math.max(0, price * quantity - discount);
    }, 0);

    const shipping = Number(draft.shippingTotal) || 0;
    const tax = Number(draft.taxTotal) || 0;

    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  }, [draft]);

  function openCreate() {
    crm.reset();
    setDraft({ ...BLANK_ORDER, items: [blankItem()] });
    setOpen(true);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function selectCustomer(customerId: string) {
    const customer = customers.find((entry) => entry.id === customerId);
    const address =
      customer?.addresses.find((entry) => entry.isDefault) ?? customer?.addresses[0];

    setDraft((current) => ({
      ...current,
      customerId,
      shippingName: address ? customer?.fullName ?? current.shippingName : current.shippingName,
      shippingPhone: address?.phone || current.shippingPhone,
      line1: address?.line1 ?? current.line1,
      line2: address?.line2 ?? current.line2,
      city: address?.city ?? current.city,
      state: address?.state ?? current.state,
      postalCode: address?.postalCode ?? current.postalCode,
      country: address?.country ?? current.country,
    }));
  }

  function selectProduct(key: string, productId: string) {
    const product = products.find((entry) => entry.id === productId);
    const variant = product?.variants[0];

    updateItem(key, {
      productId,
      variantId: variant?.id ?? "",
      unitPrice: variant ? String(variant.price) : "",
    });
  }

  async function submit() {
    const result = await crm.create("/api/crm/orders", {
      customerId: draft.customerId || null,
      status: "pending",
      paymentStatus: draft.paymentStatus,
      paymentMethod: draft.paymentMethod,
      shippingTotal: draft.shippingTotal,
      taxTotal: draft.taxTotal,
      notes: draft.notes,
      shippingAddress: {
        name: draft.shippingName,
        phone: draft.shippingPhone,
        line1: draft.line1,
        line2: draft.line2,
        city: draft.city,
        state: draft.state,
        postalCode: draft.postalCode,
        country: draft.country,
      },
      items: draft.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
    });

    if (!result.ok) return;

    const created = (result.data as { order?: OrderRow }).order;

    if (created) {
      setOrders((current) => [created, ...current]);
    }

    setOpen(false);
  }

  function openStatus(order: OrderRow, status: string) {
    crm.reset();
    setStatusTarget(order);
    setNextStatus(status);
    setCourier(order.courierName);
    setTracking(order.trackingNumber);
  }

  async function submitStatus() {
    if (!statusTarget) return;

    const result = await crm.update("/api/crm/orders", {
      id: statusTarget.id,
      status: nextStatus,
      courierName: courier,
      trackingNumber: tracking,
    });

    if (!result.ok) return;

    setOrders((current) =>
      current.map((order) =>
        order.id === statusTarget.id
          ? {
              ...order,
              status: nextStatus,
              courierName: courier || order.courierName,
              trackingNumber: tracking || order.trackingNumber,
              // Confirming an order is what pulls stock down, so surface that.
              paymentStatus:
                nextStatus === "delivered" && order.paymentStatus !== "paid"
                  ? "paid"
                  : order.paymentStatus,
            }
          : order
      )
    );

    setStatusTarget(null);
  }

  async function deleteOrder(order: OrderRow) {
    const result = await crm.remove("/api/crm/orders", { id: order.id });

    if (!result.ok) return;

    setOrders((current) => current.filter((entry) => entry.id !== order.id));
  }

  return (
    <>
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Open orders"
          value={String(stats.open)}
          hint={stats.attention > 0 ? `${stats.attention} awaiting confirmation` : "Nothing pending"}
          tone={stats.open > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Orders"
          value={String(orders.length)}
          hint={`${orders.filter((order) => order.imported).length} synced from a channel`}
        />
        <StatCard
          label="Order value"
          value={money(stats.revenue, stats.currency)}
          hint="Excluding cancelled and returned"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order number, customer or product"
          aria-label="Search orders"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
        </select>

        {(query || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("");
            }}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}

        <Button onClick={openCreate}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          New order
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Zm0 7 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="No orders yet"
          description="Create an order by hand for a phone or in-store sale, or connect a channel to bring orders in automatically."
          action={
            <Button onClick={openCreate}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14m-7-7h14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              Create your first order
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No orders match those filters.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {visible.map((order) => {
              const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const transitions = STATUS_FLOW[order.status] ?? [];
              const address = order.shippingAddress;

              return (
                <li key={order.id}>
                  <div className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-secondary">
                    {order.customerName ? (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-warning text-[11px] font-bold text-white">
                        {initials(order.customerName)}
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-bold text-muted-foreground ring-1 ring-border">
                        ?
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {order.customerName || "Walk-in customer"} · {formatDate(order.placedAt)} ·{" "}
                        {units} item{units === 1 ? "" : "s"}
                        {order.imported ? ` · via ${order.channel}` : ""}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_TONE[order.status] ?? STATUS_TONE.pending
                      }`}
                    >
                      {order.status}
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        order.paymentStatus === "paid"
                          ? "bg-success/10 text-success"
                          : "bg-surface-secondary text-muted-foreground"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>

                    <span className="w-28 shrink-0 text-right text-sm font-semibold text-foreground">
                      {money(order.total, order.currency)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                      aria-expanded={expanded === order.id}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                      aria-label={`Show details for ${order.orderNumber}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d={expanded === order.id ? "m5 15 7-7 7 7" : "m5 9 7 7 7-7"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  {expanded === order.id && (
                    <div className="space-y-4 border-t border-border bg-surface-secondary/40 px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Items
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {order.items.map((item, index) => (
                              <li
                                key={`${item.sku}-${index}`}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                  {item.quantity} × {item.productName}
                                  {item.variantTitle && item.variantTitle !== "Default"
                                    ? ` (${item.variantTitle})`
                                    : ""}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {money(item.lineTotal, order.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>

                          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <dt>Subtotal</dt>
                              <dd>{money(order.subtotal, order.currency)}</dd>
                            </div>
                            {order.discountTotal > 0 && (
                              <div className="flex justify-between">
                                <dt>Discount</dt>
                                <dd>-{money(order.discountTotal, order.currency)}</dd>
                              </div>
                            )}
                            {order.shippingTotal > 0 && (
                              <div className="flex justify-between">
                                <dt>Shipping</dt>
                                <dd>{money(order.shippingTotal, order.currency)}</dd>
                              </div>
                            )}
                            {order.taxTotal > 0 && (
                              <div className="flex justify-between">
                                <dt>Tax</dt>
                                <dd>{money(order.taxTotal, order.currency)}</dd>
                              </div>
                            )}
                            <div className="flex justify-between pt-1 text-sm font-semibold text-foreground">
                              <dt>Total</dt>
                              <dd>{money(order.total, order.currency)}</dd>
                            </div>
                          </dl>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Delivery
                          </p>
                          {address.line1 ? (
                            <p className="mt-2 text-sm leading-relaxed text-foreground">
                              {address.name ? `${address.name}, ` : ""}
                              {address.phone ? `${address.phone} · ` : ""}
                              <br />
                              {address.line1}
                              {address.line2 ? <>, {address.line2}</> : null}
                              <br />
                              {address.city}
                              {address.state ? `, ${address.state}` : ""}{" "}
                              {address.postalCode}
                              <br />
                              {address.country}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                              No address on this order.
                            </p>
                          )}

                          {order.notes && (
                            <>
                              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Notes
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-foreground">
                                {order.notes}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                        {transitions.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            This order is {order.status} and has no further transitions.
                          </p>
                        ) : (
                          transitions.map((status) => (
                            <Button
                              key={status}
                              variant={status === "cancelled" || status === "returned" ? "danger" : "secondary"}
                              className="px-3 py-1.5 text-xs"
                              onClick={() => openStatus(order, status)}
                            >
                              Mark {status}
                            </Button>
                          ))
                        )}

                        {order.status === "pending" && !order.imported && (
                          <button
                            type="button"
                            onClick={() => deleteOrder(order)}
                            className="ml-auto text-xs font-semibold text-muted-foreground hover:text-danger"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal
        open={open}
        title="New order"
        description="For phone and in-store sales. Confirming the order reduces the stock of each line."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={crm.isPending}>
              {crm.isPending ? "Creating..." : "Create order"}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {products.length === 0 && (
            <p className="rounded-xl bg-warning/10 p-3 text-xs leading-relaxed text-warning">
              You have no products with variants yet. Add a product first, then come back to
              create the order.
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Items
              </p>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                onClick={() =>
                  setDraft((current) => ({ ...current, items: [...current.items, blankItem()] }))
                }
              >
                Add item
              </Button>
            </div>

            {crm.fieldErrors.items && (
              <p role="alert" className="text-xs font-medium text-danger">
                {crm.fieldErrors.items}
              </p>
            )}

            {draft.items.map((item, index) => {
              const product = products.find((entry) => entry.id === item.productId);
              const lineTotal =
                (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0) -
                (Number(item.discount) || 0);

              return (
                <div key={item.key} className="space-y-3 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Item {index + 1}</p>
                    {draft.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            items: current.items.filter((entry) => entry.key !== item.key),
                          }))
                        }
                        className="text-xs font-semibold text-danger"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <Field label="Product" error={crm.fieldErrors[`items.${index}.productId`]}>
                    <Select
                      value={item.productId}
                      onChange={(event) => selectProduct(item.key, event.target.value)}
                    >
                      <option value="">Choose a product</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {product && product.variants.length > 1 && (
                    <Field label="Variant">
                      <Select
                        value={item.variantId}
                        onChange={(event) => {
                          const variant = product.variants.find(
                            (entry) => entry.id === event.target.value
                          );
                          updateItem(item.key, {
                            variantId: event.target.value,
                            unitPrice: variant ? String(variant.price) : item.unitPrice,
                          });
                        }}
                      >
                        {product.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.title && variant.title !== "Default"
                              ? variant.title
                              : variant.sku || "Default"}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Quantity" error={crm.fieldErrors[`items.${index}.quantity`]}>
                      <TextInput
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.key, { quantity: event.target.value })
                        }
                      />
                    </Field>

                    <Field label="Unit price">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.key, { unitPrice: event.target.value })
                        }
                      />
                    </Field>

                    <Field label="Discount">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount}
                        placeholder="0"
                        onChange={(event) =>
                          updateItem(item.key, { discount: event.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <p className="text-right text-xs font-semibold text-foreground">
                    Line total {lineTotal.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" error={crm.fieldErrors.customerId}>
              <Select value={draft.customerId} onChange={(event) => selectCustomer(event.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Payment method">
              <Select
                value={draft.paymentMethod}
                onChange={(event) => setDraft({ ...draft, paymentMethod: event.target.value })}
              >
                <option value="cod">Cash on delivery</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="wallet">Wallet</option>
              </Select>
            </Field>
          </div>

          <Field label="Payment status">
            <Select
              value={draft.paymentStatus}
              onChange={(event) => setDraft({ ...draft, paymentStatus: event.target.value })}
            >
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shipping fee">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={draft.shippingTotal}
                placeholder="0"
                onChange={(event) => setDraft({ ...draft, shippingTotal: event.target.value })}
              />
            </Field>

            <Field label="Tax">
              <TextInput
                type="number"
                step="0.01"
                min="0"
                value={draft.taxTotal}
                placeholder="0"
                onChange={(event) => setDraft({ ...draft, taxTotal: event.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-xl bg-surface-secondary p-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{preview.subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Shipping &amp; tax</span>
              <span>{(preview.shipping + preview.tax).toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm font-bold text-foreground">
              <span>Total</span>
              <span>{preview.total.toFixed(2)}</span>
            </div>
          </div>

          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-xs font-semibold text-foreground">
              Delivery address
            </summary>

            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Recipient name">
                  <TextInput
                    value={draft.shippingName}
                    onChange={(event) =>
                      setDraft({ ...draft, shippingName: event.target.value })
                    }
                  />
                </Field>

                <Field label="Phone">
                  <TextInput
                    type="tel"
                    value={draft.shippingPhone}
                    onChange={(event) =>
                      setDraft({ ...draft, shippingPhone: event.target.value })
                    }
                  />
                </Field>
              </div>

              <Field label="Address line 1">
                <TextInput
                  value={draft.line1}
                  onChange={(event) => setDraft({ ...draft, line1: event.target.value })}
                />
              </Field>

              <Field label="Address line 2">
                <TextInput
                  value={draft.line2}
                  onChange={(event) => setDraft({ ...draft, line2: event.target.value })}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="City">
                  <TextInput
                    value={draft.city}
                    onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                  />
                </Field>

                <Field label="Province / state">
                  <TextInput
                    value={draft.state}
                    onChange={(event) => setDraft({ ...draft, state: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Postal code">
                  <TextInput
                    value={draft.postalCode}
                    onChange={(event) => setDraft({ ...draft, postalCode: event.target.value })}
                  />
                </Field>

                <Field label="Country code">
                  <TextInput
                    value={draft.country}
                    onChange={(event) =>
                      setDraft({ ...draft, country: event.target.value.toUpperCase() })
                    }
                  />
                </Field>
              </div>
            </div>
          </details>

          <Field label="Notes">
            <TextArea
              value={draft.notes}
              rows={2}
              placeholder="Anything the packer should know"
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </Field>

          <FormMessage message={crm.status} />
        </form>
      </Modal>

      <Modal
        open={Boolean(statusTarget)}
        title={`Move to ${nextStatus}`}
        description={
          statusTarget
            ? `${statusTarget.orderNumber} · ${statusTarget.customerName || "Walk-in customer"}`
            : undefined
        }
        onClose={() => setStatusTarget(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={nextStatus === "cancelled" || nextStatus === "returned" ? "danger" : "primary"}
              onClick={submitStatus}
              disabled={crm.isPending}
            >
              {crm.isPending ? "Saving..." : `Confirm ${nextStatus}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {nextStatus === "confirmed"
              ? "Confirming draws down the stock of every line and records a sale movement."
              : nextStatus === "cancelled" || nextStatus === "returned"
                ? "This puts the stock of every line back and records a return movement."
                : nextStatus === "delivered"
                  ? "Marking delivered also marks the order as paid when it is still unpaid."
                  : "This updates the order status."}
          </p>

          {(nextStatus === "shipped" || nextStatus === "delivered") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Courier">
                <TextInput
                  value={courier}
                  placeholder="e.g. TCS"
                  onChange={(event) => setCourier(event.target.value)}
                />
              </Field>

              <Field label="Tracking number">
                <TextInput
                  value={tracking}
                  onChange={(event) => setTracking(event.target.value)}
                />
              </Field>
            </div>
          )}

          <FormMessage message={crm.status} />
        </div>
      </Modal>
    </>
  );
}