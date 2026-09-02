-- Inscriptions jour par jour dans les statistiques admin.
--
-- La page ne donnait qu'un total et un cumul sur 7 jours : impossible de
-- savoir quel jour les inscriptions sont tombées, donc impossible de relier
-- un pic à une publication Instagram ou TikTok. C'est pourtant le seul usage
-- utile de ces chiffres au lancement.
--
-- Les séries sont désormais complétées par generate_series pour que les jours
-- sans rien apparaissent quand même. Sans ça, la courbe sautait les jours
-- vides et les collait les uns aux autres : trois inscriptions étalées sur
-- deux semaines se lisaient comme trois jours d'affilée.

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
      (select count(*) from public.profiles),
    'users_7d',
      (select count(*) from public.profiles
       where created_at >= now() - interval '7 days'),
    'users_30d',
      (select count(*) from public.profiles
       where created_at >= now() - interval '30 days'),
    'onboarded_users',
      (select count(*) from public.profiles where onboarding_completed),
    -- Date de la dernière inscription : dit d'un coup d'œil si le robinet
    -- coule encore, là où un total cumulé ne le dit jamais.
    'last_signup_at',
      (select max(created_at) from public.profiles),
    -- Un inscrit qui n'a jamais lancé d'analyse n'est pas un utilisateur :
    -- c'est l'écart entre ces deux chiffres qui dit si le produit accroche.
    'active_users',
      (select count(distinct user_id) from public.sessions),
    'active_users_7d',
      (select count(distinct user_id) from public.sessions
       where created_at >= now() - interval '7 days'),
    'total_sessions',
      (select count(*) from public.sessions),
    'sessions_7d',
      (select count(*) from public.sessions
       where created_at >= now() - interval '7 days'),
    -- Utilisateurs revenus au moins deux jours différents : le seul signal
    -- fiable de rétention à petite échelle.
    'returning_users',
      (select count(*) from (
        select user_id
        from public.sessions
        group by user_id
        having count(distinct date_trunc('day', created_at)) >= 2
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
            where created_at >= (now() - interval '29 days')::date
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
            select created_at::date as d, count(*)::int as n
            from public.sessions
            where created_at >= (now() - interval '13 days')::date
            group by 1
          ) c on c.d = g::date
        ) s
      ), '[]'::json)
  );
end;
$$;
