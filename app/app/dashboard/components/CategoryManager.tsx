"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, PageHeader } from "../components/ui";
import {
  Field,
  FormError,
  SubmitBar,
  errorClass,
  inputClass,
} from "../components/form";

export interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CategoryRow extends CategoryOption {
  slug: string;
  productCount: number;
}

function childLabel(parent: CategoryOption | undefined): string {
  if (!parent) return "";
  return parent.parentId ? `${parent.name} / ` : "";
}

export default function CategoryManager({
  categories,
  parents,
}: {
  categories: CategoryRow[];
  parents: CategoryOption[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const parentById = new Map(parents.map((parent) => [parent.id, parent]));

  function pickErrors(payload: unknown): Record<string, string> {
    const body = (payload ?? {}) as { errors?: { field: string; message: string }[] };
    const map: Record<string, string> = {};
    for (const item of body.errors ?? []) {
      if (!map[item.field]) map[item.field] = item.message;
    }
    return map;
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/crm/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || undefined, parentId: parentId || undefined }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not create the category.");
        setFieldErrors(pickErrors(data));
        return;
      }

      setName("");
      setSlug("");
      setParentId("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(category: CategoryRow) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditParentId(category.parentId ?? "");
    setEditError(null);
    setEditFieldErrors({});
    setDeleteError(null);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    setEditSaving(true);
    setEditError(null);
    setEditFieldErrors({});

    try {
      const res = await fetch(`/api/crm/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, parentId: editParentId || null }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEditError(data.error ?? "Could not update the category.");
        setEditFieldErrors(pickErrors(data));
        return;
      }

      setEditingId(null);
      router.refresh();
    } catch {
      setEditError("Something went wrong. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  async function removeCategory(category: CategoryRow) {
    setDeleteSaving(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/crm/categories/${category.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete the category.");
        return;
      }

      setDeletingId(null);
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="text-sm font-bold text-foreground">New category</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Group products so they are easier to browse and report on.
        </p>

        <form onSubmit={createCategory} className="mt-4 space-y-4">
          <Field label="Name" htmlFor="category-name" required error={fieldErrors.name}>
            <input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kitchen"
              maxLength={80}
              required
              className={inputClass(errorClass(fieldErrors.name))}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="category-slug"
            hint="Optional. Generated from the name if you leave it blank."
            error={fieldErrors.slug}
          >
            <input
              id="category-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kitchen"
              className={inputClass(errorClass(fieldErrors.slug))}
            />
          </Field>

          <Field label="Parent" htmlFor="category-parent" error={fieldErrors.parentId}>
            <select
              id="category-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={inputClass(errorClass(fieldErrors.parentId))}
            >
              <option value="">No parent (top level)</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {childLabel(parentById.get(parent.id))}
                  {parent.name}
                </option>
              ))}
            </select>
          </Field>

          <SubmitBar
            error={error}
            saving={saving}
            submitLabel="Add category"
            savingLabel="Adding..."
            onCancelHref="/dashboard/categories"
            onCancel={() => {
              setName("");
              setSlug("");
              setParentId("");
              setError(null);
              setFieldErrors({});
            }}
          />
        </form>
      </Card>

      <div className="lg:col-span-2">
        {categories.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="No categories yet"
            description="Create your first category to group products, then assign it while adding or editing a product."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {categories.length} categor{categories.length === 1 ? "y" : "ies"}
              </p>
            </div>

            {deleteError && (
              <div className="px-4 pt-4">
                <FormError message={deleteError} />
              </div>
            )}

            <ul className="divide-y divide-border">
              {categories.map((category) => {
                const parent = category.parentId ? parentById.get(category.parentId) : undefined;
                const isEditing = editingId === category.id;

                return (
                  <li key={category.id} className="p-4">
                    {isEditing ? (
                      <form onSubmit={saveEdit} className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Name" htmlFor={`edit-name-${category.id}`} required error={editFieldErrors.name}>
                            <input
                              id={`edit-name-${category.id}`}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={80}
                              required
                              className={inputClass(errorClass(editFieldErrors.name))}
                            />
                          </Field>

                          <Field label="Parent" htmlFor={`edit-parent-${category.id}`} error={editFieldErrors.parentId}>
                            <select
                              id={`edit-parent-${category.id}`}
                              value={editParentId}
                              onChange={(e) => setEditParentId(e.target.value)}
                              className={inputClass(errorClass(editFieldErrors.parentId))}
                            >
                              <option value="">No parent (top level)</option>
                              {parents
                                .filter((option) => option.id !== category.id)
                                .map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {childLabel(parentById.get(option.id))}
                                    {option.name}
                                  </option>
                                ))}
                            </select>
                          </Field>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={editSaving}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                          >
                            {editSaving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {parent ? `${childLabel(parent)}${category.name}` : category.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            /{category.slug} · {category.productCount} product
                            {category.productCount === 1 ? "" : "s"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
                        >
                          Rename
                        </button>

                        <button
                          type="button"
                          disabled={deleteSaving && deletingId === category.id}
                          onClick={() => {
                            setDeletingId(category.id);
                            removeCategory(category);
                          }}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger-bg disabled:opacity-60"
                        >
                          {deleteSaving && deletingId === category.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
