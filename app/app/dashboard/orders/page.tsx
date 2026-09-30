import { EmptyState, PageHeader, PrimaryAction, StatCard } from "../components/ui";

export default function OrdersPage() {
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order in one place. Confirming an order automatically reduces inventory."
      />

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Open orders" value="0" hint="Pending or processing" />
        <StatCard label="Fulfilled (30d)" value="0" hint="Shipped or delivered" />
        <StatCard label="Order value (30d)" value="₨ 0" hint="Gross merchandise value" />
      </div>

      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Zm0 7 2 2 4-4"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        }
        title="No orders yet"
        description="When your first order arrives — manually or synced from eBay — it will show up here ready to confirm and fulfil."
        action={<PrimaryAction href="/dashboard/integrations">Connect a channel</PrimaryAction>}
      />
    </div>
  );
}
