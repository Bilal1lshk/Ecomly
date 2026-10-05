"use client";

import { useMemo, useState } from "react";
import { Button, Field, FormMessage, Modal, Select, TextInput } from "../components/form";
import { Card, EmptyState, PageHeader, StatCard } from "../components/ui";
import { useCrm } from "../components/useCrm";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

const BLANK = { id: "", name: "", parentId: "" };

/**
 * Category tree CRUD.
 *
 * The whole screen is one client component so the tree, the dialogs and the
 * optimistic list updates share a single source of truth; the server page only
 * supplies the initial snapshot.
 */
export function CategoriesScreen({ initial }: { initial: Category[] }) {
  const crm = useCrm();
  const [categories, setCategories] = useState<Category[]>(initial);
  const [draft, setDraft] = useState({ ...BLANK });
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Category | null>(null);

  const editing = Boolean(draft.id);
  const tree = useMemo(() => buildTree(categories), [categories]);

  const roots = categories.filter((category) => !category.parentId).length;
  const nested = categories.length - roots;

  function openCreate(parentId = "") {
    crm.reset();
    setDraft({ ...BLANK, parentId });
    setOpen(true);
  }

  function openEdit(category: Category) {
    crm.reset();
    setDraft({ id: category.id, name: category.name, parentId: category.parentId ?? "" });
    setOpen(true);
  }

  async function submit() {
    const payload = { ...draft, parentId: draft.parentId || null };
    const result = editing
      ? await crm.update("/api/crm/categories", payload)
      : await crm.create("/api/crm/categories", payload);

    if (!result.ok) return;

    const saved = (result.data as { category?: Category }).category;

    setCategories((current) =>
      editing
        ? current.map((category) =>
            category.id === draft.id
              ? {
                  ...category,
                  name: draft.name,
                  parentId: draft.parentId || null,
                  slug: saved?.slug ?? category.slug,
                }
              : category
          )
        : // The route returns the created record, so prefer it over a local guess.
          [
            ...current,
            saved ?? {
              id: `pending-${Date.now()}`,
              name: draft.name,
              slug: "",
              parentId: draft.parentId || null,
            },
          ]
    );

    setOpen(false);
    setDraft({ ...BLANK });
  }

  async function confirmDelete() {
    if (!confirming) return;

    const result = await crm.remove("/api/crm/categories", { id: confirming.id });

    if (!result.ok) {
      setConfirming(null);
      return;
    }

    setCategories((current) => current.filter((category) => category.id !== confirming.id));
    setConfirming(null);
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group your catalog into a tree. Each product picks one category from the products form."
        action={
          <Button onClick={() => openCreate()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14m-7-7h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            New category
          </Button>
        }
      />

      {categories.length > 0 && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <StatCard label="Categories" value={String(categories.length)} hint="Across the catalog" />
          <StatCard label="Top level" value={String(roots)} hint="Without a parent" />
          <StatCard
            label="Nested"
            value={String(nested)}
            hint={nested > 0 ? "Sitting under a parent" : "No nesting yet"}
            tone={nested > 0 ? "neutral" : "success"}
          />
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="No categories yet"
          description="Group your catalog so products stay easy to browse and filter. Add your first category to get started."
          action={
            <Button onClick={() => openCreate()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14m-7-7h14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              Create your first category
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {tree.map((node) => (
              <CategoryRow
                key={node.category.id}
                node={node}
                onEdit={openEdit}
                onDelete={setConfirming}
                onAddChild={openCreate}
              />
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={open}
        title={editing ? "Edit category" : "New category"}
        description="Categories can be nested. Products pick one category each from the products form."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={crm.isPending}>
              {crm.isPending ? "Saving..." : editing ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label="Name" error={crm.fieldErrors.name}>
            <TextInput
              value={draft.name}
              autoFocus
              placeholder="e.g. Summer collection"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>

          <Field
            label="Parent category"
            hint={
              editing
                ? "A category cannot be moved under itself or one of its own subcategories."
                : "Leave empty for a top-level category."
            }
          >
            <Select
              value={draft.parentId}
              onChange={(event) => setDraft({ ...draft, parentId: event.target.value })}
            >
              <option value="">No parent</option>
              {tree
                .filter((node) => node.category.id !== draft.id)
                .map((node) => (
                  <option key={node.category.id} value={node.category.id}>
                    {`${"— ".repeat(node.depth)}${node.category.name}`}
                  </option>
                ))}
            </Select>
          </Field>

          <FormMessage message={crm.status} />
        </form>
      </Modal>

      <Modal
        open={Boolean(confirming)}
        title="Delete category"
        description={
          confirming
            ? `"${confirming.name}" can only be deleted once it has no subcategories and no products assigned.`
            : undefined
        }
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={crm.isPending}>
              {crm.isPending ? "Deleting..." : "Delete category"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">This cannot be undone.</p>
      </Modal>
    </div>
  );
}

interface TreeNode {
  category: Category;
  depth: number;
}

function CategoryRow({
  node,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: TreeNode;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddChild: (parentId: string) => void;
}) {
  const { category, depth } = node;

  return (
    <li>
      <div
        className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-secondary"
        style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/20">
          {category.name.slice(0, 2).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">/{category.slug}</p>
        </div>

        <button
          type="button"
          onClick={() => onAddChild(category.id)}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          aria-label={`Add a subcategory under ${category.name}`}
          title="Add subcategory"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onEdit(category)}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          aria-label={`Edit ${category.name}`}
          title="Edit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Zm10-13 3 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onDelete(category)}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label={`Delete ${category.name}`}
          title="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </li>
  );
}

/**
 * Flattens the category list into render order with a depth per node.
 *
 * A parent id pointing at a category that no longer exists would otherwise hide
 * that whole branch, so orphans are surfaced at the top level instead of
 * silently disappearing.
 */
function buildTree(categories: Category[]): TreeNode[] {
  const byParent = new Map<string, Category[]>();

  for (const category of categories) {
    const key = category.parentId ?? "";
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const known = new Set(categories.map((category) => category.id));
  const orphaned = categories.filter(
    (category) => category.parentId && !known.has(category.parentId)
  );

  const nodes: TreeNode[] = [];
  const visited = new Set<string>();

  function walk(parentId: string, depth: number) {
    for (const category of byParent.get(parentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      nodes.push({ category, depth });
      walk(category.id, depth + 1);
    }
  }

  walk("", 0);

  for (const category of orphaned) {
    if (visited.has(category.id)) continue;
    visited.add(category.id);
    nodes.push({ category, depth: 0 });
  }

  return nodes;
}