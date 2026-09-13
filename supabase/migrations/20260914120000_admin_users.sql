-- Qui s'est inscrit, et qui s'en sert vraiment.
--
-- POURQUOI DES LIGNES ET PAS SEULEMENT DES TOTAUX
--
-- La page de statistiques dit combien de comptes existent et combien ont
-- analysé quelque chose. À quatre inscrits, c'est l'inverse du besoin : un
-- pourcentage sur quatre personnes ne veut rien dire, alors que savoir
-- lesquelles n'ont jamais rien analysé permet de leur écrire. Les moyennes
-- deviennent utiles à mille utilisateurs ; en dessous, ce sont les personnes
-- qui comptent.
--
-- L'ADRESSE E-MAIL
--
-- Elle vit dans `auth.users`, hors d'atteinte du client. Cette fonction est
-- donc `security definer`, ce qui la fait tourner avec les droits de son
-- propriétaire, et elle vérifie explicitement que l'appelant est
-- administrateur avant de renvoyer quoi que ce soit. Sans cette vérification,
-- n'importe quel compte connecté lirait la liste des e-mails.
--
-- LE PAYS
--
-- Colonne ajoutée ici mais remplie côté application, à partir de l'en-tête
-- que l'hébergeur pose sur chaque requête. Il n'y a pas moyen de le déduire
-- après coup : ni Supabase ni Postgres ne savent d'où venait quelqu'un qui
-- s'est inscrit la semaine dernière. Elle restera donc vide pour les comptes
-- existants, et se remplira à leur prochaine visite.

alter table public.profiles
  add column if not exists country text;

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

-- Le rôle `public` inclut les visiteurs anonymes : seul un compte connecté
-- doit pouvoir tenter l'appel, et la vérification ci-dessus fait le reste.
revoke all on function public.admin_users() from public;
grant execute on function public.admin_users() to authenticated;
