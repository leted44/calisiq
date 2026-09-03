"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, HistoryIcon, TrendUpIcon, ProfileIcon } from "@/components/icons";

// « Accueil » pointe sur /analyser et non sur / : la racine est devenue la
// page publique de présentation, celle qu'on envoie depuis Instagram.
const TABS = [
  { href: "/analyser", label: "Accueil", Icon: HomeIcon },
  { href: "/historique", label: "Historique", Icon: HistoryIcon },
  { href: "/progression", label: "Progrès", Icon: TrendUpIcon },
  { href: "/profil", label: "Profil", Icon: ProfileIcon },
];

export default function TabBar() {
  const pathname = usePathname();

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
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
