# Onboarding & Account Management — Implementation Plan

Premium, state-driven 6-step onboarding wizard + a minimalist "Account Management"
section in Settings (Reset / Delete). Built on the existing **warm-clay** design
system, `@calorie/core` pure math, Supabase + RLS, and `$0` infra.

---

## 1. Where the data lives (review of current schema)

`profiles` (one row per `auth.users`, auto-created by the `handle_new_user`
trigger) already holds the BMR/TDEE inputs: `dob`, `sex`, `height_cm`,
`weight_kg`, `activity_level`, `goal_type`, `daily_calorie_target`,
`daily_water_target_ml`, `units_pref`. Tracking data lives in `daily_logs`
(→ `meal_entries`, `water_entries`, `exercise_entries` all FK it `on delete
cascade`). Every table FKs `auth.users (id) on delete cascade`.

**Gaps the new flow needs** (→ new migration `0004_onboarding.sql`):

| Requirement | Today | Plan |
|---|---|---|
| Onboarding completion flag | — | `profiles.onboarded_at timestamptz` (null = not onboarded) |
| 4-option primary goal (Lose / Maintain / Build Muscle / Athletic) | `goal_type` is only lose/maintain/gain | add `primary_goal text` (check: `lose,maintain,gain,perform`); keep `goal_type` for the BMR math (perform→maintain, gain→gain) |
| Target weight + weekly rate | — | `target_weight_kg numeric(5,1)`, `weekly_rate_kg numeric(4,2)` (metric, signed by direction) |
| Dietary profile + exclusions/allergies | — | `diet_profile text` (check list), `exclusions text[]` |
| Training description | — | `training_notes text` |
| Macro targets (P/C/F grams) | only `daily_calorie_target` | `protein_target_g int`, `carbs_target_g int`, `fat_target_g int` |
| **Weight history** (cleared on reset; future trend) | no table | new `weight_entries` table |

`weight_entries`: `id uuid pk`, `user_id uuid → auth.users on delete cascade`,
`weight_kg numeric(5,1) not null`, `logged_on date not null`, `created_at`,
`unique (user_id, logged_on)`. RLS owner-only (same generator as the other
tables). Step 2's current weight seeds the first row.

**Backfill so existing users aren't trapped in onboarding:**
`update profiles set onboarded_at = created_at where daily_calorie_target is not null;`

All new columns are nullable / additive → no breaking change. Storage stays
**metric**; imperial is a display concern converted at the edge.

---

## 2. The TDEE engine (additions to `@calorie/core`)

Keep the existing pure helpers (`bmrMifflinStJeor`, `tdee`,
`calorieTargetForGoal`, `ageFromDob`). Add (all pure, no I/O — reusable on web
**and** future iOS, server-authoritative):

- `KCAL_PER_KG = 7700` and `calorieFloorForSex(sex)` → **1500** male / **1200**
  female / **1200** otherwise (conservative safe minimum).
- `calorieTargetFromRate({ tdee, sex, direction, kgPerWeek })` →
  `{ target, floored }`. delta = `kgPerWeek * KCAL_PER_KG / 7`; subtract for
  `lose`, add for `gain`, ignore for `maintain`/`perform`. **Guardrail:** if the
  result drops below `calorieFloorForSex`, clamp to the floor and set
  `floored: true` so the UI can flag it.
- `macroTargetsForCalories({ calories, weightKg, primaryGoal })` →
  `{ protein_g, carbs_g, fat_g }`. Protein by goal (g/kg of body weight):
  lose 2.0 · perform 1.8 · gain 1.8 · maintain 1.6; fat = 25–30% of calories;
  carbs = remainder (Atwater 4/4/9, never negative).
- Unit helpers: `lbToKg`, `kgToLb`, `ftInToCm`, `cmToFtIn`, `kgToLbRate`.
- `defaultUnitsForLocale(locale)` → `imperial` for regions `{US, LR, MM}`, else
  `metric`. Step 2 seeds its unit toggle from the browser locale
  (`new Intl.Locale(navigator.language).region`) so the **default follows the
  user's location**, with a manual override toggle either way.
