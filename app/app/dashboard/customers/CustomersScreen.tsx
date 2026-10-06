"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Field,
  FormMessage,
  Modal,
  TextArea,
  TextInput,
} from "../components/form";
import { Card, EmptyState, PageHeader, StatCard } from "../components/ui";
import { useCrm } from "../components/useCrm";
import { initials, money } from "@/lib/format";

export interface CustomerAddress {
  label: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string;
  tags: string[];
  addresses: CustomerAddress[];
  imported: boolean;
  orderCount: number;
  lifetimeValue: number;
  createdAt?: string;
}

const BLANK_ADDRESS: CustomerAddress = {
  label: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "PK",
  isDefault: false,
};

const BLANK = {
  id: "",
  fullName: "",
  email: "",
  phone: "",
  notes: "",
  tags: "",
  addresses: [] as CustomerAddress[],
};

export function CustomersScreen({ initial }: { initial: Customer[] }) {
  const crm = useCrm();
  const [customers, setCustomers] = useState<Customer[]>(initial);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ ...BLANK });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Customer | null>(null);

  const editing = Boolean(draft.id);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;

    return customers.filter((customer) =>
      [customer.fullName, customer.email, customer.phone, ...customer.tags]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [customers, query]);

  const totals = useMemo(() => {
    const revenue = customers.reduce((sum, customer) => sum + customer.lifetimeValue, 0);
    const repeat = customers.filter((customer) => customer.orderCount > 1).length;
    const average = customers.length > 0 ? revenue / customers.length : 0;

    return { revenue, repeat, average };
  }, [customers]);

  function openCreate() {
    crm.reset();
    setDraft({ ...BLANK, addresses: [] });
    setOpen(true);
  }

  function openEdit(customer: Customer) {
    crm.reset();
    setDraft({
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
      tags: customer.tags.join(", "),
      addresses: customer.addresses.length > 0 ? customer.addresses : [addressCopy(BLANK_ADDRESS)],
    });
    setExpanded(customer.id);
    setOpen(true);
  }

  function updateAddress(index: number, patch: Partial<CustomerAddress>) {
    const addresses = draft.addresses.map((address, position) =>
      position === index ? { ...address, ...patch } : address
    );

    // One default only: promoting one address clears the flag on the others.
    if (patch.isDefault) {
      for (const [position, address] of addresses.entries()) {
        if (position !== index) addresses[position] = { ...address, isDefault: false };
      }
    }

    setDraft({ ...draft, addresses });
  }

  async function submit() {
    const payload = {
      id: draft.id || undefined,
      fullName: draft.fullName,
      email: draft.email,
      phone: draft.phone,
      notes: draft.notes,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      addresses: draft.addresses,
    };

    const result = editing
      ? await crm.update("/api/crm/customers", payload)
      : await crm.create("/api/crm/customers", payload);

    if (!result.ok) return;

    if (editing) {
      const saved = draft;

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === draft.id
            ? {
                ...customer,
                fullName: saved.fullName,
                email: saved.email,
                phone: saved.phone,
                notes: saved.notes,
                tags: payload.tags,
                addresses: payload.addresses.filter((address) => address.line1 && address.city),
              }
            : customer
        )
      );
    } else {
      const created = (result.data as { customer?: { id: string } }).customer;

      setCustomers((current) => [
        ...current,
        {
          id: created?.id ?? `pending-${Date.now()}`,
          fullName: draft.fullName,
          email: draft.email,
          phone: draft.phone,
          notes: draft.notes,
          tags: payload.tags,
          addresses: payload.addresses.filter((address) => address.line1 && address.city),
          imported: false,
          orderCount: 0,
          lifetimeValue: 0,
        },
      ]);
    }

    setOpen(false);
    setDraft({ ...BLANK });
  }

  async function confirmDelete() {
    if (!confirming) return;

    const result = await crm.remove("/api/crm/customers", { id: confirming.id });

    if (!result.ok) {
      setConfirming(null);
      return;
    }

    setCustomers((current) => current.filter((customer) => customer.id !== confirming.id));
    setConfirming(null);
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Everyone you have sold to. Attach contacts to orders and keep their delivery addresses on file."
        action={
          <Button onClick={openCreate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14m-7-7h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            New customer
          </Button>
        }
      />

      {customers.length > 0 && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <StatCard label="Customers" value={String(customers.length)} hint="On file" />
          <StatCard
            label="Repeat buyers"
            value={String(totals.repeat)}
            hint="More than one order"
            tone={totals.repeat > 0 ? "success" : "neutral"}
          />
          <StatCard
            label="Lifetime value"
            value={money(totals.revenue, "PKR")}
            hint={`${money(totals.average, "PKR")} average per customer`}
          />
        </div>
      )}

      {customers.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone or tag"
            aria-label="Search customers"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19m6-8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10 8v-1.5a3.5 3.5 0 0 0-2.6-3.4M15 4.1a3.5 3.5 0 0 1 0 6.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="No customers yet"
          description="Add a contact manually to keep their details and delivery addresses on file, or create one from an order."
          action={
            <Button onClick={openCreate}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14m-7-7h14"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              Add your first customer
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No customer matches &ldquo;{query}&rdquo;.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {visible.map((customer) => (
              <li key={customer.id}>
                <div className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-secondary">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-warning text-xs font-bold text-white">
                    {initials(customer.fullName)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {customer.fullName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {customer.email || customer.phone || "No contact details"}
                      {customer.tags.length > 0 ? ` · ${customer.tags.join(", ")}` : ""}
                    </p>
                  </div>

                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-foreground">
                      {money(customer.lifetimeValue, "PKR")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === customer.id ? null : customer.id)}
                    aria-expanded={expanded === customer.id}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    aria-label={`Show details for ${customer.fullName}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d={expanded === customer.id ? "m5 15 7-7 7 7" : "m5 9 7 7 7-7"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(customer)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                    aria-label={`Edit ${customer.fullName}`}
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
                    onClick={() => setConfirming(customer)}
                    disabled={customer.imported}
                    title={
                  customer.imported
                    ? "Synced from a marketplace — archive instead of deleting"
                    : "Delete"
                }
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    aria-label={`Delete ${customer.fullName}`}
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

                {expanded === customer.id && (
                  <div className="border-t border-border bg-surface-secondary/40 px-4 py-4">
                    {customer.notes && (
                      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                        {customer.notes}
                      </p>
                    )}

                    {customer.addresses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No addresses saved. Add one when editing this contact.
                      </p>
                    ) : (
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {customer.addresses.map((address, index) => (
                          <li
                            key={`${address.line1}-${index}`}
                            className="rounded-xl border border-border bg-surface p-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {address.label || "Address"}
                              {address.isDefault && " · Default"}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                              {address.line1}
                              {address.line2 ? <>, {address.line2}</> : null}
                              <br />
                              {address.city}
                              {address.state ? `, ${address.state}` : ""}{" "}
                              {address.postalCode}
                              <br />
                              {address.country}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={open}
        title={editing ? "Edit customer" : "New customer"}
        description="Details are optional except the name. Addresses can be reused on any order."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={crm.isPending}>
              {crm.isPending ? "Saving..." : editing ? "Save changes" : "Create customer"}
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
          <Field label="Full name" error={crm.fieldErrors.fullName}>
            <TextInput
              value={draft.fullName}
              autoFocus
              placeholder="e.g. Ayesha Khan"
              onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={crm.fieldErrors.email}>
              <TextInput
                type="email"
                value={draft.email}
                placeholder="name@example.com"
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </Field>

            <Field label="Phone">
              <TextInput
                type="tel"
                value={draft.phone}
                placeholder="+92 300 0000000"
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Tags" hint="Comma separated, e.g. vip, wholesale">
            <TextInput
              value={draft.tags}
              onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
            />
          </Field>

          <Field label="Notes">
            <TextArea
              value={draft.notes}
              placeholder="Preferences, payment terms, anything worth remembering"
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Addresses
              </p>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                onClick={() =>
                  setDraft({
                    ...draft,
                    addresses: [...draft.addresses, addressCopy(BLANK_ADDRESS)],
                  })
                }
              >
                Add address
              </Button>
            </div>

            {crm.fieldErrors.addresses && (
              <p role="alert" className="text-xs font-medium text-danger">
                {crm.fieldErrors.addresses}
              </p>
            )}

            {draft.addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No addresses yet. One line and a city is enough.
              </p>
            ) : (
              draft.addresses.map((address, index) => (
                <div key={index} className="space-y-3 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        id={`default-${index}`}
                        type="checkbox"
                        checked={address.isDefault}
                        onChange={(event) => updateAddress(index, { isDefault: event.target.checked })}
                        className="h-4 w-4 rounded border-border"
                      />
                      <label
                        htmlFor={`default-${index}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        Default address
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          addresses: draft.addresses.filter((_, position) => position !== index),
                        })
                      }
                      className="text-xs font-semibold text-danger"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Label">
                      <TextInput
                        value={address.label}
                        placeholder="Home, Office"
                        onChange={(event) => updateAddress(index, { label: event.target.value })}
                      />
                    </Field>

                    <Field label="Contact phone">
                      <TextInput
                        type="tel"
                        value={address.phone}
                        placeholder="+92 300 0000000"
                        onChange={(event) => updateAddress(index, { phone: event.target.value })}
                      />
                    </Field>
                  </div>

                  <Field label="Address line 1">
                    <TextInput
                      value={address.line1}
                      placeholder="Street and number"
                      onChange={(event) => updateAddress(index, { line1: event.target.value })}
                    />
                  </Field>

                  <Field label="Address line 2">
                    <TextInput
                      value={address.line2}
                      onChange={(event) => updateAddress(index, { line2: event.target.value })}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="City">
                      <TextInput
                        value={address.city}
                        onChange={(event) => updateAddress(index, { city: event.target.value })}
                      />
                    </Field>

                    <Field label="Province / state">
                      <TextInput
                        value={address.state}
                        onChange={(event) => updateAddress(index, { state: event.target.value })}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Postal code">
                      <TextInput
                        value={address.postalCode}
                        onChange={(event) =>
                          updateAddress(index, { postalCode: event.target.value })
                        }
                      />
                    </Field>

                    <Field label="Country code">
                      <TextInput
                        value={address.country}
                        placeholder="PK"
                        onChange={(event) =>
                          updateAddress(index, { country: event.target.value.toUpperCase() })
                        }
                      />
                    </Field>
                  </div>
                </div>
              ))
            )}
          </div>

          <FormMessage message={crm.status} />
        </form>
      </Modal>

      <Modal
        open={Boolean(confirming)}
        title="Delete customer"
        description={
          confirming
            ? `"${confirming.fullName}" can only be deleted while no orders reference them.`
            : undefined
        }
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={crm.isPending}>
              {crm.isPending ? "Deleting..." : "Delete customer"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">This cannot be undone.</p>
      </Modal>
    </div>
  );
}

function addressCopy(address: CustomerAddress): CustomerAddress {
  return { ...address };
}