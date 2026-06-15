'use client';

import { useRouter } from 'next/navigation';
import { addDays, dateLabel, todayIso } from '@/lib/date';

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const go = (iso: string) => router.push(iso === todayIso() ? '/dashboard' : `/dashboard?date=${iso}`);
  const isToday = date === todayIso();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <h1 className="h1">{dateLabel(date)}</h1>
        <p className="muted" style={{ margin: '3px 0 0', fontSize: 13 }}>
          {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn" onClick={() => go(addDays(date, -1))} aria-label="Previous day">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {!isToday && (
          <button
            onClick={() => go(todayIso())}
            className="chip"
            style={{ height: 34, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            Today
          </button>
        )}
        <button
          className="icon-btn"
          disabled={isToday}
          style={{ opacity: isToday ? 0.4 : 1 }}
          onClick={() => go(addDays(date, 1))}
          aria-label="Next day"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
