"use client";

import { useState } from "react";

type Field = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
};

function NumberField({ id, label, value, onChange }: Field) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </div>
  );
}

export default function MarginCalculator() {
  const [cost, setCost] = useState("1200");
  const [price, setPrice] = useState("1900");
  const [fees, setFees] = useState("300");

  const c = parseFloat(cost) || 0;
  const p = parseFloat(price) || 0;
  const f = parseFloat(fees) || 0;

  const profit = p - c - f;
  const margin = p > 0 ? (profit / p) * 100 : 0;
  const roi = c > 0 ? (profit / c) * 100 : 0;

  const tone =
    margin >= 25 ? "text-success" : margin >= 10 ? "text-warning" : "text-danger";
  const barColor =
    margin >= 25 ? "bg-success" : margin >= 10 ? "bg-warning" : "bg-danger";

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-base font-bold text-foreground">Estimate profit & margin</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Plug in real numbers before you buy. Ecomly does the math instantly.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <NumberField id="cost" label="Unit cost (₨)" value={cost} onChange={setCost} />
        <NumberField id="price" label="Selling price (₨)" value={price} onChange={setPrice} />
        <NumberField id="fees" label="Fees & shipping (₨)" value={fees} onChange={setFees} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-secondary p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Est. profit</p>
          <p className={`mt-1 text-xl font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}>
            ₨ {profit.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-surface-secondary p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Margin</p>
          <p className={`mt-1 text-xl font-bold ${tone}`}>{margin.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl bg-surface-secondary p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Return on cost</p>
          <p className={`mt-1 text-xl font-bold ${tone}`}>{roi.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {margin >= 25
            ? "Healthy margin — worth pursuing."
            : margin >= 10
            ? "Thin margin — negotiate cost or raise price."
            : "Negative or razor-thin — this one will lose you money."}
        </p>
      </div>
    </div>
  );
}
