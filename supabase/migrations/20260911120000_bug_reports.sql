-- Signalements de bugs envoyés depuis l'application.
--
-- POURQUOI UNE TABLE ET PAS UN MAILTO
--
-- Un lien mailto coûte une ligne et paraît suffisant. Il perd en réalité
-- l'essentiel : le signalement part dans une boîte de réception sans
-- structure, sans le contexte technique, et sans qu'on puisse le retrouver
-- ni savoir lequel a déjà été traité. Une table rend les signalements
-- interrogeables, et surtout comparables entre eux — trois rapports sur la
-- même figure disent quelque chose qu'aucun d'eux ne dit seul.
--
-- CE QUI EST CAPTURÉ SANS ÊTRE DEMANDÉ
--
-- La catégorie et le message viennent de l'utilisateur. Le reste est relevé
-- automatiquement : navigateur, taille d'écran, langue de l'interface. C'est
-- précisément ce que personne ne pense à joindre, et ce dont on a besoin en
-- premier pour reproduire un bug. Rien là-dedans n'est une donnée nouvelle :
-- ce sont des informations que le navigateur envoie déjà à chaque requête.
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  created_at timestamptz default now(),

  -- Où le problème s'est produit. Contrainte en base et pas seulement dans
  -- l'interface : une catégorie inventée rendrait le tri inutile.
  category text not null check (
    category in ('analysis', 'video', 'export', 'progress', 'account', 'other')
  ),

  -- Figure concernée, quand il y en a une. Beaucoup de bugs d'analyse sont
  -- propres à une variation, et la question fait gagner un aller-retour.
  progression text,

  message text not null check (char_length(message) between 10 and 2000),

  -- Contexte technique relevé à l'envoi.
  user_agent text,
  app_lang text,
  viewport text,

  -- Suivi côté administrateur. 'new' tant que personne n'a regardé.
  status text not null default 'new' check (status in ('new', 'seen', 'fixed'))
);

create index if not exists bug_reports_created_idx
  on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

-- Chacun dépose ses propres signalements et relit les siens. La colonne
-- user_id est imposée par la policy : personne ne peut signaler au nom d'un
-- autre.
drop policy if exists "bug_reports: insert own" on public.bug_reports;
create policy "bug_reports: insert own" on public.bug_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "bug_reports: select own" on public.bug_reports;
create policy "bug_reports: select own" on public.bug_reports
  for select using (auth.uid() = user_id);

-- L'administrateur lit tout : c'est la seule façon d'exploiter les
-- signalements. Le drapeau vit sur profiles, donc il se donne et se retire
-- sans redéploiement, comme pour les autres outils internes.
drop policy if exists "bug_reports: admin reads all" on public.bug_reports;
create policy "bug_reports: admin reads all" on public.bug_reports
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin
    )
  );

-- La suppression de compte doit emporter les signalements : sans cette
-- ligne, la clé étrangère vers profiles bloquerait l'effacement, et la
-- fonction échouerait au milieu de son travail.
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
  delete from public.bug_reports where user_id = uid;

  delete from public.profiles where id = uid;

  delete from auth.users where id = uid;
end;
$$;
