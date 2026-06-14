/** Tiny input-validation helpers for server actions (defensive, no deps). */

export function reqStr(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`"${field}" is required.`);
  }
  const s = value.trim();
  if (s.length > max) throw new Error(`"${field}" is too long.`);
  return s;
}

export function optStr(value: unknown, field: string, max = 500): string | null {
  if (value == null || value === '') return null;
  return reqStr(value, field, max);
}

/** Non-negative finite number. */
export function num(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`"${field}" must be a number.`);
  }
  const min = opts.min ?? 0;
  const max = opts.max ?? 1_000_000;
  if (n < min || n > max) throw new Error(`"${field}" is out of range.`);
  return n;
}

export function optNum(value: unknown, field: string, opts?: { min?: number; max?: number }): number | null {
  if (value == null || value === '') return null;
  return num(value, field, opts);
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`"${field}" is invalid.`);
  }
  return value as T;
}

export function optOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | null {
  if (value == null || value === '') return null;
  return oneOf(value, allowed, field);
}
