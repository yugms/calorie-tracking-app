'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ExerciseEntry } from '@calorie/core';
import { Modal } from '@/components/modal';
import { addExercise, deleteExercise } from '@/lib/actions/exercise';

export function ExerciseCard({
  date,
  entries,
  totalKcal,
}: {
  date: string;
  entries: ExerciseEntry[];
  totalKcal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteExercise(id);
      router.refresh();
    });
  }

  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 15 }}>🏃 Exercise</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            {Math.round(totalKcal)} kcal
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Add exercise"
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
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 12 }}>
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
              <div>
                <div style={{ fontSize: 14 }}>{e.activity_name}</div>
                {e.duration_min != null && (
                  <div className="muted" style={{ fontSize: 12 }}>
                    {Math.round(Number(e.duration_min))} min
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(Number(e.calories_burned))}</span>
                <button
                  onClick={() => remove(e.id)}
                  disabled={pending}
                  aria-label={`Delete ${e.activity_name}`}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, padding: 4 }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title="Add exercise">
          <ExerciseForm date={date} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </section>
  );
}

function ExerciseForm({ date, onDone }: { date: string; onDone: () => void }) {
  const router = useRouter();
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await addExercise({
              date,
              activity_name: activity,
              duration_min: duration ? Number(duration) : null,
              calories_burned: Number(calories) || 0,
            });
            router.refresh();
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
          }
        });
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div>
        <label className="label">Activity</label>
        <input
          className="input"
          autoFocus
          required
          placeholder="e.g. Running"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Duration (min)</label>
          <input className="input" type="number" min={0} placeholder="30" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Calories burned</label>
          <input className="input" type="number" min={0} required placeholder="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>
          {error}
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
