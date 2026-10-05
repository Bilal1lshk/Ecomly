"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export type FormStatus = { kind: "success" | "error"; text: string } | null;

type ApiResult = { error?: string; fields?: Record<string, string> };

/**
 * Single place where client code talks to the /api/crm routes.
 *
 * Every write in the dashboard funnels through here so error handling, JSON
 * parsing and failure messaging stay consistent, and callers get back the
 * field-keyed validation map to attach to their inputs.
 */
export function useCrm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const send = useCallback(
    async (url: string, method: "POST" | "PATCH" | "DELETE", payload: unknown) => {
      setIsPending(true);
      setStatus(null);
      setFieldErrors({});

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => null)) as ApiResult | null;

        if (!response.ok) {
          const text = result?.error ?? "Something went wrong. Please try again.";

          if (result?.fields) setFieldErrors(result.fields);
          setStatus({ kind: "error", text });

          return { ok: false as const, error: text, fields: result?.fields ?? {} };
        }

        setStatus({ kind: "success", text: "Saved" });
        router.refresh();

        return { ok: true as const, data: result ?? {} };
      } catch {
        const text = "Could not reach the server. Check your connection and try again.";
        setStatus({ kind: "error", text });

        return { ok: false as const, error: text, fields: {} as Record<string, string> };
      } finally {
        setIsPending(false);
      }
    },
    [router]
  );

  const create = useCallback(
    (url: string, payload: unknown) => send(url, "POST", payload),
    [send]
  );
  const update = useCallback(
    (url: string, payload: unknown) => send(url, "PATCH", payload),
    [send]
  );
  const remove = useCallback(
    (url: string, payload: unknown) => send(url, "DELETE", payload),
    [send]
  );

  return {
    create,
    update,
    remove,
    isPending,
    status,
    fieldErrors,
    setStatus,
    reset: () => {
      setStatus(null);
      setFieldErrors({});
    },
  };
}