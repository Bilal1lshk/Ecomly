"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  FormMessage,
  Modal,
  Select,
  TextArea,
  TextInput,
} from "../components/form";
import { Card, EmptyState, StatCard } from "../components/ui";
import { useCrm } from "../components/useCrm";

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  barcode: string;
  weightGrams: number | null;
  reorderLevel: number;
  isActive: boolean;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  brand: string;
  description: string;
  tags: string[];
  imageUrls: string[];
  categoryId: string;
  imported: boolean;
  variants: ProductVariant[];
}

export interface CategoryOption {
  id: string;
  name: string;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-surface-secondary text-muted-foreground",
  archived: "bg-warning/10 text-warning",
};

interface DraftVariant {
  key: string;
  sku: string;
  title: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  barcode: string;
  weightGrams: string;
  reorderLevel: string;
  isActive: boolean;
}

function blankVariant(key: string): DraftVariant {
  return {
    key,
    sku: "",
    title: "",
    price: "",
    compareAtPrice: "",
    costPrice: "",
    barcode: "",
    weightGrams: "",
    reorderLevel: "5",
    isActive: true,
  };
}

const BLANK = {
  id: "",
  name: "",
  description: "",
  status: "draft",
  brand: "",
  tags: "",
  imageUrls: "",
  categoryId: "",
};

/**
 * Manual catalog management for the products page.
 *
 * Owns the editable copy of the server-rendered list so a create, edit, archive
 * or delete is reflected immediately; `router.refresh()` inside useCrm then
 * reconciles with the database.
 */
