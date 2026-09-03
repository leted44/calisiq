-- Nombre de répétitions d'une séance, pour les exercices dynamiques.
--
-- Pendant colonne de hold_duration_seconds : les deux ne sont jamais
-- renseignées ensemble. Un hold n'a pas de répétitions, une série n'a pas de
-- durée de maintien. C'est ce qui permet à l'historique et au comparatif
-- d'afficher la bonne mesure sans avoir à connaître le type d'exercice.
alter table public.sessions
  add column if not exists rep_count integer;
