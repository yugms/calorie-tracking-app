'use server';

import { revalidatePath } from 'next/cache';
import { EXERCISE_INTENSITIES } from '@calorie/core';
import { ensureDailyLog } from '@/lib/data/ensure-log';
import { normalizeIsoDate } from '@/lib/date';
import { num, optNum, optOneOf, reqStr } from '@/lib/validate';
import { requireUser } from './_helpers';

export interface ExerciseInput {
  date: string;
  activity_name: string;
  duration_min?: number | null;
  calories_burned: number;
  intensity?: string | null;
}

export async function addExercise(input: ExerciseInput) {
  const { supabase, user } = await requireUser();
  const date = normalizeIsoDate(input.date);
  const logId = await ensureDailyLog(supabase, user.id, date);

  const row = {
    daily_log_id: logId,
    user_id: user.id,
    activity_name: reqStr(input.activity_name, 'activity_name', 120),
    duration_min: optNum(input.duration_min, 'duration_min', { max: 100000 }),
    calories_burned: num(input.calories_burned, 'calories_burned', { max: 100000 }),
    intensity: optOneOf(input.intensity, EXERCISE_INTENSITIES, 'intensity'),
  };

  const { error } = await supabase.from('exercise_entries').insert(row);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function deleteExercise(id: string) {
  const { supabase } = await requireUser();
  reqStr(id, 'id', 64);
  const { error } = await supabase.from('exercise_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
