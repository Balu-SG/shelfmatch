import type { Metadata } from "next";
import { MyStorefront } from "@/components/MyStorefront";
import { Storefront } from "@/components/Storefront";
import { DEMO_PRODUCTS, DEMO_STORE } from "@/data/demo-store";

export const metadata: Metadata = { title: `${DEMO_STORE.name} · ShelfMatch demo` };

// /demo is the fictional demo store; /demo?store=mine previews a catalog
// imported on /onboard.
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams;
  if (store === "mine") return <MyStorefront />;
  return <Storefront storeName={DEMO_STORE.name} products={DEMO_PRODUCTS} fictional />;
}
