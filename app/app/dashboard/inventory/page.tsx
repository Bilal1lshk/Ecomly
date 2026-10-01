import { EmptyState, PageHeader, PrimaryAction, StatCard } from "../components/ui";

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, low-stock alerts and a full movement history per variant."
      />

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Units on hand" value="0" hint="Across all locations" />
        <StatCard label="Low stock" value="0" tone="success" hint="Nothing below reorder level" />
        <StatCard label="Movements (30d)" value="0" hint="Stock in / out / adjustments" />
      </div>

      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M4 7h16M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11h6"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        }
        title="No stock to track yet"
        description="Inventory tracks itself once you add products and confirm orders. Add your first product to start seeing live levels here."
        action={<PrimaryAction href="/dashboard/products">Go to products</PrimaryAction>}
      />
    </div>
  );
}
