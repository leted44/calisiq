import { createClient } from "@/lib/supabase/server";
import { progressionLabel } from "@/lib/pose/report";
import { getLang, getDictionary } from "@/lib/i18n/server";
import ProgressionDashboard, {
  type VariationProgression,
} from "../_components/ProgressionDashboard";
import LevelPanel, { type FigureLevel } from "../_components/LevelPanel";
import { levelPoints, tierForPoints } from "@/lib/pose/level";

export default async function ProgressionPage() {
  const t = await getDictionary();
  const lang = await getLang();
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
        label: progressionLabel(key, lang),
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

  // Niveau par figure : le MEILLEUR résultat de chacune, jamais le dernier.
  // Une mauvaise séance récente ne doit pas effacer ce qui a été prouvé, et
  // un niveau qui recule après un mauvais jour découragerait exactement les
  // gens qu'on veut garder.
  const figureLevels: FigureLevel[] = variations
    .map((v) => {
      const meilleur = v.points.reduce(
        (max, p) =>
          Math.max(max, levelPoints(v.variation, p.score, p.holdDuration)),
        0
      );
      return {
        variation: v.variation,
        label: v.label,
        points: meilleur,
        tier: tierForPoints(meilleur),
      };
    })
    // Les variations sans difficulté déclarée ne rapportent rien : les
    // afficher à zéro polluerait la liste sans rien apprendre.
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points);

  const totalPoints = figureLevels.reduce((somme, f) => somme + f.points, 0);

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">{t.progressPage.title}</h1>
        <p className="text-sm text-slate-400">
          {t.dashboard.progressSubtitle}
        </p>
      </div>

      <div className="w-full max-w-md">
        <LevelPanel figures={figureLevels} total={totalPoints} />
      </div>

      <div className="w-full max-w-md">
        <ProgressionDashboard variations={variations} />
      </div>
    </div>
  );
}
