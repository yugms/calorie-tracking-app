'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ageFromDob,
  defaultUnitsForLocale,
  type ActivityLevel,
  type DietProfile,
  type PrimaryGoal,
  type Sex,
  type UnitPref,
} from '@calorie/core';
import { completeOnboarding } from '@/lib/actions/onboarding';
import { Progress } from './progress';
import {
  Step1Goal,
  Step2Basics,
  Step3Target,
  Step4Diet,
  Step5Activity,
  Step6Review,
  type Draft,
} from './steps';

export interface WizardPrefill {
  display_name: string | null;
  dob: string | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  primary_goal: PrimaryGoal | null;
  target_weight_kg: number | null;
  weekly_rate_kg: number | null;
  diet_profile: DietProfile | null;
  exclusions: string[];
  training_notes: string | null;
  units_pref: UnitPref | null;
}

const DRAFT_KEY = 'onboarding:draft';

function initialDraft(p: WizardPrefill): Draft {
  return {
    primary_goal: p.primary_goal,
    units: p.units_pref ?? 'metric', // refined to locale default after mount
    dob: p.dob ?? '',
    sex: p.sex,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    target_weight_kg: p.target_weight_kg,
    weekly_rate_kg: p.weekly_rate_kg,
    activity_level: p.activity_level,
    diet_profile: p.diet_profile,
    exclusions: p.exclusions ?? [],
    training_notes: p.training_notes ?? '',
  };
}

type StepKey = 'goal' | 'basics' | 'target' | 'diet' | 'activity' | 'review';

function isValid(step: StepKey, d: Draft): boolean {
  switch (step) {
    case 'goal':
      return d.primary_goal != null;
    case 'basics': {
      if (!d.sex || d.height_cm == null || d.weight_kg == null) return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dob)) return false;
      const age = ageFromDob(d.dob, new Date());
      return Number.isFinite(age) && age >= 13 && age <= 120;
    }
    case 'target':
      return true; // a sensible default rate is always available
    case 'diet':
      return d.diet_profile != null;
    case 'activity':
      return d.activity_level != null;
    case 'review':
      return true;
  }
}

export function OnboardingWizard({ prefill }: { prefill: WizardPrefill }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(prefill));
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // After mount (client-only): default units to the user's locale and restore
  // any saved draft. Kept out of the initial render to avoid hydration drift.
  useEffect(() => {
    let next: Draft | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) next = { ...initialDraft(prefill), ...(JSON.parse(raw) as Partial<Draft>) };
    } catch {
      /* ignore malformed draft */
    }
    if (!prefill.units_pref) {
      let region: string | null = null;
      try {
        region = new Intl.Locale(navigator.language).region ?? null;
      } catch {
        /* ignore */
      }
      const units = defaultUnitsForLocale(region);
      next = { ...(next ?? initialDraft(prefill)), units };
    }
    if (next) setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the draft so a mid-flow refresh isn't lost.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage may be unavailable */
    }
  }, [draft]);

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setError(null);
  };

  // Step 3 only applies to lose / gain goals.
  const steps = useMemo<StepKey[]>(() => {
    const hasTarget = draft.primary_goal === 'lose' || draft.primary_goal === 'gain';
    return ['goal', 'basics', ...(hasTarget ? (['target'] as StepKey[]) : []), 'diet', 'activity', 'review'];
  }, [draft.primary_goal]);

  // Clamp index if the step list shrank (e.g. goal changed away from lose/gain).
  const clampedIndex = Math.min(index, steps.length - 1);
  const step = steps[clampedIndex]!;
  const isLast = clampedIndex === steps.length - 1;
  const canContinue = isValid(step, draft);

  function next() {
    if (!canContinue) return;
    // Seed a default weekly rate when arriving at the target step.
    if (step === 'basics' && (draft.primary_goal === 'lose' || draft.primary_goal === 'gain') && draft.weekly_rate_kg == null) {
      setDraft((d) => ({ ...d, weekly_rate_kg: 0.5 }));
    }
    setIndex(clampedIndex + 1);
  }
  function back() {
    setIndex(Math.max(0, clampedIndex - 1));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await completeOnboarding({
          primary_goal: draft.primary_goal!,
          dob: draft.dob,
          sex: draft.sex!,
          height_cm: draft.height_cm!,
          weight_kg: draft.weight_kg!,
          activity_level: draft.activity_level!,
          target_weight_kg: draft.target_weight_kg,
          weekly_rate_kg: draft.weekly_rate_kg,
          diet_profile: draft.diet_profile!,
          exclusions: draft.exclusions,
          training_notes: draft.training_notes || null,
          units_pref: draft.units,
        });
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        router.push('/dashboard');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>
      {/* Header: brand + progress */}
      <div style={{ paddingTop: 28, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c4 1.5 6.5 4.5 6.5 8.5 0 1-.3 2-.7 2.9-2.2-.6-4-2.2-4.8-4.3-.6 2.2-2.2 4-4.4 4.7-.4-1-.6-2-.6-3.2C8 7.5 9.5 4.5 12 3z" />
              <path d="M12 13v8" />
            </svg>
          </span>
          <span style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>Calorie Tracker</span>
        </div>
        <Progress current={clampedIndex + 1} total={steps.length} />
      </div>

      {/* Active step */}
      <div style={{ flex: 1, paddingBottom: 12 }}>
        {step === 'goal' && <Step1Goal draft={draft} patch={patch} />}
        {step === 'basics' && <Step2Basics draft={draft} patch={patch} />}
        {step === 'target' && <Step3Target draft={draft} patch={patch} />}
        {step === 'diet' && <Step4Diet draft={draft} patch={patch} />}
        {step === 'activity' && <Step5Activity draft={draft} patch={patch} />}
        {step === 'review' && <Step6Review draft={draft} />}
      </div>

      {/* Sticky footer nav */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--header-bg)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderTop: '1px solid var(--border)',
          margin: '0 -20px',
          padding: '14px 20px calc(14px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {clampedIndex > 0 && (
            <button type="button" className="btn btn-secondary" onClick={back} disabled={pending} style={{ flex: '0 0 auto', paddingLeft: 20, paddingRight: 20 }}>
              Back
            </button>
          )}
          {isLast ? (
            <button type="button" className="btn btn-primary" onClick={submit} disabled={pending} style={{ flex: 1 }}>
              {pending ? 'Setting up…' : "Let's Get Started"}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={next} disabled={!canContinue} style={{ flex: 1 }}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
