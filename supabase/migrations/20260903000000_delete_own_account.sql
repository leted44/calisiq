-- Suppression de compte par l'utilisateur lui-même, et compteur d'analyses
-- du jour.
--
-- Les deux fonctions sont `security definer` parce qu'elles doivent agir en
-- dehors de ce que la RLS autorise : effacer une ligne de `auth.users` pour
-- l'une, compter les analyses de tout le monde pour l'autre. Elles vérifient
-- donc elles-mêmes qui appelle, et ne sont accordées qu'aux comptes connectés.

-- Suppression complète et définitive du compte courant.
--
-- L'ordre compte : aucune clé étrangère du schéma n'est en `on delete
-- cascade`, il faut donc remonter la chaîne à la main, des feuilles vers la
-- racine, sinon Postgres refuse la suppression.
--
-- Les fichiers du stockage ne sont PAS effacés ici. Supabase interdit le
-- `delete` direct sur `storage.objects`, même à une fonction `security
-- definer` : la requête est rejetée par « Direct deletion from storage tables
-- is not allowed. Use the Storage API instead. » Le nettoyage se fait donc
-- côté client, par l'API de stockage, juste avant l'appel à cette fonction —
-- voir DeleteAccountButton.tsx.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;

  delete from public.recommendations r
  using public.sessions s
  where r.session_id = s.id and s.user_id = uid;

  delete from public.scores sc
  using public.sessions s
  where sc.session_id = s.id and s.user_id = uid;

  delete from public.sessions where user_id = uid;
  delete from public.calibration_samples where user_id = uid;

  delete from public.profiles where id = uid;

  -- En dernier : la ligne d'authentification. La session en cours devient
  -- caduque immédiatement, d'où la déconnexion déclenchée côté client juste
  -- après l'appel.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Nombre d'analyses lancées aujourd'hui, tous comptes confondus.
--
-- La RLS ne laisse chacun voir que ses propres sessions, ce qui rend ce total
-- incalculable côté client. Il alimente l'indicateur d'activité de l'accueil,
-- où il s'ajoute à une valeur simulée le temps que l'audience se constitue
-- (voir TodayActivity.tsx). Aucune donnée personnelle ne sort d'ici, juste un
-- entier.
create or replace function public.analyses_today()
returns integer
language sql
security definer set search_path = public
stable
as $$
  select count(*)::int
  from public.sessions
  where created_at >= date_trunc('day', now());
$$;

revoke all on function public.analyses_today() from public;
grant execute on function public.analyses_today() to authenticated;
