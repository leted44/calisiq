"use client";

import { LANGS, LANG_LABELS } from "@/lib/i18n/config";
import { setLang, useLang, useT } from "@/lib/i18n/client";

// Sélecteur de langue.
//
// Deux boutons plutôt qu'une liste déroulante : à deux options, la liste
// demande deux gestes et cache le choix disponible derrière le premier. Les
// libellés sont écrits dans leur propre langue, jamais traduits — quelqu'un
// qui ne lit pas le français doit reconnaître « English » même si l'interface
// est encore en français.
export default function LanguageSwitcher() {
  const t = useT();
  const current = useLang();

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div>
        <p className="text-sm font-medium text-white">{t.profile.language}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {t.profile.languageHint}
        </p>
      </div>
      <div className="flex gap-2 pt-1">
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
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-cyan-500 bg-cyan-500/10 text-white"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
