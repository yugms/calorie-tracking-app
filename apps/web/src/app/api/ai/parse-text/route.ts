import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';
import { buildDrafts } from '@/lib/ai/match';

export const dynamic = 'force-dynamic';

/** POST /api/ai/parse-text { text } → { jobId, drafts }. Requires auth + configured AI. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json({ error: 'AI logging isn’t configured. Add a Gemini API key.' }, { status: 503 });
  }

  const { text } = (await request.json().catch(() => ({}))) as { text?: unknown };
  if (typeof text !== 'string' || text.trim().length < 3 || text.length > 1000) {
    return NextResponse.json({ error: 'Describe your meal in a few words.' }, { status: 400 });
  }

  try {
    const parse = await provider.parseText(text.trim());
    const drafts = await buildDrafts(parse);

    const { data: job } = await supabase
      .from('ai_jobs')
      .insert({ user_id: user.id, type: 'text', input_ref: text.trim(), raw_response: parse.raw, status: 'parsed' })
      .select('id')
      .single();

    return NextResponse.json({ jobId: job?.id ?? null, drafts });
  } catch {
    return NextResponse.json({ error: 'Couldn’t analyze that. Try rephrasing.' }, { status: 502 });
  }
}
