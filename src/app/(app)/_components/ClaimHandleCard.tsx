"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import HandleField from "@/components/HandleField";

// Réservation du pseudo depuis le profil.
//
// L'inscription porte déjà le champ, mais elle ne concerne que les nouveaux
// comptes : sans cet écran, tous ceux inscrits avant l'ajout du pseudo
// n'auraient aucun moyen d'en obtenir un.
//
// Une fois réservé, le pseudo s'affiche sans être modifiable. Le changer
// casserait les liens déjà partagés, et personne ne contrôle où un lien a été
// collé. Rouvrir la modification est une décision à prendre séparément, avec
// une redirection de l'ancien pseudo, pas un effet de bord de cet écran.
export default function ClaimHandleCard({
  currentHandle,
}: {
  currentHandle: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [confirme, setConfirme] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valide = handle.length > 0 && confirme === handle;

  async function save() {
    if (!valide) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.analysis.errors.sessionExpired);
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ handle })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      // Cas le plus probable : quelqu'un a réservé le même pseudo entre la
      // vérification et l'enregistrement. L'index unique de la base tranche,
      // et c'est bien lui qui doit faire foi.
      setError(t.handle.taken);
      return;
    }
    router.refresh();
  }

  if (currentHandle) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {t.handle.yourHandle}
        </p>
        <p className="mt-1 font-mono text-sm text-white">
          <span className="text-slate-500">{t.handle.prefix}</span>
          {currentHandle}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-cyan-900/60 bg-cyan-500/5 p-4">
      <div>
        <p className="text-sm font-medium text-white">{t.handle.claimTitle}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
          {t.handle.claimBody}
        </p>
      </div>

      <HandleField value={handle} onChange={setHandle} onAvailable={setConfirme} />

      {error && <p className="text-xs text-orange-400">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={!valide || saving}
        className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-40 disabled:shadow-none"
      >
        {saving ? t.dashboard.saving : t.handle.save}
      </button>
    </div>
  );
}
