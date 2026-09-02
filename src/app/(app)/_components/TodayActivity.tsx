"use client";

import { useEffect, useState } from "react";

// Indicateur d'activité de l'accueil : « N ont analysé aujourd'hui ».
//
// LE CHIFFRE EST EN PARTIE SIMULÉ, et il faut le savoir avant d'y toucher.
// Il additionne deux choses : le nombre réel d'analyses lancées aujourd'hui
// (fourni par la fonction `analyses_today`) et une valeur simulée destinée à
// donner du corps à l'écran tant que l'audience se construit. Le jour où le
// trafic réel suffit, mettre SIMULATION_ACTIVE à false rend l'indicateur
// entièrement honnête sans rien casser : le compteur réel prend le relais.
//
// Deux propriétés à préserver si la simulation évolue. Elle doit être
// déterministe : deux personnes qui ouvrent l'app à la même seconde doivent
// voir le même nombre, sinon une capture d'écran partagée trahit le procédé.
// Et elle doit être strictement croissante sur la journée : un compteur qui
// recule sous les yeux de l'utilisateur se remarque immédiatement.
const SIMULATION_ACTIVE = true;

// Fourchette du total simulé sur une journée. Volontairement modeste : un
// chiffre invraisemblable pour une application qui démarre décrédibilise
// davantage qu'il ne rassure.
const DAILY_MIN = 22;
const DAILY_MAX = 68;

// Cadence de rafraîchissement. Le nombre progresse de lui-même au fil des
// heures ; on relit l'horloge régulièrement pour que l'écran suive.
const REFRESH_MS = 30_000;

// Total simulé du jour. Générateur congruentiel amorcé sur la date, pour que
// la valeur reste la même toute la journée puis change le lendemain.
function dailyTotal(now: Date): number {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  const noise = ((dayIndex * 9301 + 49297) % 233280) / 233280;
  return DAILY_MIN + Math.round(noise * (DAILY_MAX - DAILY_MIN));
}

// Part de la journée déjà écoulée, en volume d'activité et non en temps :
// presque rien la nuit, l'essentiel entre midi et le soir. Sigmoïde, donc
// strictement croissante — le compteur ne peut jamais reculer.
function dayProgress(now: Date): number {
  const fraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
  return 1 / (1 + Math.exp(-(fraction - 0.42) * 7));
}

function simulatedCount(now: Date): number {
  if (!SIMULATION_ACTIVE) return 0;
  return Math.round(dailyTotal(now) * dayProgress(now));
}

// Initiales affichées dans les pastilles. Choisies fixes plutôt que tirées au
// hasard : trois lettres qui changeraient à chaque rendu attireraient l'œil
// exactement là où il ne faut pas.
const AVATAR_INITIALS = ["M", "W", "K"];

export default function TodayActivity({ realCount }: { realCount: number }) {
  // Rendu vide au premier passage : le serveur et le navigateur ne sont pas
  // dans le même fuseau, un calcul d'horloge côté serveur produirait une
  // valeur différente de celle du client et React signalerait l'écart.
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      setCount(realCount + simulatedCount(new Date()));
    }
    update();
    const timer = setInterval(update, REFRESH_MS);
    return () => clearInterval(timer);
  }, [realCount]);

  return (
    <div className="flex h-7 items-center justify-center gap-2.5">
      {count !== null && count > 0 && (
        <>
          <div className="flex -space-x-2">
            {AVATAR_INITIALS.map((initial, index) => (
              <span
                key={initial}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-500 to-blue-600 text-[11px] font-semibold text-white"
                style={{ zIndex: AVATAR_INITIALS.length - index }}
              >
                {initial}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-cyan-400">{count}</span> ont
            analysé aujourd&apos;hui
          </p>
        </>
      )}
    </div>
  );
}
