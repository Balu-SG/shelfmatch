// Skin concerns ShelfMatch reasons about. Names match YouCam SD dst_actions,
// except dark_circle_v2, which is normalized to dark_circle.
export const CONCERNS = [
  "acne",
  "pore",
  "wrinkle",
  "texture",
  "redness",
  "oiliness",
  "moisture",
  "radiance",
  "age_spot",
  "dark_circle",
  "eye_bag",
  "firmness",
] as const;
export type Concern = (typeof CONCERNS)[number];

export const CONCERN_LABELS: Record<Concern, string> = {
  acne: "Acne",
  pore: "Pores",
  wrinkle: "Fine lines",
  texture: "Texture",
  redness: "Redness",
  oiliness: "Oiliness",
  moisture: "Hydration",
  radiance: "Radiance",
  age_spot: "Dark spots",
  dark_circle: "Dark circles",
  eye_bag: "Eye bags",
  firmness: "Firmness",
};

export type SkinType = "normal" | "oily" | "dry" | "combination" | "sensitive";

export const CATEGORIES = [
  "cleanser",
  "toner",
  "serum",
  "treatment",
  "moisturizer",
  "spf",
  "eye",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface ProductTags {
  category: Category;
  // 0–1: how strongly the product addresses each concern. Omitted = not at all.
  concerns: Partial<Record<Concern, number>>;
  skinTypes: SkinType[]; // empty = suits all
  avoidFor: SkinType[];
  keyIngredients: string[];
}

export interface Product {
  id: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  url?: string;
  variantId?: string; // Shopify variant for /cart permalinks
  productType?: string; // the store's own category label, e.g. "Skincare"
  description?: string;
  tags?: ProductTags;
}

export interface ConcernScore {
  concern: Concern;
  uiScore: number; // 1–100, higher = healthier
  rawScore: number;
  maskUrl?: string;
}

export interface SkinScan {
  scores: ConcernScore[];
  overall?: number;
  skinAge?: number;
  skinType?: SkinType;
  imageUrl?: string; // processed photo the masks overlay
  source: "youcam" | "mock";
}
