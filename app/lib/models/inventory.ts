import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { reuse, T } from "./common";

export interface ILocation {
  organizationId: Types.ObjectId;
  name: string;
  address?: string;
  city?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    address: String,
    city: String,
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  T
);

export interface IInventoryLevel {
  organizationId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  locationId: Types.ObjectId;
  quantity?: number;
  reserved?: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLevelSchema = new Schema<IInventoryLevel>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Types.ObjectId, required: true },
    locationId: { type: Types.ObjectId, ref: "Location", required: true },
    quantity: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
  },
  T
);
inventoryLevelSchema.index({ variantId: 1, locationId: 1 }, { unique: true });
inventoryLevelSchema.index({ organizationId: 1, productId: 1 });

export type StockMovementType =
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "transfer_in"
  | "transfer_out";

export interface IStockMovement {
  organizationId: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  locationId: Types.ObjectId;
  type: StockMovementType;
  quantityChange: number;
  referenceType?: string;
  referenceId?: Types.ObjectId;
  note?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    productId: { type: Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Types.ObjectId, required: true },
    locationId: { type: Types.ObjectId, ref: "Location", required: true },
    type: {
      type: String,
      enum: ["purchase", "sale", "return", "adjustment", "transfer_in", "transfer_out"],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    referenceType: String,
    referenceId: Types.ObjectId,
    note: String,
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
stockMovementSchema.index({ variantId: 1, createdAt: -1 });
stockMovementSchema.index({ organizationId: 1, createdAt: -1 });

export type LocationDoc = HydratedDocument<ILocation>;
export type LocationModel = Model<ILocation>;
export const Location = reuse<ILocation>("Location", locationSchema);

export type InventoryLevelDoc = HydratedDocument<IInventoryLevel>;
export type InventoryLevelModel = Model<IInventoryLevel>;
export const InventoryLevel = reuse<IInventoryLevel>("InventoryLevel", inventoryLevelSchema);

export type StockMovementDoc = HydratedDocument<IStockMovement>;
export type StockMovementModel = Model<IStockMovement>;
export const StockMovement = reuse<IStockMovement>("StockMovement", stockMovementSchema);