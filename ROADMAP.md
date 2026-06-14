# Fitness & Calorie-Tracking App — Architecture & Roadmap

A sleek, minimalist, **web-first** calorie and fitness tracker, architected from day one as a clean **API-driven** system so a **native iOS (Swift/SwiftUI)** app can be added later with minimal rework.

> **Status:** ✅ All 5 phases shipped (Phases 1–5). Web app builds clean; backend is API-driven and iOS-ready. See [`docs/api-contract.md`](./docs/api-contract.md) and [`ios/README.md`](./ios/README.md) for the native-app handoff. This document remains the source of truth for scope.

---

## 1. Product Vision

- **Web first**, iOS later — backend and data layer designed for reuse across both.
- **Minimalist UX:** zero clutter, generous whitespace, intuitive flows.
- **Speed of entry** is the north star — logging a meal should take minimal taps/keystrokes.

### Feature set
1. **Core tracking** — food logging by meal (Breakfast, Lunch, Dinner, Snacks), water intake, daily exercise/activity.
2. **Food intelligence**
   - Reliable nutrition database (free hybrid: USDA + Open Food Facts).
   - Barcode scanning for rapid logging.
   - Text/NLP logging ("a bowl of oatmeal with a handful of blueberries" → distinct tracked items).
   - Photo scanning (Vision AI → ingredient/portion estimates → matched to the food DB).

---

## 2. Confirmed Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Web frontend (now)** | React + **Next.js** (TypeScript, App Router) | Fast, modern, great DX; deploys free on Vercel |
| **iOS (later)** | Native **Swift / SwiftUI** | Best native feel; consumes the same backend + auth |
| **Backend / DB / Auth / Storage** | **Supabase** (Postgres, Auth, Storage, Edge Functions) | Relational DB matches the schema; free tier; built-in auth incl. **Sign in with Apple**; first-class Swift SDK for the future iOS app |
| **Food database** | **USDA FoodData Central** + **Open Food Facts** | Both free; USDA = whole foods, OFF = 2.5M+ barcoded products. Behind a swappable `FoodProvider` interface (Nutritionix drop-in later) |
| **AI (NLP + Vision)** | **Google Gemini** (free tier) | Free to start; behind a swappable `AIProvider` interface (Claude / GPT-4o upgrade later for higher food accuracy) |
| **Web hosting** | **Vercel** (free tier) | One-click Next.js deploys |

**Cost during build: $0.** The only piece with eventual cost beyond a free tier is AI vision/NLP at scale.

### Core architectural principle — *push logic down*
Because iOS will be a **native** app (no shared UI code), reuse is maximized by keeping clients **thin** and putting business logic in the backend:

- Calorie/macro math, food-DB matching, and AI orchestration live in **Supabase Edge Functions + Postgres**.
- The Next.js web app and the future Swift app are both thin clients over the **same REST API + auth**.
- This is what makes "native iOS later" cheap — you don't reimplement logic in Swift, you call the same endpoints.

---

## 3. System Architecture

```
Clients (thin)                Backend (Supabase)                 External
─────────────                 ──────────────────                 ────────
Next.js web   ─┐                                            ┌─ USDA FoodData Central (free)
               ├─► REST/Edge ─► Postgres (RLS) ─► tables    ├─ Open Food Facts (free, barcode)
Swift iOS [L]  ─┘     │          Auth (Apple/Google/email)  └─ Gemini API (free tier)
                      │          Storage (meal photos)
                      └─► Edge Functions: food-search, parse-text (NLP),
                          parse-photo (Vision), calc-nutrition
[L] = later
```

### Repo layout (monorepo)
```
/                      root: ROADMAP.md, README, .env.example
  packages/
    core/              shared TS: domain types, nutrition math,
                       FoodProvider + AIProvider interfaces, typed API client
  apps/
    web/               Next.js app (App Router) — thin UI
  supabase/
    migrations/        SQL schema + RLS policies
    functions/         Edge Functions: food-search, parse-text, parse-photo, calc-nutrition
  ios/                 placeholder (added later — Swift/SwiftUI)
```

---

## 4. Database Schema (Postgres)

All user-owned rows are protected by **Row-Level Security** (each row scoped to its `user_id`).

