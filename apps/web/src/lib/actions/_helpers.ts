import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Resolve the signed-in user or throw. Used by every mutation. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}
