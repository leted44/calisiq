"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { CheckIcon } from "@/components/icons";

/**
 * Le rappel de confirmation d'adresse, une fois entré.
 *
 * POURQUOI APRÈS ET NON AVANT
 *
 * Demander un code avant le premier écran fait payer le coût avant d'avoir
 * prouvé la valeur : la personne n'a encore rien vu, donc rien qui justifie
 * d'aller fouiller sa boîte mail, et moins encore ses indésirables. C'est
 * l'ordre le plus mauvais possible, et c'est celui qui faisait abandonner.
 *
 * Ici, l'application a déjà servi. Le rappel devient une précaution qu'on
 * comprend au lieu d'un péage qu'on subit.
 *
 * POURQUOI UN BANDEAU ET NON UN BLOCAGE
 *
 * Parce que rien ici ne le justifie : il n'y a ni paiement ni donnée sensible
 * à protéger. Le seul vrai enjeu est la récupération du compte — une adresse
 * mal tapée rend le mot de passe oublié inutilisable — et c'est exactement ce
 * que le texte dit, plutôt que d'invoquer une sécurité de façade.
 *
 * « Plus tard » referme le bandeau pour la session en cours seulement. Un
 * refus définitif se traduirait par un compte irrécupérable dont personne ne
 * se souviendrait avant le jour du problème.
 */
// Longueur du code envoyé par Supabase.
//
// Elle est RÉGLABLE côté serveur, de six à dix chiffres, et ce champ était
// figé à six : un projet réglé sur huit envoyait un code que l'application
// refusait de saisir, sans rien dire de plus qu'un bouton grisé. La borne
// haute est donc celle du réglage maximal, et le bouton s'active dès la borne
// basse plutôt qu'à une longueur exacte — ainsi un changement de réglage ne
// casse plus rien.
const CODE_MIN = 6;
const CODE_MAX = 10;

export default function VerifyEmailBanner({ email }: { email: string }) {
  const t = useT();
  const supabase = createClient();

  const [ouvert, setOuvert] = useState(false);
  const [masque, setMasque] = useState(false);
  const [etat, setEtat] = useState<"idle" | "sending" | "sent" | "done">("idle");
  const [code, setCode] = useState("");
  const [verifie, setVerifie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    setErreur(null);
    setEtat("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Aucun compte à créer : celui-ci existe déjà et est connecté. Sans ce
      // drapeau, une adresse mal tapée créerait un second compte fantôme.
      options: { shouldCreateUser: false },
    });
    if (error) {
      setErreur(error.message);
      setEtat("idle");
      return;
    }
    setEtat("sent");
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setVerifie(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setVerifie(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    // Le drapeau n'est écrit qu'après un code accepté. Il enregistre ce seul
    // fait : quelqu'un ayant accès à cette boîte a saisi ce qu'elle a reçu.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", data.user.id);
    }
    setEtat("done");
  }

  if (masque) return null;

  if (etat === "done") {
    return (
      <div className="mx-auto mb-3 flex max-w-md items-center gap-2 rounded-xl border border-green-900/50 bg-green-500/5 px-3.5 py-2.5">
        <CheckIcon className="h-4 w-4 shrink-0 text-green-400" />
        <p className="text-[13px] font-medium text-green-300">
          {t.verifyEmail.done}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-3 max-w-md rounded-xl border border-amber-900/50 bg-amber-500/5 px-3.5 py-3">
      <p className="text-[13px] font-semibold text-amber-200">
        {t.verifyEmail.title}
      </p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
        {t.verifyEmail.body}
      </p>

      {!ouvert ? (
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setOuvert(true);
              envoyer();
            }}
            className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-[12px] font-semibold text-amber-200 hover:bg-amber-500/25"
          >
            {t.verifyEmail.action}
          </button>
          <button
            type="button"
            onClick={() => setMasque(true)}
            className="text-[12px] text-slate-500 hover:text-slate-400"
          >
            {t.verifyEmail.later}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-slate-500">
            {etat === "sending" ? t.verifyEmail.sending : t.verifyEmail.sent(email)}
          </p>

          <form onSubmit={valider} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_MAX))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t.verifyEmail.codeLabel}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[15px] tracking-[0.25em] text-white placeholder-slate-600 outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={code.length < CODE_MIN || verifie}
              className="shrink-0 rounded-lg bg-amber-500/20 px-3 text-[12px] font-semibold text-amber-200 disabled:opacity-40"
            >
              {verifie ? t.verifyEmail.verifying : t.verifyEmail.verify}
            </button>
          </form>

          <button
            type="button"
            onClick={envoyer}
            disabled={etat === "sending"}
            className="text-[11px] text-slate-500 underline underline-offset-2 hover:text-slate-400 disabled:opacity-50"
          >
            {t.verifyEmail.send}
          </button>

          <p className="text-[11px] leading-relaxed text-slate-600">
            <span className="text-slate-500">{t.verifyEmail.wrongAddress}</span>{" "}
            {t.verifyEmail.wrongAddressBody}
          </p>
        </div>
      )}

      {erreur && <p className="mt-2 text-[11px] text-red-400">{erreur}</p>}
    </div>
  );
}
