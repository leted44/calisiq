"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StableIcon } from "@/components/icons";

export default function ReferenceSessionToggle({
  sessionId,
  isReference,
}: {
  sessionId: string;
  isReference: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSetReference() {
    setSaving(true);
    setError(null);

    // RPC plutôt que deux update : le retrait de l'ancienne référence et la
    // pose de la nouvelle doivent être atomiques (index unique partiel).
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_session_as_reference", {
      target_session_id: sessionId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  if (isReference) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-300">
          <StableIcon className="h-4 w-4" />
          Référence de cette figure
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Cette vidéo sert de point de départ pour mesurer ta progression. Elle
          est conservée sans limite de durée.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleSetReference}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200 hover:border-amber-600/50 disabled:opacity-50"
      >
        <StableIcon className="h-4 w-4 text-amber-400" />
        {saving ? "Enregistrement..." : "Définir comme référence"}
      </button>
      <p className="text-center text-xs text-slate-500">
        La référence est le point de départ auquel tes prochaines analyses
        seront comparées.
      </p>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
