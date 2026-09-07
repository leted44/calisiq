-- Profil public : publication d'une séance, et lecture par un visiteur.
--
-- PUBLIER EST UN GESTE, PAS UN RÉGLAGE DE COMPTE
--
-- Le drapeau est posé séance par séance, faux par défaut. Rendre tout
-- l'historique public serait une faute : on y enregistre aussi des tentatives
-- ratées, des essais de cadrage, des figures soumises dans la mauvaise
-- catégorie. Elles doivent rester privées, et le choix de montrer appartient
-- à chaque séance comme c'est déjà le cas pour la référence.
alter table public.sessions
  add column if not exists is_public boolean not null default false;

-- Vidéos des séances publiées.
--
-- Le bucket reste privé. Cette politique donne la permission de lecture
-- exactement aux objets rattachés à une séance publiée, ce qui permet de
-- signer une URL au moment du rendu de la page. Dépublier retire l'accès
-- immédiatement, sans copie à supprimer ni fichier orphelin à traquer.
drop policy if exists "videos: read published sessions" on storage.objects;
create policy "videos: read published sessions" on storage.objects
  for select
  using (
    bucket_id = 'videos'
    and exists (
      select 1
      from public.sessions s
      where s.video_url = storage.objects.name
        and s.is_public = true
    )
  );

-- Profil public, réduit à ce qui peut être montré.
--
-- Une politique de lecture sur `profiles` exposerait la ligne entière, donc
-- la taille, le poids, la date de naissance et le sexe. RLS filtre les
-- lignes, pas les colonnes. Une fonction, elle, choisit exactement ce qui
-- sort : le pseudo et l'avatar, rien d'autre.
create or replace function public.public_profile(p_handle text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select row_to_json(x)
      from (
        select p.handle, p.avatar_url
        from public.profiles p
        where lower(p.handle) = lower(p_handle)
      ) x
    ),
    'null'::json
  );
$$;

-- Séances publiées d'un profil, avec leur note moyenne.
--
-- Renvoie du JSON plutôt qu'un type composite : la forme des colonnes évolue
-- au fil des migrations, et une signature figée casserait à la première
-- colonne ajoutée. Le calcul des niveaux reste côté application, où il vit
-- déjà — le dupliquer en SQL garantirait qu'un jour les deux divergent.
create or replace function public.public_sessions(p_handle text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(row_to_json(x) order by x.created_at desc), '[]'::json)
  from (
    select
      s.id,
      s.progression,
      s.performed_at,
      s.created_at,
      s.hold_duration_seconds,
      s.rep_count,
      s.video_url,
      avg(sc.score) as score
    from public.sessions s
    join public.profiles p on p.id = s.user_id
    left join public.scores sc on sc.session_id = s.id
    where lower(p.handle) = lower(p_handle)
      and s.is_public = true
      and s.status = 'done'
    group by s.id
  ) x;
$$;

grant execute on function public.public_profile(text) to anon, authenticated;
grant execute on function public.public_sessions(text) to anon, authenticated;
