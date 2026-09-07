"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { GlobeIcon, LinkIcon } from "@/components/icons";

// Publication d'une séance sur le profil public.
//
// Séance par séance, et jamais par défaut. L'historique contient aussi des
// tentatives ratées et des essais de cadrage : les publier en bloc
// exposerait ce que personne ne veut montrer, et retirerait au geste tout son
// sens. Publier doit rester une décision.
//
// Le bouton n'apparaît pas sans pseudo : sans lui il n'existe aucune adresse
// où la séance pourrait apparaître, et proposer l'action mènerait à une page
// introuvable.
export default function PublishSessionToggle({
  sessionId,
  isPublic,
  handle,
}: {
  sessionId: string;
  isPublic: boolean;
  handle: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!handle) return null;

  async function toggle() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ is_public: !isPublic })
      .eq("id", sessionId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/u/${handle}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Le presse-papier peut être refusé (contexte non sécurisé, permission
      // du navigateur). L'adresse reste lisible juste au-dessus.
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          isPublic
            ? "border-cyan-700 bg-cyan-500/10 text-cyan-300"
            : "border-slate-700 text-slate-300 hover:border-slate-600"
        }`}
      >
        <GlobeIcon className="h-4 w-4" />
        {saving
          ? t.dashboard.saving
          : isPublic
          ? t.publish.published
          : t.publish.publish}
      </button>

      {isPublic ? (
        <div className="space-y-2">
          <p className="text-center font-mono text-[11px] text-slate-500">
            /u/{handle}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 py-2 text-xs font-medium text-slate-400 hover:border-slate-700"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            {copied ? t.install.linkCopied : t.publish.copyProfileLink}
          </button>
        </div>
      ) : (
        <p className="text-center text-[11px] leading-relaxed text-slate-500">
          {t.publish.hint}
        </p>
      )}

      {error && <p className="text-center text-xs text-orange-400">{error}</p>}
    </div>
  );
}
