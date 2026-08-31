"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrashIcon } from "@/components/icons";
import { scoreAngles, globalScore } from "@/lib/pose/scoring";
import { SCORING_GRID, type Progression } from "@/lib/pose/grid";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import type { PoseAngles } from "@/lib/pose/angles";

export type CalibrationSampleRow = {
  id: string;
  variation: string;
  user_rating: number;
  elbow_angle: number | null;
  hip_angle: number | null;
  knee_angle: number | null;
  shoulder_flexion_angle: number | null;
  body_line_angle_from_horizontal: number | null;
  shoulder_protraction: number | null;
  pelvis_deviation: number | null;
  pelvis_sag_sign: number | null;
  // Ajoutés avec la Single Leg Front Lever : null sur tous les
  // échantillons enregistrés avant (voir migration 20260901).
  torso_angle_from_horizontal: number | null;
  straightest_knee_angle: number | null;
  straightest_leg_hip_angle: number | null;
  bent_knee_angle: number | null;
};

type SampleComparison = {
  id: string;
  index: number;
  userRating: number;
  computed: number;
  gap: number;
  incoherence: string | null;
};

// Un échantillon peut être mesuré correctement et rester inutilisable :
// c'est le cas quand la position filmée n'est pas celle de la variation
// choisie. Le garder revient à apprendre à la grille qu'une figure vaut
// une autre, et ça se paye sur tous les scores suivants. On le signale
// donc au lieu de le laisser peser en silence.
function incoherenceOf(sample: CalibrationSampleRow): string | null {
  if (sample.variation === "one_leg_front_lever") {
    const bent = sample.bent_knee_angle;
    const straight = sample.straightest_knee_angle;
    if (bent !== null && bent > 150) {
      return "les deux jambes sont tendues : c'est un full front lever";
    }
    if (straight !== null && straight < 120) {
      return "les deux jambes sont repliées : c'est un tuck front lever";
    }
  }
  return null;
}

type Comparison = {
  variation: string;
  label: string;
  meanAbsoluteGap: number;
  samples: SampleComparison[];
};

// Note que la grille actuelle donnerait à un échantillon, à partir des
// angles réellement mesurés au moment de sa capture. Sert à confronter le
// barème automatique à la note humaine : c'est tout l'intérêt de la
// calibration, et ça ne demande aucune re-analyse de vidéo puisque les
// angles sont stockés.
function computedScore(sample: CalibrationSampleRow): number | null {
  const progression = sample.variation as Progression;
  if (!SCORING_GRID[progression]) return null;

  const angles: PoseAngles = {
    elbowAngle: sample.elbow_angle ?? NaN,
    hipAngle: sample.hip_angle ?? NaN,
    kneeAngle: sample.knee_angle ?? NaN,
    shoulderFlexionAngle: sample.shoulder_flexion_angle ?? NaN,
    bodyLineAngleFromHorizontal: sample.body_line_angle_from_horizontal ?? NaN,
    // NaN quand l'échantillon est antérieur à ces mesures : scoreAngles
    // produit alors un score NaN, filtré juste en dessous, plutôt que de
    // noter la figure sur une valeur inventée.
    torsoAngleFromHorizontal: sample.torso_angle_from_horizontal ?? NaN,
    straightestKneeAngle: sample.straightest_knee_angle ?? NaN,
    straightestLegHipAngle: sample.straightest_leg_hip_angle ?? NaN,
    bentKneeAngle: sample.bent_knee_angle ?? NaN,
    shoulderProtraction: sample.shoulder_protraction ?? NaN,
    pelvisDeviation: sample.pelvis_deviation ?? NaN,
    pelvisSagSign: sample.pelvis_sag_sign ?? 0,
    isInvertedPose: true,
    legOcclusionRisk: false,
  };

  const scores = scoreAngles(angles, progression).filter((s) =>
    Number.isFinite(s.score)
  );
  // Un échantillon capturé avant l'ajout d'un critère n'a pas toutes les
  // mesures : on ne compare que s'il en reste assez pour un score sensé.
  if (scores.length === 0) return null;
  return globalScore(scores);
}

function gapColor(absGap: number): string {
  if (absGap <= 1) return "text-green-400";
  if (absGap <= 2) return "text-yellow-400";
  return "text-orange-400";
}

