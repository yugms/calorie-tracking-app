'use client';

import { useRouter } from 'next/navigation';
import { addDays, dateLabel, todayIso } from '@/lib/date';

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const go = (iso: string) => router.push(iso === todayIso() ? '/dashboard' : `/dashboard?date=${iso}`);
  const isToday = date === todayIso();

  const arrow: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    cursor: 'pointer',
    fontSize: 16,
    color: 'var(--text)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>{dateLabel(date)}</h1>
        <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
          {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={arrow} onClick={() => go(addDays(date, -1))} aria-label="Previous day">
          ‹
        </button>
        {!isToday && (
          <button
            onClick={() => go(todayIso())}
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Today
          </button>
        )}
        <button
          style={{ ...arrow, opacity: isToday ? 0.4 : 1 }}
          disabled={isToday}
          onClick={() => go(addDays(date, 1))}
          aria-label="Next day"
        >
          ›
        </button>
      </div>
    </div>
  );
}
