"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { InstallAppIcon } from "@/components/icons";

// L'événement d'installation n'est pas dans les types du DOM : il n'est
// implémenté que par les navigateurs Chromium et ne fait pas partie du
// standard. On en décrit donc le strict nécessaire.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// L'app tourne-t-elle déjà depuis l'écran d'accueil ? Lu par
// `useSyncExternalStore` plutôt que posé dans un effet : c'est une valeur qui
// vit dans le navigateur et que le serveur ne peut pas connaître, exactement
// le cas que ce hook couvre. L'instantané serveur vaut `false`, donc le
// premier rendu est identique des deux côtés et React ne signale pas d'écart.
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
  // La plateforme ne change pas en cours de session, d'où l'abonnement vide.
  const isIos = useSyncExternalStore(neverChanges, readIsIos, serverFalse);

  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      // Sans ça, Chrome affiche sa propre bannière au moment qui l'arrange.
      // On garde la main pour la proposer depuis le profil.
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }

    function onInstalled() {
      setJustInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // L'événement ne se rejoue pas : une fois consommé, il faut attendre que
    // le navigateur en émette un nouveau.
    setPromptEvent(null);
    if (outcome === "accepted") setJustInstalled(true);
  }, [promptEvent]);

  if (standalone || justInstalled) return null;

  // Ni prompt disponible, ni iOS : le navigateur ne sait pas installer (Firefox
  // Android, navigateurs intégrés à Instagram ou TikTok). Mieux vaut ne rien
  // afficher qu'un bouton qui ne ferait rien.
  if (!promptEvent && !isIos) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={isIos ? () => setShowIosHelp((visible) => !visible) : handleInstall}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
          <InstallAppIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">Installer l&apos;application</p>
          <p className="text-xs text-slate-500">
            {isIos
              ? "Depuis Safari, en deux gestes"
              : "L'ajouter à ton écran d'accueil"}
          </p>
        </div>
      </button>

      {isIos && showIosHelp && (
        <div className="border-t border-slate-800 px-4 py-3">
          <ol className="space-y-2 text-xs leading-relaxed text-slate-400">
            <li>
              <span className="font-semibold text-slate-200">1.</span> Touche le
              bouton Partager en bas de Safari, le carré avec une flèche vers le
              haut.
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
        </div>
      )}
    </div>
  );
}
