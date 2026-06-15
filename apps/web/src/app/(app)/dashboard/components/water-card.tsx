'use client';

import { useOptimistic, useTransition } from 'react';
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
  const [optimisticMl, applyOptimistic] = useOptimistic(totalMl, (cur, delta: number) => Math.max(0, cur + delta));
  const pct = targetMl > 0 ? Math.min((optimisticMl / targetMl) * 100, 100) : 0;

  const run = (delta: number, fn: () => Promise<void>) =>
    startTransition(async () => {
      applyOptimistic(delta);
      await fn();
      router.refresh();
    });

  return (
    <section className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden style={{ color: 'var(--water)' }}>💧</span> Water
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '10px 0 12px' }}>
        <span className="display tnum" style={{ fontSize: 30 }}>
          {(optimisticMl / 1000).toFixed(2)}
        </span>
        <span className="muted tnum" style={{ fontSize: 13 }}>
          / {(targetMl / 1000).toFixed(1)} L
        </span>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--water)', borderRadius: 4, transition: 'width var(--dur) var(--ease)' }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {QUICK.map((ml) => (
          <button
            key={ml}
            className="tnum"
            disabled={pending}
            onClick={() => run(ml, () => addWater({ date, amount_ml: ml }))}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              transition: 'background var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease)',
            }}
          >
            +{ml}
          </button>
        ))}
        {entries.length > 0 && (
          <button
            className="icon-btn"
            style={{ borderRadius: 'var(--radius-full)', width: 38, height: 38 }}
            disabled={pending}
            onClick={() =>
              run(-Number(entries[entries.length - 1]!.amount_ml), () => deleteWater(entries[entries.length - 1]!.id))
            }
            aria-label="Undo last water"
          >
            ↩
          </button>
        )}
      </div>
    </section>
  );
}
