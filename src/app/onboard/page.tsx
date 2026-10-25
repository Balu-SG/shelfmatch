import type { Metadata } from "next";
import { Onboard } from "@/components/Onboard";
import { SellerShell } from "@/components/SellerShell";

export const metadata: Metadata = { title: "Add your store · ShelfMatch" };

export default function OnboardPage() {
  return (
    <SellerShell active="onboard">
      <Onboard />
    </SellerShell>
  );
}
