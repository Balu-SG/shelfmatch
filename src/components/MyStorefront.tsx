"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadCatalog, type ImportedCatalog } from "@/lib/events";
import { Storefront } from "./Storefront";

// Storefront preview for a catalog imported on /onboard (kept in this browser).
export function MyStorefront() {
  const [catalog, setCatalog] = useState<ImportedCatalog | null | undefined>(undefined);
  useEffect(() => setCatalog(loadCatalog()), []);

  if (catalog === undefined) return <div className="p-24 text-center text-muted">Loading your catalog…</div>;
  if (!catalog) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="text-xl font-semibold">No store imported yet</h1>
        <p className="mt-2 text-muted">Import your Shopify catalog first, then preview the skin match on it.</p>
        <Link href="/onboard" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-medium text-white">
          Add your store
        </Link>
      </div>
    );
  }
  return <Storefront storeName={catalog.source} products={catalog.products} />;
}
