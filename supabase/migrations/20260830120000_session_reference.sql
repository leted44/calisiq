-- Vidéo "référence" par figure : une session par (utilisateur, progression)
-- marquée comme point de départ, conservée indéfiniment même quand une
-- expiration automatique des vidéos sera mise en place (le stockage gratuit
-- Supabase est limité à 1 Go). Sert de "avant" pour la comparaison
-- avant/après, qui n'aurait aucun sens si la première vidéo était purgée.
alter table sessions add column is_reference boolean not null default false;

-- Au plus une référence par figure et par utilisateur.
create unique index sessions_one_reference_per_progression
  on sessions (user_id, progression)
  where is_reference;

-- La première session enregistrée pour une figure devient automatiquement
-- la référence. Fait en trigger plutôt qu'en code applicatif pour rester
-- vrai quel que soit le chemin d'insertion.
create function public.set_first_session_as_reference()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.sessions
    where user_id = new.user_id
      and progression = new.progression
      and is_reference
  ) then
    new.is_reference := true;
  end if;
  return new;
end;
$$;

create trigger sessions_set_first_as_reference
  before insert on public.sessions
  for each row execute function public.set_first_session_as_reference();

-- Changement de référence : désigner une autre session. En RPC plutôt qu'en
-- deux update côté client, pour que le retrait de l'ancienne référence et
-- la pose de la nouvelle soient atomiques (sinon l'index unique partiel
-- peut rejeter l'opération à mi-chemin et laisser la figure sans référence).
create function public.set_session_as_reference(target_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_user uuid;
  target_progression text;
begin
  select user_id, progression into target_user, target_progression
  from public.sessions where id = target_session_id;

  if target_user is null then
    raise exception 'Session introuvable';
  end if;

  -- security definer contourne la RLS : on vérifie donc explicitement que
  -- la session appartient bien à l'appelant.
  if target_user <> auth.uid() then
    raise exception 'Non autorisé';
  end if;

  update public.sessions set is_reference = false
  where user_id = target_user
    and progression = target_progression
    and is_reference;

  update public.sessions set is_reference = true
  where id = target_session_id;
end;
$$;

-- Marque rétroactivement la session la plus ancienne de chaque figure
-- (par date effective) comme référence, pour les comptes existants.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, progression
           order by coalesce(performed_at, created_at), created_at
         ) as rang
  from sessions
)
update sessions
set is_reference = true
where id in (select id from ranked where rang = 1);
