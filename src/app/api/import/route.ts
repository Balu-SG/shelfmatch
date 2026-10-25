import { NextResponse } from "next/server";
import { importShopify, parseCsv } from "@/lib/catalog";
import { tagWithKeywords } from "@/lib/keyword-tagger";
import { tagProducts } from "@/lib/tagger";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PRODUCTS = 250;

// POST { url } for a Shopify store, or multipart { csv } → tagged catalog.
// Tags with Claude when ANTHROPIC_API_KEY is set, otherwise with keyword rules.
export async function POST(req: Request) {
  let source: string;
  let products: Product[];
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const file = (await req.formData()).get("csv");
      if (!(file instanceof File)) return NextResponse.json({ error: "Attach a CSV as 'csv'." }, { status: 400 });
      source = file.name;
      products = parseCsv(await file.text());
    } else {
      const { url } = (await req.json()) as { url?: string };
      if (!url) return NextResponse.json({ error: "Send a store URL." }, { status: 400 });
      const imported = await importShopify(url);
      source = imported.domain;
      products = imported.products;
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (!products.length) return NextResponse.json({ error: "No products found." }, { status: 400 });
  const truncated = products.length > MAX_PRODUCTS;
  const batch = products.slice(0, MAX_PRODUCTS);

  let tagger: "claude" | "keywords" = process.env.ANTHROPIC_API_KEY ? "claude" : "keywords";
  let result = tagger === "claude" ? await tagProducts(batch) : tagWithKeywords(batch);
  // If Claude is misconfigured and every batch failed, fall back rather than return nothing.
  if (tagger === "claude" && result.failed.length === batch.length) {
    tagger = "keywords";
    result = tagWithKeywords(batch);
  }

  return NextResponse.json({
    source,
    tagger,
    found: products.length,
    truncated,
    tagged: result.tagged,
    skipped: result.skipped.map((p) => p.title),
    failed: result.failed.map((p) => p.title),
  });
}
