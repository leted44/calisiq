-- Pseudo public du profil.
--
-- POURQUOI IL N'Y EN AVAIT PAS
--
-- Rien n'identifiait un utilisateur autrement que par son e-mail, qui ne doit
-- jamais devenir public. Sans pseudo, il est impossible de donner une adresse
-- lisible à un profil, de signer une vidéo partagée, ou de comparer deux
-- personnes autrement que par un identifiant technique.
--
-- Nullable : les comptes existants n'en ont pas et doivent continuer de
-- fonctionner. Le pseudo se réclame quand on le veut.
alter table public.profiles
  add column if not exists handle text;

-- Unicité insensible à la casse : « Teddy » et « teddy » ne peuvent pas
-- coexister, sinon deux adresses différentes mèneraient au même profil et
-- personne ne saurait laquelle partager.
create unique index if not exists profiles_handle_unique
  on public.profiles (lower(handle));

-- Format contraint en base et pas seulement dans l'interface : le pseudo
-- finira dans une URL, et une validation qui ne vit que côté navigateur se
-- contourne en une requête.
alter table public.profiles
  drop constraint if exists profiles_handle_format;
alter table public.profiles
  add constraint profiles_handle_format
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

-- Vérification de disponibilité.
--
-- Passe par une fonction plutôt que par une lecture directe de la table :
-- laisser n'importe qui interroger `profiles` pour tester un pseudo
-- ouvrirait la table entière, alors qu'une seule réponse booléenne suffit.
-- La fonction ne renvoie jamais à qui appartient un pseudo pris.
create or replace function public.handle_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    candidate ~ '^[a-z0-9_]{3,20}$'
    -- Adresses réservées : ce sont les routes de l'application. Un pseudo
    -- « profil » rendrait son propre profil inaccessible.
    and candidate not in (
      'admin', 'api', 'app', 'auth', 'login', 'logout', 'u', 'www',
      'calisiq', 'stats', 'calibration', 'historique', 'history',
      'progression', 'progress', 'analyser', 'analyse', 'onboarding',
      'profil', 'profile', 'confidentialite', 'privacy', 'comparaison'
    )
    and not exists (
      select 1 from public.profiles where lower(handle) = lower(candidate)
    );
$$;

grant execute on function public.handle_available(text) to anon, authenticated;
