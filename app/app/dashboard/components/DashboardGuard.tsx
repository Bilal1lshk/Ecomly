import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardFrame from "./DashboardFrame";

export type GuardUser = {
  name: string;
  email: string;
  image: string | null;
};

/**
 * Server-side guard for every /dashboard route. Unauthenticated visitors are
 * redirected to /login before any dashboard chrome or content is rendered.
 */
export default async function DashboardGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user: GuardUser = {
    name: session.user.name ?? "Seller",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };

  return <DashboardFrame user={user}>{children}</DashboardFrame>;
}
