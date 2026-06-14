'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Food } from '@calorie/core';
import { Modal } from '@/components/modal';
import {
  createCustomFood,
  deleteCustomFood,
  updateCustomFood,
  type CustomFoodInput,
} from '@/lib/actions/foods';

export function FoodsManager({ foods }: { foods: Food[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Food | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm('Delete this food?')) return;
    startTransition(async () => {
      await deleteCustomFood(id);
      router.refresh();
    });
  }

  return (
    <>
      <button className="btn btn-primary" style={{ width: 'auto', alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>
        + New food
      </button>

      {foods.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            No saved foods yet. Create one to log it quickly later.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {foods.map((f) => (
            <div
              key={f.id}
              className="card"
              style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {f.brand ? `${f.brand} · ` : ''}
                  {Math.round(Number(f.calories))} kcal · {Math.round(Number(f.protein_g))}P ·{' '}
                  {Math.round(Number(f.carbs_g))}C · {Math.round(Number(f.fat_g))}F per 100 g
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setEditing(f)}
                  style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(f.id)}
                  disabled={pending}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, padding: '6px 8px' }}
                  aria-label={`Delete ${f.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal
          open
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          title={editing ? 'Edit food' : 'New food'}
        >
          <FoodForm
            food={editing}
            onDone={() => {
              setCreating(false);
              setEditing(null);
              router.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}

function FoodForm({ food, onDone }: { food: Food | null; onDone: () => void }) {
  const [v, setV] = useState({
    name: food?.name ?? '',
    brand: food?.brand ?? '',
    calories: food ? String(food.calories) : '',
    protein_g: food ? String(food.protein_g) : '',
    carbs_g: food ? String(food.carbs_g) : '',
    fat_g: food ? String(food.fat_g) : '',
    serving_grams: food?.serving_grams != null ? String(food.serving_grams) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const input: CustomFoodInput = {
          name: v.name,
          brand: v.brand || null,
          calories: Number(v.calories) || 0,
          protein_g: Number(v.protein_g) || 0,
          carbs_g: Number(v.carbs_g) || 0,
          fat_g: Number(v.fat_g) || 0,
          serving_grams: v.serving_grams ? Number(v.serving_grams) : null,
          serving_unit: v.serving_grams ? 'serving' : null,
          serving_qty: v.serving_grams ? 1 : null,
        };
        startTransition(async () => {
          try {
            if (food) await updateCustomFood(food.id, input);
            else await createCustomFood(input);
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
          }
        });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div>
        <label className="label">Name</label>
        <input className="input" autoFocus required value={v.name} onChange={set('name')} placeholder="Greek yogurt" />
      </div>
      <div>
        <label className="label">Brand (optional)</label>
        <input className="input" value={v.brand} onChange={set('brand')} placeholder="Fage" />
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        Nutrition per 100 g:
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Calories</label>
          <input className="input" type="number" min={0} required value={v.calories} onChange={set('calories')} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Serving (g)</label>
          <input className="input" type="number" min={0} value={v.serving_grams} onChange={set('serving_grams')} placeholder="optional" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Protein</label>
          <input className="input" type="number" min={0} value={v.protein_g} onChange={set('protein_g')} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Carbs</label>
          <input className="input" type="number" min={0} value={v.carbs_g} onChange={set('carbs_g')} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Fat</label>
          <input className="input" type="number" min={0} value={v.fat_g} onChange={set('fat_g')} />
        </div>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Saving…' : food ? 'Save changes' : 'Create food'}
      </button>
    </form>
  );
}
