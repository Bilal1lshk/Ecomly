import MarginCalculator from "../components/MarginCalculator";
import { EmptyState, PageHeader } from "../components/ui";

export default function ResearchPage() {
  return (
    <div>
      <PageHeader
        title="Product research"
        description="Evaluate products before you buy. Ecomly auto-calculates estimated profit and margin."
      />

      <MarginCalculator />

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Saved research
        </h3>
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          }
          title="Nothing saved yet"
          description="Products you save while evaluating will collect here with their projected margin, so you can compare before committing."
        />
      </div>
    </div>
  );
}
