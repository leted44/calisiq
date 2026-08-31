import { scoreAngles, globalScore } from "@/lib/pose/scoring";
import { SCORING_GRID, type Progression } from "@/lib/pose/grid";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import type { PoseAngles } from "@/lib/pose/angles";

export type CalibrationSampleRow = {
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
};

type SampleComparison = {
  index: number;
  userRating: number;
  computed: number;
  gap: number;
};

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
  const byVariation = new Map<string, SampleComparison[]>();

  for (const sample of samples) {
    const computed = computedScore(sample);
    if (computed === null) continue;
    const list = byVariation.get(sample.variation) ?? [];
    list.push({
      index: list.length + 1,
      userRating: sample.user_rating,
      computed,
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
                <div
                  key={s.index}
                  className="flex items-center gap-3 px-3.5 py-2 text-xs"
                >
                  <span className="w-6 shrink-0 text-slate-600">#{s.index}</span>
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
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
