import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/org";
import CreateOrganizationForm from "./CreateOrganizationForm";

export default async function CreateOrganizationPage() {
  const membership = await getCurrentMembership();
  if (membership?.orgId) {
    redirect("/dashboard");
  }

  return <CreateOrganizationForm />;
}
