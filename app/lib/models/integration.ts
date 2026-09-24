import { HydratedDocument, Model, Schema, Types } from "mongoose";
import { reuse, T } from "./common";

export type IntegrationStatus = "connected" | "disconnected" | "error";

export interface IIntegration {
  organizationId: Types.ObjectId;
  provider: string;
  name?: string;
  status?: IntegrationStatus;
  credentialsEncrypted?: string;
  settings?: Record<string, unknown>;
  lastSyncedAt?: Date;
  lastError?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const integrationSchema = new Schema<IIntegration>(
  {
    organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
    provider: { type: String, required: true },
    name: String,
    status: {
      type: String,
      enum: ["connected", "disconnected", "error"],
      default: "disconnected",
    },
    credentialsEncrypted: { type: String, select: false },
    settings: { type: Schema.Types.Mixed, default: {} },
    lastSyncedAt: Date,
    lastError: String,
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  T
);
integrationSchema.index({ organizationId: 1, provider: 1 });

export type SyncDirection = "inbound" | "outbound";
export type SyncStatus = "running" | "success" | "failed";

export interface IIntegrationSyncLog {
  organizationId: Types.ObjectId;
  integrationId: Types.ObjectId;
  direction?: SyncDirection;
  entityType?: string;
  status?: SyncStatus;
  recordsSynced?: number;
  errorMessage?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

const integrationSyncLogSchema = new Schema<IIntegrationSyncLog>({
  organizationId: { type: Types.ObjectId, ref: "Organization", required: true },
  integrationId: { type: Types.ObjectId, ref: "Integration", required: true },
  direction: { type: String, enum: ["inbound", "outbound"], default: "inbound" },
  entityType: String,
  status: { type: String, enum: ["running", "success", "failed"], default: "running" },
  recordsSynced: { type: Number, default: 0 },
  errorMessage: String,
  startedAt: { type: Date, default: Date.now },
  finishedAt: Date,
});
integrationSyncLogSchema.index({ integrationId: 1, startedAt: -1 });
integrationSyncLogSchema.index({ startedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type IntegrationDoc = HydratedDocument<IIntegration>;
export type IntegrationModel = Model<IIntegration>;
export const Integration = reuse<IIntegration>("Integration", integrationSchema);

export type IntegrationSyncLogDoc = HydratedDocument<IIntegrationSyncLog>;
export type IntegrationSyncLogModel = Model<IIntegrationSyncLog>;
export const IntegrationSyncLog = reuse<IIntegrationSyncLog>(
  "IntegrationSyncLog",
  integrationSyncLogSchema
);