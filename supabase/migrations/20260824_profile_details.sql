alter table profiles
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists birth_date date,
  add column if not exists gender text check (gender in ('homme', 'femme', 'autre')),
  add column if not exists avatar_url text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists subscription_tier text not null default 'free';

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: insert own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: update own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: delete own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
