# Calorie Tracker

A sleek, minimalist, **web-first** calorie & fitness tracker — architected API-first so a native iOS app can reuse the same backend later.

See [`ROADMAP.md`](./ROADMAP.md) for the full architecture, schema, and phase plan.

## Stack

- **Web:** Next.js (TypeScript, App Router) → Vercel
- **Backend / DB / Auth / Storage:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Shared logic:** `packages/core` (types, nutrition math, provider interfaces)
- **Food data:** USDA FoodData Central + Open Food Facts (behind `FoodProvider`)
- **AI (NLP + Vision):** Google Gemini free tier (behind `AIProvider`)

## Monorepo layout

```
packages/core      Shared TS: domain types, nutrition math, provider interfaces
apps/web           Next.js web app (thin client)
supabase/          SQL migrations + Edge Functions
ios/               (later) native Swift/SwiftUI app
```

## Getting started (Phase 1)

1. **Install dependencies** (npm workspaces):
   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com (free tier).

3. **Apply the database schema.** In the Supabase dashboard → SQL Editor, run the files in
   [`supabase/migrations/`](./supabase/migrations) in order. (Or, with the Supabase CLI:
   `supabase db push`.)

4. **Configure environment.** Copy `.env.example` to `apps/web/.env.local` and fill in your
   Supabase URL + **publishable key** (`sb_publishable_…`). Use the modern
   publishable/secret keys under Project Settings → API Keys, not the legacy
   anon/service_role keys (deprecated by end of 2026).

5. **Enable auth providers** (Supabase dashboard → Authentication → Providers):
   - Email (on by default)
   - Google — add OAuth client ID/secret
   - Apple — add Sign in with Apple credentials
   - Set the redirect URL to `http://localhost:3000/auth/callback` (and your prod URL).

   > **First time setting up Google sign-in or deploying to Vercel?** See the detailed,
   > beginner-friendly walkthrough in
   > [`docs/google-auth-and-vercel.md`](./docs/google-auth-and-vercel.md).

6. **Run the app:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — sign up, then land on the (empty) dashboard.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run the web app (dev server) |
| `npm run build` | Build core + web |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run lint` | Lint all workspaces |
