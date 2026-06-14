create extension if not exists "pgcrypto";

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, log_date)
);

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  status text not null default 'planned',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric,
  waist_cm numeric,
  data jsonb not null default '{}'::jsonb,
  unique(user_id, measured_at)
);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  structured_data jsonb,
  created_at timestamptz not null default now()
);

create table public.plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, week_start)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.food_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  available boolean not null default true,
  unique(user_id, name)
);

alter table public.profiles enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.body_metrics enable row level security;
alter table public.coach_messages enable row level security;
alter table public.plan_adjustments enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.user_settings enable row level security;
alter table public.food_templates enable row level security;
alter table public.meal_templates enable row level security;
alter table public.exercise_library enable row level security;
alter table public.user_equipment enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','daily_checkins','nutrition_logs','workout_sessions','body_metrics','coach_messages','plan_adjustments','weekly_reports','user_settings','food_templates','meal_templates','user_equipment']
  loop
    execute format('create policy "Users manage own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

create policy "Users read public or own exercises" on public.exercise_library
for select using (user_id is null or auth.uid() = user_id);
create policy "Users manage own exercises" on public.exercise_library
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, data)
  values (new.id, jsonb_build_object('name', coalesce(new.raw_user_meta_data->>'name', '新用户')));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
