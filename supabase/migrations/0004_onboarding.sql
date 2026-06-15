-- ============================================================================
-- 0004_onboarding.sql — Onboarding wizard state, macro targets, weight history,
-- and a secure account-deletion RPC. Apply after 0003_storage.sql.
-- ============================================================================

-- profiles: onboarding + richer goal/diet/macro fields -----------------------
alter table profiles
  add column if not exists onboarded_at        timestamptz,
  -- Richer 4-option goal shown in onboarding. `goal_type` stays the canonical
  -- input to the BMR/TDEE math (perform -> maintain, gain -> gain).
  add column if not exists primary_goal        text
    check (primary_goal in ('lose', 'maintain', 'gain', 'perform')),
  add column if not exists target_weight_kg    numeric(5, 1),
  -- Desired weekly rate of change in kg (always positive magnitude; direction
  -- comes from goal_type). e.g. 0.45 ≈ 1 lb/week.
  add column if not exists weekly_rate_kg      numeric(4, 2),
  add column if not exists diet_profile        text
    check (diet_profile in ('standard', 'vegetarian', 'vegan', 'plant_based', 'keto', 'custom')),
  add column if not exists exclusions          text[] not null default '{}',
  add column if not exists training_notes      text,
  add column if not exists protein_target_g    integer,
  add column if not exists carbs_target_g      integer,
  add column if not exists fat_target_g        integer;

-- weight_entries: body-weight history (seeded at onboarding, future trend) ----
create table if not exists weight_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  weight_kg  numeric(5, 1) not null check (weight_kg > 0),
  logged_on  date not null,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);
create index if not exists weight_entries_user_date_idx
  on weight_entries (user_id, logged_on);

alter table weight_entries enable row level security;
create policy "weight_entries: owner reads"   on weight_entries for select using (auth.uid() = user_id);
create policy "weight_entries: owner inserts" on weight_entries for insert with check (auth.uid() = user_id);
create policy "weight_entries: owner updates" on weight_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_entries: owner deletes" on weight_entries for delete using (auth.uid() = user_id);

-- Backfill: existing users who already have a calorie target are considered
-- onboarded, so they are not forced back through the wizard.
update profiles
  set onboarded_at = created_at
  where onboarded_at is null and daily_calorie_target is not null;

-- ----------------------------------------------------------------------------
-- delete_account(): hard-delete the calling user and everything they own.
-- SECURITY DEFINER so it can remove the auth.users row (which cascades to every
-- table via `on delete cascade`). This avoids ever shipping the service secret
-- key into the application runtime — the user calls it with their own session.
-- ----------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
