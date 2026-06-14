/**
 * Returns `value` only if it is a safe same-origin path; otherwise the fallback.
 * Blocks open-redirect payloads like `https://evil.com`, `//evil.com`, `/\evil.com`.
 * Safe to use on both client and server.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  // Must be a path rooted at our origin: exactly one leading slash, no scheme.
  if (value[0] !== '/') return fallback;
  if (value[1] === '/' || value[1] === '\\') return fallback;
  if (value.includes('://') || value.includes('\\')) return fallback;
  return value;
}
