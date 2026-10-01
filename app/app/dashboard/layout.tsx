import type { Metadata } from "next";
import DashboardGuard from "./components/DashboardGuard";

export const metadata: Metadata = {
  title: "Dashboard · Ecomly",
  description: "Your Ecomly commerce operations workspace.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardGuard>{children}</DashboardGuard>;
}
