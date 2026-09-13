import { createClient } from "@/lib/supabase/server";
import { progressionLabel } from "@/lib/pose/report";
import { levelPoints } from "@/lib/pose/level";
import type { Lang } from "@/lib/i18n/config";
import type { VariationProgression } from "../_components/ProgressionDashboard";

/**
 * Les séances terminées, regroupées par variation, et le meilleur niveau
 * atteint sur chacune.
 *
 * Le même chargement sert à la collection de figures et au détail de l'une
 * d'elles : la seconde page n'est qu'une vue filtrée de la première, et deux
 * requêtes divergentes finiraient par afficher deux vérités.
 */
export type ProgressionData = {
  variations: VariationProgression[];
  /** Meilleur total de points par variation. Absent = jamais réussie. */
  bestPoints: Record<string, number>;
};

export async function loadProgression(lang: Lang): Promise<ProgressionData> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, progression, created_at, performed_at, hold_duration_seconds, scores(score)"
    )
    .eq("status", "done")
    .order("created_at", { ascending: true });

  const byVariation = new Map<string, VariationProgression>();

  for (const session of sessions ?? []) {
    const scoreValues = (session.scores ?? []).map((s: { score: number }) => s.score);
    if (scoreValues.length === 0) continue;
    const score =
      scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length;

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

  // Niveau par figure : le MEILLEUR résultat de chacune, jamais le dernier.
  // Une mauvaise séance récente ne doit pas effacer ce qui a été prouvé, et
  // un niveau qui recule après un mauvais jour découragerait exactement les
  // gens qu'on veut garder.
  const bestPoints: Record<string, number> = {};
  for (const v of byVariation.values()) {
    const meilleur = v.points.reduce(
      (max, p) => Math.max(max, levelPoints(v.variation, p.score, p.holdDuration)),
      0
    );
    if (meilleur > 0) bestPoints[v.variation] = meilleur;
  }

  // Figure la plus pratiquée en premier — la plus pertinente par défaut.
  const variations = Array.from(byVariation.values()).sort(
    (a, b) => b.points.length - a.points.length
  );

  return { variations, bestPoints };
}
