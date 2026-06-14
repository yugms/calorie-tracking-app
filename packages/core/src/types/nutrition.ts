/** Core macro/micro nutrient facts. All values are absolute amounts (not per-100g). */
export interface NutritionFacts {
  calories: number; // kcal
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

/** Nutrition expressed per 100g — the canonical normalized form for scaling. */
export interface NutritionPer100g extends NutritionFacts {}

/** A serving definition for a food. */
export interface Serving {
  /** e.g. 1, 0.5 */
  qty: number;
  /** e.g. "cup", "g", "slice" */
  unit: string;
  /** Weight of one `qty`×`unit` serving in grams, when known. Enables gram-based scaling. */
  grams?: number | null;
}

export type UUID = string;
/** ISO date string `YYYY-MM-DD`. */
export type IsoDate = string;
/** ISO 8601 timestamp. */
export type IsoTimestamp = string;
