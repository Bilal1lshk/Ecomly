"use client";

import { useMemo, useState } from "react";
import { Button, Field, FormMessage, Modal, Select, TextArea, TextInput } from "../components/form";
import { Card, EmptyState, StatCard } from "../components/ui";
import { useCrm } from "../components/useCrm";
import { formatDateTime } from "@/lib/format";

export interface StockRow {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  variantTitle: string;
  reorderLevel: number;
  quantity: number;
  reserved: number;
  locationId: string;
  locationName: string;
  price: number;
  imageUrl: string;
}

export interface StockLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface MovementRow {
  id: string;
  productName: string;
  type: string;
  quantityChange: number;
  note: string;
  createdAt?: string | Date;
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Stock in",
  sale: "Sale",
  return: "Return",
  adjustment: "Adjustment",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

const BLANK_ADJUSTMENT = {
  productId: "",
  variantId: "",
  locationId: "",
  type: "purchase",
  quantity: "",
  note: "",
};

const BLANK_LOCATION = { id: "", name: "", address: "", city: "", isDefault: false };

/**
 * Manual stock management.
 *
 * Quantities are never edited directly: every change is recorded as a movement
 * through /api/crm/inventory so the history explains the current count. The
 * `adjustment` type is the exception — it sets an absolute count, which is what
 * a seller means after physically counting stock.
 */
export function InventoryManager({
  initial,
  locations,
  movements,
}: {
  initial: StockRow[];
  locations: StockLocation[];
  movements: MovementRow[];
}) {
  const crm = useCrm();
  const [rows, setRows] = useState<StockRow[]>(initial);
  const [allLocations, setAllLocations] = useState<StockLocation[]>(locations);
  const [history, setHistory] = useState<MovementRow[]>(movements);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const [adjust, setAdjust] = useState({ ...BLANK_ADJUSTMENT });
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [locationDraft, setLocationDraft] = useState({ ...BLANK_LOCATION });
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationEditing, setLocationEditing] = useState(false);
  const [confirmingLocation, setConfirmingLocation] = useState<StockLocation | null>(null);

