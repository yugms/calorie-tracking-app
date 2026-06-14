# iOS App (placeholder)

The native **Swift/SwiftUI** app will live here. It is **not built yet** — the web app ships
first. This folder documents how the iOS app plugs into the existing backend so almost no
server work is needed when the time comes.

> Read [`../docs/api-contract.md`](../docs/api-contract.md) first — it defines the auth, data,
> storage, and capability surfaces both clients share.

## What the iOS app reuses (no rebuild)

- **Backend:** the same Supabase project — Postgres, Auth, Storage. Zero changes.
- **Auth:** [`supabase-swift`](https://github.com/supabase/supabase-swift) `Auth`, including native **Sign in with Apple**.
- **Data:** the same RLS-protected tables via the Swift SDK's PostgREST client. Query/mutation
  shapes mirror `apps/web/src/lib/data/` and `apps/web/src/lib/actions/`.
- **Storage:** the `meal-photos` bucket, same per-user prefix.
- **Food + AI:** the `FoodProvider`/`AIProvider` logic in `@calorie/core`.

## What needs porting / decisions

| Concern | Recommendation |
|---|---|
| UI | Rebuilt in SwiftUI (native, no shared UI code — by design). |
| Nutrition math | Port the pure functions in `packages/core/src/nutrition/math.ts` to Swift (a handful of formulas), **or** call an Edge Function. |
| Food search / barcode / AI parse | Port the four `/api/*` routes to **Supabase Edge Functions** (Deno can import the same `@calorie/core` TypeScript), so iOS calls `…/functions/v1/*` with the user JWT. Keeps secret keys server-side. |
| Barcode scanning | Native `VisionKit` / `AVFoundation` (the web uses `BarcodeDetector`). |
| Config | Reuse `NEXT_PUBLIC_SUPABASE_URL` + publishable key (safe to ship in the app). Never embed the secret/USDA/Gemini keys — those stay in Edge Functions. |

## Suggested structure (when started)

```
ios/
  CalorieTracker.xcodeproj
  CalorieTracker/
    App/            entry point, Supabase client setup
    Auth/           sign-in (email, Apple, Google)
    Dashboard/      day view, meal sections, rings
    Logging/        search, barcode, AI describe/photo, confirm
    Models/         Codable structs mirroring @calorie/core types
    Services/       Supabase data/storage + Edge Function calls
```

## First steps checklist

1. Create the Xcode project here; add `supabase-swift` via SPM.
2. Configure the Supabase client (URL + publishable key).
3. Implement Auth (Apple/Google/email) → you're hitting the same user rows as web.
4. Mirror the `Codable` models from `@calorie/core` entity types.
5. Build the dashboard read path against the same tables.
6. Port the capability endpoints to Edge Functions, then wire logging.
