-- Mesures propres aux exercices à répétition dans les échantillons de
-- calibration.
--
-- Les colonnes existantes stockent la médiane des angles sur la fenêtre de
-- hold. Sur une série de tractions ou de HSPU, cette médiane n'a aucun sens :
-- le coude fait des allers-retours entre 45 et 175 degrés, et sa médiane ne
-- décrit aucune position réelle. Impossible donc de calibrer un mouvement
-- dynamique avec les colonnes actuelles.
--
-- Les quatre mesures ci-dessous sont celles que le moteur calcule réellement
-- sur une série, et sur lesquelles portent les seuils de REP_SCORING_GRID.
-- Elles restent nulles sur un hold, comme les colonnes d'angles restent
-- inexploitables sur une série : chaque type d'exercice remplit les siennes.
alter table public.calibration_samples
  -- Angle atteint en position tendue, moyenné sur les répétitions.
  add column if not exists rep_lockout double precision,
  -- Angle atteint en position fléchie, moyenné sur les répétitions.
  add column if not exists rep_peak double precision,
  -- Écart type de l'angle de hanche sur la série : la mesure de l'élan.
  add column if not exists rep_hip_swing double precision,
  -- Régularité du tempo entre répétitions, en pourcentage.
  add column if not exists rep_tempo double precision,
  -- Nombre de répétitions complètes détectées.
  add column if not exists rep_count integer;
