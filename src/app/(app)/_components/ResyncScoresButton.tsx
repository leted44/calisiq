"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rescoreFromStoredMeasures } from "@/lib/pose/rescore";
import type { CriterionScore } from "@/lib/pose/scoring";
import { SCORING_GRID, type Progression } from "@/lib/pose/grid";
import { ChangeVideoIcon } from "@/components/icons";

type Report = {
  sessionsUpdated: number;
  sessionsSkipped: number;
  criteriaRemoved: number;
  missingCriteria: string[];
};

export default function ResyncScoresButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResync() {
    if (
      !confirm(
        "Recalculer les scores de toutes tes analyses avec la grille actuelle ? Les valeurs mesurées ne changent pas, seules les notes sont réécrites."
      )
    ) {
      return;
    }

    setRunning(true);
    setError(null);
    setReport(null);

    const supabase = createClient();

    try {
      const { data: sessions, error: fetchError } = await supabase
        .from("sessions")
        .select("id, progression, scores(id, critere, valeur_mesuree)")
        .eq("status", "done");

      if (fetchError) throw fetchError;

      let sessionsUpdated = 0;
      let sessionsSkipped = 0;
      let criteriaRemoved = 0;
      const missing = new Set<string>();

      const list = sessions ?? [];
      for (const [index, session] of list.entries()) {
        setProgress(`${index + 1} / ${list.length}`);

        const progression = session.progression as Progression;
        // Figure retirée ou renommée depuis : on ne peut pas la noter avec
        // une grille qui ne la contient plus.
        if (!SCORING_GRID[progression]) {
          sessionsSkipped += 1;
          continue;
        }

        const rows = (session.scores ?? []) as {
          id: string;
          critere: string;
          valeur_mesuree: number | null;
        }[];
        if (rows.length === 0) {
          sessionsSkipped += 1;
          continue;
        }

        const measured: Partial<Record<CriterionScore["critere"], number>> = {};
        for (const row of rows) {
          if (row.valeur_mesuree !== null) {
            measured[row.critere as CriterionScore["critere"]] = row.valeur_mesuree;
          }
        }

        const { scores, missingCriteria } = rescoreFromStoredMeasures(
          measured,
          progression
        );
        missingCriteria.forEach((c) => missing.add(c));
        if (scores.length === 0) {
          sessionsSkipped += 1;
          continue;
        }

        // Remplacement plutôt que mise à jour ligne à ligne : la grille a pu
        // retirer un critère (le genou n'est plus noté en tuck, par exemple),
        // et une simple mise à jour laisserait l'ancienne ligne orpheline.
        const recomputedCriteria = new Set(scores.map((s) => s.critere));
        criteriaRemoved += rows.filter(
          (r) => !recomputedCriteria.has(r.critere as CriterionScore["critere"])
        ).length;

        const { error: deleteError } = await supabase
          .from("scores")
          .delete()
          .eq("session_id", session.id);
        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase.from("scores").insert(
          scores.map((s) => ({
            session_id: session.id,
            critere: s.critere,
            score: s.score,
            valeur_mesuree: s.valeurMesuree,
            valeur_cible: s.valeurCible,
          }))
        );
        if (insertError) throw insertError;

        sessionsUpdated += 1;
      }

      setReport({
        sessionsUpdated,
        sessionsSkipped,
        criteriaRemoved,
        missingCriteria: [...missing],
      });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div>
        <p className="text-sm font-semibold text-white">
          Resynchroniser les scores
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Réapplique la grille de seuils actuelle à toutes tes analyses déjà
          enregistrées, sans re-analyser les vidéos : les angles mesurés sont
          conservés, seules les notes sont recalculées. À lancer après avoir
          recalibré une figure, pour que ton historique et tes courbes ne
          mélangent pas deux barèmes.
        </p>
      </div>

      <button
        type="button"
        onClick={handleResync}
        disabled={running}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-cyan-700 disabled:opacity-50"
      >
        <ChangeVideoIcon className="h-4 w-4 text-cyan-400" />
        {running ? `Recalcul... ${progress}` : "Recalculer avec la grille actuelle"}
      </button>

      {report && (
        <div className="rounded-lg border border-cyan-900/50 bg-cyan-500/10 p-3 text-xs text-slate-300">
          <p className="font-medium text-cyan-300">
            {report.sessionsUpdated} analyse
            {report.sessionsUpdated > 1 ? "s" : ""} recalculée
            {report.sessionsUpdated > 1 ? "s" : ""}
          </p>
          {report.criteriaRemoved > 0 && (
            <p className="mt-1">
              {report.criteriaRemoved} critère
              {report.criteriaRemoved > 1 ? "s" : ""} retiré
              {report.criteriaRemoved > 1 ? "s" : ""} (ne fait plus partie de la
              grille pour cette figure).
            </p>
          )}
          {report.sessionsSkipped > 0 && (
            <p className="mt-1">
              {report.sessionsSkipped} ignorée
              {report.sessionsSkipped > 1 ? "s" : ""} : figure absente de la
              grille ou aucune mesure enregistrée.
            </p>
          )}
          {report.missingCriteria.length > 0 && (
            <p className="mt-1 text-orange-300">
              Critères ajoutés depuis, non calculables sans re-analyser la
              vidéo : {report.missingCriteria.join(", ")}.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
