'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  scaleNutritionByGrams,
  type EntrySource,
  type Food,
  type FoodSearchResult,
  type MealType,
  type NutritionFacts,
} from '@calorie/core';
import { Modal } from '@/components/modal';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { addMealEntry } from '@/lib/actions/meals';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

/** A food from any source, normalized for the portion picker. */
interface Pickable {
  name: string;
  brand: string | null;
  per100g: NutritionFacts;
  defaultGrams: number;
  source: EntrySource;
  foodId?: string | null;
}

function fromCustomFood(f: Food): Pickable {
  return {
    name: f.name,
    brand: f.brand,
    per100g: {
      calories: Number(f.calories),
      protein_g: Number(f.protein_g),
      carbs_g: Number(f.carbs_g),
      fat_g: Number(f.fat_g),
    },
    defaultGrams: f.serving_grams != null ? Number(f.serving_grams) : 100,
    source: 'manual',
    foodId: f.id,
  };
}

function fromSearchResult(r: FoodSearchResult, source: EntrySource): Pickable {
  return {
    name: r.name,
    brand: r.brand,
    per100g: r.per100g,
    defaultGrams: r.defaultServing?.grams ?? 100,
    source,
  };
}

export function AddEntryButton({
  meal,
  date,
  customFoods,
}: {
  meal: MealType;
  date: string;
  customFoods: Food[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Add to ${MEAL_LABELS[meal]}`}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--accent)',
          fontSize: 20,
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        +
      </button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={`Add to ${MEAL_LABELS[meal]}`}>
          <AddEntryForm meal={meal} date={date} customFoods={customFoods} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

type Tab = 'search' | 'saved' | 'manual';

function AddEntryForm({
  meal,
  date,
  customFoods,
  onDone,
}: {
  meal: MealType;
  date: string;
  customFoods: Food[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('search');
  const [picked, setPicked] = useState<Pickable | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(input: Parameters<typeof addMealEntry>[0]) {
    setError(null);
    startTransition(async () => {
      try {
        await addMealEntry(input);
        router.refresh();
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  async function lookupBarcode(code: string) {
    setScanning(false);
    setNotice('Looking up barcode…');
    try {
      const res = await fetch(`/api/foods/barcode?code=${encodeURIComponent(code)}`);
      const data = (await res.json()) as { result?: FoodSearchResult | null };
      if (data.result) {
        setNotice(null);
        setPicked(fromSearchResult(data.result, 'barcode'));
      } else {
        setNotice(`No product found for ${code}. Try search or quick add.`);
      }
    } catch {
      setNotice('Barcode lookup failed. Try again.');
    }
  }

  if (scanning) {
    return (
      <div>
        <BarcodeScanner onDetected={lookupBarcode} />
        <button
          onClick={() => setScanning(false)}
          className="btn btn-secondary"
          style={{ marginTop: 12 }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (picked) {
    return (
      <PortionPicker
        food={picked}
        pending={pending}
        onBack={() => setPicked(null)}
        onSubmit={(n, grams) =>
          submit({
            date,
            meal_type: meal,
            description: picked.brand ? `${picked.name} (${picked.brand})` : picked.name,
            quantity: grams,
            unit: 'g',
            grams,
            calories: Math.round(n.calories),
            protein_g: n.protein_g,
            carbs_g: n.carbs_g,
            fat_g: n.fat_g,
            food_id: picked.foodId ?? null,
            source: picked.source,
          })
        }
      />
    );
  }

  const tabs: Tab[] = customFoods.length > 0 ? ['search', 'saved', 'manual'] : ['search', 'manual'];

  return (
    <div>
      <button
        onClick={() => {
          setNotice(null);
          setScanning(true);
        }}
        className="btn btn-secondary"
        style={{ marginBottom: 14 }}
      >
        📷 Scan barcode
      </button>

      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--surface-2)',
          padding: 4,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              height: 34,
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: tab === t ? 'var(--surface)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === t ? 'var(--shadow)' : 'none',
            }}
          >
            {t === 'search' ? 'Search' : t === 'saved' ? 'My foods' : 'Quick add'}
          </button>
        ))}
      </div>

      {notice && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0 }}>{notice}</p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginTop: 0 }}>
          {error}
        </p>
      )}

      {tab === 'search' && <SearchTab onPick={(r) => setPicked(fromSearchResult(r, 'manual'))} />}
      {tab === 'saved' && (
        <SavedList foods={customFoods} onPick={(f) => setPicked(fromCustomFood(f))} />
      )}
      {tab === 'manual' && <ManualForm meal={meal} date={date} pending={pending} onSubmit={submit} />}
    </div>
  );
}

function PortionPicker({
  food,
  pending,
  onBack,
  onSubmit,
}: {
  food: Pickable;
  pending: boolean;
  onBack: () => void;
  onSubmit: (n: NutritionFacts, grams: number) => void;
}) {
  const [grams, setGrams] = useState(String(food.defaultGrams));
  const g = Number(grams) || 0;
  const preview = scaleNutritionByGrams(food.per100g, g);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={onBack}
        className="muted"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, alignSelf: 'flex-start', padding: 0 }}
      >
        ‹ Back
      </button>
      <div>
        <div style={{ fontWeight: 600 }}>{food.name}</div>
        {food.brand && (
          <div className="muted" style={{ fontSize: 13 }}>
            {food.brand}
          </div>
        )}
      </div>
      <div>
        <label className="label">Amount (g)</label>
        <input
          className="input"
          type="number"
          min={1}
          autoFocus
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
        />
      </div>
      <div className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-around', fontSize: 13 }}>
        <span>
          <strong>{Math.round(preview.calories)}</strong> kcal
        </span>
        <span>{preview.protein_g}g P</span>
        <span>{preview.carbs_g}g C</span>
        <span>{preview.fat_g}g F</span>
      </div>
      <button className="btn btn-primary" disabled={pending || g <= 0} onClick={() => onSubmit(preview, g)}>
        {pending ? 'Adding…' : 'Add'}
      </button>
    </div>
  );
}

function SearchTab({ onPick }: { onPick: (r: FoodSearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { results?: FoodSearchResult[] };
        setResults(data.results ?? []);
        setSearched(true);
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        className="input"
        placeholder="Search foods (e.g. greek yogurt)…"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        {loading && (
          <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            Searching…
          </p>
        )}
        {!loading && searched && results.length === 0 && (
          <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            No results. Try a different term or Quick add.
          </p>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.source}-${r.externalId}-${i}`}
            onClick={() => onPick(r)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              textAlign: 'left',
              gap: 10,
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 14, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {r.brand ? `${r.brand} · ` : ''}
                {r.source === 'usda' ? 'USDA' : 'Open Food Facts'}
              </span>
            </span>
            <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>
              {Math.round(r.per100g.calories)} kcal/100g
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SavedList({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? foods.filter((f) => f.name.toLowerCase().includes(q) || (f.brand ?? '').toLowerCase().includes(q))
      : foods;
    return list.slice(0, 30);
  }, [foods, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input className="input" placeholder="Search your foods…" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            No matches.
          </p>
        )}
        {filtered.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</span>
              {f.brand && (
                <span className="muted" style={{ fontSize: 12, display: 'block' }}>
                  {f.brand}
                </span>
              )}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {Math.round(Number(f.calories))} kcal/100g
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ManualForm({
  meal,
  date,
  pending,
  onSubmit,
}: {
  meal: MealType;
  date: string;
  pending: boolean;
  onSubmit: (input: Parameters<typeof addMealEntry>[0]) => void;
}) {
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          date,
          meal_type: meal,
          description,
          calories: Number(calories) || 0,
          protein_g: Number(protein) || 0,
          carbs_g: Number(carbs) || 0,
          fat_g: Number(fat) || 0,
          source: 'manual',
        });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div>
        <label className="label">Food</label>
        <input className="input" autoFocus required placeholder="e.g. Chicken salad" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Calories (kcal)</label>
        <input className="input" type="number" inputMode="numeric" min={0} required placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Protein (g)</label>
          <input className="input" type="number" min={0} placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Carbs (g)</label>
          <input className="input" type="number" min={0} placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Fat (g)</label>
          <input className="input" type="number" min={0} placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
