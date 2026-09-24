import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { externalSchema, IExternal, reuse, T } from "./common";

export type ProductStatus = "draft" | "active" | "archived";

export interface IVariant {
  sku: string;
  title?: string;
  options?: Map<string, string>;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  barcode?: string;
  weightGrams?: number;
  reorderLevel?: number;
  isActive?: boolean;
}

const variantSchema = new Schema<IVariant>({
  sku: { type: String, required: true },
  title: { type: String, default: "Default" },
  options: { type: Map, of: String, default: {} },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: Number,
  costPrice: Number,
  barcode: String,
  weightGrams: Number,
  reorderLevel: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
});

export interface IProductImage {
  url: string;
  alt?: string;
}

export interface IProduct {
  organizationId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  status?: ProductStatus;
  brand?: string;
  tags?: string[];
  images?: IProductImage[];
  variants: IVariant[];
  external?: IExternal;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    categoryId: { type: Types.ObjectId, ref: "Category" },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: String,
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
    brand: String,
    tags: [String],
    images: [{ url: String, alt: String }],
    variants: { type: [variantSchema], validate: (v: unknown[]) => v.length > 0 },
    external: externalSchema,
  },
  T
);
productSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
productSchema.index({ organizationId: 1, status: 1 });
productSchema.index({ organizationId: 1, "variants.sku": 1 });
productSchema.index({ name: "text", "variants.sku": "text" });
productSchema.index(
  { organizationId: 1, "external.integrationId": 1, "external.externalId": 1 },
  { unique: true, partialFilterExpression: { "external.externalId": { $exists: true } } }
);

export type ProductDoc = HydratedDocument<IProduct>;
export type ProductModel = Model<IProduct>;
export const Product = reuse<IProduct>("Product", productSchema);