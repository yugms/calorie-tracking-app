-- ============================================================================
-- 0002_rls.sql — Row-Level Security. Apply after 0001_init.sql.
-- Every user-owned row is readable/writable only by its owner. Global food rows
-- (owner_user_id is null) are readable by any authenticated user.
-- ============================================================================

alter table profiles         enable row level security;
alter table foods            enable row level security;
alter table daily_logs       enable row level security;
alter table meal_entries     enable row level security;
alter table water_entries    enable row level security;
alter table exercise_entries enable row level security;
alter table ai_jobs          enable row level security;

-- profiles --------------------------------------------------------------------
create policy "profiles: owner reads"   on profiles for select using (auth.uid() = user_id);
create policy "profiles: owner inserts" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles: owner updates" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- foods -----------------------------------------------------------------------
-- Read: global catalog rows OR your own custom foods.
create policy "foods: read global or own"
  on foods for select
  using (owner_user_id is null or auth.uid() = owner_user_id);
-- Write: only your own custom foods (cannot create/edit global rows from the client;
-- those are written server-side via the service role, which bypasses RLS).
create policy "foods: insert own"
  on foods for insert
  with check (auth.uid() = owner_user_id);
create policy "foods: update own"
  on foods for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
create policy "foods: delete own"
  on foods for delete
  using (auth.uid() = owner_user_id);

-- Generic owner-only policy generator for the remaining tables ----------------
do $$
declare
  t text;
begin
  foreach t in array array['daily_logs', 'meal_entries', 'water_entries', 'exercise_entries', 'ai_jobs']
  loop
    execute format(
      'create policy %I on %I for select using (auth.uid() = user_id);',
      t || ': owner reads', t);
    execute format(
      'create policy %I on %I for insert with check (auth.uid() = user_id);',
      t || ': owner inserts', t);
    execute format(
      'create policy %I on %I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || ': owner updates', t);
    execute format(
      'create policy %I on %I for delete using (auth.uid() = user_id);',
      t || ': owner deletes', t);
  end loop;
end;
$$;
