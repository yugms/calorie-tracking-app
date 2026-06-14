/**
 * Composite provider — merges multiple FoodProviders behind the single
 * FoodProvider seam. Search queries all providers in parallel and interleaves
 * results; barcode lookups try providers in priority order (OFF first).
 */
import type {
  FoodProvider,
  FoodSearchOptions,
  FoodSearchResult,
} from '../food-provider';
import type { FoodSource } from '../../types/enums';

/** Round-robin interleave so results from each provider are represented. */
function interleave(lists: FoodSearchResult[][], limit: number): FoodSearchResult[] {
  const out: FoodSearchResult[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max && out.length < limit; i++) {
    for (const list of lists) {
      if (i < list.length && out.length < limit) out.push(list[i]!);
    }
  }
  return out;
}

export class CompositeFoodProvider implements FoodProvider {
  /** Ordered by barcode-lookup priority (first = preferred). */
  private readonly providers: FoodProvider[];

  constructor(providers: FoodProvider[]) {
    this.providers = providers.filter(Boolean);
  }

  async search(query: string, opts: FoodSearchOptions = {}): Promise<FoodSearchResult[]> {
    const limit = opts.limit ?? 15;
    const settled = await Promise.allSettled(
      this.providers.map((p) => p.search(query, { ...opts, limit })),
    );
    const lists = settled
      .filter((s): s is PromiseFulfilledResult<FoodSearchResult[]> => s.status === 'fulfilled')
      .map((s) => s.value);
    return interleave(lists, limit);
  }

  async getByBarcode(barcode: string, opts: { signal?: AbortSignal } = {}): Promise<FoodSearchResult | null> {
    for (const p of this.providers) {
      try {
        const hit = await p.getByBarcode(barcode, opts);
        if (hit) return hit;
      } catch {
        // try the next provider
      }
    }
    return null;
  }

  async getById(externalId: string, source: FoodSource, opts: { signal?: AbortSignal } = {}): Promise<FoodSearchResult | null> {
    for (const p of this.providers) {
      try {
        const hit = await p.getById(externalId, source, opts);
        if (hit) return hit;
      } catch {
        // try the next provider
      }
    }
    return null;
  }
}
