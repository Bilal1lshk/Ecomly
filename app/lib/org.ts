import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/database/db";
import { Membership } from "@/lib/models/organization";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  return typeof id === "string" && Types.ObjectId.isValid(id) ? id : null;
}

export async function getOrgId(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  await connectDB();
  const membership = await Membership.findOne({ userId })
    .select("organizationId")
    .lean();

  return membership?.organizationId?.toString() ?? null;
}
