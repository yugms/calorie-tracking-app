'use server';

import { revalidatePath } from 'next/cache';
import { MEAL_TYPES } from '@calorie/core';
import { ensureDailyLog } from '@/lib/data/ensure-log';
import { normalizeIsoDate } from '@/lib/date';
import { num, oneOf, optNum, reqStr } from '@/lib/validate';
import { requireUser } from './_helpers';

export interface ParsedEntryInput {
  description: string;
  grams?: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const AI_SOURCES = ['nlp', 'photo'] as const;

/** Insert the user-confirmed AI-parsed entries in one batch, and close the job. */
export async function addParsedEntries(input: {
  date: string;
  meal_type: string;
  source: string;
  jobId?: string | null;
  items: ParsedEntryInput[];
}) {
  const { supabase, user } = await requireUser();
  const date = normalizeIsoDate(input.date);
  const meal = oneOf(input.meal_type, MEAL_TYPES, 'meal_type');
  const source = oneOf(input.source, AI_SOURCES, 'source');

  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('No items to add.');
  if (input.items.length > 50) throw new Error('Too many items.');

  const logId = await ensureDailyLog(supabase, user.id, date);

  const rows = input.items.map((it) => ({
    daily_log_id: logId,
    user_id: user.id,
    meal_type: meal,
    description: reqStr(it.description, 'description', 200),
    quantity: it.grams != null ? num(it.grams, 'grams', { min: 0.001, max: 100000 }) : 1,
    unit: it.grams != null ? 'g' : 'serving',
    grams: optNum(it.grams, 'grams', { max: 100000 }),
    calories: num(it.calories, 'calories', { max: 100000 }),
    protein_g: num(it.protein_g, 'protein_g', { max: 100000 }),
    carbs_g: num(it.carbs_g, 'carbs_g', { max: 100000 }),
    fat_g: num(it.fat_g, 'fat_g', { max: 100000 }),
    source,
  }));

  const { error } = await supabase.from('meal_entries').insert(rows);
  if (error) throw new Error(error.message);

  if (input.jobId) {
    // RLS limits this to the user's own job.
    await supabase.from('ai_jobs').update({ status: 'confirmed' }).eq('id', input.jobId);
  }

  revalidatePath('/dashboard');
}