- Label/value enums for the UI: `PRIMARY_GOALS`, `DIET_PROFILES`,
  `COMMON_EXCLUSIONS`, with display-label maps.

The wizard computes the reveal **live** from these; `completeOnboarding`
recomputes them **server-side** as the source of truth (never trusts client math).

---

## 3. Routing & the onboarding gate

- New **top-level** route `apps/web/src/app/onboarding/` (deliberately *outside*
  the `(app)` group, so it renders full-screen with **no** header/nav/tab-bar —
  a focused, distraction-free flow). Still auth-protected: middleware already
  forces login for any non-public path.
- `onboarding/page.tsx` (server): load profile; if `onboarded_at` is set **and**
  there's no `?reset` intent → `redirect('/dashboard')`. Otherwise render the
  wizard, pre-filled from any existing profile values.
- `(app)/layout.tsx`: after the existing `getUser`, also select
  `onboarded_at`; if null → `redirect('/onboarding')`. This guards the whole app
  (dashboard, foods, settings) behind a completed profile.

State model: a single client **state machine** in `OnboardingWizard`
(`step` 1–6 + an accumulating `draft` object). No DB writes until the final
submit. Draft mirrored to `localStorage` (`onboarding:draft`) so a mid-flow
refresh isn't lost; cleared on completion and on reset.

---

## 4. The wizard — component architecture

```
app/onboarding/
  layout.tsx          // minimal full-screen shell (brand mark, centered card, progress)
  page.tsx            // server: gate + prefill, renders <OnboardingWizard initial=…/>
  onboarding-wizard.tsx   // 'use client' — the state machine (step, draft, nav, transitions)
  steps/
    step-goal.tsx       // 1 · primary goal (4 soft selectable cards)
    step-basics.tsx     // 2 · age/sex/height/weight (+ metric/imperial toggle)
    step-target.tsx     // 3 · target weight + weekly-rate slider + floor guardrail
    step-diet.tsx       // 4 · diet profile (cards) + multi-select exclusion chips
    step-activity.tsx   // 5 · activity level (cards) + training-type notes
    step-review.tsx     // 6 · computed targets reveal + "Let's Get Started"
  progress.tsx          // slim segmented progress indicator (Step n of 6)
```

**Shared interaction model (Apple/Anthropic feel):**
- One card on screen at a time, **one or two questions max**, generous spacing,
  Geist type scale, fluid step transitions (slide+fade via `--ease`,
  `prefers-reduced-motion` respected).
- Selections are large tappable cards / `.chip`s that show an **immediate**
  selected state (clay ring + check) — tactile, no "Submit per field".
- Sticky footer: `Back` (ghost) + `Continue` (primary clay), `Continue` disabled
  until the step validates. Progress indicator pinned at top.
- **Step 3 is conditional:** shown only for `lose` / `gain`; auto-skipped for
  `maintain` / `perform` (the machine advances 2→4 and the progress bar shows 5
  effective steps). The floor guardrail flags + caps when the slider gets
  aggressive (uses `calorieTargetFromRate().floored`), with a calm inline note,
  never a hard block.
- **Step 6 reveal:** minimalist summary card — big tabular daily kcal + three
  macro mini-rings (reusing the dashboard `Ring` style) for P/C/F, a one-line
  rationale, and a prominent **"Let's Get Started"** button.

---

## 5. Server actions (`lib/actions/onboarding.ts`)

- `completeOnboarding(input)` — `requireUser`; validate every field with the
  existing `validate.ts` helpers + core enums; **recompute** `goal_type`,
  `daily_calorie_target`, macro targets, and `daily_water_target_ml`
  server-side; `upsert` the profile with `onboarded_at = now()`; **seed** a
  `weight_entries` row for the user's local "today" (from the `tz` cookie via
  `serverToday`); `revalidatePath('/dashboard')`. Returns `{ ok }`; client then
  `router.push('/dashboard')`.
- `resetAccount()` — see §6.
- `deleteAccount()` — see §6.

---

## 6. Account Management (Settings)