export default function CalibrationAccuracy({
  samples,
}: {
  samples: CalibrationSampleRow[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(sample: SampleComparison, label: string) {
    const raison = sample.incoherence
      ? `

Motif détecté : ${sample.incoherence}.`
      : "";
    const question =
      `Supprimer définitivement l'échantillon #${sample.index} de ${label} ` +
      `(ta note ${sample.userRating.toFixed(1)}) ?${raison}

` +
      "Il ne comptera plus dans la calibration. C'est irréversible.";
    if (!confirm(question)) return;

    setDeleting(sample.id);
    setError(null);
    const supabase = createClient();
    // .select() pour savoir ce qui a réellement été supprimé : la lecture
    // des échantillons est ouverte à tous les comptes, mais l'écriture
    // reste limitée aux lignes du compte connecté. Sans ce retour, la
    // suppression d'un échantillon enregistré depuis un autre compte de
    // test renverrait un succès sans rien supprimer.
    const { data, error: deleteError } = await supabase
      .from("calibration_samples")
      .delete()
      .eq("id", sample.id)
      .select("id");
    setDeleting(null);

    if (deleteError) {
      setError("Suppression impossible : " + deleteError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError(
        "Rien n'a été supprimé : cet échantillon a été enregistré depuis un autre compte. Reconnecte-toi avec ce compte pour le supprimer."
      );
      return;
    }
    router.refresh();
  }

  const byVariation = new Map<string, SampleComparison[]>();

  for (const sample of samples) {
    const computed = computedScore(sample);
    if (computed === null) continue;
    const list = byVariation.get(sample.variation) ?? [];
    list.push({
      id: sample.id,
      index: list.length + 1,
      userRating: sample.user_rating,
      computed,
      incoherence: incoherenceOf(sample),
      // Écart signé : positif = la grille est plus généreuse que toi.
      gap: computed - sample.user_rating,
    });
    byVariation.set(sample.variation, list);
  }

  const comparisons: Comparison[] = [...byVariation.entries()]
    .map(([variation, list]) => ({
      variation,
      label: PROGRESSION_LABELS[variation] ?? variation,
      samples: list,
      meanAbsoluteGap:
        list.reduce((a, s) => a + Math.abs(s.gap), 0) / list.length,
    }))
    .sort((a, b) => b.meanAbsoluteGap - a.meanAbsoluteGap);

  if (comparisons.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-white">Justesse de la grille</p>
        <p className="mt-1 text-xs text-slate-400">
          Aucun échantillon exploitable pour l&apos;instant. Enregistre des
          figures avec ta note pour comparer le barème automatique au tien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Justesse de la grille
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs leading-relaxed text-slate-400">
          Pour chaque échantillon que tu as soumis, ta note face à celle que la
          grille actuelle produirait à partir des angles mesurés. Recalculé à
          chaque affichage, donc toujours à jour après un changement de seuils :
          modifie un seuil, recharge, tu vois immédiatement l&apos;effet.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          Un écart positif signifie que la grille note plus généreusement que
          toi. Les figures les plus mal calibrées apparaissent en premier.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {comparisons.map((c) => (
          <div
            key={c.variation}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3.5 py-2.5">
              <p className="text-sm font-medium text-white">{c.label}</p>
              <span className={`text-xs font-semibold ${gapColor(c.meanAbsoluteGap)}`}>
                écart moyen {c.meanAbsoluteGap.toFixed(1)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/70">
              {c.samples.map((s) => (
                <div key={s.id} className="px-3.5 py-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-6 shrink-0 text-slate-600">
                      #{s.index}
                    </span>
                    <span className="flex-1 text-slate-400">
                      ta note{" "}
                      <span className="font-semibold text-slate-200">
                        {s.userRating.toFixed(1)}
                      </span>
                    </span>
                    <span className="flex-1 text-slate-400">
                      grille{" "}
                      <span className="font-semibold text-slate-200">
                        {s.computed.toFixed(1)}
                      </span>
                    </span>
                    <span
                      className={`w-12 shrink-0 text-right font-semibold ${gapColor(
                        Math.abs(s.gap)
                      )}`}
                    >
                      {s.gap > 0 ? "+" : ""}
                      {s.gap.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(s, c.label)}
                      disabled={deleting !== null}
                      aria-label={`Supprimer l'échantillon ${s.index}`}
                      className="shrink-0 rounded-md p-1 text-slate-600 transition hover:bg-slate-800 hover:text-red-400 disabled:opacity-40"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {s.incoherence && (
                    <p className="mt-1 pl-9 text-[11px] leading-snug text-orange-400">
                      Position incohérente avec la variation : {s.incoherence}.
                      Cet échantillon fausse la calibration.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
