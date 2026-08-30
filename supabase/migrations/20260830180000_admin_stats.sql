-- Statistiques d'usage réservées au propriétaire de l'application.
--
-- La RLS limite chaque utilisateur à ses propres lignes : une requête
-- normale ne pourrait donc jamais compter les inscrits ni les analyses des
-- autres. D'où une fonction security definer, qui contourne la RLS mais
-- vérifie explicitement que l'appelant est administrateur.
--
-- Le drapeau vit sur profiles plutôt que sur une adresse e-mail codée en
-- dur : pas de secret dans le code, et le rôle se donne ou se retire
-- depuis Supabase sans redéploiement.
alter table profiles add column is_admin boolean not null default false;

create function public.admin_stats()
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
    'daily_sessions',
      coalesce((
        select json_agg(json_build_object('day', day, 'count', n) order by day)
        from (
          select date_trunc('day', created_at)::date as day, count(*) as n
          from public.sessions
          where created_at >= now() - interval '14 days'
          group by 1
        ) d
      ), '[]'::json)
  );
end;
$$;