New sectioned card at the bottom of Settings, visually quiet and clearly
separated (an "Account" eyebrow, then two controls). Both use the existing
`Modal` (iOS bottom-sheet, focus-trapped) for confirmation.

### Reset Account Data  (secondary button)
**Decision: reset restores the account to a brand-new, just-signed-up state** —
not merely clearing logs. Server action `resetAccount()` runs with the user's
**own RLS client** (owner-delete policies already exist) and wipes everything a
fresh signup wouldn't have:
1. `delete from daily_logs where user_id = me` → cascades `meal_entries`,
   `water_entries`, `exercise_entries`.
2. `delete from weight_entries where user_id = me`.
3. `delete from foods where owner_user_id = me` (custom foods).
4. `delete from ai_jobs where user_id = me`.
5. Remove the user's objects under the private `meal-photos/<uid>/…` storage
   folder (best-effort `storage.remove`).
6. Reset the profile to signup defaults — **keep only `display_name`**; null
   every other field (`dob, sex, height_cm, weight_kg, activity_level,
   goal_type, primary_goal, target_weight_kg, weekly_rate_kg, diet_profile,
   exclusions, training_notes, daily_calorie_target, protein/carbs/fat targets,
   onboarded_at`), restore `units_pref='metric'` and
   `daily_water_target_ml=2000` (the trigger's defaults).

The result is indistinguishable from a new account (same as the
`handle_new_user` trigger leaves it). Client: confirm in modal → call action →
clear `localStorage` draft → `router.push('/onboarding')` (lands on Step 1).

### Permanently Delete Account  (red-tinted, low-profile button)
Account deletion must remove the **`auth.users`** row, which the RLS
publishable key cannot do. Rather than ship the `SUPABASE_SECRET_KEY` into the
Next runtime, use a **`SECURITY DEFINER` Postgres RPC** (in `0004`) — more
secure, no admin key in the app, still `$0`:

```sql
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();  -- cascades every owned table
end; $$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
```

Because every table FKs `auth.users on delete cascade`, this one delete purges
the profile and **all** relational rows. Flow: red button → confirmation modal
(typed "DELETE" to arm the destructive action) → `supabase.rpc('delete_account')`
→ `supabase.auth.signOut()` (destroys the session) → `router.push('/login')`.

---

## 7. Files touched / added

**Added**
- `supabase/migrations/0004_onboarding.sql` (columns, `weight_entries` + RLS,
  backfill, `delete_account()` RPC).
- `packages/core/src/nutrition/math.ts` additions + new enums in
  `types/enums.ts` (exported via the barrel).
- `apps/web/src/app/onboarding/{layout,page,onboarding-wizard,progress}.tsx`
  + `steps/*.tsx`.
- `apps/web/src/lib/actions/onboarding.ts`.
- `apps/web/src/components/account-management.tsx` (Settings section).

**Edited**
- `packages/core/src/types/entities.ts` (`Profile` new fields + `WeightEntry`).
- `apps/web/src/app/(app)/layout.tsx` (onboarding gate).
- `apps/web/src/app/(app)/settings/{page,settings-form}.tsx` (mount Account
  Management; minor copy).
- `.env.example` / `SECURITY.md` (note: delete uses a `SECURITY DEFINER` RPC, no
  new client secret required).

**No new dependencies. No new paid services.**

---

## 8. Verification (later build phase)
- `npm run build` green (core `tsc --noEmit`, web types + lint).
- New user → forced to `/onboarding`; complete flow → profile written, weight
  seeded, lands on dashboard with a sensible target. Existing users (backfilled)
  skip onboarding.
- Step 3 skip logic for maintain/perform; floor guardrail caps + flags an
  aggressive rate.
- Reset → tracking + weight wiped, flag cleared, redirected to Step 1; custom
  foods retained.
- Delete → `rpc` purges all tables incl. `auth.users`, session destroyed,
  redirected to `/login`; re-login is a brand-new account.
- Light/dark, focus-visible rings, reduced-motion, mobile widths all hold.

---

> **STOP — awaiting review.** No schema or component changes made yet beyond this
> plan file.
