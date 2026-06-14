/** Shared fetch helper: JSON with timeout + optional caller abort signal. */
export async function fetchJson<T>(
  url: string,
  opts: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    timeoutMs?: number;
    method?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const { signal, headers, timeoutMs = 8000, method = 'GET', body } = opts;
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal: combined,
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return (await res.json()) as T;
}

/** Coerce a possibly-string/undefined value to a finite number, else undefined. */
export function toNum(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}
