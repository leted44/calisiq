"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, HistoryIcon, TrendUpIcon, ProfileIcon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/fr";

// Le libellé est une fonction du dictionnaire et non une chaîne : la table
// est définie au chargement du module, avant que la langue soit connue.
//
// « Accueil » pointe sur /analyser et non sur / : la racine est devenue la
// page publique de présentation, celle qu'on envoie depuis Instagram.
const TABS: {
  href: string;
  label: (t: Dictionary) => string;
  Icon: typeof HomeIcon;
}[] = [
  { href: "/analyser", label: (t) => t.nav.home, Icon: HomeIcon },
  { href: "/historique", label: (t) => t.nav.history, Icon: HistoryIcon },
  { href: "/progression", label: (t) => t.nav.progress, Icon: TrendUpIcon },
  { href: "/profil", label: (t) => t.nav.profile, Icon: ProfileIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active ? "drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" : ""
                }`}
              />
              {label(t)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
