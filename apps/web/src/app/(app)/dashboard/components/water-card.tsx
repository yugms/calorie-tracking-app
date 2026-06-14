'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { WaterEntry } from '@calorie/core';
import { addWater, deleteWater } from '@/lib/actions/water';

const QUICK = [250, 500, 750];

export function WaterCard({
  date,
  entries,
  totalMl,
  targetMl,
}: {
  date: string;
  entries: WaterEntry[];
  totalMl: number;
  targetMl: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pct = targetMl > 0 ? Math.min((totalMl / targetMl) * 100, 100) : 0;

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>💧 Water</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          {(totalMl / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} L
        </span>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden', margin: '12px 0' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#38bdf8', transition: 'width 0.2s' }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {QUICK.map((ml) => (
          <button
            key={ml}
            disabled={pending}
            onClick={() => run(() => addWater({ date, amount_ml: ml }))}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            +{ml}
          </button>
        ))}
        {entries.length > 0 && (
          <button
            disabled={pending}
            onClick={() => run(() => deleteWater(entries[entries.length - 1]!.id))}
            aria-label="Undo last water"
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 15,
              color: 'var(--text-muted)',
            }}
          >
            ↩
          </button>
        )}
      </div>
    </section>
  );
}
