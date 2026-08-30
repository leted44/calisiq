import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendUpIcon, ProfileIcon, BodyIcon, TimerIcon } from "@/components/icons";

type AdminStats = {
  total_users: number;
  users_7d: number;
  users_30d: number;
  onboarded_users: number;
  active_users: number;
  active_users_7d: number;
  total_sessions: number;
  sessions_7d: number;
  returning_users: number;
  daily_sessions: { day: string; count: number }[];
};

function percent(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof TrendUpIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-400" />
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function StatsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 pt-10">
        <div className="w-full max-w-md">
          <Link
            href="/profil"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
          >
            ← Profil
          </Link>
          <h1 className="text-2xl font-bold text-white">Statistiques</h1>
          <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            Cette page est réservée au compte administrateur.
          </p>
        </div>
      </div>
    );
  }

  const stats = data as AdminStats;
  const maxDaily = Math.max(1, ...stats.daily_sessions.map((d) => d.count));

  return (
    <div className="flex flex-col items-center gap-5 px-4 pb-6 pt-10">
      <div className="w-full max-w-md">
        <Link
          href="/profil"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
        >
          ← Profil
        </Link>
        <h1 className="text-2xl font-bold text-white">Statistiques</h1>
        <p className="text-sm text-slate-400">Usage réel de l&apos;application.</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Inscriptions
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total"
              value={stats.total_users}
              icon={ProfileIcon}
            />
            <StatCard
              label="7 derniers jours"
              value={stats.users_7d}
              hint={`${stats.users_30d} sur 30 jours`}
              icon={TrendUpIcon}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Usage réel
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Ont analysé"
              value={stats.active_users}
              hint={`${percent(stats.active_users, stats.total_users)} des inscrits`}
              icon={BodyIcon}
            />
            <StatCard
              label="Revenus"
              value={stats.returning_users}
              hint="au moins 2 jours différents"
              icon={TimerIcon}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            L&apos;écart entre inscrits et « ont analysé » est le chiffre à
            surveiller : un compte créé qui n&apos;analyse jamais rien signale un
            problème de prise en main, pas de trafic.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Analyses
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total"
              value={stats.total_sessions}
              icon={BodyIcon}
            />
            <StatCard
              label="7 derniers jours"
              value={stats.sessions_7d}
              hint={`${stats.active_users_7d} utilisateurs actifs`}
              icon={TrendUpIcon}
            />
          </div>
        </div>

        {stats.daily_sessions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              14 derniers jours
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex h-24 items-end gap-1">
                {stats.daily_sessions.map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/40 to-cyan-400"
                    style={{ height: `${(d.count / maxDaily) * 100}%` }}
                    title={`${d.day} · ${d.count} analyses`}
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Analyses par jour · maximum {maxDaily}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
