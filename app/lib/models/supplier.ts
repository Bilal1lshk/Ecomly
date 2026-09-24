import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { reuse, T } from "./common";

export interface ISupplierSupply {
  productId?: Types.ObjectId;
  variantId?: Types.ObjectId;
  supplierSku?: string;
  costPrice?: number;
  leadTimeDays?: number;
  isPreferred?: boolean;
}

export interface ISupplier {
  organizationId: Types.ObjectId;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  supplies?: ISupplierSupply[];
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    contactName: String,
    email: String,
    phone: String,
    address: String,
    notes: String,
    supplies: [
      {
        productId: { type: Types.ObjectId, ref: "Product" },
        variantId: Types.ObjectId,
        supplierSku: String,
        costPrice: Number,
        leadTimeDays: Number,
        isPreferred: { type: Boolean, default: false },
      },
    ],
  },
  T
);
supplierSchema.index({ organizationId: 1, name: 1 });

export type SupplierDoc = HydratedDocument<ISupplier>;
export type SupplierModel = Model<ISupplier>;
export const Supplier = reuse<ISupplier>("Supplier", supplierSchema);