# Public API Contract

The backend is **API-driven**: the Next.js web app is a thin client over Supabase, and the
future **native iOS (Swift/SwiftUI)** app consumes the *same* backend with no server changes.
This document is the contract both clients code against.

There are three surfaces:

1. **Auth** — Supabase Auth (JWT sessions).
2. **Data API** — Supabase auto-generated REST (PostgREST) over the Postgres tables, guarded by Row-Level Security.
3. **Capability endpoints** — a few server routes that wrap secret keys (food DB, AI). Portable to Supabase Edge Functions.

---

## 1. Auth

- Provider: **Supabase Auth**. Methods enabled: email/password, Google, **Sign in with Apple**.
- Clients hold a JWT access token + refresh token. Every Data API and Storage request is authorized by the JWT; RLS uses `auth.uid()` from it.
- **Web:** `@supabase/ssr` stores the session in cookies; middleware refreshes it (`apps/web/src/lib/supabase/`).
- **iOS:** use [`supabase-swift`](https://github.com/supabase/supabase-swift) `Auth` — it manages the same tokens. Sign in with Apple is native on iOS.
- Redirect/callback: `/auth/callback` exchanges the OAuth `code` for a session (web). Native iOS uses the SDK's ASWebAuthenticationSession flow.

## 2. Data API (PostgREST)

Base: `https://<project-ref>.supabase.co/rest/v1`. Send `apikey: <publishable key>` and `Authorization: Bearer <user JWT>`.

**Every table is protected by RLS** — a client can only read/write its own rows (global food rows are world-readable). The SDKs (`supabase-js`, `supabase-swift`) wrap these calls; you rarely hand-write URLs.

| Table | Scope | Notes |
|---|---|---|
| `profiles` | owner | one row per user; goals + stats. Created on signup. |
| `foods` | owner + global-read | custom foods (owner set) and cached external foods (owner null). |
| `daily_logs` | owner | one row per `(user_id, log_date)`. |
| `meal_entries` | owner | denormalized nutrition snapshot + `meal_type` + `source`. |
| `water_entries` | owner | `amount_ml`. |
| `exercise_entries` | owner | `activity_name`, `calories_burned`. |
| `ai_jobs` | owner | audit of AI parses. |

Full column definitions: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql); policies: [`0002_rls.sql`](../supabase/migrations/0002_rls.sql).

Example (read today's meals — conceptually):
```
GET /rest/v1/meal_entries?daily_log_id=eq.<id>&order=logged_at.asc
Authorization: Bearer <jwt>
apikey: <publishable key>
```
The reference query/mutation logic lives in `apps/web/src/lib/data/` and `apps/web/src/lib/actions/` — mirror it on iOS via the Swift SDK.

## 3. Capability endpoints (wrap secret keys)

These run server-side because they use keys that must never reach a client (USDA key, Gemini key). All require an authenticated session.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/api/foods/search` | `?q=<text>` (≥2 chars) | `{ results: FoodSearchResult[] }` |
| GET | `/api/foods/barcode` | `?code=<6–14 digits>` | `{ result: FoodSearchResult \| null }` |
| POST | `/api/ai/parse-text` | `{ text }` | `{ jobId, drafts: DraftEntry[] }` |
| POST | `/api/ai/parse-photo` | multipart `image` | `{ jobId, drafts: DraftEntry[] }` |

`FoodSearchResult` and the AI types are defined in `@calorie/core` (`providers/food-provider.ts`, `providers/ai-provider.ts`). `DraftEntry` is in `apps/web/src/lib/ai/match.ts`.

**For iOS:** these are currently Next.js routes. The provider *logic* is framework-agnostic and lives in `@calorie/core` (`UsdaFoodProvider`, `OpenFoodFactsProvider`, `CompositeFoodProvider`, `GeminiProvider`). Recommended path: **port these four routes to Supabase Edge Functions** (Deno can import the same TypeScript) so the native app calls `https://<ref>.supabase.co/functions/v1/...` with the user JWT — one backend, both clients. Until then, the iOS app can call the deployed web app's `/api/*` routes.

## 4. Storage

- Bucket `meal-photos` (private). Objects are namespaced `meal-photos/<user_id>/<file>`; RLS restricts each user to their own prefix (`0003_storage.sql`).
- iOS uploads meal photos via `supabase-swift` Storage to the same bucket/prefix.

## 5. Shared logic (`@calorie/core`)

Pure TypeScript, no framework deps: domain types, **nutrition math** (per-100g scaling, Mifflin-St Jeor BMR→TDEE→calorie target), and the provider interfaces/implementations. The web app imports it directly. For iOS, either:
- **Port** the small, pure functions in `nutrition/math.ts` to Swift (a few formulas), or
- Keep nutrition computation server-side in Edge Functions so both clients stay thin.

Keeping business logic here (and in Edge Functions) is the project's core principle — it's what makes "native iOS later" cheap.
