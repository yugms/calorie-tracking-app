import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFoodProvider } from '@/lib/food/provider';

export const dynamic = 'force-dynamic';

/** GET /api/foods/barcode?code=… → FoodSearchResult or null. Requires auth. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const code = new URL(request.url).searchParams.get('code')?.trim() ?? '';
  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid barcode.' }, { status: 400 });
  }

  try {
    const result = await getFoodProvider().getByBarcode(code);
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: 'Barcode lookup is temporarily unavailable.' }, { status: 502 });
  }
}
