# UI Overhaul Plan — "Warm Clay / Editorial"

A complete visual overhaul moving the app from a generic, bright-green, system-font look to a
**premium, calm, editorial** aesthetic: Anthropic's spaciousness + Apple Fitness/App Store card
structure. This document is the spec; no stylesheet or component changes happen until it's approved.

**Locked direction:** accent = **Warm Clay** · type = **Geist Sans (all)** · theme = **manual toggle, light default, persisted**.

---

## 1. Current state & what gets tokenized

- **Theme mechanism:** CSS custom properties in `apps/web/src/app/globals.css` (`:root` + a `@media (prefers-color-scheme: dark)` block). Good foundation — we keep CSS variables but restructure to `data-theme`.
- **Fonts:** plain system stack (`--font`). Replace with **Geist** via `next/font/google`.
- **Hardcoded colors to pull into tokens:**
  - Macro bars `#3b82f6` / `#f59e0b` / `#ef4444` — `dashboard/components/calorie-summary.tsx`
  - Water bar `#38bdf8` — `dashboard/components/water-card.tsx`
  - `theme_color` / `background_color` — `manifest.ts`; `themeColor` — `layout.tsx`
  - Brand greens — `app/icon.svg`
  - Generic green accent `#16a34a` / `#22c55e` — `globals.css`

---

## 2. Color system (exact hex)

### Light mode (primary default) — warm, grounded, low-glare
| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#FBFAF8` | app background (warm stone) |
| `--surface` | `#FFFFFF` | cards/containers |
| `--surface-2` | `#F4F2EE` | insets, ring tracks, hover |
| `--surface-3` | `#ECEAE4` | pressed / nested |
| `--border` | `#E9E6DF` | hairline borders |
| `--border-strong` | `#DDD9D0` | emphasized dividers |
| `--text` | `#191919` | primary (deep charcoal) |
| `--text-secondary` | `#6F6B63` | secondary (warm gray) |
| `--text-tertiary` | `#9A958B` | meta / eyebrow labels |
| `--accent` | `#B5654A` | **warm clay** — primary buttons, active, ring |
| `--accent-hover` | `#9E5440` | hover |
| `--accent-press` | `#8A4A38` | active/press |
| `--accent-contrast` | `#FFFFFF` | text on accent |
| `--accent-soft` | `#F4EAE5` | active-nav tint, badges |
| `--accent-ring` | `rgba(181,101,74,.30)` | focus ring |
| `--danger` | `#C0473A` | muted brick (harmonizes w/ clay) |
| `--success` | `#4E7A56` | positive states |

### Dark mode — warm ink (not pitch black)
| Token | Hex |
|---|---|
| `--canvas` | `#100F0E` |
| `--surface` | `#1A1916` |
| `--surface-2` | `#221F1B` |
| `--surface-3` | `#2A2723` |
| `--border` | `#2C2925` |
| `--border-strong` | `#3A352F` |
| `--text` | `#E9E6E1` |
| `--text-secondary` | `#9C968C` |
| `--text-tertiary` | `#6E685F` |
| `--accent` | `#D08A6F` (lightened clay) |
| `--accent-hover` | `#DB9C84` |
| `--accent-press` | `#C57A5E` |
| `--accent-contrast` | `#181613` (dark text on light clay) |
| `--accent-soft` | `#2A1E18` |
| `--accent-ring` | `rgba(208,138,111,.35)` |
| `--danger` | `#D2685B` |

### Data-viz palette (muted, editorial — never neon)
| Macro | Light | Dark |
|---|---|---|
| Protein | `#5F7E96` (slate blue) | `#7C9BB2` |
| Carbs | `#C49A52` (honey ochre) | `#D8B36A` |
| Fat | `#B0728A` (dusty rose) | `#C68AA0` |
| Water | `#5E96A0` (muted teal) | `#79AEBC` |

The **calorie ring** uses the clay `--accent` arc on a `--surface-2` track; macro mini-rings use the data tokens.

### Shadows (ultra-subtle, layered, warm-tinted)
```
light  --shadow-sm 0 1px 2px rgba(25,22,18,.05)
       --shadow    0 1px 2px rgba(25,22,18,.05), 0 4px 12px rgba(25,22,18,.05)
       --shadow-lg 0 4px 16px rgba(25,22,18,.08), 0 16px 40px rgba(25,22,18,.08)
dark   --shadow    0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3)
```

---

## 3. Typography — Geist Sans

Loaded with `next/font/google`:
```ts
import { Geist } from 'next/font/google';
const geist = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
// <html className={geist.variable}>  ·  body { font-family: var(--font-sans) }
```
Data/numbers use `font-feature-settings: 'tnum' 1` (tabular figures so nutrition values align). Weights 400 / 500 / 600 / 700.

| Role | Size / line | Tracking | Weight |
|---|---|---|---|
| Display (hero kcal) | 44 / 1.0 | −0.03em | 600 · tnum |
| H1 (page title) | 26 / 1.1 | −0.02em | 600 |
| H2 (card/section) | 17 / 1.25 | −0.01em | 600 |
| Body | 15 / 1.5 | — | 400 |
| Body-sm | 13.5 / 1.45 | — | 400 |
| Label | 12 | — | 500 |
| Eyebrow (UPPERCASE) | 11 | +0.06em | 600 · `--text-tertiary` |

