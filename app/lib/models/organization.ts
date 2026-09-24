import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { T, reuse } from "./common";

export type MembershipRole = "owner" | "admin" | "manager" | "staff";

export interface IOrganization {
  name: string;
  slug: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
  orderPrefix?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logoUrl: String,
    currency: { type: String, default: "PKR" },
    timezone: { type: String, default: "Asia/Karachi" },
    orderPrefix: { type: String, default: "ORD" },
  },
  T
);

export interface IMembership {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role?: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "manager", "staff"], default: "staff" },
  },
  T
);
membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1 });

export type InvitationRole = "admin" | "manager" | "staff";

export interface IInvitation {
  organizationId: Types.ObjectId;
  email: string;
  role?: InvitationRole;
  token: string;
  invitedBy?: Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    email: { type: String, required: true, lowercase: true },
    role: { type: String, enum: ["admin", "manager", "staff"], default: "staff" },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
    acceptedAt: Date,
  },
  T
);

export type OrganizationDoc = HydratedDocument<IOrganization>;
export type OrganizationModel = Model<IOrganization>;
export const Organization = reuse<IOrganization>("Organization", organizationSchema);

export type MembershipDoc = HydratedDocument<IMembership>;
export type MembershipModel = Model<IMembership>;
export const Membership = reuse<IMembership>("Membership", membershipSchema);

export type InvitationDoc = HydratedDocument<IInvitation>;
export type InvitationModel = Model<IInvitation>;
export const Invitation = reuse<IInvitation>("Invitation", invitationSchema);