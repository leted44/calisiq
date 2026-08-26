import type { CriterionScore } from "@/lib/pose/scoring";
import type { Recommendation } from "@/lib/pose/recommendations";
import {
  tierFor,
  TIER_LABELS,
  TIER_COLORS,
  describeCriterion,
  formatHoldDuration,
  CRITERE_DEFINITIONS,
} from "@/lib/pose/report";
import ScoreRing from "@/components/ScoreRing";

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Épaules",
  shoulder_flexion: "Épaules",
  pelvis_deviation: "Bassin",
  hip_angle: "Hanches",
  knee_angle: "Genoux",
  elbow_angle: "Coudes",
  body_line_angle: "Axe du corps",
};

function scoreTextColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-cyan-400";
  return "text-orange-400";
}

export default function ResultCard({
  globalScoreValue,
  representativeFrame,
  scores,
  recommendations,
  holdDurationSeconds,
  figure = "planche",
}: {
  globalScoreValue: number;
  representativeFrame: string | null;
  scores: CriterionScore[];
  recommendations: Recommendation[] | null;
  holdDurationSeconds?: number | null;
  figure?: "planche" | "handstand";
}) {
  return (
    <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-4">
        {representativeFrame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={representativeFrame}
            alt="Frame représentative du hold"
            className="h-24 w-24 rounded-lg object-cover"
          />
        )}
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Score global
          </p>
          <p className={`text-3xl font-bold ${scoreTextColor(globalScoreValue)}`}>
            {globalScoreValue.toFixed(1)}
            <span className="text-base font-normal text-slate-600">/10</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scores.map((s) => (
          <ScoreRing key={s.critere} value={s.score} label={CRITERE_LABELS[s.critere]} />
        ))}
        {holdDurationSeconds !== undefined && (
          <ScoreRing
            value={Number(holdDurationSeconds?.toFixed(1) ?? 0)}
            label="Hold"
            suffix="s"
          />
        )}
      </div>

      <div className="space-y-3">
        {scores.map((s) => {
          const tier = tierFor(s.score);
          const isAngle =
            s.critere === "hip_angle" ||
            s.critere === "elbow_angle" ||
            s.critere === "knee_angle" ||
            s.critere === "body_line_angle" ||
            s.critere === "shoulder_flexion";
          const unit = isAngle ? "°" : "";
          const decimals = isAngle ? 0 : 2;
          return (
            <div key={s.critere} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {CRITERE_LABELS[s.critere]}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[tier]}`}
                >
                  {TIER_LABELS[tier]}
                </span>
              </div>
              <p className="text-[11px] italic text-slate-500">
                {CRITERE_DEFINITIONS[s.critere]}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {describeCriterion(s.critere, s.score, figure)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-600">
                mesuré {s.valeurMesuree.toFixed(decimals)}
                {unit} · cible {s.valeurCible.toFixed(decimals)}
                {unit}
              </p>
            </div>
          );
        })}
        {holdDurationSeconds !== undefined && holdDurationSeconds !== null && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-white">Durée du hold</span>
            </div>
            <p className="text-xs text-slate-400">
              Temps réellement maintenu en position stable :{" "}
              {formatHoldDuration(holdDurationSeconds)}
            </p>
          </div>
        )}
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="rounded-lg border border-cyan-900/50 bg-cyan-500/10 p-3">
          <p className="mb-1 text-sm font-semibold text-cyan-300">
            À travailler en priorité
          </p>
          <ul className="space-y-1 text-xs text-slate-300">
            {recommendations.map((r) => (
              <li key={r.exercice}>
                <span className="font-medium text-white">{r.exercice}</span> —{" "}
                {r.raison}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
