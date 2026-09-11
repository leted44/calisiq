-- Notification par e-mail à chaque signalement de bug.
--
-- POURQUOI UN DÉCLENCHEUR ET PAS UNE EDGE FUNCTION
--
-- La voie officielle passe par un webhook de base qui appelle une Edge
-- Function. Elle suppose la CLI Supabase, Docker et un déploiement — trois
-- outils de plus pour envoyer un e-mail. pg_net fait la requête HTTP
-- directement depuis Postgres, donc tout se pose depuis l'éditeur SQL, y
-- compris depuis un téléphone.
--
-- LES SECRETS NE SONT PAS DANS CE FICHIER
--
-- La clé d'API et l'adresse de destination vivent dans le coffre Supabase
-- (`vault`), pas dans le dépôt. Ce fichier peut donc être versionné et lu par
-- n'importe qui sans rien exposer, et la clé se change sans redéploiement.
-- Tant que les deux secrets n'existent pas, la fonction ne fait simplement
-- rien.
--
-- L'ENVOI NE DOIT JAMAIS FAIRE ÉCHOUER L'ENREGISTREMENT
--
-- Un signalement perdu parce que le service d'e-mail était en panne serait le
-- comble. net.http_post met la requête en file d'attente sans attendre la
-- réponse, et le bloc exception rattrape le reste : quoi qu'il arrive, la
-- ligne est écrite.
create extension if not exists pg_net;

create or replace function public.notify_bug_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cle text;
  destinataire text;
  auteur text;
  corps text;
begin
  select decrypted_secret into cle
  from vault.decrypted_secrets where name = 'resend_api_key';

  select decrypted_secret into destinataire
  from vault.decrypted_secrets where name = 'bug_report_email';

  -- Notification non configurée : on laisse passer sans bruit. Le
  -- signalement reste consultable en base, ce qui était déjà le cas avant.
  if cle is null or destinataire is null then
    return new;
  end if;

  select u.email into auteur from auth.users u where u.id = new.user_id;

  corps :=
    'Catégorie : ' || new.category || E'\n' ||
    'Figure : ' || coalesce(new.progression, '—') || E'\n' ||
    'Auteur : ' || coalesce(auteur, '—') || E'\n' ||
    'Langue : ' || coalesce(new.app_lang, '—') || E'\n' ||
    'Écran : ' || coalesce(new.viewport, '—') || E'\n' ||
    'Navigateur : ' || coalesce(new.user_agent, '—') || E'\n\n' ||
    new.message || E'\n\n' ||
    'Identifiant : ' || new.id::text;

  begin
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cle
      ),
      body := jsonb_build_object(
        -- Expéditeur de test fourni par Resend : il fonctionne sans vérifier
        -- de domaine, à condition d'écrire à l'adresse du compte Resend.
        -- Passer à une adresse @calisiq.com demandera de vérifier le domaine.
        'from', 'CalisIQ <onboarding@resend.dev>',
        'to', array[destinataire],
        'subject', '[CalisIQ] ' || new.category ||
                   coalesce(' · ' || new.progression, ''),
        'text', corps
      )
    );
  exception when others then
    -- Journalisé, jamais propagé.
    raise warning 'Notification de signalement impossible : %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists bug_reports_notify on public.bug_reports;
create trigger bug_reports_notify
  after insert on public.bug_reports
  for each row execute function public.notify_bug_report();
