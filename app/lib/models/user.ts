import { HydratedDocument, Model, Schema } from "mongoose";
import { T, reuse } from "./common";
export interface IUser {
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: String,
    avatarUrl: String,
  },
  T
);

export type UserDoc = HydratedDocument<IUser>;
export type UserModel = Model<IUser>;
export const User = reuse<IUser>("User", userSchema);