-- Mesures nécessaires aux figures ASYMÉTRIQUES (Single Leg Front Lever),
-- ajoutées le 2026-09-01.
--
-- Les colonnes existantes hip_angle et knee_angle contiennent une moyenne
-- pondérée des deux côtés, ce qui suppose les deux jambes dans la même
-- position. Sur une figure à une jambe, cette moyenne se situe entre une
-- jambe tendue et une jambe repliée, et ne décrit donc aucune des deux.
-- De même, body_line_angle_from_horizontal part du milieu des deux
-- chevilles, un point qui ne correspond à rien quand elles sont à des
-- endroits très différents.
--
-- On stocke donc en plus :
--   torso_angle_from_horizontal : le tronc seul (épaule -> hanche), qui
--     garde un sens quelle que soit la position des jambes ;
--   straightest_knee_angle / straightest_leg_hip_angle : la jambe la plus
--     tendue, c'est-à-dire celle qui porte la difficulté de la figure.
--
-- NULL sur tous les échantillons antérieurs : la valeur n'était pas
-- mesurée, elle ne peut pas être reconstituée sans re-analyser la vidéo,
-- et l'interface traite ce cas explicitement plutôt que d'inventer.
-- `if not exists` sur chaque colonne : cette migration a été enrichie
-- après une première application (bent_knee_angle ajoutée ensuite), et
-- sans cette précaution la rejouer échouait dès la première colonne déjà
-- présente, sans créer les suivantes.
alter table calibration_samples
  add column if not exists torso_angle_from_horizontal numeric,
  add column if not exists straightest_knee_angle numeric,
  add column if not exists straightest_leg_hip_angle numeric,
  add column if not exists bent_knee_angle numeric;
