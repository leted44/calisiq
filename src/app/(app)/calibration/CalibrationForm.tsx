"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  runPoseAnalysis,
  measureImage,
  type PoseAnalysisResult,
} from "@/lib/pose/runAnalysis";
import { scoreAngles, globalScore } from "@/lib/pose/scoring";
import { SCORING_GRID, type Progression } from "@/lib/pose/grid";

const VARIATIONS = [
  { value: "tuck_planche", label: "Tuck Planche", figure: "planche" },
  { value: "advanced_tuck_planche", label: "Advanced Tuck Planche", figure: "planche" },
  { value: "straddle_planche", label: "Straddle Planche", figure: "planche" },
  { value: "full_planche", label: "Full Planche", figure: "planche" },
  { value: "handstand", label: "Handstand (statique)", figure: "handstand" },
  { value: "handstand_push_up", label: "Handstand Push-up", figure: "handstand" },
  { value: "one_arm_handstand", label: "One Arm Handstand", figure: "handstand" },
  { value: "tuck_front_lever", label: "Tuck Front Lever", figure: "front_lever" },
  { value: "advanced_tuck_front_lever", label: "Advanced Tuck Front Lever", figure: "front_lever" },
  { value: "one_leg_front_lever", label: "Single Leg Front Lever", figure: "front_lever" },
  { value: "straddle_front_lever", label: "Straddle Front Lever", figure: "front_lever" },
  { value: "full_front_lever", label: "Full Front Lever", figure: "front_lever" },
] as const;

// Plus bas que le formulaire principal (2s) : ici on ne mesure qu'une
// position à un instant donné, pas un hold tenu — même le mode photo
// (0 seconde) fonctionne, ce minimum n'est qu'une garde-fou technique.
const MIN_TRIM_SECONDS = 0.5;

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Impossible de lire ce fichier vidéo."));
    };
    video.src = URL.createObjectURL(file);
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

// Même code couleur que le reste de l'app (ResultCard, export vidéo) : les
// seuils de "bon"/"faible" doivent se lire pareil partout, pas différer
// d'un écran à l'autre.
function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-cyan-400";
  return "text-orange-400";
}

