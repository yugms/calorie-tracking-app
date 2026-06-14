/**
 * FoodProvider — the single seam behind which all nutrition-database backends sit.
 * Phase 3 implements this against USDA FoodData Central + Open Food Facts; a
 * Nutritionix implementation can be dropped in later with no caller changes.
 */
import type { FoodSource, NutritionPer100g, Serving } from '../index.js';

/** A normalized food result, independent of which database produced it. */
export interface FoodSearchResult {
  source: FoodSource;
  /** Provider-native id (FDC id, OFF barcode, etc.). */
  externalId: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  /** Canonical nutrition per 100g. */
  per100g: NutritionPer100g;
  /** Default serving for friendlier entry, when the provider supplies one. */
  defaultServing?: Serving | null;
}

export interface FoodSearchOptions {
  /** Max results to return. */
  limit?: number;
  /** Restrict to a specific backing source, when supported. */
  source?: FoodSource;
  signal?: AbortSignal;
}

export interface FoodProvider {
  /** Free-text search (e.g. "greek yogurt"). */
  search(query: string, opts?: FoodSearchOptions): Promise<FoodSearchResult[]>;
  /** Exact lookup by barcode (UPC/EAN). Returns null if not found. */
  getByBarcode(barcode: string, opts?: { signal?: AbortSignal }): Promise<FoodSearchResult | null>;
  /** Fetch one item by its provider-native id. */
  getById(
    externalId: string,
    source: FoodSource,
    opts?: { signal?: AbortSignal },
  ): Promise<FoodSearchResult | null>;
}
