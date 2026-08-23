-- profiles : géré par Supabase Auth, extension custom
create table profiles (
  id uuid references auth.users primary key,
  created_at timestamptz default now(),
  is_premium boolean default false
);

-- Crée automatiquement un profil à chaque inscription (auth.users est géré par Supabase, pas accessible en direct)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  video_url text not null,
  progression text not null, -- 'tuck_planche' | 'advanced_tuck_planche' | 'straddle_planche' | 'full_planche'
  status text default 'processing', -- 'processing' | 'done' | 'error'
  trim_start numeric, -- secondes, début du segment à analyser (choisi par l'utilisateur)
  trim_end numeric -- secondes, fin du segment à analyser
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) not null,
  critere text not null, -- 'body_line' | 'elbow_angle' | 'hip_angle' | 'shoulder_protraction'
  score numeric not null, -- 0-10
  valeur_mesuree numeric,
  valeur_cible numeric,
  created_at timestamptz default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) not null,
  exercice text not null,
  raison text not null
);

-- RLS : chaque utilisateur ne voit que ses propres données
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table scores enable row level security;
alter table recommendations enable row level security;

create policy "profiles: select own" on profiles for select using (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id);
create policy "profiles: insert own" on profiles for insert with check (auth.uid() = id);

create policy "sessions: all own" on sessions for all using (auth.uid() = user_id);

create policy "scores: select own" on scores for select using (
  exists (select 1 from sessions where sessions.id = scores.session_id and sessions.user_id = auth.uid())
);
create policy "scores: insert own" on scores for insert with check (
  exists (select 1 from sessions where sessions.id = scores.session_id and sessions.user_id = auth.uid())
);

create policy "recommendations: select own" on recommendations for select using (
  exists (select 1 from sessions where sessions.id = recommendations.session_id and sessions.user_id = auth.uid())
);
create policy "recommendations: insert own" on recommendations for insert with check (
  exists (select 1 from sessions where sessions.id = recommendations.session_id and sessions.user_id = auth.uid())
);

create policy "scores: delete own" on scores for delete using (
  exists (select 1 from sessions where sessions.id = scores.session_id and sessions.user_id = auth.uid())
);
create policy "recommendations: delete own" on recommendations for delete using (
  exists (select 1 from sessions where sessions.id = recommendations.session_id and sessions.user_id = auth.uid())
);

-- Storage bucket pour les vidéos (privé, accès via signed URL)
insert into storage.buckets (id, name, public) values ('videos', 'videos', false)
on conflict (id) do nothing;

create policy "videos: insert own" on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: delete own" on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: select own" on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