  const totals = useMemo(() => {
    const units = rows.reduce((sum, row) => sum + row.quantity, 0);
    const low = rows.filter((row) => row.quantity > 0 && row.quantity <= row.reorderLevel).length;
    const out = rows.filter((row) => row.quantity === 0).length;
    const value = rows.reduce((sum, row) => sum + row.quantity * row.price, 0);

    return { units, low, out, value };
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (filter === "low" && !(row.quantity > 0 && row.quantity <= row.reorderLevel)) {
        return false;
      }
      if (filter === "out" && row.quantity !== 0) return false;
      if (!needle) return true;

      return `${row.productName} ${row.sku} ${row.locationName}`.toLowerCase().includes(needle);
    });
  }, [rows, query, filter]);

  function openAdjust(row?: StockRow) {
    crm.reset();
    setAdjust({
      ...BLANK_ADJUSTMENT,
      productId: row?.productId ?? "",
      variantId: row?.variantId ?? "",
      locationId: row?.locationId || allLocations[0]?.id || "",
      type: row ? "adjustment" : "purchase",
    });
    setAdjustOpen(true);
  }

  async function submitAdjustment() {
    const result = await crm.create("/api/crm/inventory", {
      productId: adjust.productId,
      variantId: adjust.variantId || null,
      locationId: adjust.locationId || null,
      type: adjust.type,
      quantityChange: adjust.quantity,
      note: adjust.note,
    });

    if (!result.ok) return;

    const { quantity, applied } = result.data as { quantity: number; applied: number };

    setRows((current) =>
      current.map((row) =>
        row.variantId === adjust.variantId && row.locationId === adjust.locationId
          ? { ...row, quantity }
          : row
      )
    );

    setHistory((current) => [
      {
        id: `pending-${Date.now()}`,
        productName:
          rows.find((row) => row.variantId === adjust.variantId)?.productName ?? "Product",
        type: adjust.type,
        quantityChange: applied,
        note: adjust.note,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);

    setAdjustOpen(false);
    setAdjust({ ...BLANK_ADJUSTMENT });
  }

  function openLocationCreate() {
    crm.reset();
    setLocationDraft({ ...BLANK_LOCATION });
    setLocationEditing(false);
    setLocationOpen(true);
  }

  function openLocationEdit(location: StockLocation) {
    crm.reset();
    setLocationDraft({
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      isDefault: location.isDefault,
    });
    setLocationEditing(true);
    setLocationOpen(true);
  }

  async function submitLocation() {
    const payload = { ...locationDraft, isActive: true };

    const result = locationEditing
      ? await crm.update("/api/crm/locations", payload)
      : await crm.create("/api/crm/locations", payload);

    if (!result.ok) return;

    if (locationEditing) {
      setAllLocations((current) =>
        current.map((location) =>
          location.id === locationDraft.id
            ? {
                ...location,
                name: locationDraft.name,
                address: locationDraft.address,
                city: locationDraft.city,
                isDefault: locationDraft.isDefault,
              }
            : location.isDefault && locationDraft.isDefault
              ? { ...location, isDefault: false }
              : location
        )
      );
    } else {
      const created = (result.data as { location?: StockLocation }).location;

      setAllLocations((current) =>
        created ? [...current, created].sort((a, b) => a.name.localeCompare(b.name)) : current
      );
    }

    setLocationOpen(false);
    setLocationDraft({ ...BLANK_LOCATION });
  }

  async function confirmLocationDelete() {
    if (!confirmingLocation) return;

    const result = await crm.remove("/api/crm/locations", { id: confirmingLocation.id });

    if (!result.ok) {
      setConfirmingLocation(null);
      return;
    }

    setAllLocations((current) => current.filter((entry) => entry.id !== confirmingLocation.id));
    setConfirmingLocation(null);
  }

  return (
    <>
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Units on hand"
          value={String(totals.units)}
          hint={`Across ${allLocations.length} location${allLocations.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Needs attention"
          value={String(totals.low + totals.out)}
          hint={`${totals.low} low · ${totals.out} out of stock`}
          tone={totals.low + totals.out > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Stock value"
          value={totals.value.toFixed(0)}
          hint="At current sale price"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product, SKU or location"
          aria-label="Search stock"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />

        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          {(["all", "low", "out"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === option
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "all" ? "All" : option === "low" ? "Low" : "Out"}
            </button>
          ))}
        </div>

        <Button onClick={() => openAdjust()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14m-7-7h14"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          Adjust stock
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11h6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              title="No stock to track yet"
              description="Add products with variants, then record stock in here. Sync from a marketplace to pull your listing quantities in automatically."
            />
          ) : visible.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No stock matches those filters.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Stock levels</p>
                {totals.low > 0 && (
                  <p className="text-xs font-semibold text-warning">{totals.low} below reorder</p>
                )}
              </div>

              <ul className="divide-y divide-border">
                {visible.map((row) => {
                  const isLow = row.quantity > 0 && row.quantity <= row.reorderLevel;
                  const isOut = row.quantity === 0;

                  return (
                    <li
                      key={`${row.variantId}-${row.locationId}`}
                      className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-surface-secondary"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary text-xs font-bold text-muted-foreground ring-1 ring-border">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          row.productName.slice(0, 2).toUpperCase()
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.productName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.sku ? `SKU ${row.sku}` : "No SKU"}
                          {row.variantTitle && row.variantTitle !== "Default"
                            ? ` · ${row.variantTitle}`
                            : ""}
                          {` · reorder at ${row.reorderLevel}`}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {row.locationName}
                      </span>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isOut
                            ? "bg-danger/10 text-danger"
                            : isLow
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                        }`}
                      >
                        {isOut ? "Out of stock" : isLow ? "Low" : "In stock"}
                      </span>

                      <span className="w-12 shrink-0 text-right text-sm font-semibold text-foreground">
                        {row.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => openAdjust(row)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                        aria-label={`Adjust stock for ${row.productName}`}
                        title="Adjust"
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
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Locations</p>
              <button
                type="button"
                onClick={openLocationCreate}
                className="text-xs font-semibold text-primary"
              >
                Add
              </button>
            </div>

            {allLocations.length === 0 ? (
              <p className="p-4 text-sm leading-relaxed text-muted-foreground">
                No locations yet. Add one so stock has somewhere to sit.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {allLocations.map((location) => (
                  <li
                    key={location.id}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {location.name}
                        {location.isDefault && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            default
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[location.city, location.address].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openLocationEdit(location)}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                      aria-label={`Edit ${location.name}`}
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
                      onClick={() => setConfirmingLocation(location)}
                      disabled={allLocations.length <= 1}
                      title={
                        allLocations.length <= 1
                          ? "A workspace needs at least one location"
                          : "Delete"
                      }
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                      aria-label={`Delete ${location.name}`}
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
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Recent movements</p>
            </div>

            {history.length === 0 ? (
              <p className="p-4 text-sm leading-relaxed text-muted-foreground">
                Nothing recorded yet. Every stock change appears here with its reason.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {history.map((movement) => {
                  const up = movement.quantityChange > 0;

                  return (
                    <li key={movement.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-foreground">
                          {movement.productName}
                        </p>
                        <span
                          className={`shrink-0 text-sm font-semibold ${
                            up ? "text-success" : "text-danger"
                          }`}
                        >
                          {up ? "+" : ""}
                          {movement.quantityChange}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {MOVEMENT_LABELS[movement.type] ?? movement.type} ·{" "}
                        {formatDateTime(movement.createdAt)}
                      </p>
                      {movement.note && (
                        <p className="mt-1 text-xs italic text-muted-foreground">{movement.note}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={adjustOpen}
        title="Adjust stock"
        description="Record why the quantity changed. Stock in adds units, a count sets the exact number on hand."
        onClose={() => setAdjustOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAdjustment} disabled={crm.isPending}>
              {crm.isPending ? "Saving..." : "Record movement"}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitAdjustment();
          }}
        >
          <Field label="Product" error={crm.fieldErrors.productId}>
            <Select
              value={adjust.productId}
              onChange={(event) => {
                const row = rows.find((entry) => entry.productId === event.target.value);
                setAdjust({
                  ...adjust,
                  productId: event.target.value,
                  variantId: row?.variantId ?? "",
                  locationId: row?.locationId || adjust.locationId,
                });
              }}
            >
              <option value="">Choose a product</option>
              {uniqueProducts(rows).map((entry) => (
                <option key={entry.productId} value={entry.productId}>
                  {entry.productName}
                </option>
              ))}
            </Select>
          </Field>

          {variantsFor(rows, adjust.productId).length > 1 && (
            <Field label="Variant">
              <Select
                value={adjust.variantId}
                onChange={(event) => setAdjust({ ...adjust, variantId: event.target.value })}
              >
                {variantsFor(rows, adjust.productId).map((row) => (
                  <option key={row.variantId} value={row.variantId}>
                    {row.variantTitle && row.variantTitle !== "Default"
                      ? row.variantTitle
                      : row.sku || "Default"}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Location" error={crm.fieldErrors.locationId}>
            <Select
              value={adjust.locationId}
              onChange={(event) => setAdjust({ ...adjust, locationId: event.target.value })}
            >
              <option value="">Choose a location</option>
              {allLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Movement type">
            <Select
              value={adjust.type}
              onChange={(event) => setAdjust({ ...adjust, type: event.target.value })}
            >
              <option value="purchase">Stock in — received from a supplier</option>
              <option value="adjustment">Count — set the exact quantity</option>
              <option value="return">Return — customer sent stock back</option>
              <option value="transfer_in">Transfer in</option>
              <option value="transfer_out">Transfer out</option>
            </Select>
          </Field>

          <Field
            label={adjust.type === "adjustment" ? "Quantity on hand" : "Quantity change"}
            hint={
              adjust.type === "adjustment"
                ? "The count after the adjustment"
                : "Positive to add, negative to remove"
            }
            error={crm.fieldErrors.quantityChange}
          >
            <TextInput
              type="number"
              min={adjust.type === "adjustment" ? "0" : undefined}
              value={adjust.quantity}
              onChange={(event) => setAdjust({ ...adjust, quantity: event.target.value })}
            />
          </Field>

          <Field label="Note">
            <TextInput
              value={adjust.note}
              placeholder="e.g. Restocked from supplier"
              onChange={(event) => setAdjust({ ...adjust, note: event.target.value })}
            />
          </Field>

          <FormMessage message={crm.status} />
        </form>
      </Modal>

      <Modal
        open={locationOpen}
        title={locationEditing ? "Edit location" : "New location"}
        description="Where your stock physically sits. Stock levels are tracked per location."
        onClose={() => setLocationOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLocationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLocation} disabled={crm.isPending}>
              {crm.isPending ? "Saving..." : locationEditing ? "Save changes" : "Create location"}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitLocation();
          }}
        >
          <Field label="Name" error={crm.fieldErrors.name}>
            <TextInput
              value={locationDraft.name}
              autoFocus
              placeholder="e.g. Main warehouse"
              onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })}
            />
          </Field>

          <Field label="City">
            <TextInput
              value={locationDraft.city}
              onChange={(event) => setLocationDraft({ ...locationDraft, city: event.target.value })}
            />
          </Field>

          <Field label="Address">
            <TextArea
              value={locationDraft.address}
              rows={2}
              onChange={(event) =>
                setLocationDraft({ ...locationDraft, address: event.target.value })
              }
            />
          </Field>

          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={locationDraft.isDefault}
              onChange={(event) =>
                setLocationDraft({ ...locationDraft, isDefault: event.target.checked })
              }
              className="h-4 w-4 rounded border-border"
            />
            Use as the default location for orders and movements
          </label>

          <FormMessage message={crm.status} />
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmingLocation)}
        title="Delete location"
        description={
          confirmingLocation
            ? `"${confirmingLocation.name}" can only be deleted once no stock sits there.`
            : undefined
        }
        onClose={() => setConfirmingLocation(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingLocation(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmLocationDelete}
              disabled={crm.isPending}
            >
              {crm.isPending ? "Deleting..." : "Delete location"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">This cannot be undone.</p>
      </Modal>
    </>
  );
}

function uniqueProducts(rows: StockRow[]) {
  const seen = new Map<string, string>();

  for (const row of rows) {
    if (!seen.has(row.productId)) seen.set(row.productId, row.productName);
  }

  return [...seen.entries()].map(([productId, productName]) => ({ productId, productName }));
}

function variantsFor(rows: StockRow[], productId: string): StockRow[] {
  if (!productId) return [];
  return rows.filter((row) => row.productId === productId);
}