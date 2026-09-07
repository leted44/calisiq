"use client";

import { LANGS, LANG_LABELS } from "@/lib/i18n/config";
import { setLang, useLang } from "@/lib/i18n/client";

// Sélecteur de langue des pages publiques.
//
// Distinct de celui du profil, et pour une raison de fond : le profil est
// derrière l'authentification, alors que la page d'accueil et l'écran de
// connexion s'adressent à quelqu'un qui n'a pas encore de compte. Sans ce
// sélecteur-ci, un visiteur tombant sur la version anglaise n'avait aucun
// moyen de revenir au français, et inversement.
//
// Discret par construction : deux codes de langue, pas de libellé, en haut de
// page. Ce n'est pas ce qu'on vient chercher, mais ça doit se trouver.
export default function LanguagePicker({
  className = "",
}: {
  className?: string;
}) {
  const current = useLang();

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/70 p-0.5 ${className}`}
    >
      {LANGS.map((lang) => {
        const active = lang === current;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => {
              if (!active) setLang(lang);
            }}
            aria-pressed={active}
            // Le libellé complet part dans l'attribut : la pastille n'affiche
            // que deux lettres, mais un lecteur d'écran doit entendre le nom
            // de la langue, pas son code.
            aria-label={LANG_LABELS[lang]}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              active
                ? "bg-cyan-500/15 text-cyan-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
