"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrashIcon } from "@/components/icons";

export default function DeleteSessionButton({
  sessionId,
  videoPath,
}: {
  sessionId: string;
  videoPath: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Supprimer définitivement ce hold et son analyse ?")) return;

    setDeleting(true);
    setError(null);

    const { error: scoresError } = await supabase
      .from("scores")
      .delete()
      .eq("session_id", sessionId);
    if (scoresError) {
      setError("Suppression des scores échouée : " + scoresError.message);
      setDeleting(false);
      return;
    }

    const { error: recommendationsError } = await supabase
      .from("recommendations")
      .delete()
      .eq("session_id", sessionId);
    if (recommendationsError) {
      setError(
        "Suppression des recommandations échouée : " +
          recommendationsError.message
      );
      setDeleting(false);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("videos")
      .remove([videoPath]);
    if (storageError) {
      setError("Suppression de la vidéo échouée : " + storageError.message);
      setDeleting(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-800 disabled:opacity-50"
      >
        <TrashIcon className="h-3.5 w-3.5" />
        {deleting ? "Suppression..." : "Supprimer"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
