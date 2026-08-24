import { createClient } from "@/lib/supabase/server";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import CalibrationForm from "./CalibrationForm";

const ALL_VARIATIONS = [
  "tuck_planche",
  "advanced_tuck_planche",
  "straddle_planche",
  "full_planche",
  "handstand",
  "handstand_push_up",
  "one_arm_handstand",
];

const EXTRA_LABELS: Record<string, string> = {
  handstand_push_up: "Handstand Push-up",
  one_arm_handstand: "One Arm Handstand",
};

export default async function CalibrationPage() {
  const supabase = await createClient();

  const { data: samples } = await supabase
    .from("calibration_samples")
    .select("variation, user_rating")
    .order("created_at");

  const byVariation = new Map<string, number[]>();
  for (const v of ALL_VARIATIONS) byVariation.set(v, []);
  for (const s of samples ?? []) {
    const list = byVariation.get(s.variation) ?? [];
    list.push(s.user_rating);
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

      <div className="w-full max-w-md space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Échantillons collectés
        </p>
        <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
          {ALL_VARIATIONS.map((v) => {
            const ratings = byVariation.get(v) ?? [];
            const label = PROGRESSION_LABELS[v] ?? EXTRA_LABELS[v] ?? v;
            const statusColor =
              ratings.length === 0
                ? "bg-slate-800 text-slate-500"
                : ratings.length < 5
                ? "bg-orange-500/15 text-orange-400"
                : "bg-green-500/15 text-green-400";

            return (
              <div key={v} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-slate-500">
                    {ratings.length === 0
                      ? "Pas commencé"
                      : `Notes : ${ratings.join(", ")}`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}
                >
                  {ratings.length} échantillon{ratings.length > 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-600">
          Moins de 5 échantillons : encore en cours. 5 et plus : probablement
          assez pour recalibrer les seuils sur données réelles.
        </p>
      </div>

      <div className="w-full max-w-md">
        <CalibrationForm />
      </div>
    </div>
  );
}
