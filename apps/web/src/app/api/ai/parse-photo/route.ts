import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';
import { buildDrafts } from '@/lib/ai/match';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

/** POST /api/ai/parse-photo (multipart: image) → { jobId, drafts }. Requires auth + configured AI. */
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

  const form = await request.formData().catch(() => null);
  const file = form?.get('image');
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Please attach an image.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is too large (max 6 MB).' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Store the photo under the user's own folder (RLS-scoped) for the audit trail.
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  await supabase.storage.from('meal-photos').upload(path, bytes, { contentType: file.type, upsert: false });

  try {
    const parse = await provider.parsePhoto({ image: bytes, mimeType: file.type });
    const drafts = await buildDrafts(parse);

    const { data: job } = await supabase
      .from('ai_jobs')
      .insert({ user_id: user.id, type: 'photo', input_ref: path, raw_response: parse.raw, status: 'parsed' })
      .select('id')
      .single();

    return NextResponse.json({ jobId: job?.id ?? null, drafts });
  } catch {
    return NextResponse.json({ error: 'Couldn’t analyze that photo. Try another angle.' }, { status: 502 });
  }
}
