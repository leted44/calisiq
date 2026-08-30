import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import ComparisonView from "../../_components/ComparisonView";

type SessionRow = {
  id: string;
  video_url: string;
  created_at: string;
  performed_at: string | null;
  trim_start: number | null;
  trim_end: number | null;
  hold_duration_seconds: number | null;
  is_reference: boolean;
  scores: { score: number }[] | null;
};

function averageScore(row: SessionRow): number | null {
  const values = (row.scores ?? []).map((s) => s.score);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function effectiveDate(row: SessionRow): string {
  return row.performed_at ?? row.created_at;
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ progression: string }>;
}) {
  const { progression } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("sessions")
    .select(
      "id, video_url, created_at, performed_at, trim_start, trim_end, hold_duration_seconds, is_reference, scores(score)"
    )
    .eq("progression", progression)
    .eq("status", "done");

  const sessions = (data ?? []) as SessionRow[];
  if (sessions.length === 0) notFound();

  const reference =
    sessions.find((s) => s.is_reference) ??
    // Aucune référence marquée (compte antérieur à la migration, ou
    // référence supprimée) : on retombe sur la plus ancienne analyse, qui
    // est le "avant" le plus naturel.
    [...sessions].sort(
      (a, b) =>
        new Date(effectiveDate(a)).getTime() - new Date(effectiveDate(b)).getTime()
    )[0];

  const latest = [...sessions]
    .filter((s) => s.id !== reference.id)
    .sort(
      (a, b) =>
        new Date(effectiveDate(b)).getTime() - new Date(effectiveDate(a)).getTime()
    )[0];

  const label = PROGRESSION_LABELS[progression] ?? progression;

  if (!latest) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pt-10">
        <div className="w-full max-w-md">
          <Link
            href="/progression"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
          >
            ← Progression
          </Link>
          <h1 className="text-2xl font-bold text-white">{label}</h1>
          <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            Il faut au moins deux analyses de cette figure pour comparer. Analyse
            à nouveau cette figure, et son évolution apparaîtra ici.
          </p>
        </div>
      </div>
    );
  }

  const [referenceUrl, latestUrl] = await Promise.all([
    supabase.storage.from("videos").createSignedUrl(reference.video_url, 3600),
    supabase.storage.from("videos").createSignedUrl(latest.video_url, 3600),
  ]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-6 pt-10">
      <div className="w-full max-w-md">
        <Link
          href="/progression"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
        >
          ← Progression
        </Link>
        <h1 className="text-2xl font-bold text-white">{label}</h1>
        <p className="text-sm text-slate-400">
          Ta référence face à ta dernière analyse.
        </p>
      </div>

      <div className="w-full max-w-md">
        <ComparisonView
          before={{
            videoUrl: referenceUrl.data?.signedUrl ?? null,
            date: effectiveDate(reference),
            score: averageScore(reference),
            holdDuration: reference.hold_duration_seconds,
            trimStart: reference.trim_start,
            trimEnd: reference.trim_end,
          }}
          after={{
            videoUrl: latestUrl.data?.signedUrl ?? null,
            date: effectiveDate(latest),
            score: averageScore(latest),
            holdDuration: latest.hold_duration_seconds,
            trimStart: latest.trim_start,
            trimEnd: latest.trim_end,
          }}
        />
      </div>
    </div>
  );
}
