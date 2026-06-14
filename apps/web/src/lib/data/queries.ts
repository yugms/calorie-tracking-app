import 'server-only';
import {
  MEAL_TYPES,
  sumNutrition,
  type ExerciseEntry,
  type MealEntry,
  type NutritionFacts,
  type WaterEntry,
} from '@calorie/core';
import { createClient } from '@/lib/supabase/server';
import type { CustomFood, DayData, MealGroup } from './types';

function entryNutrition(e: MealEntry): NutritionFacts {
  return {
    calories: Number(e.calories),
    protein_g: Number(e.protein_g),
    carbs_g: Number(e.carbs_g),
    fat_g: Number(e.fat_g),
  };
}

/** Load the full day view for the signed-in user. Empty (not created) days return zeros. */
export async function getDayData(date: string): Promise<DayData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_calorie_target, daily_water_target_ml')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: log } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('log_date', date)
    .maybeSingle();

  let mealRows: MealEntry[] = [];
  let waterRows: WaterEntry[] = [];
  let exerciseRows: ExerciseEntry[] = [];

  if (log) {
    const [meals, water, exercise] = await Promise.all([
      supabase
        .from('meal_entries')
        .select('*')
        .eq('daily_log_id', log.id)
        .order('logged_at', { ascending: true }),
      supabase
        .from('water_entries')
        .select('*')
        .eq('daily_log_id', log.id)
        .order('logged_at', { ascending: true }),
      supabase
        .from('exercise_entries')
        .select('*')
        .eq('daily_log_id', log.id)
        .order('logged_at', { ascending: true }),
    ]);
    mealRows = (meals.data as MealEntry[] | null) ?? [];
    waterRows = (water.data as WaterEntry[] | null) ?? [];
    exerciseRows = (exercise.data as ExerciseEntry[] | null) ?? [];
  }

  const meals: MealGroup[] = MEAL_TYPES.map((meal) => {
    const entries = mealRows.filter((e) => e.meal_type === meal);
    return { meal, entries, totals: sumNutrition(entries.map(entryNutrition)) };
  });

  const food = sumNutrition(mealRows.map(entryNutrition));
  const waterMl = waterRows.reduce((sum, w) => sum + Number(w.amount_ml), 0);
  const exerciseKcal = exerciseRows.reduce((sum, x) => sum + Number(x.calories_burned), 0);

  return {
    date,
    profile: profile ?? null,
    meals,
    water: waterRows,
    exercise: exerciseRows,
    totals: { food, waterMl, exerciseKcal },
  };
}

/** The user's saved custom foods (most recent first). */
export async function getCustomFoods(): Promise<CustomFood[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data } = await supabase
    .from('foods')
    .select('*')
    .eq('owner_user_id', user.id)
    .eq('source', 'custom')
    .order('created_at', { ascending: false });

  return (data as CustomFood[] | null) ?? [];
}

/** Full profile row for the settings page. */
export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return data;
}
