import "server-only";
import type { Product } from "./types";

// Catalog import: Shopify's public products.json, or a CSV export.

const MAX_PAGES = 4; // 4 × 250 = 1,000 products is plenty for a demo

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  body_html: string | null;
  tags: string[] | string;
  variants: { id: number; price: string; available?: boolean }[];
  images: { src: string }[];
}

export function normalizeDomain(input: string): string {
  const url = new URL(/^https?:\/\//.test(input) ? input : `https://${input}`);
  return url.host;
}

export function stripHtml(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function importShopify(storeUrl: string): Promise<{ domain: string; products: Product[] }> {
  const domain = normalizeDomain(storeUrl);
  const products: Product[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`https://${domain}/products.json?limit=250&page=${page}`, {
      headers: { "User-Agent": "ShelfMatch/0.1 (catalog import)" },
      cache: "no-store",
    });
    if (!res.ok) {
      if (page === 1) {
        throw new Error(
          `Couldn't read ${domain}/products.json (HTTP ${res.status}). Is it a Shopify store? Try CSV upload instead.`,
        );
      }
      break;
    }
    const { products: batch } = (await res.json()) as { products: ShopifyProduct[] };
    if (!batch?.length) break;
    for (const p of batch) {
      const variant = p.variants[0];
      if (!variant) continue;
      products.push({
        id: String(p.id),
        title: p.title,
        brand: p.vendor,
        price: Number(variant.price),
        currency: "USD", // products.json doesn't expose currency
        imageUrl: p.images[0]?.src,
        url: `https://${domain}/products/${p.handle}`,
        variantId: String(variant.id),
        productType: p.product_type || undefined,
        description: [p.product_type, Array.isArray(p.tags) ? p.tags.join(", ") : p.tags, stripHtml(p.body_html)]
          .filter(Boolean)
          .join(" | ")
          .slice(0, 2000),
      });
    }
    if (batch.length < 250) break;
  }
  return { domain, products };
}

// Minimal CSV parser (quoted fields, escaped quotes). Expects a header row with
// at least title and price; description/brand/image/url are optional.
export function parseCsv(text: string): Product[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];
  const col = (...names: string[]) =>
    header.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const idx = {
    title: col("title", "name", "product", "product name"),
    price: col("price", "variant price"),
    description: col("description", "body", "body (html)", "ingredients"),
    brand: col("brand", "vendor"),
    image: col("image", "image src", "image url"),
    url: col("url", "link"),
    type: col("type", "product type", "category"),
  };
  if (idx.title < 0 || idx.price < 0) throw new Error("CSV needs 'title' and 'price' columns.");

  return body
    .filter((r) => r[idx.title]?.trim())
    .map((r, i) => ({
      id: `csv-${i + 1}`,
      title: r[idx.title].trim(),
      price: Number(String(r[idx.price]).replace(/[^0-9.]/g, "")) || 0,
      currency: "USD",
      brand: idx.brand >= 0 ? r[idx.brand]?.trim() : undefined,
      imageUrl: idx.image >= 0 ? r[idx.image]?.trim() || undefined : undefined,
      url: idx.url >= 0 ? r[idx.url]?.trim() || undefined : undefined,
      productType: idx.type >= 0 ? r[idx.type]?.trim() || undefined : undefined,
      description: idx.description >= 0 ? stripHtml(r[idx.description]).slice(0, 2000) : undefined,
    }));
}