| Table | Purpose | Key columns |
|---|---|---|
| **`profiles`** | User profile + goals | user_id (→`auth.users`), display_name, dob, sex, height_cm, weight_kg, activity_level, goal_type, daily_calorie_target, daily_water_target_ml, units_pref |
| **`foods`** | Food catalog + custom foods (caches external lookups) | id, owner_user_id (null = global), source (`usda`/`off`/`custom`), external_id, barcode, name, brand, serving_qty, serving_unit, serving_grams, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg |
| **`daily_logs`** | One row per user per day | id, user_id, log_date, calorie_target_snapshot, water_target_snapshot, notes — `UNIQUE(user_id, log_date)` |
| **`meal_entries`** | A food logged into a meal | id, daily_log_id, user_id, meal_type (`breakfast`/`lunch`/`dinner`/`snack`), food_id (nullable), description, quantity, unit, grams, calories, protein_g, carbs_g, fat_g, logged_at, source (`manual`/`barcode`/`nlp`/`photo`), ai_confidence |
| **`water_entries`** | Water intake | id, daily_log_id, user_id, amount_ml, logged_at |
| **`exercise_entries`** | Activity logging | id, daily_log_id, user_id, activity_name, duration_min, calories_burned, intensity, logged_at, source |
| **`ai_jobs`** | Audit/debug for AI parses | id, user_id, type (`photo`/`text`), input_ref, raw_response (jsonb), status |

---

## 5. AI Pipeline (text & photo logging)

Every AI path ends in a **user-confirmation step** before anything is written — accuracy-aware (2026 food-vision benchmarks: ~68–86% food ID, portion estimates weaker), so the human always reconciles against the verified food DB.

**Text (NLP)**
```
User phrase → Edge Fn parse-text → Gemini → JSON items[{name, qty, unit}]
  → FoodProvider lookup (USDA/OFF) → calc-nutrition
  → Confirmation screen (edit/approve) → insert meal_entries
```

**Photo (Vision)**
```
Image → Supabase Storage → Edge Fn parse-photo → Gemini Vision
  → JSON items[{name, est_grams, confidence}] → FoodProvider match
  → calc-nutrition → Confirmation screen → insert meal_entries
```

**Barcode**
```
Scanned code → Open Food Facts lookup → prefill → Confirmation → insert meal_entries
```

---

## 6. Execution Phases

> Phases are **sequential**. Each has explicit exit criteria; we review at each boundary before proceeding.

### Phase 1 — Foundation & API Setup
- Monorepo + tooling (workspaces, TypeScript, lint/format).
- Supabase project; SQL schema + RLS migrations.
- Auth: email + Google + **Sign in with Apple**.
- `packages/core` skeleton: domain types, `FoodProvider` / `AIProvider` interfaces, typed Supabase/API client.
- Deploy an empty authenticated shell to Vercel; `.env.example`.
- **Exit:** a user can sign up / sign in and an empty authenticated dashboard loads.

### Phase 2 — Core CRUD Logging
- Daily dashboard: calorie ring + macro, water, and exercise summaries.
- Meal sections (Breakfast / Lunch / Dinner / Snacks) with fast add / edit / delete.
- Manual food entry + custom foods.
- Water tracking (quick "+250 ml" taps).
- Exercise logging; date navigation.
- **Exit:** a full day can be logged manually, end to end. (Minimal-tap UX is the priority.)

### Phase 3 — Food Intelligence (non-AI)
- Implement `FoodProvider` against USDA + Open Food Facts.
- Food search with caching into `foods`.
- **Barcode scanning** (web camera → OFF lookup → prefill → confirm).
- **Exit:** search a food or scan a barcode and log it in a couple of taps.

### Phase 4 — AI Integrations
- `AIProvider` against Gemini (swappable).
- Edge Functions `parse-text` (NLP) and `parse-photo` (Vision).
- Shared **confirmation screen** flow; `calc-nutrition`; `ai_jobs` audit; photo upload to Storage.
- **Exit:** "a bowl of oatmeal with blueberries" and a meal photo each become reviewed, logged entries.

### Phase 5 — UI/UX Polish & iOS Readiness
- Design system + micro-interactions; optimistic updates / offline cache; accessibility; performance.
- Finalize and **document the public REST API / auth contract** so the native Swift app consumes the identical backend.
- `ios/` placeholder + integration notes.
- **Exit:** polished web app + a clean, documented API surface ready for native iOS.

---

## 7. What's free vs. eventual cost

| Item | Cost |
|---|---|
| Supabase (DB, Auth, Storage) | Free tier ($0; ~$25/mo only if scaling live traffic) |
| Vercel web hosting | Free tier ($0) |
| USDA + Open Food Facts | Free ($0) |
| Google Gemini AI | Free tier ($0; usage-based cost only at scale or if upgrading to Claude/GPT-4o) |
```
