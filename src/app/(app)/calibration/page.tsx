import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PROGRESSION_LABELS,
  CALIBRATED_CRITERIA,
  figureFamily,
  FIGURE_FAMILY_ORDER,
  FIGURE_FAMILY_LABELS,
} from "@/lib/pose/report";
import { SCORING_GRID, REP_SCORING_GRID } from "@/lib/pose/grid";
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
  pelvis_sag: "gainage",
  rep_form: "tenue du corps",
  rep_lockout: "extension",
  rep_peak: "amplitude",
  rep_control: "contrôle",
  rep_tempo: "tempo",
};

// Dérivé des grilles plutôt qu'écrit à la main.
//
// La liste codée en dur s'était arrêtée à douze variations quand
// l'application en compte vingt-huit : dragon flag, drapeau et tous les
// exercices à répétition manquaient à l'appel, si bien que la page censée
// suivre l'avancement de la calibration en cachait plus de la moitié, sans
// rien signaler. L'ordre de déclaration des grilles regroupe déjà les
// variations par famille, c'est exactement l'ordre voulu ici.
const ALL_VARIATIONS = [
  ...Object.keys(SCORING_GRID),
  ...Object.keys(REP_SCORING_GRID),
  // Sans grille d'aucune sorte, donc absente des deux tables : ses
  // échantillons servent justement à construire le barème qui lui manque.
  "one_arm_handstand",
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
      "id, variation, user_rating, media_type, elbow_angle, hip_angle, knee_angle, shoulder_flexion_angle, body_line_angle_from_horizontal, shoulder_protraction, pelvis_deviation, pelvis_sag_sign, torso_angle_from_horizontal, straightest_knee_angle, straightest_leg_hip_angle, bent_knee_angle, rep_count, rep_lockout, rep_peak, rep_hip_swing, rep_form, rep_tempo, rating_form, rating_depth"
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
        {FIGURE_FAMILY_ORDER.map((famille) => {
          const variations = ALL_VARIATIONS.filter(
            (v) => figureFamily(v) === famille
          );
          if (variations.length === 0) return null;
          const total = variations.reduce(
            (n, v) => n + (byVariation.get(v)?.length ?? 0),
            0
          );
          return (
            <div key={famille} className="space-y-2 pt-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-800 pb-1.5">
                <p className="text-sm font-semibold text-white">
                  {FIGURE_FAMILY_LABELS[famille]}
                </p>
                <span className="text-[11px] text-slate-500">
                  {total} échantillon{total > 1 ? "s" : ""}
                </span>
              </div>
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
              {variations.map((v) => {
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
                    {/* Seules les variations calibrées portent une pastille.
                        L'étiquette « Aucun critère calibré » a été retirée :
                        sur une page qui liste vingt-huit variations dont la
                        plupart attendent encore des échantillons, elle
                        répétait vingt fois la même absence sans rien
                        apprendre. Le compteur d'échantillons juste au-dessus
                        dit déjà où en est chacune. */}
                    {calibrated.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-400">
                          {calibrated.length} critère
                          {calibrated.length > 1 ? "s" : ""} calibré
                          {calibrated.length > 1 ? "s" : ""}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({calibrated.map((c) => CRITERE_LABELS[c] ?? c).join(", ")})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          );
        })}
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
