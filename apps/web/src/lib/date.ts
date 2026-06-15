/** Date helpers. Logs are keyed by calendar date (YYYY-MM-DD). */

/** Local calendar date as YYYY-MM-DD (uses the runtime's local timezone). */
export function todayIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calendar date as YYYY-MM-DD in a specific IANA timezone. Used on the server,
 * where the runtime is UTC, to compute the *user's* local "today".
 */
export function todayIsoInTz(timeZone: string, d: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return todayIso(d);
  }
}

/** Validate a YYYY-MM-DD string; fall back to `fallback` (today) if malformed. */
export function normalizeIsoDate(value: string | undefined | null, fallback: string = todayIso()): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return value;
  }
  return fallback;
}

/** Shift a YYYY-MM-DD by whole days (negative = past). */
export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return todayIso(d);
}

/** Human label for a date header, e.g. "Today", "Yesterday", or "Mon, Jun 9". */
export function dateLabel(iso: string): string {
  const today = todayIso();
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
