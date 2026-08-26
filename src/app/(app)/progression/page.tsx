import { createClient } from "@/lib/supabase/server";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import ProgressionDashboard, {
  type VariationProgression,
} from "../_components/ProgressionDashboard";

export default async function ProgressionPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, progression, created_at, performed_at, hold_duration_seconds, scores(score)")
    .eq("status", "done")
    .order("created_at", { ascending: true });

  const byVariation = new Map<string, VariationProgression>();

  for (const session of sessions ?? []) {
    const scoreValues = (session.scores ?? []).map((s: { score: number }) => s.score);
    if (scoreValues.length === 0) continue;
    const score = scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length;

    const key = session.progression as string;
    if (!byVariation.has(key)) {
      byVariation.set(key, {
        variation: key,
        label: PROGRESSION_LABELS[key] ?? key,
        points: [],
      });
    }
    byVariation.get(key)!.points.push({
      sessionId: session.id as string,
      // performed_at (date choisie à l'import) prime sur created_at (date
      // d'analyse) pour refléter quand la figure a réellement été faite,
      // pas quand la vidéo a été traitée par l'app.
      date: (session.performed_at as string | null) ?? (session.created_at as string),
      score,
      holdDuration: (session.hold_duration_seconds as number | null) ?? null,
    });
  }

  // Re-trie chaque série par date effective : performed_at peut réordonner
  // une séance importée en retard par rapport à created_at.
  for (const variation of byVariation.values()) {
    variation.points.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Figure la plus pratiquée en premier — la plus pertinente à afficher par défaut.
  const variations = Array.from(byVariation.values()).sort(
    (a, b) => b.points.length - a.points.length
  );

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Progression</h1>
        <p className="text-sm text-slate-400">
          Score, durée de hold et records — figure par figure, sur la période
          de ton choix.
        </p>
      </div>

      <div className="w-full max-w-md">
        <ProgressionDashboard variations={variations} />
      </div>
    </div>
  );
}
