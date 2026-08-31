import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROGRESSION_LABELS, CALIBRATED_CRITERIA } from "@/lib/pose/report";
import CalibrationForm from "./CalibrationForm";
import CalibrationAccuracy, {
  type CalibrationSampleRow,
} from "../_components/CalibrationAccuracy";

const CRITERE_LABELS: Record<string, string> = {
  shoulder_protraction: "protraction",
  shoulder_flexion: "ouverture épaule",
  pelvis_deviation: "bassin",
  hip_angle: "hanche",
  knee_angle: "genou",
  elbow_angle: "coude",
  body_line_angle: "axe du corps",
};

const ALL_VARIATIONS = [
  "tuck_planche",
  "advanced_tuck_planche",
  "straddle_planche",
  "full_planche",
  "handstand",
  "handstand_push_up",
  "one_arm_handstand",
  "tuck_front_lever",
  "advanced_tuck_front_lever",
  "one_leg_front_lever",
  "straddle_front_lever",
  "full_front_lever",
];

const EXTRA_LABELS: Record<string, string> = {
  handstand_push_up: "Handstand Push-up",
  one_arm_handstand: "One Arm Handstand",
};

export default async function CalibrationPage() {
  const supabase = await createClient();

  // Outil interne : réservé au compte administrateur. Le drapeau vit sur
  // profiles plutôt qu'une adresse codée en dur, donc il se donne ou se
  // retire depuis Supabase sans redéploiement (voir migration
  // 20260830180000).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    : { data: null };

  if (!profile?.is_admin) notFound();

  const { data: samples } = await supabase
    .from("calibration_samples")
    .select(
      "variation, user_rating, media_type, elbow_angle, hip_angle, knee_angle, shoulder_flexion_angle, body_line_angle_from_horizontal, shoulder_protraction, pelvis_deviation, pelvis_sag_sign, torso_angle_from_horizontal, straightest_knee_angle, straightest_leg_hip_angle"
    )
    .order("created_at");

  type Sample = { rating: number; mediaType: string };
  const byVariation = new Map<string, Sample[]>();
  for (const v of ALL_VARIATIONS) byVariation.set(v, []);
  for (const s of samples ?? []) {
    const list = byVariation.get(s.variation) ?? [];
    list.push({ rating: s.user_rating, mediaType: s.media_type ?? "video" });
    byVariation.set(s.variation, list);
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Calibration</h1>
        <p className="text-sm text-slate-400">
          Outil interne : mesure les angles réels d&apos;une figure et
          enregistre un échantillon avec ta propre note.
        </p>
      </div>

      <div className="w-full max-w-md">
        <CalibrationAccuracy samples={(samples ?? []) as CalibrationSampleRow[]} />
      </div>

      <div className="w-full max-w-md space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Échantillons collectés
        </p>
        <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
          {ALL_VARIATIONS.map((v) => {
            const items = byVariation.get(v) ?? [];
            const videoCount = items.filter((s) => s.mediaType === "video").length;
            const photoCount = items.filter((s) => s.mediaType === "photo").length;
            const label = PROGRESSION_LABELS[v] ?? EXTRA_LABELS[v] ?? v;
            const calibrated = CALIBRATED_CRITERIA[v] ?? [];
            const importedColor =
              items.length === 0
                ? "bg-slate-800 text-slate-500"
                : items.length < 5
                ? "bg-orange-500/15 text-orange-400"
                : "bg-green-500/15 text-green-400";

            return (
              <div key={v} className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${importedColor}`}
                  >
                    {items.length} importé{items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {items.length === 0
                    ? "Pas commencé"
                    : `${videoCount} vidéo${videoCount > 1 ? "s" : ""} · ${photoCount} photo${photoCount > 1 ? "s" : ""}`}
                </p>
                {items.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Notes : {items.map((s) => s.rating).join(", ")}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      calibrated.length > 0
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {calibrated.length > 0
                      ? `${calibrated.length} critère${calibrated.length > 1 ? "s" : ""} calibré${calibrated.length > 1 ? "s" : ""}`
                      : "Aucun critère calibré"}
                  </span>
                  {calibrated.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      ({calibrated.map((c) => CRITERE_LABELS[c] ?? c).join(", ")})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-600">
          <span className="text-slate-400">Importé</span> = échantillons
          soumis dans l&apos;outil. <span className="text-cyan-400">Calibré</span>{" "}
          = seuils du critère effectivement mis à jour dans le code à partir
          de données réelles — les deux ne sont pas automatiquement liés,
          la recalibration reste une étape que je fais manuellement.
        </p>
      </div>

      <div className="w-full max-w-md">
        <CalibrationForm />
      </div>

    </div>
  );
}
