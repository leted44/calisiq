"use client";

import { useState, useSyncExternalStore } from "react";
import {
  InstallAppIcon,
  CheckIcon,
  IosShareIcon,
  AddToHomeIcon,
  LinkIcon,
} from "@/components/icons";

// L'événement d'installation n'est pas dans les types du DOM : il n'est
// implémenté que par les navigateurs Chromium et ne fait pas partie du
// standard. On en décrit donc le strict nécessaire.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// L'événement est retenu par le script du layout racine, qui s'exécute bien
// avant l'hydratation. Voir le commentaire là-bas : Chrome ne l'émet qu'une
// fois, au chargement, et un écouteur monté avec cette page le manquerait.
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

// Safari, ou un autre navigateur sur iOS ? La distinction est décisive : seul
// Safari sait poser une app sur l'écran d'accueil. Chrome, Firefox et les
// navigateurs intégrés à Instagram ou TikTok s'annoncent par un jeton propre
// dans leur signature, tous absents de celle de Safari.
function readIsIosSafari() {
  const ua = window.navigator.userAgent;
  if (!/iphone|ipad|ipod/i.test(ua)) return false;
  return !/crios|fxios|edgios|opios|instagram|fban|fbav|tiktok/i.test(ua);
}

const neverChanges = () => () => {};
const serverFalse = () => false;

// Une étape du mode d'emploi iOS : un pictogramme reconnaissable et une
// phrase. Montrer l'icône du bouton Partager vaut mieux que la décrire — c'est
// exactement ce que l'utilisateur doit repérer dans sa barre Safari.
function Step({
  index,
  icon,
  children,
}: {
  index: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-cyan-400">
        {icon}
      </span>
      <span className="text-sm leading-snug text-slate-300">
        <span className="font-semibold text-white">{index}.</span> {children}
      </span>
    </li>
  );
}

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
  const isIosSafari = useSyncExternalStore(
    neverChanges,
    readIsIosSafari,
    serverFalse
  );

  const [justInstalled, setJustInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const installed = standalone || justInstalled;

  async function handleInstall() {
    const promptEvent = (window as WindowWithPrompt).__calisiqInstallPrompt;
    if (!promptEvent) return;

    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // L'invite ne se rejoue pas : une fois consommée, le navigateur doit en
    // émettre une nouvelle.
    (window as WindowWithPrompt).__calisiqInstallPrompt = null;
    window.dispatchEvent(new Event("calisiq:installprompt"));
    if (outcome === "accepted") setJustInstalled(true);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers refusé : l'adresse reste lisible juste à côté.
    }
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

  // iOS dans Safari : aucune installation automatique n'existe, Apple réserve
  // le geste à sa feuille de partage. Le mode d'emploi est donc affiché
  // d'emblée plutôt que caché derrière un bouton — un clic de moins, et
  // l'utilisateur voit tout de suite ce qu'on attend de lui.
  if (isIosSafari) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
            <InstallAppIcon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">Installer CalisIQ</p>
            <p className="text-xs text-slate-500">Deux gestes, dans Safari</p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          <Step index={1} icon={<IosShareIcon className="h-5 w-5" />}>
            Touche <span className="font-medium text-white">Partager</span>, dans
            la barre en bas de l&apos;écran
          </Step>
          <Step index={2} icon={<AddToHomeIcon className="h-5 w-5" />}>
            Choisis{" "}
            <span className="font-medium text-white">
              Sur l&apos;écran d&apos;accueil
            </span>
          </Step>
        </ul>
      </div>
    );
  }

  // iOS hors Safari : l'installation est impossible ici, quoi qu'on fasse. La
  // seule action utile est de renvoyer vers Safari, donc on donne l'adresse.
  if (isIos) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
            <InstallAppIcon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">Installer CalisIQ</p>
            <p className="text-xs text-slate-500">
              Sur iPhone, l&apos;installation passe par Safari
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Ouvre cette adresse dans Safari, puis reviens ici : le mode
          d&apos;emploi s&apos;affichera.
        </p>

        <button
          type="button"
          onClick={handleCopyLink}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-200"
        >
          <LinkIcon className="h-4 w-4" />
          {copied ? "Adresse copiée" : "Copier l'adresse"}
        </button>
      </div>
    );
  }

  // Android et ordinateurs. Une invite native est disponible dans la plupart
  // des cas : un seul geste suffit alors.
  if (hasPrompt) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className="flex w-full items-center gap-3 rounded-xl border border-cyan-900/60 bg-cyan-500/5 p-4 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
          <InstallAppIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">Installer CalisIQ</p>
          <p className="text-xs text-cyan-300/80">
            Un seul geste, directement depuis ici
          </p>
        </div>
      </button>
    );
  }

  // Pas d'invite native et pas iOS : navigateur qui ne sait pas installer, ou
  // conditions non réunies. On explique où chercher dans le menu.
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        type="button"
        onClick={() => setShowHelp((visible) => !visible)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
          <InstallAppIcon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">Installer CalisIQ</p>
          <p className="text-xs text-slate-500">
            Voir comment l&apos;ajouter à ton écran d&apos;accueil
          </p>
        </div>
      </button>

      {showHelp && (
        <div className="border-t border-slate-800 px-4 py-3">
          <ol className="space-y-2 text-xs leading-relaxed text-slate-400">
            <li>
              <span className="font-semibold text-slate-200">1.</span> Ouvre le
              menu de ton navigateur, les trois points en haut à droite.
            </li>
            <li>
              <span className="font-semibold text-slate-200">2.</span> Choisis
              « Installer l&apos;application » ou « Ajouter à l&apos;écran
              d&apos;accueil ».
            </li>
          </ol>
          <p className="mt-2.5 text-[11px] text-slate-500">
            Cette option n&apos;existe pas dans les navigateurs intégrés à
            Instagram ou TikTok : ouvre le lien dans Chrome d&apos;abord.
          </p>
        </div>
      )}
    </div>
  );
}
