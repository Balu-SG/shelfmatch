import type { Category, Concern, Product, ProductTags, SkinType } from "./types";

// Rule-based fallback tagger: reads titles and descriptions for product types
// and known actives. Used when no Anthropic key is configured, so onboarding
// always works. Claude (tagger.ts) is more accurate and handles odd wording.

// Store product types that are never face skincare.
const SKIP_TYPES = /makeup|cosmetic|merch|fragrance|perfume|collateral|body|balm|lip|gift|hair|accessor|tool|apparel|candle|bundle|\bsets?\b|sample/i;

const NOT_SKINCARE =
  /\b(duo|trio|package|brush|spritz|hand cream|lip ?(stick|gloss|liner|balm)|mascara|brow|foundation|concealer|blush|bronzer|highlighter|palette|eyeliner|eye ?shadow|nail|fragrance|perfume|eau de|candle|gift ?card|shampoo|conditioner|hair|body (wash|lotion|oil)|deodorant|merch|hat|tote|sweatshirt|bundle|kit|set)\b/i;

// Order matters: the first match wins.
const CATEGORY_RULES: [Category, RegExp][] = [
  ["spf", /\b(spf|sunscreen|sun ?screen|uv ?(filter|protect))/i],
  ["eye", /\beye (cream|gel|serum|balm|mask)|under[- ]eye/i],
  ["cleanser", /\b(cleans|wash|micellar|cleansing)/i],
  ["treatment", /\b(retin|peel|mask|exfoliat|spot|blemish patch|resurfac)/i],
  ["toner", /\b(toner|essence|mist|tonic)\b/i],
  ["serum", /\b(serum|ampoule|drops|booster|concentrate|oil)\b/i],
  ["moisturizer", /\b(moistur\w*|cream|lotion|gel[- ]cream|hydrator|emulsion|balm)\b/i],
];

const ACTIVES: { re: RegExp; name: string; concerns: Partial<Record<Concern, number>>; avoid?: SkinType[] }[] = [
  { re: /salicylic|\bbha\b/i, name: "salicylic acid", concerns: { acne: 0.7, pore: 0.6, oiliness: 0.4 }, avoid: ["dry", "sensitive"] },
  { re: /benzoyl|tea tree/i, name: "tea tree / benzoyl", concerns: { acne: 0.8 }, avoid: ["sensitive"] },
  { re: /azelaic/i, name: "azelaic acid", concerns: { redness: 0.6, acne: 0.6, age_spot: 0.4 } },
  { re: /niacinamide/i, name: "niacinamide", concerns: { pore: 0.7, oiliness: 0.6, redness: 0.3, age_spot: 0.3 } },
  { re: /retinol|retinal|retinoid|retinyl/i, name: "retinoid", concerns: { wrinkle: 0.8, firmness: 0.5, texture: 0.5 }, avoid: ["sensitive"] },
  { re: /bakuchiol/i, name: "bakuchiol", concerns: { wrinkle: 0.6, firmness: 0.4 } },
  { re: /peptide/i, name: "peptides", concerns: { firmness: 0.7, wrinkle: 0.6 } },
  { re: /hyaluronic/i, name: "hyaluronic acid", concerns: { moisture: 0.8 } },
  { re: /ceramide/i, name: "ceramides", concerns: { moisture: 0.7, redness: 0.4 } },
  { re: /squalane/i, name: "squalane", concerns: { moisture: 0.6 } },
  { re: /vitamin c|ascorbic/i, name: "vitamin C", concerns: { radiance: 0.8, age_spot: 0.6 } },
  { re: /glycolic|lactic|mandelic|\baha\b/i, name: "AHA", concerns: { texture: 0.7, radiance: 0.5 }, avoid: ["sensitive"] },
  { re: /\bpha\b|gluconolactone/i, name: "PHA", concerns: { texture: 0.5 } },
  { re: /tranexamic|kojic|arbutin|dark spot|hyperpigment/i, name: "brightening actives", concerns: { age_spot: 0.7, radiance: 0.4 } },
  { re: /centella|cica|madecassoside/i, name: "centella", concerns: { redness: 0.7 } },
  { re: /colloidal oat|allantoin|aloe|soothing|calming/i, name: "soothing agents", concerns: { redness: 0.5 } },
  { re: /clay|kaolin|bentonite|charcoal/i, name: "clay", concerns: { oiliness: 0.7, pore: 0.5 }, avoid: ["dry"] },
  { re: /mattif|oil[- ]control|oil[- ]free|shine/i, name: "oil control", concerns: { oiliness: 0.6 } },
  { re: /caffeine/i, name: "caffeine", concerns: { eye_bag: 0.7, dark_circle: 0.4 } },
  { re: /vitamin k|dark circle/i, name: "vitamin K", concerns: { dark_circle: 0.7 } },
  { re: /hydrat|moistur|glycerin/i, name: "humectants", concerns: { moisture: 0.5 } },
  { re: /glow|radian|bright|dull/i, name: "glow", concerns: { radiance: 0.5 } },
  { re: /firm|lift|elastic/i, name: "firming", concerns: { firmness: 0.5 } },
  { re: /pore/i, name: "pore care", concerns: { pore: 0.5 } },
];

const TYPE_WORDS: [SkinType, RegExp][] = [
  ["oily", /\boily\b|acne[- ]prone/i],
  ["dry", /\bdry\b|dehydrated/i],
  ["combination", /combination/i],
  ["sensitive", /sensitive|reactive/i],
  ["normal", /\bnormal\b/i],
];

export function tagProduct(p: Product): ProductTags | null {
  const text = `${p.title} ${p.description ?? ""}`;
  const title = p.title;
  const category = CATEGORY_RULES.find(([, re]) => re.test(title))?.[0] ?? CATEGORY_RULES.find(([, re]) => re.test(text))?.[0];
  if (p.productType && SKIP_TYPES.test(p.productType)) return null;
  if (!category || (NOT_SKINCARE.test(title) && category !== "spf")) return null;

  const concerns: Partial<Record<Concern, number>> = {};
  const keyIngredients: string[] = [];
  const avoid = new Set<SkinType>();
  for (const a of ACTIVES) {
    if (!a.re.test(text)) continue;
    keyIngredients.push(a.name);
    a.avoid?.forEach((t) => avoid.add(t));
    for (const [c, s] of Object.entries(a.concerns)) {
      concerns[c as Concern] = Math.max(concerns[c as Concern] ?? 0, s ?? 0);
    }
  }
  if (category === "spf") {
    concerns.age_spot = Math.max(concerns.age_spot ?? 0, 0.5);
    concerns.wrinkle = Math.max(concerns.wrinkle ?? 0, 0.3);
  }
  if (/\b(rich|butter|balm)\b/i.test(text)) avoid.add("oily");
  const skinTypes = TYPE_WORDS.filter(([, re]) => re.test(text)).map(([t]) => t);
  return {
    category,
    concerns,
    skinTypes,
    avoidFor: [...avoid].filter((t) => !skinTypes.includes(t)),
    keyIngredients: keyIngredients.filter((k) => !["humectants", "glow", "firming", "pore care", "oil control"].includes(k)).slice(0, 3),
  };
}

export function tagWithKeywords(products: Product[]) {
  const tagged: Product[] = [];
  const skipped: Product[] = [];
  for (const p of products) {
    const tags = tagProduct(p);
    if (tags) tagged.push({ ...p, tags });
    else skipped.push(p);
  }
  return { tagged, skipped, failed: [] as Product[] };
}
