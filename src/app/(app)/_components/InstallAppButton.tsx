"use client";

import { useState, useSyncExternalStore } from "react";
import { InstallAppIcon, CheckIcon } from "@/components/icons";

// L'événement d'installation n'est pas dans les types du DOM : il n'est
// implémenté que par les navigateurs Chromium et ne fait pas partie du
// standard. On en décrit donc le strict nécessaire.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// L'événement est retenu par le script du layout racine, qui s'exécute bien
// avant l'hydratation. Voir le commentaire là-bas : Chrome ne l'émet qu'une
// fois, au chargement, et un écouteur monté avec cette page le manquerait
// systématiquement.
type WindowWithPrompt = Window & {
  __calisiqInstallPrompt?: InstallPromptEvent | null;
};

function subscribeToInstallPrompt(onChange: () => void) {
  window.addEventListener("calisiq:installprompt", onChange);
  return () => window.removeEventListener("calisiq:installprompt", onChange);
}

function readHasPrompt() {
  return Boolean((window as WindowWithPrompt).__calisiqInstallPrompt);
}

// L'app tourne-t-elle déjà depuis l'écran d'accueil ?
function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS ignore `display-mode` et expose son propre drapeau.
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function readIsIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

const neverChanges = () => () => {};
const serverFalse = () => false;

export default function InstallAppButton() {
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    readStandalone,
    serverFalse
  );
  const hasPrompt = useSyncExternalStore(
    subscribeToInstallPrompt,
    readHasPrompt,
    serverFalse
  );
  // La plateforme ne change pas en cours de session, d'où l'abonnement vide.
  const isIos = useSyncExternalStore(neverChanges, readIsIos, serverFalse);

  const [justInstalled, setJustInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const installed = standalone || justInstalled;

  async function handleClick() {
    const promptEvent = (window as WindowWithPrompt).__calisiqInstallPrompt;

    // Pas d'invite native disponible : ni Chromium hors conditions, ni iOS qui
    // n'en propose aucune. On explique alors le geste au lieu de ne rien faire.
    if (!promptEvent) {
      setShowHelp((visible) => !visible);
      return;
    }

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // L'invite ne se rejoue pas : une fois consommée, le navigateur doit en
    // émettre une nouvelle.
    (window as WindowWithPrompt).__calisiqInstallPrompt = null;
    window.dispatchEvent(new Event("calisiq:installprompt"));
    if (outcome === "accepted") setJustInstalled(true);
  }

  if (installed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-cyan-900/60 bg-cyan-500/5 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
          <CheckIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">CalisIQ est bien installé</p>
          <p className="text-xs text-slate-500">
            Tu la lances depuis ton écran d&apos;accueil
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
          <InstallAppIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">Installer CalisIQ</p>
          <p className="text-xs text-slate-500">
            {hasPrompt
              ? "L'ajouter à ton écran d'accueil"
              : "Voir comment l'ajouter à ton écran d'accueil"}
          </p>
        </div>
      </button>

      {showHelp && (
        <div className="border-t border-slate-800 px-4 py-3">
          {isIos ? (
            <>
              <ol className="space-y-2 text-xs leading-relaxed text-slate-400">
                <li>
                  <span className="font-semibold text-slate-200">1.</span> Touche
                  le bouton Partager en bas de Safari, le carré avec une flèche
                  vers le haut.
                </li>
                <li>
                  <span className="font-semibold text-slate-200">2.</span> Fais
                  défiler et choisis « Sur l&apos;écran d&apos;accueil ».
                </li>
              </ol>
              <p className="mt-2.5 text-[11px] text-slate-500">
                Depuis un autre navigateur que Safari, iOS ne propose pas
                l&apos;installation.
              </p>
            </>
          ) : (
            <>
              <ol className="space-y-2 text-xs leading-relaxed text-slate-400">
                <li>
                  <span className="font-semibold text-slate-200">1.</span> Ouvre
                  le menu de ton navigateur, les trois points en haut à droite.
                </li>
                <li>
                  <span className="font-semibold text-slate-200">2.</span>{" "}
                  Choisis « Installer l&apos;application » ou « Ajouter à
                  l&apos;écran d&apos;accueil ».
                </li>
              </ol>
              <p className="mt-2.5 text-[11px] text-slate-500">
                Cette option n&apos;existe pas dans les navigateurs intégrés à
                Instagram ou TikTok : ouvre le lien dans Chrome d&apos;abord.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
