'use server';

import { revalidatePath } from 'next/cache';
import { num, optNum, optStr, reqStr } from '@/lib/validate';
import { requireUser } from './_helpers';

export interface CustomFoodInput {
  name: string;
  brand?: string | null;
  serving_qty?: number | null;
  serving_unit?: string | null;
  serving_grams?: number | null;
  /** Per-100g nutrition. */
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
}

function toRow(input: CustomFoodInput) {
  return {
    name: reqStr(input.name, 'name', 120),
    brand: optStr(input.brand, 'brand', 120),
    serving_qty: optNum(input.serving_qty, 'serving_qty', { min: 0.001, max: 100000 }),
    serving_unit: optStr(input.serving_unit, 'serving_unit', 40),
    serving_grams: optNum(input.serving_grams, 'serving_grams', { min: 0.001, max: 100000 }),
    calories: num(input.calories, 'calories', { max: 100000 }),
    protein_g: num(input.protein_g, 'protein_g', { max: 100000 }),
    carbs_g: num(input.carbs_g, 'carbs_g', { max: 100000 }),
    fat_g: num(input.fat_g, 'fat_g', { max: 100000 }),
    fiber_g: optNum(input.fiber_g, 'fiber_g', { max: 100000 }),
    sugar_g: optNum(input.sugar_g, 'sugar_g', { max: 100000 }),
    sodium_mg: optNum(input.sodium_mg, 'sodium_mg', { max: 10_000_000 }),
  };
}

export async function createCustomFood(input: CustomFoodInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('foods')
    .insert({ ...toRow(input), owner_user_id: user.id, source: 'custom' });
  if (error) throw new Error(error.message);
  revalidatePath('/foods');
}

export async function updateCustomFood(id: string, input: CustomFoodInput) {
  const { supabase } = await requireUser();
  reqStr(id, 'id', 64);
  // RLS restricts updates to the user's own custom rows.
  const { error } = await supabase.from('foods').update(toRow(input)).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/foods');
}

export async function deleteCustomFood(id: string) {
  const { supabase } = await requireUser();
  reqStr(id, 'id', 64);
  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/foods');
}
