import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { T, reuse } from "./common";

export interface ICategory {
  organizationId: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    parentId: { type: Types.ObjectId, ref: "Category", default: null },
    name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  T
);
categorySchema.index({ organizationId: 1, slug: 1 }, { unique: true });

export type CategoryDoc = HydratedDocument<ICategory>;
export type CategoryModel = Model<ICategory>;
export const Category = reuse<ICategory>("Category", categorySchema);