"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import LanguagePicker from "../_components/LanguagePicker";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const t = useT();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/analyser");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/analyser");
      router.refresh();
      return;
    }

    setPendingEmail(email);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingEmail) return;
    setError(null);
    setVerifying(true);

    const { error } = await supabase.auth.verifyOtp({
      email: pendingEmail,
      token: otpCode,
      type: "signup",
    });

    setVerifying(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/analyser");
    router.refresh();
  }

  async function handleResendCode() {
    if (!pendingEmail) return;
    setError(null);
    setResendStatus("sending");

    const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail });

    if (error) {
      setError(error.message);
      setResendStatus("idle");
      return;
    }
    setResendStatus("sent");
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-950 p-4">
      {/* Largeur portée de 300 à 330 px avec le nouveau logo : l'ancien
          verrou était nettement plus haut que large, le nouveau est presque
          carré. À largeur égale il aurait occupé un tiers de hauteur en
          moins et l'écran se serait vidé par le haut. */}
      <div className="relative flex w-full max-w-[330px] flex-col items-center gap-2">
        {/* Le logo est une image opaque sur fond noir, composée en `screen` :
            le noir n'ajoute rien et s'efface exactement, les lumières
            s'additionnent au fond. D'où deux règles à respecter ici. Le fond
            derrière doit rester sombre et uni, sinon il transparaît dans les
            noirs du logo — le halo cyan qui se trouvait à cet endroit a été
            retiré pour cette raison. Et pas de `drop-shadow` : le visuel porte
            déjà son propre éclairage. */}
        <div className="mb-3 flex w-full max-w-sm justify-end">
          <LanguagePicker />
        </div>
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-full.webp"
            alt="CalisIQ"
            className="relative w-full mix-blend-screen"
          />
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
          {t.auth2.tagline}
        </p>
      </div>

      {pendingEmail ? (
        <form
          onSubmit={handleVerifyOtp}
          className="relative w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold text-white">{t.auth2.confirmTitle}</h1>
            <p className="text-sm text-slate-400">
              {t.auth2.confirmSentTo} <span className="text-slate-300">{pendingEmail}</span>.
              Saisis-le ci-dessous pour activer ton compte.
            </p>
          </div>

          <input
            type="text"
            required
            autoFocus
            inputMode="text"
            placeholder={t.auth2.codePlaceholder}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center text-lg tracking-[0.3em] text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.35)] py-2.5 font-medium text-white transition-opacity disabled:opacity-50"
          >
            {verifying ? t.auth2.verifying : t.auth2.confirm}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setPendingEmail(null);
                setOtpCode("");
                setError(null);
              }}
              className="text-slate-400 hover:text-slate-300"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendStatus === "sending"}
              className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 disabled:opacity-50"
            >
              {resendStatus === "sent"
                ? t.auth2.codeResent
                : resendStatus === "sending"
                ? t.auth2.sending
                : t.auth2.resendCode}
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold text-white">
              {mode === "signin" ? t.auth2.signIn : t.auth2.createAccount}
            </h1>
            <p className="text-sm text-slate-400">
              {t.auth2.pitch}
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-white hover:border-slate-600 disabled:opacity-50"
          >
            <GoogleIcon className="h-4 w-4" />
            {googleLoading ? t.auth2.redirecting : t.auth2.continueWithGoogle}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-xs uppercase tracking-wide text-slate-500">{t.auth2.orEmail}</p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="space-y-3">
            <input
              type="email"
              required
              placeholder={t.auth2.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder={t.auth2.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.35)] py-2.5 font-medium text-white transition-opacity disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? t.auth2.signInAction : t.auth2.signUpAction}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-sm text-slate-400 underline underline-offset-2 hover:text-slate-300"
          >
            {mode === "signin"
              ? t.auth2.noAccount
              : t.auth2.haveAccount}
          </button>
        </form>
      )}
    </div>
  );
}
