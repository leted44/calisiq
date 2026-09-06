"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  type Lang,
} from "./config";
import { fr, type Dictionary } from "./fr";
import { en } from "./en";

const DICTIONARIES: Record<Lang, Dictionary> = { fr, en };

const LangContext = createContext<{ lang: Lang; t: Dictionary }>({
  lang: DEFAULT_LANG,
  t: fr,
});

/**
 * Fournit la langue aux composants client.
 *
 * La valeur vient du serveur, qui a lu le cookie : le premier rendu client est
 * donc déjà dans la bonne langue et l'hydratation ne provoque aucun
 * clignotement.
 */
export function LanguageProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return (
    <LangContext.Provider value={{ lang, t: DICTIONARIES[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

/** Dictionnaire de la langue courante, pour un composant client. */
export function useT(): Dictionary {
  return useContext(LangContext).t;
}

/** Langue courante, quand le code doit s'en servir autrement que pour du texte. */
export function useLang(): Lang {
  return useContext(LangContext).lang;
}

/**
 * Change la langue et recharge.
 *
 * Le rechargement complet est délibéré : la moitié des pages sont rendues sur
 * le serveur, qui doit relire le cookie pour produire la bonne langue. Un
 * simple changement d'état côté client laisserait ces pages en arrière.
 */
export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
  window.location.reload();
}
