import { EmptyState, PageHeader, PrimaryAction } from "../components/ui";

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="Products"
        description="Your full catalog — variants, SKUs, pricing, categories and status."
      />

      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        }
        title="No products yet"
        description="Once you add products they'll appear here with variants, stock levels and pricing. Start by researching something worth selling."
        action={
          <PrimaryAction href="/dashboard/research">
            Research a product
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </PrimaryAction>
        }
      />
    </div>
  );
}
