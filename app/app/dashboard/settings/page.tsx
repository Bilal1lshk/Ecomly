import { Card, EmptyState, PageHeader } from "../components/ui";

const FIELDS = [
  ["Workspace name", "My Store"],
  ["Currency", "PKR"],
  ["Timezone", "Asia/Karachi"],
  ["Order prefix", "ORD"],
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace profile, members and roles."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base font-bold text-foreground">Workspace</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Defaults applied across products, orders and reports.
          </p>
          <dl className="mt-5 divide-y divide-border">
            {FIELDS.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div>
          <h3 className="mb-4 text-base font-bold text-foreground">Members & roles</h3>
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            }
            title="You're the only member"
            description="Invite teammates and assign owner, admin, manager or staff roles to control who can do what."
          />
        </div>
      </div>
    </div>
  );
}
