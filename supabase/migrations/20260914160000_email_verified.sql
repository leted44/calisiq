-- Confirmer son adresse après être entré, et non avant.
--
-- POURQUOI DÉPLACER L'ÉTAPE PLUTÔT QUE LA SUPPRIMER
--
-- Exiger un code avant le premier écran fait abandonner : la personne n'a
-- encore rien vu de l'application, donc rien qui justifie d'aller fouiller sa
-- boîte mail, et moins encore ses indésirables. Le coût est payé avant que la
-- valeur soit prouvée, ce qui est l'ordre le plus mauvais possible.
--
-- La supprimer entièrement coûterait autre chose : une adresse mal tapée rend
-- le compte irrécupérable, puisque le mot de passe oublié s'envoie justement
-- à cette adresse. Ce n'est pas un problème de sécurité — il n'y a rien à
-- voler ici — c'est un problème de service après-vente.
--
-- D'où le déplacement : on entre, on analyse, et l'application rappelle
-- ensuite de confirmer, au moment où elle a déjà servi à quelque chose.
--
-- CE QUE CE DRAPEAU EST, ET CE QU'IL N'EST PAS
--
-- Un repère de confort, pas une frontière de sécurité. Avec la confirmation
-- désactivée côté Supabase, `auth.users.email_confirmed_at` est renseigné dès
-- l'inscription : il n'existe donc plus, en base, de vérité serveur sur la
-- possession réelle de l'adresse. Ce drapeau enregistre le fait qu'un code
-- envoyé à cette adresse a bien été saisi, et rien de plus fort.
--
-- Conséquence assumée : aucune fonctionnalité ne doit être conditionnée à ce
-- drapeau. Il sert à afficher un rappel et à savoir, côté administration, qui
-- a une adresse joignable.

alter table public.profiles
  add column if not exists email_verified boolean not null default false;

-- Les comptes existants ont tous franchi l'ancienne étape de confirmation, et
-- les comptes Google arrivent vérifiés par le fournisseur : leur redemander
-- serait absurde.
update public.profiles p
set email_verified = true
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and p.email_verified = false;
