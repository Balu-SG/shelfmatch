import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SellerShell } from "@/components/SellerShell";

export const metadata: Metadata = { title: "Insights · ShelfMatch" };

export default function DashboardPage() {
  return (
    <SellerShell active="dashboard">
      <Dashboard />
    </SellerShell>
  );
}