export function ProductManager({
  initial,
  categories,
}: {
  initial: ProductRow[];
  categories: CategoryOption[];
}) {
  const crm = useCrm();
  const [products, setProducts] = useState<ProductRow[]>(initial);
  const [draft, setDraft] = useState<DraftState>({ ...BLANK, variants: [blankVariant("v0")] });
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<ProductRow | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const editing = Boolean(draft.id);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      if (categoryFilter && product.categoryId !== categoryFilter) return false;
      if (statusFilter && product.status !== statusFilter) return false;
      if (!needle) return true;

      return [
        product.name,
        product.brand,
        ...product.tags,
        ...product.variants.map((variant) => variant.sku),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [products, query, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.status === "active").length;
    const imported = products.filter((product) => product.imported).length;
    const draftCount = products.filter((product) => product.status === "draft").length;

    return { active, imported, draftCount };
  }, [products]);

  function openCreate() {
    crm.reset();
    setDraft({ ...BLANK, variants: [blankVariant("v0")] });
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    crm.reset();
    setDraft({
      id: product.id,
      name: product.name,
      description: product.description,
      status: product.status,
      brand: product.brand,
      tags: product.tags.join(", "),
      imageUrls: product.imageUrls.join("\n"),
      categoryId: product.categoryId,
      variants:
        product.variants.length > 0
          ? product.variants.map((variant, index) => ({
              key: `v${index}-${variant.id}`,
              sku: variant.sku,
              title: variant.title,
              price: String(variant.price),
              compareAtPrice: variant.compareAtPrice === null ? "" : String(variant.compareAtPrice),
              costPrice: variant.costPrice === null ? "" : String(variant.costPrice),
              barcode: variant.barcode,
              weightGrams: variant.weightGrams === null ? "" : String(variant.weightGrams),
              reorderLevel: String(variant.reorderLevel),
              isActive: variant.isActive,
            }))
          : [blankVariant("v0")],
    });
    setOpen(true);
  }

  function updateVariant(key: string, patch: Partial<DraftVariant>) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.key === key ? { ...variant, ...patch } : variant
      ),
    }));
  }

  async function submit() {
    const payload = {
      id: draft.id || undefined,
      name: draft.name,
      description: draft.description,
      status: draft.status,
      brand: draft.brand,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      imageUrls: draft.imageUrls.split(/[\n,]/).map((url) => url.trim()).filter(Boolean),
      categoryId: draft.categoryId || null,
      variants: draft.variants.map((variant) => ({
        sku: variant.sku,
        title: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        barcode: variant.barcode,
        weightGrams: variant.weightGrams,
        reorderLevel: variant.reorderLevel,
        isActive: variant.isActive,
      })),
    };

    const result = editing
      ? await crm.update("/api/crm/products", payload)
      : await crm.create("/api/crm/products", payload);

    if (!result.ok) return;

    if (editing) {
      const saved = draft;

      setProducts((current) =>
        current.map((product) =>
          product.id === draft.id
            ? {
                ...product,
                name: saved.name,
                status: saved.status,
                brand: saved.brand,
                tags: payload.tags,
                imageUrls: payload.imageUrls,
                categoryId: saved.categoryId,
                variants: payload.variants.map((variant, index) => ({
                  id: product.variants[index]?.id ?? "",
                  sku: variant.sku,
                  title: variant.title,
                  price: Number(variant.price) || 0,
                  compareAtPrice:
                    variant.compareAtPrice === "" ? null : Number(variant.compareAtPrice),
                  costPrice: variant.costPrice === "" ? null : Number(variant.costPrice),
                  barcode: variant.barcode,
                  weightGrams:
                    variant.weightGrams === "" ? null : Number(variant.weightGrams),
                  reorderLevel: Number(variant.reorderLevel) || 0,
                  isActive: variant.isActive,
                })),
              }
            : product
        )
      );
    } else {
      const created = (result.data as { product?: ProductRow }).product;

      setProducts((current) =>
        created
          ? [created, ...current]
          : [
              {
                id: `pending-${Date.now()}`,
                name: draft.name,
                slug: "",
                status: draft.status,
                brand: draft.brand,
                description: draft.description,
                tags: payload.tags,
                imageUrls: payload.imageUrls,
                categoryId: draft.categoryId,
                imported: false,
                variants: payload.variants.map((variant) => ({
                  id: "",
                  sku: variant.sku,
                  title: variant.title,
                  price: Number(variant.price) || 0,
                  compareAtPrice:
                    variant.compareAtPrice === "" ? null : Number(variant.compareAtPrice),
                  costPrice: variant.costPrice === "" ? null : Number(variant.costPrice),
                  barcode: variant.barcode,
                  weightGrams: variant.weightGrams === "" ? null : Number(variant.weightGrams),
                  reorderLevel: Number(variant.reorderLevel) || 0,
                  isActive: variant.isActive,
                })),
              },
              ...current,
            ]
      );
    }

    setOpen(false);
    setDraft({ ...BLANK, variants: [blankVariant("v0")] });
  }

  async function archive(product: ProductRow) {
    const result = await crm.update("/api/crm/products", {
      id: product.id,
      name: product.name,
      description: product.description,
      status: product.status === "archived" ? "active" : "archived",
      categoryId: product.categoryId || null,
      imageUrls: product.imageUrls,
      tags: product.tags,
      brand: product.brand,
      variants: product.variants.map((variant) => ({
        sku: variant.sku,
        title: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        barcode: variant.barcode,
        weightGrams: variant.weightGrams,
        reorderLevel: variant.reorderLevel,
        isActive: variant.isActive,
      })),
    });

    if (!result.ok) return;

    setProducts((current) =>
      current.map((entry) =>
        entry.id === product.id
          ? { ...entry, status: entry.status === "archived" ? "active" : "archived" }
          : entry
      )
    );
  }

  async function confirmDelete() {
    if (!confirming) return;

    const result = await crm.remove("/api/crm/products", { id: confirming.id });

    if (!result.ok) {
      setConfirming(null);
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== confirming.id));
    setConfirming(null);
  }

  const isFiltered = Boolean(query || categoryFilter || statusFilter);

  return (
    <>
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Products" value={String(products.length)} hint="In your catalog" />
        <StatCard
          label="Active"
          value={String(stats.active)}
          hint="Visible for sale"
          tone={stats.active > 0 ? "success" : "neutral"}
        />
        <StatCard
          label="Imported"
          value={String(stats.imported)}
          hint="Synced from a marketplace"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, brand or SKU"
          aria-label="Search products"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
          className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategoryFilter("");
              setStatusFilter("");
            }}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title={isFiltered ? "No products match those filters" : "No products yet"}
          description={
            isFiltered
              ? "Try a different search term, or clear the filters to see your whole catalog."
              : "Add a product by hand, or connect eBay to import your listings."
          }
          action={
            isFiltered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategoryFilter("");
                  setStatusFilter("");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={openCreate}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 5v14m-7-7h14"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                Add your first product
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {visible.map((product) => {
              const variant = product.variants[0];
              const image = product.imageUrls[0];
              const category = categories.find((entry) => entry.id === product.categoryId);

              return (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-secondary"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary text-xs font-bold text-muted-foreground ring-1 ring-border">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      product.name.slice(0, 2).toUpperCase()
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {variant?.sku ? `SKU ${variant.sku}` : "No SKU"}
                      {product.brand ? ` · ${product.brand}` : ""}
                      {` · ${product.variants.length} variant${
                        product.variants.length === 1 ? "" : "s"
                      }`}
                      {category ? ` · ${category.name}` : ""}
                    </p>
                  </div>

                  {product.imported && (
                    <span className="hidden shrink-0 rounded-full bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline">
                      eBay
                    </span>
                  )}

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      STATUS_TONE[product.status] ?? STATUS_TONE.draft
                    }`}
                  >
                    {product.status}
                  </span>

                  <span className="w-24 shrink-0 text-right text-sm font-semibold text-foreground">
                    {variant ? variant.price.toFixed(2) : "—"}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                      aria-label={`Edit ${product.name}`}
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
                      onClick={() => archive(product)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                      aria-label={`${product.status === "archived" ? "Restore" : "Archive"} ${product.name}`}
                      title={product.status === "archived" ? "Restore" : "Archive"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M3 7h18v4H3V7Zm2 4v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M10 14h4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirming(product)}
                      disabled={product.imported}
                      title={
                        product.imported
                          ? "Synced from a marketplace — archive instead of deleting"
                          : "Delete"
                      }
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      aria-label={`Delete ${product.name}`}
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
            })}
          </ul>
        </Card>
      )}

      <ProductFormModal
        open={open}
        editing={editing}
        draft={draft}
        setDraft={setDraft}
        categories={categories}
        crm={crm}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        onVariantChange={updateVariant}
      />

      <Modal
        open={Boolean(confirming)}
        title="Delete product"
        description={
          confirming
            ? `"${confirming.name}" and its stock history will be removed. This cannot be undone.`
            : undefined
        }
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={crm.isPending}>
              {crm.isPending ? "Deleting..." : "Delete product"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Products already referenced by an order cannot be deleted — archive them instead so
          order history stays intact.
        </p>
      </Modal>
    </>
  );
}

type CrmState = ReturnType<typeof useCrm>;
interface DraftState extends Omit<typeof BLANK, "variants"> {
  variants: DraftVariant[];
}

function ProductFormModal({
  open,
  editing,
  draft,
  setDraft,
  categories,
  crm,
  onClose,
  onSubmit,
  onVariantChange,
}: {
  open: boolean;
  editing: boolean;
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  categories: CategoryOption[];
  crm: CrmState;
  onClose: () => void;
  onSubmit: () => void;
  onVariantChange: (key: string, patch: Partial<DraftVariant>) => void;
}) {
  return (
    <Modal
      open={open}
      title={editing ? "Edit product" : "New product"}
      description="A product needs at least one variant. Each variant carries its own SKU, price and reorder level."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={crm.isPending}>
            {crm.isPending ? "Saving..." : editing ? "Save changes" : "Create product"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Product name" error={crm.fieldErrors.name}>
          <TextInput
            value={draft.name}
            autoFocus
            placeholder="e.g. Handwoven wool blanket"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand">
            <TextInput
              value={draft.brand}
              onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
            />
          </Field>

          <Field label="Category">
            <Select
              value={draft.categoryId}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" error={crm.fieldErrors.status}>
            <Select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>

          <Field label="Tags" hint="Comma separated">
            <TextInput
              value={draft.tags}
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
            />
          </Field>
        </div>

        <Field label="Description">
          <TextArea
            value={draft.description}
            rows={3}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
        </Field>

        <Field label="Image URLs" hint="One per line">
          <TextArea
            value={draft.imageUrls}
            rows={2}
            placeholder="https://example.com/blanket.jpg"
            onChange={(event) => setDraft({ ...draft, imageUrls: event.target.value })}
          />
        </Field>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variants
            </p>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              onClick={() =>
                setDraft({
                  ...draft,
                  variants: [...draft.variants, blankVariant(`v${Date.now()}`)],
                })
              }
            >
              Add variant
            </Button>
          </div>

          {crm.fieldErrors.variants && (
            <p role="alert" className="text-xs font-medium text-danger">
              {crm.fieldErrors.variants}
            </p>
          )}

          {draft.variants.map((variant, index) => (
            <div key={variant.key} className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Variant {index + 1}</p>
                {draft.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variants: draft.variants.filter((entry) => entry.key !== variant.key),
                      })
                    }
                    className="text-xs font-semibold text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="SKU" error={crm.fieldErrors[`variants.${index}.sku`]}>
                  <TextInput
                    value={variant.sku}
                    placeholder="BLK-001"
                    onChange={(event) => onVariantChange(variant.key, { sku: event.target.value })}
                  />
                </Field>

                <Field label="Title">
                  <TextInput
                    value={variant.title}
                    placeholder="Default"
                    onChange={(event) => onVariantChange(variant.key, { title: event.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Price" error={crm.fieldErrors[`variants.${index}.price`]}>
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.price}
                    onChange={(event) => onVariantChange(variant.key, { price: event.target.value })}
                  />
                </Field>

                <Field label="Compare at price">
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.compareAtPrice}
                    placeholder="Was-price"
                    onChange={(event) =>
                      onVariantChange(variant.key, { compareAtPrice: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cost price">
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.costPrice}
                    onChange={(event) =>
                      onVariantChange(variant.key, { costPrice: event.target.value })
                    }
                  />
                </Field>

                <Field label="Reorder level" hint="Low-stock alert threshold">
                  <TextInput
                    type="number"
                    min="0"
                    value={variant.reorderLevel}
                    onChange={(event) =>
                      onVariantChange(variant.key, { reorderLevel: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Barcode">
                  <TextInput
                    value={variant.barcode}
                    onChange={(event) =>
                      onVariantChange(variant.key, { barcode: event.target.value })
                    }
                  />
                </Field>

                <Field label="Weight (grams)">
                  <TextInput
                    type="number"
                    min="0"
                    value={variant.weightGrams}
                    onChange={(event) =>
                      onVariantChange(variant.key, { weightGrams: event.target.value })
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={variant.isActive}
                  onChange={(event) =>
                    onVariantChange(variant.key, { isActive: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Available for sale
              </label>
            </div>
          ))}
        </div>

        <FormMessage message={crm.status} />
      </form>
    </Modal>
  );
}