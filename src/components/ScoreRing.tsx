import { tierFor } from "@/lib/pose/report";

const RING_COLORS: Record<string, string> = {
  optimal: "#4ade80",
  bon: "#22d3ee",
  faible: "#fb923c",
};

export default function ScoreRing({
  value,
  label,
  suffix = "/10",
  size = 78,
}: {
  value: number;
  label: string;
  suffix?: string;
  size?: number;
}) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const ratio = suffix === "/10" ? Math.min(1, Math.max(0, value / 10)) : 1;
  const offset = circumference * (1 - ratio);
  const color = suffix === "/10" ? RING_COLORS[tierFor(value)] : "#4ade80";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={5}
            className="text-slate-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">
            {suffix === "/10" ? value.toFixed(1) : value}
            <span className="text-[10px] font-normal text-slate-500">{suffix}</span>
          </span>
        </div>
      </div>
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}
