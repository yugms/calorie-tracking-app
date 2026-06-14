import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFoodProvider } from '@/lib/food/provider';

export const dynamic = 'force-dynamic';

/** GET /api/foods/search?q=… → normalized FoodSearchResult[]. Requires auth. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const results = await getFoodProvider().search(q, { limit: 20 });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Food search is temporarily unavailable.' }, { status: 502 });
  }
}
