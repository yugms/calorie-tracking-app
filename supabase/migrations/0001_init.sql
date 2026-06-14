-- ============================================================================
-- 0001_init.sql — Core schema for the calorie tracker.
-- Apply in the Supabase SQL Editor (or `supabase db push`) before 0002_rls.sql.
-- ============================================================================

-- Enums -----------------------------------------------------------------------
create type meal_type           as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type entry_source        as enum ('manual', 'barcode', 'nlp', 'photo');
create type food_source         as enum ('usda', 'off', 'custom');
create type sex                 as enum ('male', 'female', 'other', 'prefer_not_to_say');
create type activity_level      as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type goal_type           as enum ('lose', 'maintain', 'gain');
create type unit_pref           as enum ('metric', 'imperial');
create type exercise_intensity  as enum ('low', 'moderate', 'high');
create type ai_job_type         as enum ('text', 'photo');
create type ai_job_status       as enum ('pending', 'parsed', 'confirmed', 'failed');

-- updated_at trigger helper ---------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles --------------------------------------------------------------------
-- One row per auth user. Created automatically on signup (see trigger below).
create table profiles (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  display_name          text,
  dob                   date,
  sex                   sex,
  height_cm             numeric(5, 1),
  weight_kg             numeric(5, 1),
  activity_level        activity_level,
  goal_type             goal_type,
  daily_calorie_target  integer,
  daily_water_target_ml integer default 2000,
  units_pref            unit_pref not null default 'metric',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- foods -----------------------------------------------------------------------
-- Catalog of foods. owner_user_id null => global row (cached from USDA/OFF).
-- Non-null => a user's custom food. Nutrition stored per 100 g for clean scaling.
create table foods (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid references auth.users (id) on delete cascade,
  source         food_source not null,
  external_id    text,
  barcode        text,
  name           text not null,
  brand          text,
  serving_qty    numeric(8, 2),
  serving_unit   text,
  serving_grams  numeric(8, 2),
  calories       numeric(8, 2) not null default 0,  -- per 100 g
  protein_g      numeric(8, 2) not null default 0,
  carbs_g        numeric(8, 2) not null default 0,
  fat_g          numeric(8, 2) not null default 0,
  fiber_g        numeric(8, 2),
  sugar_g        numeric(8, 2),
  sodium_mg      numeric(8, 2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger foods_set_updated_at
  before update on foods
  for each row execute function set_updated_at();

-- Cached external foods are unique per (source, external_id); custom foods are not.
create unique index foods_source_external_id_uniq
  on foods (source, external_id)
  where owner_user_id is null and external_id is not null;
create index foods_barcode_idx on foods (barcode) where barcode is not null;
create index foods_owner_idx on foods (owner_user_id);
-- Trigram search on name (enable extension first).
create extension if not exists pg_trgm;
create index foods_name_trgm_idx on foods using gin (name gin_trgm_ops);

-- daily_logs ------------------------------------------------------------------
create table daily_logs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  log_date                date not null,
  calorie_target_snapshot integer,
  water_target_snapshot   integer,
  notes                   text,
  created_at              timestamptz not null default now(),
  unique (user_id, log_date)
);
create index daily_logs_user_date_idx on daily_logs (user_id, log_date);

-- meal_entries ----------------------------------------------------------------
create table meal_entries (
  id            uuid primary key default gen_random_uuid(),
  daily_log_id  uuid not null references daily_logs (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  meal_type     meal_type not null,
  food_id       uuid references foods (id) on delete set null,
  description   text not null,
  quantity      numeric(8, 2) not null default 1,
  unit          text not null default 'serving',
  grams         numeric(8, 2),
  calories      numeric(8, 2) not null default 0,
  protein_g     numeric(8, 2) not null default 0,
  carbs_g       numeric(8, 2) not null default 0,
  fat_g         numeric(8, 2) not null default 0,
  logged_at     timestamptz not null default now(),
  source        entry_source not null default 'manual',
  ai_confidence numeric(4, 3),
  created_at    timestamptz not null default now()
);
create index meal_entries_log_idx on meal_entries (daily_log_id);
create index meal_entries_user_idx on meal_entries (user_id);

-- water_entries ---------------------------------------------------------------
create table water_entries (
  id           uuid primary key default gen_random_uuid(),
  daily_log_id uuid not null references daily_logs (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  amount_ml    integer not null check (amount_ml > 0),
  logged_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index water_entries_log_idx on water_entries (daily_log_id);

-- exercise_entries ------------------------------------------------------------
create table exercise_entries (
  id              uuid primary key default gen_random_uuid(),
  daily_log_id    uuid not null references daily_logs (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  activity_name   text not null,
  duration_min    numeric(6, 1),
  calories_burned numeric(8, 2) not null default 0,
  intensity       exercise_intensity,
  logged_at       timestamptz not null default now(),
  source          entry_source not null default 'manual',
  created_at      timestamptz not null default now()
);
create index exercise_entries_log_idx on exercise_entries (daily_log_id);

-- ai_jobs ---------------------------------------------------------------------
-- Audit/debug trail for AI parses. input_ref = storage path (photo) or raw text.
create table ai_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         ai_job_type not null,
  input_ref    text not null,
  raw_response jsonb,
  status       ai_job_status not null default 'pending',
  created_at   timestamptz not null default now()
);
create index ai_jobs_user_idx on ai_jobs (user_id);

-- Auto-create a profile row when a new auth user signs up --------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
