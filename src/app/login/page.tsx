"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push("/");
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
      router.push("/");
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

    router.push("/");
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
        <div className="relative w-full">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-cyan-500/25 blur-3xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-full.png"
            alt="CalisIQ"
            className="relative w-full drop-shadow-[0_0_25px_rgba(34,211,238,0.35)]"
          />
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
          Analyse Intelligente de la Forme
        </p>
      </div>

      {pendingEmail ? (
        <form
          onSubmit={handleVerifyOtp}
          className="relative w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold text-white">Confirme ton email</h1>
            <p className="text-sm text-slate-400">
              On a envoyé un code à <span className="text-slate-300">{pendingEmail}</span>.
              Saisis-le ci-dessous pour activer ton compte.
            </p>
          </div>

          <input
            type="text"
            required
            autoFocus
            inputMode="text"
            placeholder="Code de confirmation"
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
            {verifying ? "Vérification..." : "Confirmer"}
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
                ? "Code renvoyé"
                : resendStatus === "sending"
                ? "Envoi..."
                : "Renvoyer le code"}
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
              {mode === "signin" ? "Connexion" : "Créer un compte"}
            </h1>
            <p className="text-sm text-slate-400">
              Filme ta figure, obtiens ton score et ton plan de progression en
              quelques secondes grâce à l&apos;IA.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-white hover:border-slate-600 disabled:opacity-50"
          >
            <GoogleIcon className="h-4 w-4" />
            {googleLoading ? "Redirection..." : "Continuer avec Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-xs uppercase tracking-wide text-slate-500">Ou e-mail</p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <div className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mot de passe"
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
            {loading ? "..." : mode === "signin" ? "Se connecter" : "S'inscrire"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-sm text-slate-400 underline underline-offset-2 hover:text-slate-300"
          >
            {mode === "signin"
              ? "Pas de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
          </button>
        </form>
      )}
    </div>
  );
}
