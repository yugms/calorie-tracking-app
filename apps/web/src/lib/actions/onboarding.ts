'use server';

import { revalidatePath } from 'next/cache';
import {
  ACTIVITY_LEVELS,
  DIET_PROFILES,
  PRIMARY_GOALS,
  SEXES,
  UNIT_PREFS,
  ageFromDob,
  bmrMifflinStJeor,
  calorieFloorForSex,
  calorieTargetForGoal,
  calorieTargetFromRate,
  goalTypeForPrimary,
  macroTargetsForCalories,
  tdee,
} from '@calorie/core';
import { num, oneOf, optNum, optOneOf, optStr, reqStr } from '@/lib/validate';
import { serverToday } from '@/lib/timezone';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from './_helpers';

export interface OnboardingInput {
  primary_goal: string;
  dob: string; // YYYY-MM-DD
  sex: string;
  height_cm: number;
  weight_kg: number;
  activity_level: string;
  /** Only for lose/gain goals. */
  target_weight_kg?: number | null;
  weekly_rate_kg?: number | null;
  diet_profile: string;
  exclusions?: string[];
  training_notes?: string | null;
  daily_water_target_ml?: number | null;
  units_pref?: string | null;
}

/** Sanitize the free-form exclusions list (allergies / dietary exclusions). */
function cleanExclusions(input: string[] | undefined): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const s = raw.trim().toLowerCase();
    if (s && s.length <= 40) seen.add(s);
    if (seen.size >= 20) break;
  }
  return [...seen];
}

/**
 * Write the user's onboarding answers to their profile, compute authoritative
 * calorie + macro targets server-side, seed a first weight entry, and mark the
 * profile onboarded. Never trusts client-computed targets.
 */
export async function completeOnboarding(input: OnboardingInput) {
  const { supabase, user } = await requireUser();

  const primary_goal = oneOf(input.primary_goal, PRIMARY_GOALS, 'primary_goal');
  const dob = reqStr(input.dob, 'dob', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error('"dob" must be YYYY-MM-DD.');
  const sex = oneOf(input.sex, SEXES, 'sex');
  const height_cm = num(input.height_cm, 'height_cm', { min: 50, max: 300 });
  const weight_kg = num(input.weight_kg, 'weight_kg', { min: 20, max: 500 });
  const activity_level = oneOf(input.activity_level, ACTIVITY_LEVELS, 'activity_level');
  const diet_profile = oneOf(input.diet_profile, DIET_PROFILES, 'diet_profile');
  const units_pref = optOneOf(input.units_pref, UNIT_PREFS, 'units_pref') ?? 'metric';
  const exclusions = cleanExclusions(input.exclusions);
  const training_notes = optStr(input.training_notes, 'training_notes', 500);
  const target_weight_kg = optNum(input.target_weight_kg, 'target_weight_kg', { min: 20, max: 500 });
  const weekly_rate_kg = optNum(input.weekly_rate_kg, 'weekly_rate_kg', { min: 0, max: 2 });
  const daily_water_target_ml =
    optNum(input.daily_water_target_ml, 'daily_water_target_ml', { min: 100, max: 20000 }) ?? 2000;

  // --- The engine: BMR -> TDEE -> calorie target -> macro targets -----------
  const goal_type = goalTypeForPrimary(primary_goal);
  const ageYears = ageFromDob(dob, new Date());
  const bmr = bmrMifflinStJeor({ sex, weightKg: weight_kg, heightCm: height_cm, ageYears });
  const tdeeKcal = tdee(bmr, activity_level);

  let daily_calorie_target: number;
  if ((goal_type === 'lose' || goal_type === 'gain') && weekly_rate_kg && weekly_rate_kg > 0) {
    daily_calorie_target = calorieTargetFromRate({
      tdee: tdeeKcal,
      sex,
      goal: goal_type,
      kgPerWeek: weekly_rate_kg,
    }).target;
  } else {
    daily_calorie_target = calorieTargetForGoal(tdeeKcal, goal_type);
  }
  daily_calorie_target = Math.max(daily_calorie_target, calorieFloorForSex(sex));

  const macros = macroTargetsForCalories({
    calories: daily_calorie_target,
    weightKg: weight_kg,
    primaryGoal: primary_goal,
  });

  const row = {
    user_id: user.id,
    dob,
    sex,
    height_cm,
    weight_kg,
    activity_level,
    goal_type,
    primary_goal,
    target_weight_kg,
    weekly_rate_kg,
    diet_profile,
    exclusions,
    training_notes,
    units_pref,
    daily_calorie_target,
    daily_water_target_ml,
    protein_target_g: macros.protein_g,
    carbs_target_g: macros.carbs_g,
    fat_target_g: macros.fat_g,
    onboarded_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);

  // Seed the first weight-history point for the user's local "today".
  const today = await serverToday();
  await supabase
    .from('weight_entries')
    .upsert({ user_id: user.id, weight_kg, logged_on: today }, { onConflict: 'user_id,logged_on' });

  revalidatePath('/dashboard');
  revalidatePath('/settings');
  return { ok: true, daily_calorie_target, macros };
}

/**
 * Restore the account to a brand-new, just-signed-up state: delete all tracking
 * data, weight history, custom foods, and AI jobs, then reset the profile to the
 * signup defaults (keeping only the display name). Runs entirely under the
 * caller's RLS — no elevated privileges needed.
 */
export async function resetAccount() {
  const { supabase, user } = await requireUser();

  // daily_logs cascade-deletes meal/water/exercise entries.
  await supabase.from('daily_logs').delete().eq('user_id', user.id);
  await supabase.from('weight_entries').delete().eq('user_id', user.id);
  await supabase.from('foods').delete().eq('owner_user_id', user.id);
  await supabase.from('ai_jobs').delete().eq('user_id', user.id);

  // Best-effort: remove the user's meal photos.
  const { data: files } = await supabase.storage.from('meal-photos').list(user.id);
  if (files && files.length > 0) {
    await supabase.storage.from('meal-photos').remove(files.map((f) => `${user.id}/${f.name}`));
  }

  // Reset the profile to signup defaults (the handle_new_user trigger state).
  const { error } = await supabase
    .from('profiles')
    .update({
      dob: null,
      sex: null,
      height_cm: null,
      weight_kg: null,
      activity_level: null,
      goal_type: null,
      primary_goal: null,
      target_weight_kg: null,
      weekly_rate_kg: null,
      diet_profile: null,
      exclusions: [],
      training_notes: null,
      daily_calorie_target: null,
      daily_water_target_ml: 2000,
      protein_target_g: null,
      carbs_target_g: null,
      fat_target_g: null,
      units_pref: 'metric',
      onboarded_at: null,
    })
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
  revalidatePath('/settings');
  return { ok: true };
}

/**
 * Permanently delete the account. A SECURITY DEFINER Postgres function removes
 * the auth.users row (cascading every owned table); we then destroy the local
 * session. No service-role secret is shipped to the app.
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.rpc('delete_account');
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();
  return { ok: true };
}
