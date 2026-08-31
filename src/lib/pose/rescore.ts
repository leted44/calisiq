import type { PoseAngles } from "./angles";
import { scoreAngles, type CriterionScore } from "./scoring";
import type { Progression } from "./grid";

// Recalcule les scores d'une analyse déjà enregistrée à partir des valeurs
// mesurées stockées, en leur appliquant la grille de seuils actuelle.
//
// Pourquoi c'est possible sans re-analyser la vidéo : chaque ligne de la
// table `scores` conserve `valeur_mesuree`, c'est-à-dire l'angle réellement
// observé. Seule la conversion angle -> note dépend de la grille, et c'est
// justement elle qui change quand on recalibre.
//
// On reconstruit un PoseAngles à partir des valeurs stockées puis on appelle
// scoreAngles, plutôt que de réimplémenter la traversée de la grille : une
// seconde implémentation finirait par diverger de la première.

const CRITERION_TO_ANGLE: Record<CriterionScore["critere"], keyof PoseAngles> = {
  shoulder_protraction: "shoulderProtraction",
  shoulder_flexion: "shoulderFlexionAngle",
  pelvis_deviation: "pelvisDeviation",
  hip_angle: "hipAngle",
  knee_angle: "kneeAngle",
  elbow_angle: "elbowAngle",
  body_line_angle: "bodyLineAngleFromHorizontal",
  torso_angle: "torsoAngleFromHorizontal",
  straightest_knee_angle: "straightestKneeAngle",
  straightest_leg_hip_angle: "straightestLegHipAngle",
  bent_knee_angle: "bentKneeAngle",
};

export type RescoreResult = {
  scores: CriterionScore[];
  /**
   * Critères présents dans la grille actuelle mais dont aucune valeur
   * mesurée n'a été enregistrée : ils ont été ajoutés après cette analyse.
   * Impossible de leur donner une note sans re-analyser la vidéo.
   */
  missingCriteria: CriterionScore["critere"][];
};

export function rescoreFromStoredMeasures(
  measured: Partial<Record<CriterionScore["critere"], number>>,
  progression: Progression
): RescoreResult {
  // NaN pour tout ce qu'on n'a pas : scoreAngles produira alors un score
  // NaN, qu'on isole ensuite au lieu de l'écrire en base.
  const angles: PoseAngles = {
    elbowAngle: NaN,
    hipAngle: NaN,
    kneeAngle: NaN,
    shoulderFlexionAngle: NaN,
    bodyLineAngleFromHorizontal: NaN,
    torsoAngleFromHorizontal: NaN,
    straightestKneeAngle: NaN,
    straightestLegHipAngle: NaN,
    bentKneeAngle: NaN,
    shoulderProtraction: NaN,
    pelvisDeviation: NaN,
    // Non stocké : sert uniquement à distinguer sag et pike pour le choix
    // de l'exercice correctif, pas au calcul des notes.
    pelvisSagSign: 0,
    isInvertedPose: true,
    legOcclusionRisk: false,
  };

  for (const [critere, value] of Object.entries(measured)) {
    if (value === null || value === undefined) continue;
    const field = CRITERION_TO_ANGLE[critere as CriterionScore["critere"]];
    if (field) {
      (angles[field] as number) = value;
    }
  }

  const recomputed = scoreAngles(angles, progression);
  const scores = recomputed.filter((s) => Number.isFinite(s.score));
  const missingCriteria = recomputed
    .filter((s) => !Number.isFinite(s.score))
    .map((s) => s.critere);

  return { scores, missingCriteria };
}
