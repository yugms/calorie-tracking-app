'use server';

import { revalidatePath } from 'next/cache';
import {
  ACTIVITY_LEVELS,
  GOAL_TYPES,
  SEXES,
  UNIT_PREFS,
  ageFromDob,
  bmrMifflinStJeor,
  calorieTargetForGoal,
  tdee,
} from '@calorie/core';
import { num, optNum, optOneOf, optStr } from '@/lib/validate';
import { requireUser } from './_helpers';

export interface ProfileInput {
  display_name?: string | null;
  dob?: string | null; // YYYY-MM-DD
  sex?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  goal_type?: string | null;
  daily_water_target_ml?: number | null;
  units_pref?: string | null;
  /** Optional manual override; when omitted the target is auto-computed. */
  daily_calorie_target?: number | null;
}

export async function updateProfile(input: ProfileInput) {
  const { supabase, user } = await requireUser();

  const dob = input.dob ? optStr(input.dob, 'dob', 10) : null;
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error('"dob" must be YYYY-MM-DD.');

  const sex = optOneOf(input.sex, SEXES, 'sex');
  const height_cm = optNum(input.height_cm, 'height_cm', { min: 50, max: 300 });
  const weight_kg = optNum(input.weight_kg, 'weight_kg', { min: 20, max: 500 });
  const activity_level = optOneOf(input.activity_level, ACTIVITY_LEVELS, 'activity_level');
  const goal_type = optOneOf(input.goal_type, GOAL_TYPES, 'goal_type');

  // Auto-compute calorie target when we have the full picture and no manual override.
  let daily_calorie_target = optNum(input.daily_calorie_target, 'daily_calorie_target', {
    min: 800,
    max: 20000,
  });
  if (
    daily_calorie_target == null &&
    dob &&
    sex &&
    sex !== 'prefer_not_to_say' &&
    height_cm != null &&
    weight_kg != null &&
    activity_level &&
    goal_type
  ) {
    const age = ageFromDob(dob, new Date());
    const bmr = bmrMifflinStJeor({ sex, weightKg: weight_kg, heightCm: height_cm, ageYears: age });
    daily_calorie_target = calorieTargetForGoal(tdee(bmr, activity_level), goal_type);
  }

  const row = {
    user_id: user.id,
    display_name: optStr(input.display_name, 'display_name', 80),
    dob,
    sex,
    height_cm,
    weight_kg,
    activity_level,
    goal_type,
    daily_water_target_ml: optNum(input.daily_water_target_ml, 'daily_water_target_ml', {
      min: 100,
      max: 20000,
    }),
    units_pref: optOneOf(input.units_pref, UNIT_PREFS, 'units_pref') ?? 'metric',
    daily_calorie_target,
  };

  // Profile row is created on signup; upsert keeps this idempotent regardless.
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/settings');
  return { daily_calorie_target };
}
