"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    await supabase.from("scores").delete().eq("session_id", sessionId);
    await supabase.from("recommendations").delete().eq("session_id", sessionId);
    await supabase.storage.from("videos").remove([videoPath]);

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
        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-800 disabled:opacity-50"
      >
        {deleting ? "Suppression..." : "Supprimer"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
