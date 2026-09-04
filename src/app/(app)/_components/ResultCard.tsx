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

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  rep_lockout: "Extension",
  rep_peak: "Amplitude",
  rep_control: "Contrôle",
  rep_form: "Forme",
  rep_tempo: "Tempo",
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
// courts ci-dessus restent utilisés dans les barres du résumé.
const CRITERE_DETAIL_TITLES: Record<CriterionScore["critere"], string> = {
  rep_lockout: "Extension complète",
  rep_peak: "Amplitude du mouvement",
  rep_control: "Contrôle du corps",
  rep_form: "Tenue du corps",
  rep_tempo: "Régularité du tempo",
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
  rep_lockout: ["Lockout", "Bas de rep"],
  rep_peak: ["Amplitude", "Haut de rep"],
  rep_control: ["Strict", "Kipping"],
  rep_form: ["Posture", "Gainage"],
  rep_tempo: ["Tempo", "Endurance"],
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
  repCount,
  figure = "planche",
}: {
  globalScoreValue: number;
  representativeFrame: string | null;
  scores: CriterionScore[];
  recommendations: Recommendation[] | null;
  holdDurationSeconds?: number | null;
  // Exclusif de holdDurationSeconds : une série n'a pas de durée de hold, un
  // hold n'a pas de répétitions. L'un des deux est toujours null.
  repCount?: number | null;
  figure?: "planche" | "handstand" | "front_lever" | "dragon_flag" | "reps";
}) {
  const [view, setView] = useState<"summary" | "details">("summary");
  const globalTier = tierFor(globalScoreValue);
  // Critères classés du plus faible au plus fort. Cinq anneaux de même taille
  // ne hiérarchisaient rien : l'œil ne savait pas où se poser et le critère à
  // corriger se noyait au milieu des autres. Classés, le premier de la liste
  // est celui sur lequel il faut travailler.
  const ranked = [...scores].sort((a, b) => a.score - b.score);
  const weakest = ranked[0];

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      {/* Bandeau de verdict.
          L'image de la figure passe en fond plein cadre et le score devient le
          plus gros élément de l'écran : c'est ce chiffre qu'on retient, qu'on
          capture et qu'on partage. L'ancienne disposition mettait une vignette
          de 96 px et un score de même taille que le reste du texte, ce qui ne
          donnait aucun point d'entrée au regard. */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800">
        {representativeFrame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={representativeFrame}
            alt=""
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="h-44 w-full bg-gradient-to-br from-slate-800 to-slate-900" />
        )}

        {/* Voile dégradé : sans lui le texte se perd sur une image claire. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/10"
        />
        {/* Halo teinté par le niveau : le verdict se lit avant même le chiffre. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-4 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: TIER_HEX[globalTier], opacity: 0.2 }}
        />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Score global
            </p>
            <p className="mt-0.5 flex items-baseline gap-1">
              <span
                className="text-5xl font-bold leading-none tabular-nums"
                style={{ color: TIER_HEX[globalTier] }}
              >
                {globalScoreValue.toFixed(1)}
              </span>
              <span className="text-lg font-medium text-slate-500">/10</span>
            </p>
            <span
              className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TIER_COLORS[globalTier]}`}
            >
              {GLOBAL_TIER_LABELS[globalTier]}
            </span>
          </div>

          {/* Mesure secondaire : répétitions ou durée de hold, jamais les deux.
              Encadrée à part pour ne pas entrer en concurrence avec le score. */}
          {(repCount !== undefined && repCount !== null) ||
          (holdDurationSeconds !== undefined && holdDurationSeconds !== null) ? (
            <div className="shrink-0 rounded-lg border border-white/10 bg-slate-950/70 px-3.5 py-2 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold leading-none tabular-nums text-white">
                {repCount !== undefined && repCount !== null
                  ? repCount
                  : holdDurationSeconds!.toFixed(1)}
                {repCount === undefined || repCount === null ? (
                  <span className="text-sm font-medium text-slate-400">s</span>
                ) : null}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {repCount !== undefined && repCount !== null ? "Répétitions" : "Hold"}
              </p>
            </div>
          ) : null}
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
          {/* Bandeau distinct, et surtout pas un anneau : ceux-ci affichent une
              note sur 10, et un « 8 » dans un anneau se lisait comme un score
              de 8/10 au lieu de huit répétitions. */}
          {repCount !== undefined && repCount !== null && (
            <div className="flex items-center justify-center gap-2.5 rounded-xl border border-cyan-900/50 bg-cyan-500/5 px-4 py-3">
              <span className="text-2xl font-bold tabular-nums text-cyan-300">
                {repCount}
              </span>
              <span className="text-sm text-slate-300">
                {repCount > 1 ? "répétitions complètes" : "répétition complète"}
              </span>
            </div>
          )}

          {/* Le point faible, nommé. C'est la valeur de l'app : pas « 7,4 sur
              10 » mais « ce sont tes hanches qui coûtent des points ». */}
          {weakest && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Point faible
                </p>
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: TIER_HEX[tierFor(weakest.score)] }}
                >
                  {weakest.score.toFixed(1)}
                  <span className="text-xs font-normal text-slate-600">/10</span>
                </p>
              </div>
              <p className="mt-0.5 text-[15px] font-semibold text-white">
                {CRITERE_DETAIL_TITLES[weakest.critere]}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {describeCriterion(weakest.critere, weakest.score, figure)}
              </p>
            </div>
          )}

          {/* Tous les critères, du plus faible au plus fort. Des barres et non
              des anneaux : à cinq critères, on compare des longueurs d'un seul
              regard là où cinq cercles demandent de lire cinq chiffres. C'est
              aussi la forme qu'utilise déjà la vidéo exportée, donc l'app et ce
              qu'on partage racontent la même chose. */}
          <div className="space-y-2.5">
            {ranked.map((s) => (
              <div key={s.critere} className="flex items-center gap-3">
                <span className="w-[92px] shrink-0 truncate text-xs text-slate-400">
                  {CRITERE_LABELS[s.critere]}
                </span>
                <div className="flex-1">
                  <ScoreBar value={s.score} color={TIER_HEX[tierFor(s.score)]} />
                </div>
                <span
                  className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums"
                  style={{ color: TIER_HEX[tierFor(s.score)] }}
                >
                  {s.score.toFixed(1)}
                </span>
              </div>
            ))}
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

          {repCount !== undefined && repCount !== null && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h4 className="text-base font-bold text-white">Répétitions</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Répétitions complètes détectées :{" "}
                <span className="font-semibold text-white">{repCount}</span>. Les
                répétitions partielles ne sont pas comptées.
              </p>
            </div>
          )}

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
