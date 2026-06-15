# Security Review — Phases 1–2

Review of the codebase and setup instructions for secret leaks, authorization gaps, and common web risks. Date: 2026-06-14.

## Summary

| Area | Status |
|---|---|
| Secret / API-key handling | ✅ Clean |
| Database authorization (RLS) | ✅ Enforced on every table |
| Open redirect (auth flows) | ⚠️ Found → ✅ Fixed |
| Input validation | ✅ Server-side on all writes |
| Injection (SQL / XSS) | ✅ No raw SQL; React auto-escaping; no `dangerouslySetInnerHTML` |
| CSRF | ✅ Next.js Server Actions enforce same-origin |
| Dependency audit | ⚠️ 1 transitive (postcss) — accepted, not exploitable in our usage |

## Findings & resolutions

### 1. Open redirect via `next` / `redirectedFrom` (Fixed)
**Risk:** The OAuth callback built its redirect as `` `${origin}${next}` `` and the login form called `router.replace(redirectedFrom)`, where both values came straight from attacker-controllable query params. A crafted link could bounce an authenticated user to an external site (phishing).
**Fix:** Added `safeRedirectPath()` (`apps/web/src/lib/safe-redirect.ts`) which only allows same-origin paths (single leading `/`, rejecting `//`, `/\`, and any scheme). Applied in `auth/callback/route.ts` and `login/login-form.tsx`.

### 2. Dependency: postcss XSS advisory (Accepted)
**Detail:** `npm audit` flags `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93), pulled transitively by Next.js. The advisory concerns running PostCSS over **untrusted CSS input**.
**Assessment:** Not exploitable here — PostCSS runs only at build time over our own stylesheets, never on user data at runtime. The suggested `audit fix --force` downgrades Next.js to v9 (a major breakage) and is not appropriate.
**Action:** Accepted; keep Next.js on a current release (the advisory will clear as Next bumps its bundled postcss).

## What was verified clean

- **Keys:** Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` are exposed to the browser — all browser-safe by design. `SUPABASE_SECRET_KEY` is server-only by name (no `NEXT_PUBLIC_` prefix) and is not read or imported anywhere yet. No service-role key is used in any client path.
- **`.env.local` is gitignored** (verified via `git check-ignore`); no secrets are committed. `.env.example` contains only placeholders.
- **Row-Level Security** is enabled on all seven tables (`0002_rls.sql`). Every user-owned table is owner-scoped (`auth.uid() = user_id`); `foods` additionally allows reading global catalog rows. The web app talks to Postgres through the user's session + publishable key, so RLS is always in force — server actions that filter only by row `id` are still protected, because RLS blocks rows the user doesn't own.
- **Server actions** (`apps/web/src/lib/actions/*`) all call `requireUser()` first and validate input (`apps/web/src/lib/validate.ts`): bounded numbers, length-capped strings, enum allow-lists. No raw SQL — the Supabase client parameterizes all queries.
- **`handle_new_user` trigger** is `security definer` with a pinned `search_path = public` (prevents search-path hijacking).
- **Storage:** the `meal-photos` bucket is private, with policies restricting each user to their own `<user_id>/` prefix.

## Onboarding & account management (migration 0004)

- **Account deletion** uses a `SECURITY DEFINER` Postgres function `delete_account()`
  (`0004_onboarding.sql`) rather than the service-role key. The function deletes
  `auth.users where id = auth.uid()` (cascading every owned table), so the user
  removes only **their own** account, and **no service secret is shipped into the
  app runtime**. `execute` is granted to `authenticated` only (revoked from
  `public`/`anon`); the function pins `search_path = public, auth` and re-checks
  `auth.uid()`.
- **Account reset** (`resetAccount`) runs entirely under the caller's own RLS
  session — it deletes only rows the owner-scoped policies already permit, plus
  resets their profile to signup defaults. No elevated privileges.
- **`weight_entries`** (new table) has RLS enabled with the same owner-only
  policies as the other user tables.

## Setup-instructions guidance (hardening notes for you)

- **"Confirm email" toggle:** the setup guide suggests disabling email confirmation *for local testing only*. **Re-enable it before production** — otherwise anyone can register with an address they don't own.
- **Secret key:** when Phase 4 introduces server-side AI calls, keep `SUPABASE_SECRET_KEY` / `GEMINI_API_KEY` server-only (never `NEXT_PUBLIC_`), and set them only in Vercel's server env, not in client bundles.
- **OAuth redirect URLs:** keep the Supabase **Redirect URLs** allow-list tight (only your real localhost + production origins).
- **Rotate** any key that is ever pasted into a shared channel; treat the Supabase secret key like a password.
