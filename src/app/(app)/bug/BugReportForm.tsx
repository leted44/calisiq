"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT, useLang } from "@/lib/i18n/client";
import { SCORING_GRID, REP_SCORING_GRID } from "@/lib/pose/grid";
import { progressionLabel } from "@/lib/pose/report";
import { CheckIcon } from "@/components/icons";

const CATEGORIES = [
  "analysis",
  "video",
  "export",
  "progress",
  "account",
  "other",
] as const;

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

// Toutes les variations notables, dans l'ordre des grilles : c'est déjà
// l'ordre par famille, et il évite d'entretenir une seconde liste qui
// divergerait au premier ajout de figure.
const VARIATIONS = [...Object.keys(SCORING_GRID), ...Object.keys(REP_SCORING_GRID)];

/**
 * Formulaire de signalement.
 *
 * LA CATÉGORIE AVANT LE TEXTE
 *
 * Un champ libre seul produit des messages du type « ça marche pas ». La
 * catégorie est donc demandée en premier, en gros boutons : elle coûte un
 * geste, elle trie le signalement, et surtout elle oriente ce que la personne
 * va écrire ensuite — on décrit mieux un problème quand on vient de choisir sa
 * famille.
 *
 * La figure est facultative et n'apparaît que là où elle veut dire quelque
 * chose. La demander sur un bug de connexion ferait hésiter pour rien.
 */
export default function BugReportForm() {
  const t = useT();
  const lang = useLang();
  const [category, setCategory] = useState<string | null>(null);
  const [progression, setProgression] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assezLong = message.trim().length >= MESSAGE_MIN;
  const pretAEnvoyer = category !== null && assezLong && !sending;
  // La figure ne concerne que ce qui est mesuré sur une figure.
  const figurePertinente = category === "analysis" || category === "export";

  async function envoyer() {
    if (!pretAEnvoyer) return;
    setSending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.analysis.errors.sessionExpired);
      setSending(false);
      return;
    }

    const { error: insertError } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      category,
      progression: progression || null,
      message: message.trim().slice(0, MESSAGE_MAX),
      // Contexte technique. C'est ce que personne ne pense à joindre, et
      // c'est ce qui permet de reproduire : un bug de caméra tient souvent au
      // navigateur, un bug d'affichage à la largeur d'écran.
      user_agent: navigator.userAgent,
      app_lang: lang,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });

    setSending(false);
    if (insertError) {
      setError(t.bug.failed(insertError.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 rounded-xl border border-green-800/60 bg-green-500/5 p-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-500/15 text-green-400">
          <CheckIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-white">{t.bug.sent}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {t.bug.sentHint}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setCategory(null);
            setProgression("");
            setMessage("");
          }}
          className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
        >
          {t.bug.another}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {t.bug.where}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {CATEGORIES.map((c) => {
            const actif = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={actif}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  actif
                    ? "border-cyan-400/60 bg-cyan-500/10"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    actif ? "text-white" : "text-slate-200"
                  }`}
                >
                  {t.bug.categories[c]}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  {t.bug.categoryHints[c]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {figurePertinente && (
        <div className="space-y-1.5">
          <label
            htmlFor="bug-figure"
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            {t.bug.figure}{" "}
            <span className="normal-case text-slate-600">
              ({t.common.optional})
            </span>
          </label>
          <select
            id="bug-figure"
            value={progression}
            onChange={(e) => setProgression(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
          >
            <option value="">{t.bug.figureNone}</option>
            {VARIATIONS.map((v) => (
              <option key={v} value={v}>
                {progressionLabel(v, lang)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="bug-message"
          className="text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          {t.bug.what}
        </label>
        <textarea
          id="bug-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          rows={5}
          placeholder={t.bug.placeholder}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm leading-relaxed text-white placeholder-slate-600 outline-none focus:border-cyan-500"
        />
        <p className="text-[11px] text-slate-500">
          {message.length > 0 && !assezLong
            ? t.bug.tooShort
            : `${message.length}/${MESSAGE_MAX}`}
        </p>
      </div>

      <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
        {t.bug.context}
      </p>

      {error && (
        <p className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={envoyer}
        disabled={!pretAEnvoyer}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-opacity disabled:opacity-40 disabled:shadow-none"
      >
        {sending ? t.bug.sending : t.bug.send}
      </button>
    </div>
  );
}
