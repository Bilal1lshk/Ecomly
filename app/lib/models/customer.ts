import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { externalSchema, IExternal, reuse, T } from "./common";

export interface ICustomerAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export interface ICustomer {
  organizationId: Types.ObjectId;
  fullName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  addresses?: ICustomerAddress[];
  external?: IExternal;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    fullName: { type: String, required: true },
    email: { type: String, lowercase: true },
    phone: String,
    notes: String,
    tags: [String],
    addresses: [
      {
        label: String,
        line1: { type: String, required: true },
        line2: String,
        city: { type: String, required: true },
        state: String,
        postalCode: String,
        country: { type: String, default: "PK" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    external: externalSchema,
  },
  T
);
customerSchema.index({ organizationId: 1, phone: 1 });
customerSchema.index({ organizationId: 1, email: 1 });
customerSchema.index({ fullName: "text", email: "text", phone: "text" });

export type CustomerDoc = HydratedDocument<ICustomer>;
export type CustomerModel = Model<ICustomer>;
export const Customer = reuse<ICustomer>("Customer", customerSchema);