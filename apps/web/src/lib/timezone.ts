import 'server-only';
import { cookies } from 'next/headers';
import { todayIso, todayIsoInTz } from './date';

/** Cookie holding the browser's IANA timezone (set by <TimezoneSync />). */
export const TZ_COOKIE = 'tz';

/**
 * The user's local "today" (YYYY-MM-DD). Reads the timezone the browser stored
 * in a cookie; falls back to the server's local date if it's not set yet
 * (corrected on the next render once the cookie lands).
 */
export async function serverToday(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return tz ? todayIsoInTz(tz) : todayIso();
}
