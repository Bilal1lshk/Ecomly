import mongoose from "mongoose";
import { connectDB } from "@/lib/database/db";

export const dynamic = "force-dynamic";

type DbStatus = {
  connected: boolean;
  host?: string;
  name?: string;
  readyState: number;
  models: string[];
  error?: string;
};

const stateLabels = ["disconnected", "connected", "connecting", "disconnecting"];

export default async function DbPage() {
  let status: DbStatus;

  try {
    await connectDB();
    const conn = mongoose.connection;
    status = {
      connected: true,
      host: conn.host,
      name: conn.name,
      readyState: conn.readyState,
      models: Object.keys(mongoose.models),
    };
  } catch (error) {
    status = {
      connected: false,
      readyState: mongoose.connection.readyState,
      models: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 p-8 dark:bg-black">
      <main className="w-full max-w-lg rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.15] dark:bg-black">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Database Connection
        </h1>

        <div className="mt-6 flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              status.connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <p
            className={`text-lg font-medium ${
              status.connected ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
            }`}
          >
            {status.connected ? "Connected" : status.error ? "Failed to connect" : "Not connected"}
          </p>
          <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
            {stateLabels[status.readyState] ?? status.readyState}
          </span>
        </div>

        {status.connected ? (
          <dl className="mt-6 divide-y divide-zinc-200 text-sm dark:divide-white/10">
            <Row label="Host" value={status.host ?? "—"} />
            <Row label="Database" value={status.name ?? "—"} />
            <Row label="Registered models" value={status.models.length ? status.models.join(", ") : "—"} />
          </dl>
        ) : (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {status.error ?? "No error reported. Check your MONGODB_URI in .env.local."}
          </p>
        )}

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          JSON status available at{" "}
          <code className="rounded bg-black/[.06] px-1.5 py-0.5 dark:bg-white/[.08]">/api/db</code>
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium text-black dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}