import type { PoseAngles } from "./angles";
import { SCORING_GRID, isRepProgression, type Progression } from "./grid";
import { globalScore, scoreAngles } from "./scoring";

// Note que la grille actuelle donne à une mesure, et raison explicite quand
// elle ne peut pas en donner.
//
// POURQUOI UN STATUT PLUTÔT QU'UN `number | null`
//
// Le bloc de calibration traduisait `null` en ne s'affichant pas du tout.
// Une variation absente de la grille faisait donc disparaître la note sans un
// mot, et rien ne distinguait « pas encore de barème » d'un bug. Le cas s'est
// produit sur le handstand push-up, absent de SCORING_GRID parce qu'il vit
// dans REP_SCORING_GRID, et il se reproduira à chaque figure ajoutée avant
// son barème. Un statut oblige l'appelant à dire quelque chose.
//
// C'est le seul endroit qui décide de cette note. Une figure ajoutée plus
// tard passe forcément par ici : soit elle est notée, soit le bloc explique
// pourquoi elle ne l'est pas.
export type EstimatedScore =
  | { status: "ok"; value: number }
  | { status: "no_grid" }
  | { status: "incomplete" };

export function estimateGridScore({
  variation,
  angles,
  repScore,
}: {
  variation: string;
  /** Angles médians de la fenêtre analysée. Sans objet sur une série. */
  angles: PoseAngles;
  /**
   * Note déjà produite par l'analyse. Un exercice à répétition ne se note pas
   * depuis des angles médians : sa note vient du découpage en répétitions, que
   * seule l'analyse a fait. Vaut 0 sur un hold, où elle est ignorée.
   */
  repScore: number;
}): EstimatedScore {
  if (isRepProgression(variation)) {
    return Number.isFinite(repScore)
      ? { status: "ok", value: repScore }
      : { status: "incomplete" };
  }

  const grid = SCORING_GRID[variation as Progression];
  if (!grid) return { status: "no_grid" };

  // Un critère dont la mesure manque produit un score NaN, qui contaminerait
  // la moyenne. Le filtrer : une note partielle reste comparable, « NaN/10 »
  // ne l'est pas.
  const scores = scoreAngles(angles, variation as Progression).filter((s) =>
    Number.isFinite(s.score)
  );
  if (scores.length === 0) return { status: "incomplete" };
  return { status: "ok", value: globalScore(scores) };
}
