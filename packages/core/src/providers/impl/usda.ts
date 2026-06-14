/**
 * USDA FoodData Central provider. Free with an API key (https://fdc.nal.usda.gov).
 * Strong for whole/generic foods; nutrient values are per 100 g.
 */
import type {
  FoodProvider,
  FoodSearchOptions,
  FoodSearchResult,
} from '../food-provider';
import type { FoodSource } from '../../types/enums';
import { fetchJson, toNum } from './http';

const BASE = 'https://api.nal.usda.gov/fdc/v1';

// USDA nutrient numbers (stable identifiers).
const N = {
  energyKcal: '208',
  protein: '203',
  fat: '204',
  carbs: '205',
  fiber: '291',
  sugars: '269',
  sodium: '307',
} as const;

interface UsdaNutrient {
  nutrientNumber?: string;
  value?: number;
}
interface UsdaFood {
  fdcId: number;
  description?: string;
  brandName?: string;
  brandOwner?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
}
interface UsdaSearchResponse {
  foods?: UsdaFood[];
}

function nutrient(food: UsdaFood, number: string): number {
  const match = food.foodNutrients?.find((n) => n.nutrientNumber === number);
  return toNum(match?.value) ?? 0;
}

function toResult(food: UsdaFood): FoodSearchResult {
  const grams =
    food.servingSize != null && (food.servingSizeUnit ?? '').toLowerCase() === 'g'
      ? food.servingSize
      : null;
  return {
    source: 'usda',
    externalId: String(food.fdcId),
    barcode: food.gtinUpc ?? null,
    name: food.description ?? 'Unknown food',
    brand: food.brandName ?? food.brandOwner ?? null,
    per100g: {
      calories: nutrient(food, N.energyKcal),
      protein_g: nutrient(food, N.protein),
      carbs_g: nutrient(food, N.carbs),
      fat_g: nutrient(food, N.fat),
      fiber_g: nutrient(food, N.fiber),
      sugar_g: nutrient(food, N.sugars),
      sodium_mg: nutrient(food, N.sodium),
    },
    defaultServing: grams ? { qty: 1, unit: 'serving', grams } : null,
  };
}

export class UsdaFoodProvider implements FoodProvider {
  constructor(private readonly apiKey: string) {}

  async search(query: string, opts: FoodSearchOptions = {}): Promise<FoodSearchResult[]> {
    const limit = opts.limit ?? 15;
    const url =
      `${BASE}/foods/search?api_key=${encodeURIComponent(this.apiKey)}` +
      `&query=${encodeURIComponent(query)}&pageSize=${limit}` +
      `&dataType=${encodeURIComponent('Foundation,SR Legacy,Branded')}`;
    const data = await fetchJson<UsdaSearchResponse>(url, { signal: opts.signal });
    return (data.foods ?? []).map(toResult);
  }

  async getByBarcode(barcode: string, opts: { signal?: AbortSignal } = {}): Promise<FoodSearchResult | null> {
    const url =
      `${BASE}/foods/search?api_key=${encodeURIComponent(this.apiKey)}` +
      `&query=${encodeURIComponent(barcode)}&pageSize=5&dataType=Branded`;
    const data = await fetchJson<UsdaSearchResponse>(url, { signal: opts.signal });
    const match = (data.foods ?? []).find((f) => f.gtinUpc === barcode) ?? null;
    return match ? toResult(match) : null;
  }

  async getById(externalId: string, _source: FoodSource, opts: { signal?: AbortSignal } = {}): Promise<FoodSearchResult | null> {
    const url = `${BASE}/food/${encodeURIComponent(externalId)}?api_key=${encodeURIComponent(this.apiKey)}`;
    try {
      const food = await fetchJson<UsdaFood>(url, { signal: opts.signal });
      return toResult(food);
    } catch {
      return null;
    }
  }
}
