'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACTIVITY_LEVELS,
  GOAL_TYPES,
  SEXES,
  type Profile,
} from '@calorie/core';
import { updateProfile, type ProfileInput } from '@/lib/actions/profile';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (little exercise)',
  light: 'Light (1–3 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very active (physical job/2x day)',
};
const GOAL_LABELS: Record<string, string> = {
  lose: 'Lose weight',
  maintain: 'Maintain',
  gain: 'Gain weight',
};
const SEX_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [v, setV] = useState({
    display_name: profile?.display_name ?? '',
    dob: profile?.dob ?? '',
    sex: profile?.sex ?? '',
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : '',
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : '',
    activity_level: profile?.activity_level ?? '',
    goal_type: profile?.goal_type ?? '',
    daily_water_target_ml: profile?.daily_water_target_ml != null ? String(profile.daily_water_target_ml) : '2000',
  });
  const [target, setTarget] = useState<number | null>(profile?.daily_calorie_target ?? null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField =
    (k: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setV({ ...v, [k]: e.target.value });
      setSaved(false);
    };

  function save() {
    setError(null);
    const input: ProfileInput = {
      display_name: v.display_name || null,
      dob: v.dob || null,
      sex: v.sex || null,
      height_cm: v.height_cm ? Number(v.height_cm) : null,
      weight_kg: v.weight_kg ? Number(v.weight_kg) : null,
      activity_level: v.activity_level || null,
      goal_type: v.goal_type || null,
      daily_water_target_ml: v.daily_water_target_ml ? Number(v.daily_water_target_ml) : null,
    };
    startTransition(async () => {
      try {
        const res = await updateProfile(input);
        setTarget(res.daily_calorie_target ?? null);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 20, textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 13 }}>
          Daily calorie goal
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>
          {target != null ? `${target}` : '—'}
          <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}>
            {' '}
            kcal
          </span>
        </div>
        {target == null && (
          <div className="muted" style={{ fontSize: 12 }}>
            Fill in your stats below to calculate it.
          </div>
        )}
      </div>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div>
          <label className="label">Display name</label>
          <input className="input" value={v.display_name} onChange={setField('display_name')} placeholder="Your name" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Date of birth</label>
            <input className="input" type="date" value={v.dob} onChange={setField('dob')} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Sex</label>
            <select className="input" value={v.sex} onChange={setField('sex')}>
              <option value="">Select…</option>
              {SEXES.map((s) => (
                <option key={s} value={s}>
                  {SEX_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Height (cm)</label>
            <input className="input" type="number" min={50} max={300} value={v.height_cm} onChange={setField('height_cm')} placeholder="175" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Weight (kg)</label>
            <input className="input" type="number" min={20} max={500} value={v.weight_kg} onChange={setField('weight_kg')} placeholder="70" />
          </div>
        </div>

        <div>
          <label className="label">Activity level</label>
          <select className="input" value={v.activity_level} onChange={setField('activity_level')}>
            <option value="">Select…</option>
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Goal</label>
          <select className="input" value={v.goal_type} onChange={setField('goal_type')}>
            <option value="">Select…</option>
            {GOAL_TYPES.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Daily water target (ml)</label>
          <input className="input" type="number" min={100} max={20000} step={50} value={v.daily_water_target_ml} onChange={setField('daily_water_target_ml')} />
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }}>
            Saved ✓
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
