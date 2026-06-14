/**
 * AIProvider — the seam for NLP (text) and Vision (photo) meal parsing.
 * Phase 4 implements this against Google Gemini (free tier); Claude / GPT-4o
 * implementations are drop-in swaps. Providers ONLY extract structured items —
 * matching to the food DB and persistence happen downstream, always behind a
 * user-confirmation step.
 */
import type { NutritionFacts } from '../types/nutrition';

/** One candidate food item extracted from text or a photo. */
export interface ParsedFoodItem {
  /** Best-guess food name to search the food DB with (e.g. "rolled oats"). */
  name: string;
  /** Quantity the user implied, if any (e.g. 1, 0.5). */
  quantity?: number | null;
  /** Unit for `quantity` (e.g. "cup", "bowl", "handful"). */
  unit?: string | null;
  /** Vision/NLP estimate of the portion weight in grams, when inferable. */
  estimatedGrams?: number | null;
  /**
   * The model's own nutrition estimate for this item. Used as a fallback when
   * the item can't be matched to the food database (so every item still has
   * numbers the user can confirm or edit).
   */
  estimatedNutrition?: NutritionFacts;
  /** Model confidence 0..1 for this item. Surfaced on the confirmation screen. */
  confidence: number;
}

export interface ParseResult {
  items: ParsedFoodItem[];
  /** Raw provider payload, retained for the `ai_jobs` audit row. */
  raw?: unknown;
}

export interface ParsePhotoInput {
  /** Image bytes or a URL the provider can fetch (e.g. a signed Storage URL). */
  image: ArrayBuffer | Uint8Array | string;
  mimeType?: string;
}

export interface AIProvider {
  /** Identifier for logging/telemetry, e.g. "gemini". */
  readonly id: string;
  /** Parse a natural-language phrase into distinct food items. */
  parseText(text: string, opts?: { signal?: AbortSignal }): Promise<ParseResult>;
  /** Parse a meal photo into distinct food items with portion estimates. */
  parsePhoto(input: ParsePhotoInput, opts?: { signal?: AbortSignal }): Promise<ParseResult>;
}
