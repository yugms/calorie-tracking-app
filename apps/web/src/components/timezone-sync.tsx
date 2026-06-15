'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Stores the browser's IANA timezone in a cookie so the server can compute the
 * user's local "today" (the server runs in UTC). Refreshes once when the value
 * changes so server components re-render with the correct date.
 */
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const current = document.cookie
      .split('; ')
      .find((c) => c.startsWith('tz='))
      ?.slice(3);

    if (current === tz) return; // already in sync — no refresh

    // IANA names use only cookie-safe characters; no encoding needed.
    document.cookie = `tz=${tz}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }, [router]);

  return null;
}
