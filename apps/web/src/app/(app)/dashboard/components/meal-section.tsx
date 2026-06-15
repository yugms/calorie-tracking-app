'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Food, MealEntry, MealType } from '@calorie/core';
import { deleteMealEntry } from '@/lib/actions/meals';
import { AddEntryButton } from './add-entry-dialog';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎',
};

export function MealSection({
  meal,
  entries,
  calories,
  date,
  customFoods,
}: {
  meal: MealType;
  entries: MealEntry[];
  calories: number;
  date: string;
  customFoods: Food[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteMealEntry(id);
      router.refresh();
    });
  }

  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'var(--surface-2)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {MEAL_ICONS[meal]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="h2">{MEAL_LABELS[meal]}</h2>
          <div className="eyebrow tnum" style={{ marginTop: 2 }}>
            {Math.round(calories)} kcal
          </div>
        </div>
        <AddEntryButton meal={meal} date={date} customFoods={customFoods} />
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '11px 0',
                borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                opacity: pending ? 0.55 : 1,
                transition: 'opacity var(--dur-fast) var(--ease)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.description}
                </div>
                <div className="muted tnum" style={{ fontSize: 12, marginTop: 1 }}>
                  {e.grams ? `${Math.round(Number(e.grams))} g · ` : ''}
                  {Math.round(Number(e.protein_g))}P · {Math.round(Number(e.carbs_g))}C · {Math.round(Number(e.fat_g))}F
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span className="tnum" style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {Math.round(Number(e.calories))}
                </span>
                <button
                  onClick={() => remove(e.id)}
                  disabled={pending}
                  aria-label={`Delete ${e.description}`}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
