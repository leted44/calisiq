"use client";

import { useSyncExternalStore } from "react";

// Favoris de variations, conservés sur l'appareil.
//
// POURQUOI PAS EN BASE
//
// Un favori est un raccourci d'affichage, pas une donnée d'entraînement : le
// perdre en changeant de téléphone ne fait rien perdre du travail. Le stocker
// en base imposerait une table, une migration et une requête au chargement de
// l'accueil, pour une préférence que l'utilisateur refait en deux clics. Le
// jour où il en faut la synchronisation entre appareils, ce module est le seul
// endroit à changer.
//
// POURQUOI UN STORE ET PAS UN useState + useEffect
//
// Lire localStorage pendant le rendu casse l'hydratation (le serveur ne le
// voit pas) et le faire dans un effet déclenche un setState au montage, que
// le lint refuse à juste titre. `useSyncExternalStore` est fait pour ça : il
// donne un instantané vide côté serveur puis la vraie valeur côté client.

const KEY = "calisiq:favorite-variations";

// Référence stable : `useSyncExternalStore` compare les instantanés par
// identité, un tableau vide recréé à chaque appel boucherait le rendu.
const EMPTY: readonly string[] = [];

let cache: readonly string[] | null = null;
const listeners = new Set<() => void>();

function read(): readonly string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : EMPTY;
  } catch {
    // Navigation privée, quota plein, valeur corrompue : l'absence de favoris
    // est une dégradation acceptable, pas une erreur à remonter.
    cache = EMPTY;
  }
  return cache;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function useFavorites(): readonly string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleFavorite(value: string): void {
  const current = read();
  cache = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // L'écriture peut échouer sans que l'affichage ait à en souffrir : le
    // favori vit alors le temps de la session.
  }
  for (const listener of listeners) listener();
}