// Une ligne du tableau des angles : valeur mesurée, et cible de la
// variation sélectionnée quand elle existe. Sans la cible, un angle brut
// ne dit rien — 84° de hanche est excellent en tuck et catastrophique en
// full, et c'est précisément ce qu'on cherche à juger en calibration.
function AngleRow({
  label,
  value,
  target,
  tolerance,
  unit = "°",
  decimals = 1,
}: {
  label: string;
  value: number;
  target?: number;
  tolerance?: number;
  unit?: string;
  decimals?: number;
}) {
  // Écart rapporté à la tolérance du critère plutôt qu'en valeur absolue :
  // 5° d'écart sur un critère toléré à 20° n'a rien à voir avec 5° sur un
  // critère toléré à 6°.
  const ratio =
    target !== undefined && tolerance
      ? Math.abs(value - target) / tolerance
      : null;
  const color =
    ratio === null
      ? "text-white"
      : ratio <= 0.5
      ? "text-green-400"
      : ratio <= 1
      ? "text-cyan-400"
      : "text-orange-400";

  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="whitespace-nowrap font-mono">
        <span className={color}>
          {value.toFixed(decimals)}
          {unit}
        </span>
        {target !== undefined && (
          <span className="text-slate-600">
            {" / "}
            {target.toFixed(decimals)}
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}

export default function CalibrationForm() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [variation, setVariation] = useState<(typeof VARIATIONS)[number]["value"]>(
    VARIATIONS[0].value
  );
  const figure = VARIATIONS.find((v) => v.value === variation)?.figure ?? "planche";

  const [mediaKind, setMediaKind] = useState<"video" | "image" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<PoseAnalysisResult | null>(null);
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);
    setResult(null);
    setSaved(false);

    if (mediaUrl) URL.revokeObjectURL(mediaUrl);

    if (selected.type.startsWith("image/")) {
      setFile(selected);
      setMediaUrl(URL.createObjectURL(selected));
      setMediaKind("image");
      setDuration(null);
      return;
    }

    let videoDuration: number;
    try {
      videoDuration = await getVideoDuration(selected);
    } catch {
      setError("Impossible de lire ce fichier. Essaie une autre vidéo ou photo.");
      return;
    }

    setFile(selected);
    setMediaUrl(URL.createObjectURL(selected));
    setMediaKind("video");
    setDuration(videoDuration);
    setTrimStart(0);
    setTrimEnd(videoDuration);
  }

  function handleReset() {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setFile(null);
    setMediaUrl(null);
    setMediaKind(null);
    setDuration(null);
    setTrimStart(0);
    setTrimEnd(0);
    setResult(null);
    setRating("");
    setNotes("");
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Garde le même média et la même découpe, ne fait que rejouer la mesure —
  // utile pour vérifier qu'il n'y a pas eu d'erreur ponctuelle avant de noter.
  function handleRemeasure() {
    setResult(null);
    setRating("");
    setNotes("");
    setSaved(false);
    setError(null);
  }

  function seekPreview(time: number) {
    const video = previewVideoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = time;
  }

  function handleTrimStartChange(value: number) {
    const next = Math.min(value, trimEnd - MIN_TRIM_SECONDS);
    setTrimStart(next);
    seekPreview(next);
  }

  function handleTrimEndChange(value: number) {
    const next = Math.max(value, trimStart + MIN_TRIM_SECONDS);
    setTrimEnd(next);
    seekPreview(next);
  }

  async function handleMeasure() {
    setError(null);

    if (mediaKind === "image") {
      if (!previewImageRef.current) return;
      setAnalyzing(true);
      setResult(null);
      try {
        const analysisResult = await measureImage(previewImageRef.current);
        setAnalyzing(false);
        setResult(analysisResult);
      } catch (err) {
        setAnalyzing(false);
        setError("La mesure a échoué : " + (err as Error).message);
      }
      return;
    }

    if (!file || !duration || !previewVideoRef.current || !canvasRef.current) return;

    if (trimEnd - trimStart < MIN_TRIM_SECONDS) {
      setError(
        `Le segment sélectionné est trop court : il faut au moins ${MIN_TRIM_SECONDS}s pour capturer un hold stable.`
      );
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setProgressPercent(0);

    try {
      const analysisResult = await runPoseAnalysis({
        video: previewVideoRef.current,
        canvas: canvasRef.current,
        progression: null,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setProgressPercent,
      });
      setAnalyzing(false);
      setResult(analysisResult);
    } catch (err) {
      setAnalyzing(false);
      setError("La mesure a échoué : " + (err as Error).message);
    }
  }

  async function handleSaveSample() {
    if (!result || !result.ok) return;
    const ratingValue = Number(rating);
    if (!rating || Number.isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      setError("Indique une note entre 0 et 10.");
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée, reconnecte-toi.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("calibration_samples").insert({
      user_id: user.id,
      figure,
      variation,
      elbow_angle: result.summaryAngles.elbowAngle,
      hip_angle: result.summaryAngles.hipAngle,
      knee_angle: result.summaryAngles.kneeAngle,
      shoulder_flexion_angle: result.summaryAngles.shoulderFlexionAngle,
      body_line_angle_from_horizontal: result.summaryAngles.bodyLineAngleFromHorizontal,
      shoulder_protraction: result.summaryAngles.shoulderProtraction,
      pelvis_deviation: result.summaryAngles.pelvisDeviation,
      pelvis_sag_sign: result.summaryAngles.pelvisSagSign,
      torso_angle_from_horizontal: result.summaryAngles.torsoAngleFromHorizontal,
      straightest_knee_angle: result.summaryAngles.straightestKneeAngle,
      straightest_leg_hip_angle: result.summaryAngles.straightestLegHipAngle,
      user_rating: ratingValue,
      notes: notes || null,
      media_type: mediaKind ?? "video",
    });

    setSaving(false);

    if (insertError) {
      setError("Enregistrement impossible : " + insertError.message);
      return;
    }

    setSaved(true);
  }

  // Rouvre la notation sur la MÊME mesure, pour l'enregistrer sous une
  // autre variation. On ne remet à zéro que la note et le commentaire :
  // le média, l'analyse et les angles restent en place, il n'y a donc ni
  // réimport ni réanalyse.
  function handleRateAnotherVariation() {
    setRating("");
    setNotes("");
    setSaved(false);
    setError(null);
  }

  const currentVariationLabel =
    VARIATIONS.find((v) => v.value === variation)?.label ?? variation;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Variation
        </label>
        <select
          value={variation}
          onChange={(e) => {
            setVariation(e.target.value as (typeof VARIATIONS)[number]["value"]);
            // Changer de variation après un enregistrement rouvre
            // directement la notation sur la même mesure : c'est
            // exactement le geste "je note ce hold sous une autre
            // catégorie", inutile d'exiger un clic de plus.
            if (saved) handleRateAnotherVariation();
          }}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-500"
        >
          {VARIATIONS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {!mediaUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
        >
          Importer une vidéo ou une photo
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {mediaUrl && mediaKind === "image" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Photo
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Changer
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={previewImageRef}
            src={mediaUrl}
            alt="Aperçu"
            className="w-full rounded-xl border border-slate-800"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!result && (
            <button
              type="button"
              onClick={handleMeasure}
              disabled={analyzing}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
            >
              {analyzing ? "Mesure..." : "Mesurer"}
            </button>
          )}
        </div>
      )}

      {mediaUrl && mediaKind === "video" && duration !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Découpe
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Changer
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800">
            <video ref={previewVideoRef} src={mediaUrl} controls playsInline className="w-full" />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
            />
          </div>

          {!result && (
            <div>
              <p className="mb-2 text-xs text-slate-500">
                Sélectionne uniquement le passage à mesurer
              </p>
              <div className="relative h-6">
                <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-700" />
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  style={{
                    left: `${(trimStart / duration) * 100}%`,
                    right: `${100 - (trimEnd / duration) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => handleTrimStartChange(Number(e.target.value))}
                  className="dual-range"
                />
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => handleTrimEndChange(Number(e.target.value))}
                  className="dual-range"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Début : {formatTime(trimStart)}</span>
                <span>Fin : {formatTime(trimEnd)}</span>
                <span>Durée : {formatTime(trimEnd - trimStart)}</span>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!result && !analyzing && (
            <button
              type="button"
              onClick={handleMeasure}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            >
              Mesurer
            </button>
          )}
        </div>
      )}

      {mediaUrl && result && result.ok && (
        <div className="space-y-4">
          {result.warning && (
            <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
              {result.warning}
            </p>
          )}

          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Angles mesurés
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-600">
                mesuré / cible
              </p>
            </div>
            {(() => {
              const grid = SCORING_GRID[variation as Progression];
              const a = result.summaryAngles;

              // Séparer les critères notés de ceux qui ne le sont pas pour
              // cette variation. Tout mélanger laissait croire à un bug
              // (« pourquoi le genou n'a pas de cible ? ») alors que ces
              // exclusions sont délibérées et documentées dans grid.ts :
              // en tuck les genoux sont pliés par construction, la ligne
              // épaule-cheville n'a pas de sens jambes repliées, etc.
              const rows = [
                {
                  label: "Coude",
                  value: a.elbowAngle,
                  t: grid?.elbow_angle,
                },
                {
                  label: "Hanche",
                  value: a.hipAngle,
                  t: grid?.hip_angle,
                },
                {
                  label: "Genou",
                  value: a.kneeAngle,
                  t: grid?.knee_angle,
                },
                {
                  label: "Ligne de corps (vs horizontale)",
                  value: a.bodyLineAngleFromHorizontal,
                  t: grid?.body_line_angle_from_horizontal,
                },
                {
                  label: "Ouverture épaule (hanche-épaule-poignet)",
                  value: a.shoulderFlexionAngle,
                  t: grid?.shoulder_flexion,
                },
                {
                  label: "Protraction épaules",
                  value: a.shoulderProtraction,
                  t: grid?.shoulder_protraction,
                  unit: "",
                  decimals: 3,
                },
                {
                  label: "Déviation bassin",
                  value: a.pelvisDeviation,
                  t: grid?.pelvis_deviation,
                  unit: "",
                  decimals: 3,
                },
                {
                  label: "Signe sag/pike bassin",
                  value: a.pelvisSagSign,
                  t: undefined,
                  unit: "",
                  decimals: 3,
                },
              ];

              const scored = rows.filter((r) => r.t);
              const unscored = rows.filter((r) => !r.t);

              return (
                <div className="space-y-3">
                  {scored.length > 0 && (
                    <dl className="space-y-1.5 text-sm">
                      {scored.map((r) => (
                        <AngleRow
                          key={r.label}
                          label={r.label}
                          value={r.value}
                          target={r.t!.target}
                          tolerance={r.t!.tolerance}
                          unit={r.unit}
                          decimals={r.decimals}
                        />
                      ))}
                    </dl>
                  )}

                  {unscored.length > 0 && (
                    <div className="space-y-1.5 border-t border-slate-800 pt-3">
                      <p className="text-[10px] uppercase tracking-wide text-slate-600">
                        Mesuré mais non noté pour cette variation
                      </p>
                      <dl className="space-y-1.5 text-sm opacity-60">
                        {unscored.map((r) => (
                          <AngleRow
                            key={r.label}
                            label={r.label}
                            value={r.value}
                            unit={r.unit}
                            decimals={r.decimals}
                          />
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              );
            })()}
            <p className="pt-1 text-[11px] leading-relaxed text-slate-600">
              Les critères non notés sont exclus volontairement pour cette
              variation (genoux pliés en tuck, ligne de corps sans objet jambes
              repliées…). Leurs mesures sont quand même enregistrées, pour
              pouvoir les exploiter si un critère est ajouté plus tard. La
              couleur indique l&apos;écart rapporté à la tolérance du critère,
              pas en degrés bruts.
            </p>
          </div>

          {result.representativeFrameDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.representativeFrameDataUrl}
              alt="Frame représentative"
              className="w-full rounded-xl border border-slate-800"
            />
          )}

          {!saved ? (
            <div className="space-y-3">
              {(() => {
                // Note que la grille ACTUELLE donnerait à cette mesure
                // précise, affichée avant même que tu notes toi-même : la
                // comparaison se fait dans le même geste, sans attendre le
                // bloc récapitulatif de la page. Absent pour les variations
                // sans grille (handstand_push_up, one_arm_handstand — pas
                // encore implémentées).
                const grid = SCORING_GRID[variation as Progression];
                if (!grid) return null;
                const scores = scoreAngles(
                  result.summaryAngles,
                  variation as Progression
                );
                const score = globalScore(scores);
                return (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Note de la grille actuelle
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        À comparer à la tienne, pas à recopier
                      </p>
                    </div>
                    <p className={`text-2xl font-bold ${scoreColor(score)}`}>
                      {score.toFixed(1)}
                      <span className="text-sm font-normal text-slate-600">/10</span>
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ta note (0-10)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={0.5}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="Ex. 8"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Notes (facultatif)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex. léger arch dans le dos, coudes tendus"
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSample}
                disabled={saving}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer l'échantillon"}
              </button>
              <button
                type="button"
                onClick={handleRemeasure}
                className="w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-600"
              >
                Remesurer (même média)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                Échantillon enregistré pour {currentVariationLabel}.
              </p>

              {/* Une même exécution peut légitimement être notée sous
                  plusieurs variations : un hold jugé 8/10 en tuck vaut
                  bien moins en full, puisque les cibles diffèrent. La
                  mesure étant indépendante de la variation (analyse lancée
                  avec progression: null), on peut renoter sans réimporter
                  ni réanalyser. */}
              <div className="space-y-2 rounded-xl border border-cyan-900/50 bg-cyan-500/5 p-3">
                <p className="text-sm font-medium text-cyan-300">
                  Noter la même mesure sous une autre variation
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Les angles ne changent pas, seules les cibles et ta note
                  changent. Choisis la variation ci-dessus, puis reprends la
                  notation.
                </p>
                <button
                  type="button"
                  onClick={handleRateAnotherVariation}
                  className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white"
                >
                  Renoter cette mesure
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
              >
                Mesurer un autre essai
              </button>
            </div>
          )}
        </div>
      )}

      {mediaUrl && result && !result.ok && (
        <div className="space-y-3">
          <p className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-400">
            {result.warning}
          </p>
          <button
            type="button"
            onClick={handleRemeasure}
            className="w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-600"
          >
            Remesurer (même média)
          </button>
        </div>
      )}
    </div>
  );
}
