import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { externalSchema, IExternal, reuse, T } from "./common";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "refunded";

export type PaymentMethod = "cod" | "card" | "bank_transfer" | "wallet";

export interface IOrderItem {
  productId?: Types.ObjectId;
  variantId?: Types.ObjectId;
  productName: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discount?: number;
  lineTotal: number;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Types.ObjectId, ref: "Product" },
  variantId: Types.ObjectId,
  productName: { type: String, required: true },
  variantTitle: String,
  sku: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  unitCost: Number,
  discount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
});

export interface IShippingAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IFulfilment {
  courierName?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface IOrder {
  organizationId: Types.ObjectId;
  orderNumber: string;
  customerId?: Types.ObjectId;
  locationId?: Types.ObjectId;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  channel?: string;
  items: IOrderItem[];

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
  paidAt?: Date;
  cancelledAt?: Date;
  createdBy?: Types.ObjectId;
  external?: IExternal;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    orderNumber: { type: String, required: true },
    customerId: { type: Types.ObjectId, ref: "Customer" },
    locationId: { type: Types.ObjectId, ref: "Location" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "card", "bank_transfer", "wallet"],
      default: "cod",
    },
    channel: { type: String, default: "manual" },

    items: { type: [orderItemSchema], validate: (v: unknown[]) => v.length > 0 },

    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    shippingTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },

    shippingAddress: {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: "PK" },
    },

    fulfilment: {
      courierName: String,
      trackingNumber: String,
      shippedAt: Date,
      deliveredAt: Date,
    },

    notes: String,
    placedAt: { type: Date, default: Date.now },
    paidAt: Date,
    cancelledAt: Date,
    createdBy: { type: Types.ObjectId, ref: "User" },
    external: externalSchema,
  },
  T
);
orderSchema.index({ organizationId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ organizationId: 1, status: 1, placedAt: -1 });
orderSchema.index({ organizationId: 1, customerId: 1 });
orderSchema.index(
  { organizationId: 1, "external.integrationId": 1, "external.externalId": 1 },
  { unique: true, partialFilterExpression: { "external.externalId": { $exists: true } } }
);

export interface ICounter {
  organizationId: Types.ObjectId;
  key: string;
  seq?: number;
}

const counterSchema = new Schema<ICounter>({
  organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
counterSchema.index({ organizationId: 1, key: 1 }, { unique: true });

export type OrderDoc = HydratedDocument<IOrder>;
export type OrderModel = Model<IOrder>;
export const Order = reuse<IOrder>("Order", orderSchema);

export type CounterDoc = HydratedDocument<ICounter>;
export type CounterModel = Model<ICounter>;
export const Counter = reuse<ICounter>("Counter", counterSchema);