import mongoose, { Model, Schema, Types } from "mongoose";

const { ObjectId } = Schema.Types;

export const T = { timestamps: true } as const;

export function reuse<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

export interface IExternal {
  integrationId?: Types.ObjectId;
  externalId?: string;
}

export const externalSchema = new Schema<IExternal>(
  {
    integrationId: { type: ObjectId, ref: "Integration" },
    externalId: String,
  },
  { _id: false }
);