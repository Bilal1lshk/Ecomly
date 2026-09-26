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

  // email verification
  emailVerified?: boolean;
  emailVerifyToken?: string;
  emailVerifyExpires?: Date;

  // password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: String,
    avatarUrl: String,

    // email verification
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // password reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  T
);

export type UserDoc = HydratedDocument<IUser>;
export type UserModel = Model<IUser>;
export const User = reuse<IUser>("User", userSchema);