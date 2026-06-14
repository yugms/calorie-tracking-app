'use server';

import { revalidatePath } from 'next/cache';
import { MEAL_TYPES, ENTRY_SOURCES } from '@calorie/core';
import { ensureDailyLog } from '@/lib/data/ensure-log';
import { normalizeIsoDate } from '@/lib/date';
import { num, oneOf, optNum, reqStr } from '@/lib/validate';
import { requireUser } from './_helpers';

export interface MealEntryInput {
  date: string;
  meal_type: string;
  description: string;
  quantity?: number;
  unit?: string;
  grams?: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  food_id?: string | null;
  source?: string;
}

export async function addMealEntry(input: MealEntryInput) {
  const { supabase, user } = await requireUser();
  const date = normalizeIsoDate(input.date);
  const logId = await ensureDailyLog(supabase, user.id, date);

  const row = {
    daily_log_id: logId,
    user_id: user.id,
    meal_type: oneOf(input.meal_type, MEAL_TYPES, 'meal_type'),
    description: reqStr(input.description, 'description', 200),
    quantity: input.quantity != null ? num(input.quantity, 'quantity', { min: 0.001, max: 100000 }) : 1,
    unit: input.unit ? reqStr(input.unit, 'unit', 40) : 'serving',
    grams: optNum(input.grams, 'grams', { max: 100000 }),
    calories: num(input.calories, 'calories', { max: 100000 }),
    protein_g: num(input.protein_g, 'protein_g', { max: 100000 }),
    carbs_g: num(input.carbs_g, 'carbs_g', { max: 100000 }),
    fat_g: num(input.fat_g, 'fat_g', { max: 100000 }),
    food_id: input.food_id ?? null,
    source: input.source ? oneOf(input.source, ENTRY_SOURCES, 'source') : 'manual',
  };

  const { error } = await supabase.from('meal_entries').insert(row);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function updateMealEntry(id: string, patch: Partial<MealEntryInput>) {
  const { supabase } = await requireUser();
  reqStr(id, 'id', 64);

  const update: Record<string, unknown> = {};
  if (patch.description != null) update.description = reqStr(patch.description, 'description', 200);
  if (patch.meal_type != null) update.meal_type = oneOf(patch.meal_type, MEAL_TYPES, 'meal_type');
  if (patch.quantity != null) update.quantity = num(patch.quantity, 'quantity', { min: 0.001, max: 100000 });
  if (patch.unit != null) update.unit = reqStr(patch.unit, 'unit', 40);
  if (patch.grams !== undefined) update.grams = optNum(patch.grams, 'grams', { max: 100000 });
  if (patch.calories != null) update.calories = num(patch.calories, 'calories', { max: 100000 });
  if (patch.protein_g != null) update.protein_g = num(patch.protein_g, 'protein_g', { max: 100000 });
  if (patch.carbs_g != null) update.carbs_g = num(patch.carbs_g, 'carbs_g', { max: 100000 });
  if (patch.fat_g != null) update.fat_g = num(patch.fat_g, 'fat_g', { max: 100000 });

  // RLS guarantees the row belongs to the user; no extra ownership check needed.
  const { error } = await supabase.from('meal_entries').update(update).eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function deleteMealEntry(id: string) {
  const { supabase } = await requireUser();
  reqStr(id, 'id', 64);
  const { error } = await supabase.from('meal_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
