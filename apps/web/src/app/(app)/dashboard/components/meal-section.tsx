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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15 }}>{MEAL_LABELS[meal]}</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            {Math.round(calories)} kcal
          </span>
        </div>
        <AddEntryButton meal={meal} date={date} customFoods={customFoods} />
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                opacity: pending ? 0.6 : 1,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.description}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {e.grams ? `${Math.round(Number(e.grams))} g · ` : ''}
                  {Math.round(Number(e.protein_g))}P · {Math.round(Number(e.carbs_g))}C ·{' '}
                  {Math.round(Number(e.fat_g))}F
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(Number(e.calories))}</span>
                <button
                  onClick={() => remove(e.id)}
                  disabled={pending}
                  aria-label={`Delete ${e.description}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 15,
                    padding: 4,
                  }}
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
