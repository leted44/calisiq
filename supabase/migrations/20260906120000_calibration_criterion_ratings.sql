-- Notes humaines par critère, en plus de la note globale.
--
-- POURQUOI LA NOTE GLOBALE NE SUFFIT PAS
--
-- Calibrer, c'est confronter les seuils de la grille aux notes humaines. Avec
-- une seule note globale, un écart entre les deux ne dit pas D'OÙ il vient :
-- une série notée 8,5 par l'humain et 4,1 par la grille peut l'être parce que
-- le seuil de forme est trop sévère, ou celui de tempo, ou les deux. Il faut
-- alors deviner, ce qui est exactement ce que la calibration doit éliminer.
--
-- Deux critères seulement, et pas les cinq : ce sont les deux qu'un œil humain
-- juge réellement sur une vidéo. La tenue du corps se voit (cassé à la hanche
-- ou aligné), la profondeur se voit (jusqu'où descend la tête, le menton, les
-- épaules). L'oscillation de hanche est un écart type et la régularité du
-- tempo un pourcentage : personne ne les estime honnêtement à l'œil, et
-- demander une note dessus produirait du bruit présenté comme de la donnée.
--
-- Facultatives : un échantillon noté seulement globalement reste exploitable,
-- comme tous ceux déjà enregistrés.
alter table public.calibration_samples
  -- Tenue du corps pendant la série, 0 à 10.
  add column if not exists rating_form double precision,
  -- Profondeur atteinte en position basse, 0 à 10.
  add column if not exists rating_depth double precision;
