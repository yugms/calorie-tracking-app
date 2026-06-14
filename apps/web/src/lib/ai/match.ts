import 'server-only';
import {
  scaleNutritionByGrams,
  type FoodSource,
  type ParseResult,
  type ParsedFoodItem,
} from '@calorie/core';
import { getFoodProvider } from '@/lib/food/provider';

/** A proposed meal entry shown on the confirmation screen (editable by the user). */
export interface DraftEntry {
  description: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  /** Which food DB matched this item, or null when the AI estimate was used. */
  matchedSource: FoodSource | null;
}

const round = (n: number, dp = 1) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

async function buildDraft(item: ParsedFoodItem): Promise<DraftEntry> {
  const grams = item.estimatedGrams ?? null;

  // Try to route the item back to our primary food database.
  let matched = null;
  try {
    const results = await getFoodProvider().search(item.name, { limit: 1 });
    matched = results[0] ?? null;
  } catch {
    /* fall back to the AI estimate */
  }

  if (matched) {
    const g = grams ?? matched.defaultServing?.grams ?? 100;
    const n = scaleNutritionByGrams(matched.per100g, g);
    return {
      description: matched.brand ? `${matched.name} (${matched.brand})` : matched.name,
      grams: g,
      calories: Math.round(n.calories),
      protein_g: round(n.protein_g),
      carbs_g: round(n.carbs_g),
      fat_g: round(n.fat_g),
      confidence: item.confidence,
      matchedSource: matched.source,
    };
  }

  // No DB match: use the model's own nutrition estimate.
  const est = item.estimatedNutrition ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  return {
    description: item.name,
    grams,
    calories: Math.round(est.calories),
    protein_g: round(est.protein_g),
    carbs_g: round(est.carbs_g),
    fat_g: round(est.fat_g),
    confidence: item.confidence,
    matchedSource: null,
  };
}

/** Match every parsed item to the food DB (AI estimate as fallback). */
export function buildDrafts(parse: ParseResult): Promise<DraftEntry[]> {
  return Promise.all(parse.items.map(buildDraft));
}
