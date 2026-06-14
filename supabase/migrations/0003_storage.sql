-- ============================================================================
-- 0003_storage.sql — Private bucket for meal photos (used by Phase 4 photo logging).
-- Objects are namespaced by user id: `meal-photos/<user_id>/<file>`.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

-- Each user can only touch files under their own `<user_id>/` prefix.
create policy "meal-photos: read own"
  on storage.objects for select
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "meal-photos: insert own"
  on storage.objects for insert
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "meal-photos: delete own"
  on storage.objects for delete
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