---

## 4. Scale & motion tokens

- **Radius:** `xs 8` · `sm 12` (inputs/buttons) · `md 16` (cards) · `lg 22` (hero/sheet) · `full 999`
- **Spacing (4px base):** 4 8 12 16 20 24 32 40 — card padding 20–24, section gap 18, page padding 20–24, content max-width **720**
- **Motion:** `--ease cubic-bezier(.32,.72,0,1)`, `--ease-out cubic-bezier(.16,1,.3,1)`; durations 140 / 220 / 320ms. Button press `scale(.98)`, card hover lift, sliding tab indicator, sheet present (translateY + fade). Existing `prefers-reduced-motion` reset is retained.

---

## 5. Theme switching (manual, light default, no flash)

1. Tokens defined under `:root[data-theme='light']` and `:root[data-theme='dark']` (`:root` = light fallback).
2. **No-FOUC inline `<script>`** in the root `<head>`: reads `localStorage.theme` (default `'light'`), sets `document.documentElement.dataset.theme` before first paint.
3. **`ThemeToggle`** client component (sun/moon) in the header: flips `data-theme` + persists to `localStorage`; proper `aria-label` / `aria-pressed`.
4. `metadata.themeColor` becomes a media array: light `#FBFAF8`, dark `#100F0E`.

---

## 6. Component blueprint (Apple App Store / Fitness structure)

| File | Change |
|---|---|
| `app/layout.tsx` | Geist font, no-FOUC theme script, `data-theme`, themeColor metadata, body on tokens |
| `app/globals.css` | **(largest)** full token system + refined primitives: `.card`, `.btn` (primary clay / secondary / ghost / pill), `.input` (border + `--accent-ring` focus), `.eyebrow`, `.chip`, `.stat`, `.sheet`, `.skeleton`; data colors → tokens |
| `components/theme-toggle.tsx` | **NEW** — sun/moon toggle |
| `(app)/layout.tsx` | translucent sticky top bar (`backdrop-blur` + hairline), clay leaf brandmark, nav as **segmented pill w/ sliding indicator**, `ThemeToggle` + quiet sign-out; **mobile → Apple-style bottom tab bar** |
| `components/nav-links.tsx` | segmented-pill + bottom-tab variants |
| `dashboard/components/calorie-summary.tsx` | hero card (radius-lg, shadow-lg): crisp **SVG ring** (rounded caps, clay arc) + big tabular remaining-kcal + **3 macro mini-rings** in data tokens + eaten/burned meta |
| `dashboard/components/meal-section.tsx` | App-Store card: soft circular meal icon, title + subtotal, hairline divider, refined rows (desc · muted macro meta · right-aligned tabular kcal), clean `+` pill, quiet empty state |
| `dashboard/components/water-card.tsx`, `exercise-card.tsx` | Apple-Fitness **stat cards**: icon, big tabular value, token progress, refined quick-add pills (keep optimistic water) |
| `dashboard/components/date-nav.tsx` | refined segmented date selector + smooth transitions |
| `components/modal.tsx` | **iOS bottom sheet**: grabber handle, top-rounded radius-lg, spring present via `--ease`, blurred dim (keep focus-trap a11y) |
| `dashboard/components/add-entry-dialog.tsx` | sheet styling, segmented tabs w/ sliding indicator, polished draft-confirm cards, confidence as subtle meter |
| `foods/foods-manager.tsx`, `settings/settings-form.tsx`, `login/*`, `components/barcode-scanner.tsx` | restyle w/ tokens + Geist; Settings as sectioned cards w/ calorie-goal hero stat; Login editorial w/ clay button |
| `app/icon.svg`, `app/manifest.ts` | clay `#B5654A` brandmark, `background_color #FBFAF8` |

**No new dependencies** — `next/font/google` (incl. Geist) is built into Next. Stays $0.

---

## 7. Accessibility & verification (for the build phase)

- Contrast: `#191919` on `#FBFAF8` is excellent; **clay button** white-on-`#B5654A` ≈ 4.0 (AA for UI/large text) — if small-text AA is needed anywhere, darken accent to ~`#A85A40`. Keep `focus-visible` rings (clay ring token), `prefers-reduced-motion`, and Modal focus-trap.
- Build: `npm run build` green (types + lint).
- Manual: toggle light↔dark (no flash on reload), mobile widths (bottom tab bar), sheet/press motion, focus rings.
- `grep` confirms old hexes (`#16a34a`, `#3b82f6`, `#f59e0b`, `#ef4444`, `#38bdf8`) are gone from components.

---

## 8. Suggested execution order (once approved)
1. Tokens + Geist + theme toggle/no-FOUC (`globals.css`, `layout.tsx`, `theme-toggle.tsx`) — the foundation.
2. App shell + nav (top bar, segmented pill, mobile tab bar).
3. Dashboard hero (SVG ring + macro rings) → meal cards → water/exercise stat cards → date selector.
4. Modal → bottom sheet + add-entry dialog.
5. Foods / Settings / Login / barcode + brand assets.
6. Build, contrast/responsive/motion QA.
