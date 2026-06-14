/**
 * Open Food Facts provider. Free, no key. 2.5M+ barcoded packaged products —
 * the primary source for barcode scanning. Nutrient values are per 100 g.
 */
import type {
  FoodProvider,
  FoodSearchOptions,
  FoodSearchResult,
} from '../food-provider';
import type { FoodSource } from '../../types/enums';
import { fetchJson, toNum } from './http';

const BASE = 'https://world.openfoodfacts.org';
// OFF asks API users to identify themselves with a descriptive User-Agent.
const UA = 'CalorieTracker/0.1 (https://github.com/yugms/calorie-tracking-app)';
const FIELDS = 'code,product_name,brands,nutriments,serving_quantity';

interface OffNutriments {
  ['energy-kcal_100g']?: number;
  ['energy_100g']?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number; // grams
  salt_100g?: number; // grams
}
interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
}

function caloriesPer100g(n: OffNutriments): number {
  const kcal = toNum(n['energy-kcal_100g']);
  if (kcal != null) return kcal;
  const kj = toNum(n['energy_100g']);
  return kj != null ? Math.round(kj / 4.184) : 0;
}

function sodiumMgPer100g(n: OffNutriments): number {
  const sodium = toNum(n.sodium_100g);
  if (sodium != null) return Math.round(sodium * 1000);
  const salt = toNum(n.salt_100g);
  return salt != null ? Math.round(salt * 400) : 0; // sodium ≈ salt / 2.5, then g→mg
}

function toResult(p: OffProduct): FoodSearchResult | null {
  if (!p.product_name && !p.code) return null;
  const n = p.nutriments ?? {};
  const grams = toNum(p.serving_quantity) ?? null;
  return {
    source: 'off',
    externalId: p.code ?? null,
    barcode: p.code ?? null,
    name: p.product_name?.trim() || `Product ${p.code}`,
    brand: p.brands?.split(',')[0]?.trim() || null,
    per100g: {
      calories: caloriesPer100g(n),
      protein_g: toNum(n.proteins_100g) ?? 0,
      carbs_g: toNum(n.carbohydrates_100g) ?? 0,
      fat_g: toNum(n.fat_100g) ?? 0,
      fiber_g: toNum(n.fiber_100g) ?? 0,
      sugar_g: toNum(n.sugars_100g) ?? 0,
      sodium_mg: sodiumMgPer100g(n),
    },
    defaultServing: grams ? { qty: 1, unit: 'serving', grams } : null,
  };
}

export class OpenFoodFactsProvider implements FoodProvider {
  async search(query: string, opts: FoodSearchOptions = {}): Promise<FoodSearchResult[]> {
    const limit = opts.limit ?? 15;
    const url =
      `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&page_size=${limit}&fields=${FIELDS}`;
    const data = await fetchJson<{ products?: OffProduct[] }>(url, {
      signal: opts.signal,
      headers: { 'User-Agent': UA },
    });
    return (data.products ?? [])
      .map(toResult)
      .filter((r): r is FoodSearchResult => r !== null);
  }

  async getByBarcode(barcode: string, opts: { signal?: AbortSignal } = {}): Promise<FoodSearchResult | null> {
    const url = `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
    const data = await fetchJson<{ status?: number; product?: OffProduct }>(url, {
      signal: opts.signal,
      headers: { 'User-Agent': UA },
    });
    if (data.status !== 1 || !data.product) return null;
    return toResult(data.product);
  }

  async getById(externalId: string, _source: FoodSource, opts: { signal?: AbortSignal } = {}): Promise<FoodSearchResult | null> {
    return this.getByBarcode(externalId, opts);
  }
}
