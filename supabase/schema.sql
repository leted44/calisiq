-- profiles : géré par Supabase Auth, extension custom
create table profiles (
  id uuid references auth.users primary key,
  created_at timestamptz default now(),
  is_premium boolean default false,
  height_cm numeric,
  weight_kg numeric,
  birth_date date,
  gender text check (gender in ('homme', 'femme', 'autre')),
  avatar_url text,
  onboarding_completed boolean not null default false,
  subscription_tier text not null default 'free',
  is_admin boolean not null default false -- accès aux statistiques globales (voir migration 20260830180000)
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
  trim_end numeric, -- secondes, fin du segment à analyser
  hold_duration_seconds numeric, -- durée du hold détecté (fenêtre stable), en secondes
  performed_at timestamptz, -- date réelle de la figure (import uniquement) ; à défaut, retomber sur created_at
  is_reference boolean not null default false -- point de départ "avant" de la figure, jamais purgé (voir migration 20260830120000)
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

-- Échantillons de calibration : angles mesurés réels + note subjective,
-- pour dériver les seuils de scoring de nouvelles figures à partir de
-- données réelles plutôt que de valeurs devinées.
create table calibration_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  created_at timestamptz default now(),
  figure text not null,
  variation text not null,
  elbow_angle numeric,
  hip_angle numeric,
  knee_angle numeric,
  shoulder_flexion_angle numeric,
  body_line_angle_from_horizontal numeric,
  shoulder_protraction numeric,
  pelvis_deviation numeric,
  pelvis_sag_sign numeric,
  user_rating numeric not null,
  notes text,
  media_type text not null default 'video' check (media_type in ('video', 'photo'))
);

-- RLS : chaque utilisateur ne voit que ses propres données
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table scores enable row level security;
alter table recommendations enable row level security;
alter table calibration_samples enable row level security;

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

create policy "calibration_samples: all own" on calibration_samples for all
  using (auth.uid() = user_id);

-- Outil interne mono-utilisateur : la lecture ne depend pas du compte
-- connecte (l'utilisateur a plusieurs comptes de test). L'ecriture reste
-- restreinte a ses propres lignes via la policy ci-dessus.
create policy "calibration_samples: select all" on calibration_samples
  for select using (true);

-- Storage bucket pour les vidéos (privé, accès via signed URL)
insert into storage.buckets (id, name, public) values ('videos', 'videos', false)
on conflict (id) do nothing;

create policy "videos: insert own" on storage.objects for insert
  with check (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: delete own" on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: select own" on storage.objects for select
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage bucket pour les photos de profil (public en lecture)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: insert own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: update own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: delete own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
