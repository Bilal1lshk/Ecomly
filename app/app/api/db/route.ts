import mongoose from "mongoose";
import { connectDB } from "@/lib/database/db";

export async function GET() {
  const started = Date.now();
  try {
    await connectDB();
    const conn = mongoose.connection;
    return Response.json({
      connected: true,
      host: conn.host,
      name: conn.name,
      readyState: conn.readyState,
      latencyMs: Date.now() - started,
      models: Object.keys(mongoose.models),
    });
  } catch (error) {
    return Response.json(
      {
        connected: false,
        readyState: mongoose.connection.readyState,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}