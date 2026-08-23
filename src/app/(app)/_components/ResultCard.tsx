import type { CriterionScore } from "@/lib/pose/scoring";
import type { Recommendation } from "@/lib/pose/recommendations";

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Protraction",
  pelvis_deviation: "Bassin",
  hip_angle: "Genou-hanche-épaule",
  elbow_angle: "Coude",
};

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-400";
  if (score >= 4) return "bg-orange-400";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 7) return "text-green-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-500";
}

export default function ResultCard({
  globalScoreValue,
  representativeFrame,
  scores,
  recommendations,
}: {
  globalScoreValue: number;
  representativeFrame: string | null;
  scores: CriterionScore[];
  recommendations: Recommendation[] | null;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
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

      <div className="space-y-2">
        {scores.map((s) => {
          const isAngle = s.critere === "hip_angle" || s.critere === "elbow_angle";
          const unit = isAngle ? "°" : "";
          const decimals = isAngle ? 0 : 2;
          return (
            <div key={s.critere}>
              <div className="mb-0.5 flex justify-between text-xs text-slate-400">
                <span>{CRITERE_LABELS[s.critere]}</span>
                <span>
                  {s.score.toFixed(1)}/10 (mesuré {s.valeurMesuree.toFixed(decimals)}
                  {unit}, cible {s.valeurCible.toFixed(decimals)}
                  {unit})
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${scoreColor(s.score)}`}
                  style={{ width: `${Math.min(100, s.score * 10)}%` }}
                />
              </div>
            </div>
          );
        })}
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
