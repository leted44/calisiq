"use client";

import { useState } from "react";
import type { CriterionScore } from "@/lib/pose/scoring";
import type { Recommendation } from "@/lib/pose/recommendations";
import {
  tierFor,
  TIER_LABELS,
  TIER_COLORS,
  describeCriterion,
  formatHoldDuration,
  CRITERE_DEFINITIONS,
  type ScoreTier,
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
  torso_angle: "Tronc",
  straightest_knee_angle: "Jambe tendue",
  straightest_leg_hip_angle: "Hanche jambe tendue",
  bent_knee_angle: "Jambe repliée",
};

// Titres plus descriptifs pour la vue "Détail par catégorie" — les labels
// courts ci-dessus restent utilisés sous les ScoreRing du résumé.
const CRITERE_DETAIL_TITLES: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Protraction des épaules",
  shoulder_flexion: "Ouverture des épaules",
  pelvis_deviation: "Alignement du bassin",
  hip_angle: "Position des hanches",
  knee_angle: "Extension des jambes",
  elbow_angle: "Verrouillage des coudes",
  body_line_angle: "Alignement du corps",
  torso_angle: "Alignement du tronc",
  straightest_knee_angle: "Extension de la jambe tendue",
  straightest_leg_hip_angle: "Ouverture de hanche (jambe tendue)",
  bent_knee_angle: "Repli de la jambe libre",
};

// Mots-clés techniques associés à chaque critère, purement indicatifs (pas
// des mesures) — aident à reconnaître le vocabulaire coaching courant.
const CRITERE_TAGS: Record<CriterionScore["critere"], string[]> = {
  shoulder_protraction: ["Protraction", "Charge bras"],
  shoulder_flexion: ["Ouverture", "Stack"],
  pelvis_deviation: ["Bassin", "Banana"],
  hip_angle: ["Ouverture", "Extension"],
  knee_angle: ["Jambes tendues", "Genoux"],
  elbow_angle: ["Verrouillage", "Triceps"],
  body_line_angle: ["Ligne droite", "Axe"],
  torso_angle: ["Tronc", "Horizontale"],
  straightest_knee_angle: ["Jambe tendue", "Genou"],
  straightest_leg_hip_angle: ["Ouverture", "Jambe tendue"],
  bent_knee_angle: ["Jambe repliée", "Single leg"],
};

const TIER_HEX: Record<ScoreTier, string> = {
  optimal: "#4ade80",
  bon: "#22d3ee",
  faible: "#fb923c",
};

// Badge d'ensemble sur le score global — reste honnête par rapport aux
// seuils réels de tierFor plutôt que de gonfler la formulation.
const GLOBAL_TIER_LABELS: Record<ScoreTier, string> = {
  optimal: "Excellent niveau",
  bon: "Bon niveau",
  faible: "Encore du travail",
};

function scoreTextColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-cyan-400";
  return "text-orange-400";
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
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
  figure?: "planche" | "handstand" | "front_lever" | "dragon_flag";
}) {
  const [view, setView] = useState<"summary" | "details">("summary");
  const globalTier = tierFor(globalScoreValue);

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
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${scoreTextColor(globalScoreValue)}`}>
              {globalScoreValue.toFixed(1)}
              <span className="text-base font-normal text-slate-600">/10</span>
            </p>
          </div>
          <span
            className={`mt-1.5 inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TIER_COLORS[globalTier]}`}
          >
            {GLOBAL_TIER_LABELS[globalTier]}
          </span>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950/50 p-1">
        <button
          type="button"
          onClick={() => setView("summary")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
            view === "summary"
              ? "bg-cyan-500/15 text-cyan-300"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Résumé
        </button>
        <button
          type="button"
          onClick={() => setView("details")}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
            view === "details"
              ? "bg-cyan-500/15 text-cyan-300"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Détail par catégorie
        </button>
      </div>

      {view === "summary" && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {scores.map((s) => (
              <ScoreRing key={s.critere} value={s.score} label={CRITERE_LABELS[s.critere]} />
            ))}
            {holdDurationSeconds !== undefined && holdDurationSeconds !== null && (
              <ScoreRing
                value={Number(holdDurationSeconds.toFixed(1))}
                label="Hold"
                suffix="s"
              />
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
      )}

      {view === "details" && (
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
              <div
                key={s.critere}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {CRITERE_DETAIL_TITLES[s.critere]}
                    </h4>
                    <span
                      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[tier]}`}
                    >
                      {TIER_LABELS[tier]}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold ${scoreTextColor(s.score)}`}>
                    {s.score.toFixed(1)}
                    <span className="text-xs font-normal text-slate-600">/10</span>
                  </span>
                </div>

                <ScoreBar value={s.score} color={TIER_HEX[tier]} />

                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {describeCriterion(s.critere, s.score, figure)}
                </p>
                <p className="mt-1 text-[11px] italic text-slate-500">
                  {CRITERE_DEFINITIONS[s.critere]}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CRITERE_TAGS[s.critere].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="mt-3 font-mono text-[10px] text-slate-600">
                  mesuré {s.valeurMesuree.toFixed(decimals)}
                  {unit} · cible {s.valeurCible.toFixed(decimals)}
                  {unit}
                </p>
              </div>
            );
          })}

          {holdDurationSeconds !== undefined && holdDurationSeconds !== null && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="text-base font-bold text-white">Durée du hold</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Temps réellement maintenu en position stable :{" "}
                <span className="font-semibold text-white">
                  {formatHoldDuration(holdDurationSeconds)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
