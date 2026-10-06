import crypto from "crypto";

/**
 * URL-safe slug shared by categories and products.
 *
 * Mirrors the slugify in lib/org.ts: lowercased, non-alphanumerics collapsed to
 * a single dash, trimmed, and length-capped so it stays usable in a path.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Appends a short random suffix until `exists` reports the slug is free.
 *
 * Categories and products both carry a unique (organizationId, slug) index, and
 * a seller may well create "Shirt" twice; retrying beats surfacing a raw E11000.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  attempts = 5
): Promise<string> {
  const root = slugify(base) || "item";

  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidate =
      attempt === 0 ? root : `${root}-${crypto.randomBytes(3).toString("hex")}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function optionalStr(value: unknown): string | undefined {
  const result = str(value);
  return result ? result : undefined;
}

export function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(str(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function optionalNum(value: unknown): number | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toObjectId(value: unknown): string | null {
  const raw = str(value);
  return raw && /^[a-f\d]{24}$/i.test(raw) ? raw : null;
}

export function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => str(item))
    .filter((item): item is string => Boolean(item));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}