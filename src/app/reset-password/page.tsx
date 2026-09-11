"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import LanguagePicker from "../_components/LanguagePicker";

// Destination du lien de réinitialisation, une fois le code de récupération
// échangé par /auth/callback contre une session.
//
// POURQUOI VÉRIFIER LA SESSION AU CHARGEMENT
//
// Cette page ne peut rien faire sans la session "recovery" que l'échange de
// code a dû poser. Quelqu'un qui l'ouvre directement (lien réutilisé, expiré,
// ou favori enregistré par erreur) n'a pas cette session : le formulaire
// serait alors affiché sans jamais pouvoir aboutir, avec une erreur muette au
// moment de valider. Autant le dire tout de suite, avec un moyen d'en
// redemander un.
export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(data.user !== null);
      setChecking(false);
    });
    // supabase et router sont stables entre les rendus : les omettre évite de
    // relancer la vérification à chaque fois que React recrée ces références.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t.resetPassword.mismatch);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError(t.resetPassword.failed(error.message));
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-950 p-4">
      <div className="mb-3 flex w-full max-w-sm justify-end">
        <LanguagePicker />
      </div>

      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40">
        {checking ? (
          <p className="text-center text-sm text-slate-400">{t.common.loading}</p>
        ) : !hasSession ? (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-semibold text-white">
              {t.resetPassword.invalidLink}
            </h1>
            <p className="text-sm text-slate-400">
              {t.resetPassword.invalidLinkBody}
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            >
              {t.resetPassword.requestNew}
            </button>
          </div>
        ) : success ? (
          <div className="space-y-4 text-center">
            <h1 className="text-xl font-semibold text-white">
              {t.resetPassword.success}
            </h1>
            <button
              type="button"
              onClick={() => {
                router.push("/analyser");
                router.refresh();
              }}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            >
              {t.resetPassword.continueToApp}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-semibold text-white">
                {t.resetPassword.title}
              </h1>
              <p className="text-sm text-slate-400">{t.resetPassword.body}</p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                autoFocus
                placeholder={t.resetPassword.newPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder={t.resetPassword.confirmPassword}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-opacity disabled:opacity-50"
            >
              {saving ? t.resetPassword.saving : t.resetPassword.save}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
