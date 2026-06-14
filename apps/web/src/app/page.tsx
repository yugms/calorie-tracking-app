import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Root route: send signed-in users to the dashboard, others to login. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/dashboard' : '/login');
}
