'use server';

import { revalidatePath } from 'next/cache';
import { ensureDailyLog } from '@/lib/data/ensure-log';
import { normalizeIsoDate } from '@/lib/date';
import { num, reqStr } from '@/lib/validate';
import { requireUser } from './_helpers';

export async function addWater(input: { date: string; amount_ml: number }) {
  const { supabase, user } = await requireUser();
  const date = normalizeIsoDate(input.date);
  const amount = Math.round(num(input.amount_ml, 'amount_ml', { min: 1, max: 100000 }));
  const logId = await ensureDailyLog(supabase, user.id, date);

  const { error } = await supabase
    .from('water_entries')
    .insert({ daily_log_id: logId, user_id: user.id, amount_ml: amount });
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function deleteWater(id: string) {
  const { supabase } = await requireUser();
  reqStr(id, 'id', 64);
  const { error } = await supabase.from('water_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}
