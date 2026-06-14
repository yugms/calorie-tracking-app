'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  scaleNutritionByGrams,
  type Food,
  type MealType,
} from '@calorie/core';
import { Modal } from '@/components/modal';
import { addMealEntry } from '@/lib/actions/meals';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

type Tab = 'manual' | 'saved';

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
          <AddEntryForm
            meal={meal}
            date={date}
            customFoods={customFoods}
            onDone={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

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
  const [tab, setTab] = useState<Tab>(customFoods.length > 0 ? 'saved' : 'manual');
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

  return (
    <div>
      {customFoods.length > 0 && (
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
          {(['saved', 'manual'] as Tab[]).map((t) => (
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
              {t === 'saved' ? 'My foods' : 'Quick add'}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginTop: 0 }}>
          {error}
        </p>
      )}

      {tab === 'manual' ? (
        <ManualForm meal={meal} date={date} pending={pending} onSubmit={submit} />
      ) : (
        <SavedFoodForm
          meal={meal}
          date={date}
          foods={customFoods}
          pending={pending}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

const fieldRow: React.CSSProperties = { display: 'flex', gap: 10 };

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
        <input
          className="input"
          autoFocus
          required
          placeholder="e.g. Chicken salad"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Calories (kcal)</label>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          required
          placeholder="0"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
      </div>
      <div style={fieldRow}>
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

function SavedFoodForm({
  meal,
  date,
  foods,
  pending,
  onSubmit,
}: {
  meal: MealType;
  date: string;
  foods: Food[];
  pending: boolean;
  onSubmit: (input: Parameters<typeof addMealEntry>[0]) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grams, setGrams] = useState('100');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? foods.filter((f) => f.name.toLowerCase().includes(q) || (f.brand ?? '').toLowerCase().includes(q))
      : foods;
    return list.slice(0, 20);
  }, [foods, query]);

  const selected = foods.find((f) => f.id === selectedId) ?? null;
  const g = Number(grams) || 0;
  const preview = selected
    ? scaleNutritionByGrams(
        {
          calories: Number(selected.calories),
          protein_g: Number(selected.protein_g),
          carbs_g: Number(selected.carbs_g),
          fat_g: Number(selected.fat_g),
        },
        g,
      )
    : null;

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => setSelectedId(null)}
          className="muted"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, alignSelf: 'flex-start', padding: 0 }}
        >
          ‹ Back to list
        </button>
        <div>
          <div style={{ fontWeight: 600 }}>{selected.name}</div>
          {selected.brand && (
            <div className="muted" style={{ fontSize: 13 }}>
              {selected.brand}
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
          {selected.serving_grams && (
            <button
              type="button"
              onClick={() => setGrams(String(selected.serving_grams))}
              className="muted"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 6, padding: 0 }}
            >
              Use 1 serving ({selected.serving_grams} g)
            </button>
          )}
        </div>
        {preview && (
          <div className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-around', fontSize: 13 }}>
            <span><strong>{Math.round(preview.calories)}</strong> kcal</span>
            <span>{preview.protein_g}g P</span>
            <span>{preview.carbs_g}g C</span>
            <span>{preview.fat_g}g F</span>
          </div>
        )}
        <button
          className="btn btn-primary"
          disabled={pending || g <= 0}
          onClick={() =>
            preview &&
            onSubmit({
              date,
              meal_type: meal,
              description: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
              quantity: g,
              unit: 'g',
              grams: g,
              calories: Math.round(preview.calories),
              protein_g: preview.protein_g,
              carbs_g: preview.carbs_g,
              fat_g: preview.fat_g,
              food_id: selected.id,
              source: 'manual',
            })
          }
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        className="input"
        placeholder="Search your foods…"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <p className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            No matches. Create foods on the{' '}
            <a href="/foods" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Foods
            </a>{' '}
            page.
          </p>
        )}
        {filtered.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setSelectedId(f.id);
              setGrams(String(f.serving_grams ?? 100));
            }}
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
