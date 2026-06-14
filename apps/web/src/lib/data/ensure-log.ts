import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the daily_logs id for (user, date), creating the row on first use.
 * Snapshots the user's current calorie/water targets onto the log.
 */
export async function ensureDailyLog(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<string> {
  const existing = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', date)
    .maybeSingle();

  if (existing.data?.id) return existing.data.id as string;

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_calorie_target, daily_water_target_ml')
    .eq('user_id', userId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('daily_logs')
    .insert({
      user_id: userId,
      log_date: date,
      calorie_target_snapshot: profile?.daily_calorie_target ?? null,
      water_target_snapshot: profile?.daily_water_target_ml ?? null,
    })
    .select('id')
    .single();

  // Handle the race where a concurrent request created the row first.
  if (error) {
    const retry = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', date)
      .single();
    if (retry.data?.id) return retry.data.id as string;
    throw error;
  }

  return data.id as string;
}
