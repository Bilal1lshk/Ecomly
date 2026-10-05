import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/org";

export type ApiError = { error: string; fields?: Record<string, string> };

/**
 * Resolves the caller's organisation for a CRM write.
 *
 * Every /api/crm handler is org-scoped, never user-scoped: a member of the org
 * acts on the org's catalog. Returns a ready-to-send 401/403 instead of a null
 * so handlers do not each re-implement the branch.
 */
export async function requireOrg(): Promise<
  { ok: true; orgId: string } | { ok: false; response: NextResponse<ApiError> }
> {
  const orgId = await getOrgId();

  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json<ApiError>(
        { error: "Sign in with an active workspace to continue" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, orgId };
}

export function badRequest(error: string, fields?: Record<string, string>) {
  return NextResponse.json<ApiError>({ error, ...(fields ? { fields } : {}) }, { status: 400 });
}

export function notFound(what: string) {
  return NextResponse.json<ApiError>({ error: `${what} not found` }, { status: 404 });
}

export function serverError(context: string, error: unknown) {
  console.error(`[crm] ${context}:`, error);
  return NextResponse.json<ApiError>(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

/** Mongo duplicate-key on any of the declared unique indexes. */
export function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

export function serverErrorOnDuplicate(context: string, error: unknown, message: string) {
  if (isDuplicateKey(error)) {
    return NextResponse.json<ApiError>({ error: message }, { status: 409 });
  }
  return serverError(context, error);
}