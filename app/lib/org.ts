import crypto from "crypto";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/database/db";
import { Membership, Organization } from "@/lib/models/organization";
import { User } from "@/lib/models/user";

export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) {
      console.log("[getSessionUserId] No session user id found", session?.user);
    }
    return typeof id === "string" && Types.ObjectId.isValid(id) ? id : null;
  } catch (e) {
    console.error("[getSessionUserId] error:", e);
    return null;
  }
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "workspace";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? root : `${root}-${crypto.randomBytes(3).toString("hex")}`;

    if (!(await Organization.exists({ slug: candidate }))) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Same as getOrgId(), but provisions a personal workspace on first use instead of
 * returning null. Every model in the app is org-scoped, so a seller cannot connect
 * eBay or sync a listing without one; creating it here keeps the connect flow a
 * single click rather than an onboarding step the seller has to complete first.
 *
 * Returns null only when there is no valid session.
 */
export interface CreateOrganizationParams {
  name: string;
  slug?: string;
}

export async function createOrganization(
  params: CreateOrganizationParams
): Promise<{ orgId: string; slug: string }> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("unauthorized");
  }

  await connectDB();

  const baseSlug = params.slug?.trim()
    ? slugify(params.slug.trim())
    : slugify(params.name.trim());
  const slug = await uniqueSlug(baseSlug);

  const org = await Organization.create({
    name: params.name.trim(),
    slug,
  });

  try {
    await Membership.create({
      organizationId: org._id,
      userId,
      role: "owner",
    });
  } catch (e) {
    await Organization.deleteOne({ _id: org._id }).catch(() => undefined);
    throw e;
  }

  return { orgId: org._id.toString(), slug };
}

export async function getCurrentMembership() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  await connectDB();
  const membership = await Membership.findOne({ userId })
    .select("organizationId role")
    .lean();

  if (!membership) return null;

  return {
    orgId: membership.organizationId.toString(),
    role: membership.role ?? "staff",
  };
}

export async function ensureOrgId(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  await connectDB();

  const existing = await Membership.findOne({ userId }).select("organizationId").lean();
  if (existing) return existing.organizationId.toString();

  const user = await User.findById(userId).select("name email").lean();

  const label =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "My";

  const org = await Organization.create({
    name: `${label}'s Workspace`,
    slug: await uniqueSlug(slugify(label)),
  });

  try {
    await Membership.create({ organizationId: org._id, userId, role: "owner" });
  } catch (e) {
    // A concurrent request may have provisioned one first; prefer theirs so the
    // seller does not end up with two workspaces.
    const winner = await Membership.findOne({ userId }).select("organizationId").lean();

    if (winner) {
      await Organization.deleteOne({ _id: org._id }).catch(() => undefined);
      return winner.organizationId.toString();
    }

    throw e;
  }

  return org._id.toString();
}
