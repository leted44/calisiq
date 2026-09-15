-- Plateforme et navigateur d'arrivée de chaque compte.
--
-- POURQUOI
--
-- Un inscrit qui ne lance jamais d'analyse pose une question sans réponse :
-- a-t-il renoncé, ou l'application a-t-elle échoué chez lui ? Les échecs
-- connus sont liés à l'appareil, pas à la personne — iOS décode la vidéo
-- autrement et refuse certains formats, et les navigateurs intégrés à
-- Instagram ou TikTok brident l'accès aux fichiers et à la caméra sans rien
-- expliquer à qui les utilise. Quelqu'un qui ouvre le lien depuis une story
-- atterrit exactement là.
--
-- Si les comptes inactifs se concentrent sur une plateforme ou un navigateur,
-- ce n'est plus un problème d'adoption, c'est un bug à corriger.
--
-- ÉCRIT UNE FOIS, JAMAIS MIS À JOUR
--
-- Comme le pays. C'est l'appareil d'arrivée qui explique un échec de prise en
-- main ; celui d'une consultation trois mois plus tard ne dit plus rien de ce
-- moment-là. Les comptes existants se renseigneront à leur prochaine visite.

alter table public.profiles
  add column if not exists platform text,
  add column if not exists browser text;

-- Répartition de l'activation par plateforme et par navigateur, ajoutée aux
-- statistiques : c'est le croisement « combien sont arrivés / combien ont
-- réellement analysé » qui répond à la question, pas un simple décompte.
create or replace function public.admin_platforms()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  select is_admin into caller_is_admin
  from public.profiles
  where id = auth.uid();

  if not coalesce(caller_is_admin, false) then
    raise exception 'Non autorisé';
  end if;

  return json_build_object(
    'platforms',
      coalesce((
        select json_agg(ligne order by ligne.users desc)
        from (
          select
            coalesce(p.platform, 'unknown') as key,
            count(*)::int as users,
            count(*) filter (where a.user_id is not null)::int as active
          from public.profiles p
          left join (
            select distinct user_id from public.sessions where status = 'done'
          ) a on a.user_id = p.id
          where not p.is_internal
          group by 1
        ) ligne
      ), '[]'::json),
    'browsers',
      coalesce((
        select json_agg(ligne order by ligne.users desc)
        from (
          select
            coalesce(p.browser, 'unknown') as key,
            count(*)::int as users,
            count(*) filter (where a.user_id is not null)::int as active
          from public.profiles p
          left join (
            select distinct user_id from public.sessions where status = 'done'
          ) a on a.user_id = p.id
          where not p.is_internal
          group by 1
        ) ligne
      ), '[]'::json)
  );
end;
$$;

revoke all on function public.admin_platforms() from public;
grant execute on function public.admin_platforms() to authenticated;

-- La liste nominative renvoie les deux champs, pour qu'une ligne inactive dise
-- d'elle-même sur quoi la personne a essayé.
create or replace function public.admin_users()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  select is_admin into caller_is_admin
  from public.profiles
  where id = auth.uid();

  if not coalesce(caller_is_admin, false) then
    raise exception 'Non autorisé';
  end if;

  return coalesce(
    (
      select json_agg(ligne order by ligne.created_at desc)
      from (
        select
          p.id,
          au.email,
          p.handle,
          p.country,
          p.platform,
          p.browser,
          p.created_at,
          p.onboarding_completed,
          p.is_internal,
          -- Séances terminées seulement : un import abandonné en cours de
          -- route n'est pas une analyse, et le compter ferait passer pour
          -- actif quelqu'un qui ne l'est pas.
          coalesce(s.sessions_done, 0) as sessions_done,
          coalesce(s.figures, 0) as figures,
          s.last_session_at
        from public.profiles p
        join auth.users au on au.id = p.id
        left join (
          select
            user_id,
            count(*) filter (where status = 'done') as sessions_done,
            count(distinct progression) filter (where status = 'done') as figures,
            max(created_at) filter (where status = 'done') as last_session_at
          from public.sessions
          group by user_id
        ) s on s.user_id = p.id
      ) ligne
    ),
    '[]'::json
  );
end;
$$;

revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated;
