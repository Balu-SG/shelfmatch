import type { Category, Concern, Product, SkinType } from "@/lib/types";

// Fictional demo store. Tags are pre-filled in the same shape the AI tagger
// produces, so the demo works without an Anthropic key. Oil control is
// intentionally under-stocked so the gap finder has something to find.

export const DEMO_STORE = {
  id: "demo",
  name: "Dewdrop Apothecary",
  domain: "dewdrop.demo",
  currency: "USD",
};

type Row = [
  id: string,
  title: string,
  price: number,
  category: Category,
  concerns: Partial<Record<Concern, number>>,
  ingredients: string[],
  skinTypes?: SkinType[],
  avoidFor?: SkinType[],
];

const rows: Row[] = [
  // Cleansers
  ["cl-milk", "Oat Milk Cream Cleanser", 18, "cleanser", { moisture: 0.5, redness: 0.4 }, ["colloidal oat", "glycerin"], ["dry", "sensitive"]],
  ["cl-gel", "Green Tea Gel Cleanser", 16, "cleanser", { oiliness: 0.4, pore: 0.3 }, ["green tea", "zinc PCA"], ["oily", "combination"], ["dry"]],
  ["cl-bha", "Clarifying BHA Cleanser", 20, "cleanser", { acne: 0.7, pore: 0.6, oiliness: 0.3 }, ["salicylic acid 2%"], ["oily"], ["dry", "sensitive"]],
  ["cl-balm", "Melting Cleansing Balm", 26, "cleanser", { moisture: 0.4, texture: 0.2 }, ["sunflower oil", "vitamin E"], ["dry", "normal"]],
  ["cl-ceramide", "Ceramide Hydrating Cleanser", 15, "cleanser", { moisture: 0.6 }, ["ceramides", "hyaluronic acid"], [], []],
  ["cl-enzyme", "Papaya Enzyme Powder Wash", 24, "cleanser", { texture: 0.6, radiance: 0.5 }, ["papain", "rice powder"], ["normal", "combination"], ["sensitive"]],

  // Toners
  ["tn-rose", "Rosewater Calming Mist", 14, "toner", { redness: 0.4, moisture: 0.3 }, ["rose water", "allantoin"], ["sensitive"]],
  ["tn-aha", "Glow AHA Toner", 22, "toner", { texture: 0.7, radiance: 0.6, age_spot: 0.3 }, ["glycolic acid 7%"], ["normal"], ["sensitive"]],
  ["tn-pha", "Gentle PHA Essence", 25, "toner", { texture: 0.5, moisture: 0.3 }, ["gluconolactone"], ["sensitive", "dry"]],

  // Serums
  ["sr-hyal", "Hyaluronic Water Serum", 21, "serum", { moisture: 0.9, wrinkle: 0.2 }, ["hyaluronic acid", "panthenol"], [], []],
  ["sr-vitc", "Vitamin C Brightening Serum", 34, "serum", { radiance: 0.9, age_spot: 0.7, firmness: 0.2 }, ["vitamin C 15%", "ferulic acid"], ["normal", "oily", "combination"], ["sensitive"]],
  ["sr-niac", "Niacinamide 10% Pore Serum", 19, "serum", { pore: 0.8, oiliness: 0.7, texture: 0.4, acne: 0.3 }, ["niacinamide 10%", "zinc"], ["oily", "combination"]],
  ["sr-peptide", "Peptide Firming Serum", 42, "serum", { firmness: 0.8, wrinkle: 0.7 }, ["matrixyl peptides", "copper peptide"], [], []],
  ["sr-cica", "Cica Recovery Serum", 28, "serum", { redness: 0.8, acne: 0.3 }, ["centella asiatica", "madecassoside"], ["sensitive"]],
  ["sr-tranex", "Tranexamic Dark Spot Serum", 36, "serum", { age_spot: 0.9, radiance: 0.5 }, ["tranexamic acid", "niacinamide"], [], []],
  ["sr-squalane", "Squalane Glow Oil", 30, "serum", { moisture: 0.6, radiance: 0.4 }, ["squalane"], ["dry"], ["oily"]],
  ["sr-azelaic", "Azelaic Acid 10% Booster", 27, "serum", { redness: 0.7, acne: 0.6, age_spot: 0.4 }, ["azelaic acid"], ["sensitive", "combination"]],

  // Treatments (PM actives)
  ["tr-retinal", "Retinal 0.1% Night Treatment", 48, "treatment", { wrinkle: 0.9, firmness: 0.6, texture: 0.6, age_spot: 0.4 }, ["retinaldehyde"], ["normal", "oily"], ["sensitive"]],
  ["tr-bakuchiol", "Bakuchiol Gentle Night Serum", 38, "treatment", { wrinkle: 0.6, firmness: 0.5, redness: 0.2 }, ["bakuchiol"], ["sensitive", "dry"]],
  ["tr-spot", "Overnight Blemish Patch Gel", 13, "treatment", { acne: 0.9 }, ["salicylic acid", "tea tree"], ["oily"], ["dry"]],
  ["tr-lactic", "Lactic Acid Resurfacing Drops", 29, "treatment", { texture: 0.8, radiance: 0.6, pore: 0.4 }, ["lactic acid 10%"], ["normal", "dry"], ["sensitive"]],
  ["tr-mask", "Kaolin Clay Detox Mask", 23, "treatment", { pore: 0.6, oiliness: 0.6, acne: 0.3 }, ["kaolin", "bentonite"], ["oily"], ["dry"]],
  ["tr-sleep", "Overnight Hydra Sleeping Mask", 32, "treatment", { moisture: 0.8, radiance: 0.4 }, ["ceramides", "beta-glucan"], ["dry", "normal"]],

  // Moisturizers
  ["mo-gel", "Water Gel Moisturizer", 24, "moisturizer", { moisture: 0.6, oiliness: 0.2 }, ["hyaluronic acid", "aloe"], ["oily", "combination"]],
  ["mo-barrier", "Barrier Repair Cream", 29, "moisturizer", { moisture: 0.8, redness: 0.5 }, ["ceramides", "cholesterol", "fatty acids"], ["dry", "sensitive"]],
  ["mo-rich", "Rich Peptide Cream", 44, "moisturizer", { firmness: 0.6, wrinkle: 0.5, moisture: 0.7 }, ["peptides", "shea butter"], ["dry", "normal"], ["oily"]],
  ["mo-light", "Everyday Light Lotion", 17, "moisturizer", { moisture: 0.5 }, ["glycerin", "squalane"], [], []],
  ["mo-calm", "Cica Calming Cream", 26, "moisturizer", { redness: 0.7, moisture: 0.5 }, ["centella asiatica", "panthenol"], ["sensitive"]],
  ["mo-bright", "Radiance Day Cream", 31, "moisturizer", { radiance: 0.6, moisture: 0.5, age_spot: 0.3 }, ["vitamin C derivative", "licorice root"], ["normal", "combination"]],

  // SPF
  ["spf-mineral", "Mineral Sheer SPF 50", 28, "spf", { age_spot: 0.6, redness: 0.3 }, ["zinc oxide"], ["sensitive", "dry"]],
  ["spf-fluid", "Invisible Fluid SPF 50", 25, "spf", { age_spot: 0.6, wrinkle: 0.3 }, ["niacinamide", "UV filters"], ["normal", "oily", "combination"]],
  ["spf-tint", "Tinted Glow SPF 40", 32, "spf", { age_spot: 0.5, radiance: 0.4 }, ["iron oxides", "zinc oxide"], ["normal", "dry"]],
  ["spf-hydra", "Hydrating Milk SPF 30", 22, "spf", { age_spot: 0.5, moisture: 0.4 }, ["hyaluronic acid", "UV filters"], ["dry"]],

  // Eye
  ["eye-caff", "Caffeine Eye De-puff Gel", 19, "eye", { eye_bag: 0.8, dark_circle: 0.4 }, ["caffeine 5%", "green tea"], [], []],
  ["eye-vitk", "Brightening Eye Cream", 33, "eye", { dark_circle: 0.8, wrinkle: 0.3 }, ["vitamin K", "niacinamide"], [], []],
  ["eye-ret", "Retinal Eye Serum", 39, "eye", { wrinkle: 0.7, firmness: 0.5 }, ["retinaldehyde", "peptides"], ["normal"], ["sensitive"]],
];

const COLORS: Record<Category, string> = {
  cleanser: "e0f2fe",
  toner: "fce7f3",
  serum: "fef3c7",
  treatment: "ede9fe",
  moisturizer: "dcfce7",
  spf: "ffedd5",
  eye: "f1f5f9",
};

export const DEMO_PRODUCTS: Product[] = rows.map(
  ([id, title, price, category, concerns, keyIngredients, skinTypes = [], avoidFor = []]) => ({
    id,
    title,
    brand: DEMO_STORE.name,
    price,
    currency: DEMO_STORE.currency,
    imageUrl: `swatch:${COLORS[category]}`,
    tags: { category, concerns, skinTypes, avoidFor, keyIngredients },
  }),
);
