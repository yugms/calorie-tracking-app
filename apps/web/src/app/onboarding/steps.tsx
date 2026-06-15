'use client';

import {
  ACTIVITY_LEVELS,
  COMMON_EXCLUSIONS,
  DIET_PROFILES,
  ageFromDob,
  bmrMifflinStJeor,
  calorieTargetForGoal,
  calorieTargetFromRate,
  cmToFtIn,
  ftInToCm,
  goalTypeForPrimary,
  kgToLb,
  lbToKg,
  macroTargetsForCalories,
  tdee,
  type ActivityLevel,
  type DietProfile,
  type PrimaryGoal,
  type Sex,
  type UnitPref,
} from '@calorie/core';
import { OptionCard, Field, StepHead } from './ui';

// --- Shared draft model -------------------------------------------------------
export interface Draft {
  primary_goal: PrimaryGoal | null;
  units: UnitPref;
  dob: string;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  weekly_rate_kg: number | null;
  activity_level: ActivityLevel | null;
  diet_profile: DietProfile | null;
  exclusions: string[];
  training_notes: string;
}
export type Patch = (p: Partial<Draft>) => void;
interface StepProps {
  draft: Draft;
  patch: Patch;
}

// --- Labels -------------------------------------------------------------------
const GOAL_OPTS: { value: PrimaryGoal; emoji: string; title: string; subtitle: string }[] = [
  { value: 'lose', emoji: '📉', title: 'Lose weight', subtitle: 'Shed fat at a steady, sustainable pace' },
  { value: 'maintain', emoji: '⚖️', title: 'Maintain weight', subtitle: 'Stay right where you are' },
  { value: 'gain', emoji: '💪', title: 'Build muscle / gain', subtitle: 'Add size and strength' },
  { value: 'perform', emoji: '🏃', title: 'Athletic performance', subtitle: 'Fuel training and recovery' },
];
const ACTIVITY_OPTS: Record<ActivityLevel, { emoji: string; title: string; subtitle: string }> = {
  sedentary: { emoji: '🪑', title: 'Sedentary', subtitle: 'Little or no exercise' },
  light: { emoji: '🚶', title: 'Lightly active', subtitle: 'Light exercise 1–3 days/week' },
  moderate: { emoji: '🚴', title: 'Moderately active', subtitle: 'Moderate exercise 3–5 days/week' },
  active: { emoji: '🏋️', title: 'Very active', subtitle: 'Hard exercise 6–7 days/week' },
  very_active: { emoji: '🔥', title: 'Extra active', subtitle: 'Physical job or training twice a day' },
};
const DIET_OPTS: Record<DietProfile, { emoji: string; title: string; subtitle: string }> = {
  standard: { emoji: '🍽️', title: 'Standard / mixed', subtitle: 'A bit of everything' },
  vegetarian: { emoji: '🥗', title: 'Vegetarian', subtitle: 'No meat, poultry, or seafood' },
  vegan: { emoji: '🌱', title: 'Vegan', subtitle: 'No animal products' },
  plant_based: { emoji: '🥦', title: 'Plant-based', subtitle: 'Mostly plants' },
  keto: { emoji: '🥑', title: 'Keto', subtitle: 'Low-carb, high-fat' },
  custom: { emoji: '⚙️', title: 'Custom', subtitle: "I'll set my own" },
};
const EXCLUSION_LABELS: Record<string, string> = {
  dairy: 'Dairy',
  eggs: 'Eggs',
  gluten: 'Gluten',
  peanuts: 'Peanuts',
  tree_nuts: 'Tree nuts',
  soy: 'Soy',
  shellfish: 'Shellfish',
  fish: 'Fish',
  pork: 'Pork',
  red_meat: 'Red meat',
  sesame: 'Sesame',
};
const SEX_OPTS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// --- Live target computation (client preview; server is authoritative) --------
export function computeTargets(draft: Draft): {
  tdee: number;
  target: number;
  floored: boolean;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
} | null {
  const { primary_goal, dob, sex, height_cm, weight_kg, activity_level, weekly_rate_kg } = draft;
  if (!primary_goal || !dob || !sex || height_cm == null || weight_kg == null || !activity_level) return null;

  const age = ageFromDob(dob, new Date());
  if (!Number.isFinite(age) || age <= 0 || age > 120) return null;

  const goal = goalTypeForPrimary(primary_goal);
  const tdeeKcal = tdee(bmrMifflinStJeor({ sex, weightKg: weight_kg, heightCm: height_cm, ageYears: age }), activity_level);

  let target: number;
  let floored = false;
  if ((goal === 'lose' || goal === 'gain') && weekly_rate_kg && weekly_rate_kg > 0) {
    const r = calorieTargetFromRate({ tdee: tdeeKcal, sex, goal, kgPerWeek: weekly_rate_kg });
    target = r.target;
    floored = r.floored;
  } else {
    target = calorieTargetForGoal(tdeeKcal, goal);
  }
  const macros = macroTargetsForCalories({ calories: target, weightKg: weight_kg, primaryGoal: primary_goal });
  return { tdee: tdeeKcal, target, floored, macros };
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// =============================================================================
// Step 1 — Primary goal
// =============================================================================
export function Step1Goal({ draft, patch }: StepProps) {
  return (
    <div className="step-in">
      <StepHead eyebrow="Your objective" title="What's your main goal?" subtitle="We'll tailor your daily targets around it. You can change this later." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GOAL_OPTS.map((o) => (
          <OptionCard
            key={o.value}
            active={draft.primary_goal === o.value}
            onClick={() => patch({ primary_goal: o.value })}
            emoji={o.emoji}
            title={o.title}
            subtitle={o.subtitle}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Step 2 — Anthropometrics & basics
// =============================================================================
export function Step2Basics({ draft, patch }: StepProps) {
  const imperial = draft.units === 'imperial';

  function setHeightMetric(cm: string) {
    patch({ height_cm: numOrNull(cm) });
  }
  function setHeightImperial(ftStr: string, inStr: string) {
    const ft = numOrNull(ftStr);
    const inches = numOrNull(inStr);
    patch({ height_cm: ft == null && inches == null ? null : ftInToCm(ft ?? 0, inches ?? 0) });
  }
  function setWeight(v: string, key: 'weight_kg' | 'target_weight_kg') {
    const n = numOrNull(v);
    patch({ [key]: n == null ? null : imperial ? lbToKg(n) : n } as Partial<Draft>);
  }

  const hImp = draft.height_cm != null ? cmToFtIn(draft.height_cm) : null;
  const wDisplay = (kg: number | null): string =>
    kg == null ? '' : imperial ? String(kgToLb(kg)) : String(kg);

  return (
    <div className="step-in">
      <StepHead eyebrow="About you" title="A few basics" subtitle="These set your metabolic rate. Nothing here is shared." />

      <div className="seg" style={{ marginBottom: 18 }}>
        {(['imperial', 'metric'] as UnitPref[]).map((u) => (
          <button key={u} type="button" className="seg-item" data-active={draft.units === u} onClick={() => patch({ units: u })}>
            {u === 'imperial' ? 'Imperial (lb / ft)' : 'Metric (kg / cm)'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Date of birth">
            <input className="input" type="date" value={draft.dob} max="2015-12-31" onChange={(e) => patch({ dob: e.target.value })} />
          </Field>
        </div>

        <div>
          <label className="label">Biological sex</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SEX_OPTS.map((s) => (
              <button
                key={s.value}
                type="button"
                className="chip chip-toggle"
                data-active={draft.sex === s.value}
                onClick={() => patch({ sex: s.value })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {imperial ? (
            <>
              <Field label="Height">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" type="number" inputMode="numeric" min={1} max={8} placeholder="ft" value={hImp?.ft ?? ''} onChange={(e) => setHeightImperial(e.target.value, String(hImp?.inches ?? ''))} />
                  <input className="input" type="number" inputMode="numeric" min={0} max={11} placeholder="in" value={hImp?.inches ?? ''} onChange={(e) => setHeightImperial(String(hImp?.ft ?? ''), e.target.value)} />
                </div>
              </Field>
              <Field label="Weight (lb)">
                <input className="input" type="number" inputMode="decimal" min={40} max={1100} placeholder="160" value={wDisplay(draft.weight_kg)} onChange={(e) => setWeight(e.target.value, 'weight_kg')} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Height (cm)">
                <input className="input" type="number" inputMode="numeric" min={50} max={300} placeholder="175" value={draft.height_cm ?? ''} onChange={(e) => setHeightMetric(e.target.value)} />
              </Field>
              <Field label="Weight (kg)">
                <input className="input" type="number" inputMode="decimal" min={20} max={500} placeholder="70" value={wDisplay(draft.weight_kg)} onChange={(e) => setWeight(e.target.value, 'weight_kg')} />
              </Field>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Step 3 — Target formulation (lose / gain only)
// =============================================================================
export function Step3Target({ draft, patch }: StepProps) {
  const imperial = draft.units === 'imperial';
  const goal = draft.primary_goal === 'lose' ? 'lose' : 'gain';
  const verb = goal === 'lose' ? 'lose' : 'gain';

  // Rate slider works in the display unit; draft stores kg.
  const rateUnit = imperial ? 'lb' : 'kg';
  const rateMin = imperial ? 0.25 : 0.1;
  const rateMax = imperial ? 2 : 1;
  const rateStep = imperial ? 0.25 : 0.05;
  const rateDisplay = draft.weekly_rate_kg == null ? (imperial ? 1 : 0.5) : imperial ? kgToLb(draft.weekly_rate_kg) : draft.weekly_rate_kg;

  function setRate(v: number) {
    patch({ weekly_rate_kg: imperial ? lbToKg(v) : v });
  }
  function setTarget(v: string) {
    const n = numOrNull(v);
    patch({ target_weight_kg: n == null ? null : imperial ? lbToKg(n) : n });
  }
  const targetDisplay = draft.target_weight_kg == null ? '' : imperial ? String(kgToLb(draft.target_weight_kg)) : String(draft.target_weight_kg);

  const preview = computeTargets({ ...draft, weekly_rate_kg: draft.weekly_rate_kg ?? (imperial ? lbToKg(1) : 0.5) });

  return (
    <div className="step-in">
      <StepHead eyebrow="Your target" title={`How fast do you want to ${verb}?`} subtitle="Pick a pace that feels sustainable. We'll keep you above a safe minimum." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label={`Target weight (${imperial ? 'lb' : 'kg'})`} hint="Optional — helps us track progress.">
          <input className="input" type="number" inputMode="decimal" placeholder={imperial ? '150' : '68'} value={targetDisplay} onChange={(e) => setTarget(e.target.value)} />
        </Field>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <label className="label" style={{ marginBottom: 0 }}>
              Weekly pace
            </label>
            <span className="tnum" style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)' }}>
              {(Math.round(rateDisplay * 100) / 100).toLocaleString()} {rateUnit}/wk
            </span>
          </div>
          <input
            className="range"
            type="range"
            min={rateMin}
            max={rateMax}
            step={rateStep}
            value={rateDisplay}
            onChange={(e) => setRate(Number(e.target.value))}
          />
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6 }}>
            <span>Gradual</span>
            <span>Aggressive</span>
          </div>
        </div>

        {preview && (
          <div className="card" style={{ padding: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="eyebrow">Estimated daily target</div>
              <div className="display tnum" style={{ fontSize: 28, marginTop: 4 }}>
                {preview.target}
                <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}> kcal</span>
              </div>
            </div>
            {preview.floored && (
              <span className="chip" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', height: 'auto', padding: '8px 12px', maxWidth: 150, textAlign: 'center', lineHeight: 1.3 }}>
                Capped at a safe minimum
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Step 4 — Dietary profile & exclusions
// =============================================================================
export function Step4Diet({ draft, patch }: StepProps) {
  function toggleExclusion(x: string) {
    const has = draft.exclusions.includes(x);
    patch({ exclusions: has ? draft.exclusions.filter((e) => e !== x) : [...draft.exclusions, x] });
  }
  return (
    <div className="step-in">
      <StepHead eyebrow="Your plate" title="How do you eat?" subtitle="This helps us tune food suggestions to your style." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DIET_PROFILES.map((d) => (
          <OptionCard
            key={d}
            active={draft.diet_profile === d}
            onClick={() => patch({ diet_profile: d })}
            emoji={DIET_OPTS[d].emoji}
            title={DIET_OPTS[d].title}
            subtitle={DIET_OPTS[d].subtitle}
          />
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <label className="label">Anything to avoid? (optional)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COMMON_EXCLUSIONS.map((x) => (
            <button key={x} type="button" className="chip chip-toggle" data-active={draft.exclusions.includes(x)} onClick={() => toggleExclusion(x)}>
              {EXCLUSION_LABELS[x] ?? x}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Step 5 — Activity & energy profile
// =============================================================================
export function Step5Activity({ draft, patch }: StepProps) {
  return (
    <div className="step-in">
      <StepHead eyebrow="Your energy" title="How active are you?" subtitle="Outside of food, this is the biggest driver of your calorie needs." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ACTIVITY_LEVELS.map((a) => (
          <OptionCard
            key={a}
            active={draft.activity_level === a}
            onClick={() => patch({ activity_level: a })}
            emoji={ACTIVITY_OPTS[a].emoji}
            title={ACTIVITY_OPTS[a].title}
            subtitle={ACTIVITY_OPTS[a].subtitle}
          />
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <label className="label">What does a typical training week look like? (optional)</label>
        <textarea
          className="input"
          rows={3}
          style={{ resize: 'vertical', minHeight: 72 }}
          placeholder="e.g. lifting 4×/week, a long run on weekends, pickup basketball"
          value={draft.training_notes}
          onChange={(e) => patch({ training_notes: e.target.value })}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Step 6 — Reveal
// =============================================================================
function MiniRing({ label, grams, pct, color }: { label: string; grams: number; pct: number; color: string }) {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 600 }}>
            {Math.round(grams)}g
          </span>
        </div>
      </div>
      <span className="eyebrow" style={{ fontSize: 10 }}>
        {label}
      </span>
    </div>
  );
}

export function Step6Review({ draft }: { draft: Draft }) {
  const t = computeTargets(draft);
  if (!t) {
    return (
      <div className="step-in">
        <StepHead eyebrow="Almost there" title="A few details are missing" subtitle="Go back and fill in your basics so we can calculate your targets." />
      </div>
    );
  }
  const macroKcal = t.macros.protein_g * 4 + t.macros.carbs_g * 4 + t.macros.fat_g * 9;
  const pPct = macroKcal ? (t.macros.protein_g * 4 * 100) / macroKcal : 0;
  const cPct = macroKcal ? (t.macros.carbs_g * 4 * 100) / macroKcal : 0;
  const fPct = macroKcal ? (t.macros.fat_g * 9 * 100) / macroKcal : 0;

  return (
    <div className="step-in">
      <StepHead eyebrow="Your plan" title="Here's your starting point" subtitle="A solid baseline — it'll adapt as you log and your weight changes." />

      <div className="card card-lg" style={{ padding: 24, textAlign: 'center' }}>
        <div className="eyebrow">Daily calorie target</div>
        <div className="display tnum" style={{ fontSize: 52, margin: '6px 0 2px' }}>
          {t.target}
        </div>
        <div className="muted" style={{ fontSize: 14 }}>kcal per day</div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <MiniRing label="Protein" grams={t.macros.protein_g} pct={pPct} color="var(--protein)" />
          <MiniRing label="Carbs" grams={t.macros.carbs_g} pct={cPct} color="var(--carbs)" />
          <MiniRing label="Fat" grams={t.macros.fat_g} pct={fPct} color="var(--fat)" />
        </div>
      </div>

      <p className="muted" style={{ fontSize: 13, textAlign: 'center', margin: '16px 8px 0', lineHeight: 1.5 }}>
        Based on a maintenance estimate of <strong style={{ color: 'var(--text)' }}>{t.tdee} kcal</strong>
        {t.floored ? ', capped at a safe minimum for your profile.' : '.'}
      </p>
    </div>
  );
}
