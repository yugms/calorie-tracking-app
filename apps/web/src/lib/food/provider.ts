import 'server-only';
import {
  CompositeFoodProvider,
  OpenFoodFactsProvider,
  UsdaFoodProvider,
  type FoodProvider,
} from '@calorie/core';

let cached: FoodProvider | null = null;

/**
 * Server-only food provider. Open Food Facts is always available (no key, and
 * is barcode-priority); USDA is added only when a real API key is configured.
 * If USDA isn't configured, search still works via OFF.
 */
export function getFoodProvider(): FoodProvider {
  if (cached) return cached;

  const providers: FoodProvider[] = [new OpenFoodFactsProvider()];
  const usdaKey = process.env.USDA_FDC_API_KEY;
  if (usdaKey && usdaKey.length > 8 && !usdaKey.startsWith('your-')) {
    providers.push(new UsdaFoodProvider(usdaKey));
  }

  cached = new CompositeFoodProvider(providers);
  return cached;
}
