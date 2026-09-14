import { createClient } from "@/lib/supabase/server";
import { progressionLabel } from "@/lib/pose/report";
import { ladderFamily } from "@/lib/pose/ladder";
import { getLang, getDictionary } from "@/lib/i18n/server";
import HistoryList, {
  type HistoryRow,
  type FigureFilter,
} from "./_HistoryList";

export default async function HistoriquePage() {
  const t = await getDictionary();
  const lang = await getLang();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, progression, status, created_at, performed_at, hold_duration_seconds, rep_count, is_reference, scores(score)"
    )
    .order("created_at", { ascending: false });

  const rows: HistoryRow[] = (sessions ?? [])
    .map((session) => {
      const scoreValues = (session.scores ?? []).map((s: { score: number }) => s.score);
      const score =
        scoreValues.length > 0
          ? scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length
          : null;
      const progression = session.progression as string;
      return {
        id: session.id as string,
        progression,
        label: progressionLabel(progression, lang),
        family: ladderFamily(progression),
        status: session.status as string,
        // performed_at (date choisie à l'import) prime sur created_at (date
        // d'analyse) : l'historique raconte quand la figure a été faite, pas
        // quand la vidéo a été traitée.
        date: (session.performed_at as string | null) ?? (session.created_at as string),
        score,
        holdSeconds: (session.hold_duration_seconds as number | null) ?? null,
        reps: (session.rep_count as number | null) ?? null,
        isReference: Boolean(session.is_reference),
        isBest: false,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Meilleur essai de chaque variation, marqué d'une couronne.
  //
  // Par VARIATION et non par figure : le meilleur tuck planche et la meilleure
  // full planche sont deux exploits distincts, et n'en couronner qu'un
  // reviendrait à effacer le premier le jour où le second arrive.
  const meilleurs = new Map<string, { id: string; score: number }>();
  const compteParVariation = new Map<string, number>();
  for (const ligne of rows) {
    compteParVariation.set(
      ligne.progression,
      (compteParVariation.get(ligne.progression) ?? 0) + 1
    );
    if (ligne.score === null) continue;
    const connu = meilleurs.get(ligne.progression);
    if (!connu || ligne.score > connu.score) {
      meilleurs.set(ligne.progression, { id: ligne.id, score: ligne.score });
    }
  }
  for (const ligne of rows) {
    // Une seule analyse sur une variation n'est pas un record, c'est la seule
    // qui existe : la couronner ne dirait rien.
    ligne.isBest =
      meilleurs.get(ligne.progression)?.id === ligne.id &&
      (compteParVariation.get(ligne.progression) ?? 0) > 1;
  }

  // Figures présentes dans l'historique, la plus travaillée en tête : le
  // filtre ne propose que ce qui existe, jamais une case qui ne donnerait rien.
  const parFamille = new Map<string, number>();
  for (const ligne of rows) {
    parFamille.set(ligne.family, (parFamille.get(ligne.family) ?? 0) + 1);
  }
  const libelles = t.figures as Record<string, { label: string } | undefined>;
  const figures: FigureFilter[] = [...parFamille.entries()]
    .map(([family, count]) => ({
      family,
      label: libelles[family]?.label ?? family,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">{t.history.title}</h1>
        <p className="text-sm text-slate-400">
          {rows.length > 0 ? t.history.analyses(rows.length) : t.history.subtitle}
        </p>
      </div>

      <div className="w-full max-w-md">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            {t.history.empty}
          </p>
        ) : (
          <HistoryList rows={rows} figures={figures} />
        )}
      </div>
    </div>
  );
}
