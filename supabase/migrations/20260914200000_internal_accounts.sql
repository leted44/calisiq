-- Écarter les comptes internes des statistiques.
--
-- POURQUOI CE N'EST PAS UN DÉTAIL
--
-- Six des comptes inscrits appartiennent au développeur. Ils portent
-- l'écrasante majorité des analyses, et tant qu'ils sont comptés, chaque
-- chiffre de la page ment dans le sens le plus flatteur : le taux d'activation
-- paraît excellent, la rétention aussi, et le pic d'analyses reflète une
-- séance de test plutôt qu'un usage. Une statistique qui se mesure elle-même
-- ne mesure rien.
--
-- POURQUOI LES MARQUER PLUTÔT QUE LES SUPPRIMER
--
-- Ces comptes servent à tester, et leurs analyses alimentent la calibration.
-- Les effacer perdrait ce travail. Ils restent donc visibles dans la liste
-- nominative, signalés comme internes, et n'entrent dans aucun total.
--
-- POURQUOI PAR ADRESSE ET NON PAR IDENTIFIANT
--
-- Les identifiants changent si un compte est recréé ; les adresses, non.
-- La liste est explicite et se relit : un compte interne oublié ici gonfle
-- silencieusement les chiffres, et c'est le genre d'erreur qu'on ne remarque
-- jamais parce qu'elle va dans le bon sens.

alter table public.profiles
  add column if not exists is_internal boolean not null default false;

update public.profiles p
set is_internal = true
from auth.users u
where u.id = p.id
  and lower(u.email) in (
    'dydyx97114@gmail.com',
    'teddy-benjamin@hotmail.com',
    'tadd@hotmail.com',
    'eddy.benjamin44@hotmail.com',
    'lindalatina15@gmail.com',
    'calisiq.app@gmail.com'
  );

create or replace function public.admin_stats()
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
    'total_users',
      (select count(*) from public.profiles where not is_internal),
    'users_7d',
      (select count(*) from public.profiles
       where not is_internal and created_at >= now() - interval '7 days'),
    'users_30d',
      (select count(*) from public.profiles
       where not is_internal and created_at >= now() - interval '30 days'),
    'onboarded_users',
      (select count(*) from public.profiles
       where not is_internal and onboarding_completed),
    -- Date de la dernière inscription : dit d'un coup d'œil si le robinet
    -- coule encore, là où un total cumulé ne le dit jamais.
    'last_signup_at',
      (select max(created_at) from public.profiles where not is_internal),
    -- Un inscrit qui n'a jamais lancé d'analyse n'est pas un utilisateur :
    -- c'est l'écart entre ces deux chiffres qui dit si le produit accroche.
    'active_users',
      (select count(distinct s.user_id) from public.sessions s
       join public.profiles p on p.id = s.user_id
       where not p.is_internal),
    'active_users_7d',
      (select count(distinct s.user_id) from public.sessions s
       join public.profiles p on p.id = s.user_id
       where not p.is_internal and s.created_at >= now() - interval '7 days'),
    'total_sessions',
      (select count(*) from public.sessions s
       join public.profiles p on p.id = s.user_id
       where not p.is_internal),
    'sessions_7d',
      (select count(*) from public.sessions s
       join public.profiles p on p.id = s.user_id
       where not p.is_internal and s.created_at >= now() - interval '7 days'),
    -- Utilisateurs revenus au moins deux jours différents : le seul signal
    -- fiable de rétention à petite échelle.
    'returning_users',
      (select count(*) from (
        select s.user_id
        from public.sessions s
        join public.profiles p on p.id = s.user_id
        where not p.is_internal
        group by s.user_id
        having count(distinct date_trunc('day', s.created_at)) >= 2
      ) r),
    -- Rétention à sept jours : part des inscrits ayant refait une analyse
    -- dans la semaine suivant leur première.
    --
    -- Calculée sur les seuls comptes ayant déjà passé sept jours depuis leur
    -- première analyse : inclure quelqu'un inscrit hier reviendrait à compter
    -- comme « perdu » quelqu'un qui a encore six jours pour revenir, et à
    -- faire baisser le chiffre à chaque nouvelle inscription.
    --
    -- Null tant qu'aucun compte n'est éligible : mieux vaut ne rien afficher
    -- qu'un zéro qui se lirait comme un échec.
    'd7_eligible',
      (select count(*) from (
        select s.user_id, min(s.created_at) as first_at
        from public.sessions s
        join public.profiles p on p.id = s.user_id
        where not p.is_internal
        group by s.user_id
        having min(s.created_at) <= now() - interval '7 days'
      ) e),
    'd7_returned',
      (select count(*) from (
        select s.user_id, min(s.created_at) as first_at
        from public.sessions s
        join public.profiles p on p.id = s.user_id
        where not p.is_internal
        group by s.user_id
        having min(s.created_at) <= now() - interval '7 days'
          and max(s.created_at) > min(s.created_at) + interval '1 day'
          and max(s.created_at) <= min(s.created_at) + interval '7 days'
      ) r),
    'daily_users',
      coalesce((
        select json_agg(json_build_object('day', day, 'count', n) order by day)
        from (
          select
            g::date as day,
            coalesce(c.n, 0)::int as n
          from generate_series(
            (now() - interval '29 days')::date::timestamp,
            now()::date::timestamp,
            interval '1 day'
          ) g
          left join (
            select created_at::date as d, count(*)::int as n
            from public.profiles
            where not is_internal
              and created_at >= (now() - interval '29 days')::date
            group by 1
          ) c on c.d = g::date
        ) s
      ), '[]'::json),
    'daily_sessions',
      coalesce((
        select json_agg(json_build_object('day', day, 'count', n) order by day)
        from (
          select
            g::date as day,
            coalesce(c.n, 0)::int as n
          from generate_series(
            (now() - interval '13 days')::date::timestamp,
            now()::date::timestamp,
            interval '1 day'
          ) g
          left join (
            select s.created_at::date as d, count(*)::int as n
            from public.sessions s
            join public.profiles p on p.id = s.user_id
            where not p.is_internal
              and s.created_at >= (now() - interval '13 days')::date
            group by 1
          ) c on c.d = g::date
        ) s
      ), '[]'::json)
  );
end;
$$;

-- La liste nominative, elle, garde tout le monde : c'est son rôle de montrer
-- qui existe. Le drapeau est simplement renvoyé pour que l'écran puisse
-- distinguer un compte interne d'un vrai inscrit.
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
