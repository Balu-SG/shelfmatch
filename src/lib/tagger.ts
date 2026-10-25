import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES, CONCERNS, type Product, type ProductTags } from "./types";

// AI catalog tagging: maps each product to YouCam skin concerns.

const MODEL = process.env.SHELFMATCH_TAG_MODEL ?? "claude-haiku-5-5";
const CHUNK = 10;
const CONCURRENCY = 4;

const SKIN_TYPES = ["normal", "oily", "dry", "combination", "sensitive"] as const;

const TagSchema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      skincare: z.boolean().describe("false for makeup, hair, body, tools, gift cards, bundles"),
      category: z.enum(CATEGORIES),
      concerns: z.array(
        z.object({
          concern: z.enum(CONCERNS),
          strength: z.number().describe("0.1 = slight benefit, 1.0 = primary purpose"),
        }),
      ),
      skin_types: z.array(z.enum(SKIN_TYPES)).describe("skin types it is made for; empty if all"),
      avoid_for: z.array(z.enum(SKIN_TYPES)).describe("skin types likely irritated by it"),
      key_ingredients: z.array(z.string()).describe("up to 3 actives, most important first"),
    }),
  ),
});

const SYSTEM = `You tag skincare products for a routine recommender that runs on YouCam skin-analysis scores.

For each product, decide from its title and description:
- category: cleanser, toner, serum, treatment (exfoliants, retinoids, masks, spot treatments, PM actives), moisturizer, spf (any product whose main job is sun protection), eye.
- concerns: only the ones the product genuinely addresses, with strength 0.1–1.0. Concern meanings: acne (blemishes), pore (enlarged pores), wrinkle (fine lines), texture (rough/uneven surface), redness (irritation/rosacea), oiliness (excess sebum/shine), moisture (dehydration/dryness), radiance (dullness), age_spot (hyperpigmentation/dark spots), dark_circle, eye_bag (puffiness), firmness (sagging/elasticity).
- skin_types and avoid_for: be conservative. Strong acids and retinoids → avoid_for sensitive. Heavy oils/butters → avoid_for oily. Drying actives (high-strength BHA, clay) → avoid_for dry.
- Base it on the ingredients named. Don't invent claims a description doesn't support.
- Set skincare=false for anything that is not a face skincare product.

Return one entry per input product, using the exact id given.`;

export interface TagResult {
  tagged: Product[];
  skipped: Product[];
  failed: Product[];
}

const client = () => new Anthropic();

async function tagChunk(products: Product[]): Promise<Map<string, ProductTags | null>> {
  const input = products
    .map((p) => `id: ${p.id}\ntitle: ${p.title}\nbrand: ${p.brand ?? ""}\ndescription: ${p.description ?? ""}`)
    .join("\n---\n");

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { format: zodOutputFormat(TagSchema), effort: "low" },
    system: SYSTEM,
    messages: [{ role: "user", content: input }],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined to tag this batch.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`Tagging returned no parseable output (${response.stop_reason}).`);

  const out = new Map<string, ProductTags | null>();
  for (const t of parsed.products) {
    if (!t.skincare) {
      out.set(t.id, null);
      continue;
    }
    out.set(t.id, {
      category: t.category,
      concerns: Object.fromEntries(
        t.concerns.map((c) => [c.concern, Math.min(1, Math.max(0, Math.round(c.strength * 10) / 10))]),
      ),
      skinTypes: t.skin_types,
      avoidFor: t.avoid_for,
      keyIngredients: t.key_ingredients.slice(0, 3),
    });
  }
  return out;
}

export async function tagProducts(products: Product[]): Promise<TagResult> {
  const chunks: Product[][] = [];
  for (let i = 0; i < products.length; i += CHUNK) chunks.push(products.slice(i, i + CHUNK));

  const results = new Map<string, ProductTags | null>();
  const failedIds = new Set<string>();
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++];
      try {
        for (const [id, tags] of await tagChunk(chunk)) results.set(id, tags);
      } catch (err) {
        console.error("tagChunk failed:", err);
        for (const p of chunk) failedIds.add(p.id);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));

  const result: TagResult = { tagged: [], skipped: [], failed: [] };
  for (const p of products) {
    const tags = results.get(p.id);
    if (failedIds.has(p.id) || tags === undefined) result.failed.push(p);
    else if (tags === null) result.skipped.push(p);
    else result.tagged.push({ ...p, tags });
  }
  return result;
}
