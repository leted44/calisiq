type IconProps = { className?: string };

const base = "h-9 w-9";
const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

// Silhouettes simplifiées (vue de profil) pour aider à distinguer les figures
// et variations d'un coup d'œil — pas des photos, des pictogrammes.

export function PlancheFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="4.2" cy="10.5" r="1.6" {...stroke} />
      <path d="M5.6 11.5 8 12h9" {...stroke} />
      <path d="M8 12v8" {...stroke} />
      <path d="M17 12v8" {...stroke} />
    </svg>
  );
}

export function HandstandFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="16.5" r="1.6" {...stroke} />
      <path d="M12 15v-6" {...stroke} />
      <path d="M12 9V3" {...stroke} />
      <path d="M8 20h8" {...stroke} />
      <path d="M12 20v-3" {...stroke} />
    </svg>
  );
}

export function TuckPlancheIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="4.2" cy="10.5" r="1.6" {...stroke} />
      <path d="M5.6 11.5 8 12h4" {...stroke} />
      <path d="M8 12v8" {...stroke} />
      <path d="M12 12c1 1.5 1 3.5 0 5" {...stroke} />
      <path d="M12 17c-1 .8-1.5 1.6-1.5 3" {...stroke} />
    </svg>
  );
}

export function AdvancedTuckIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="4.2" cy="10.5" r="1.6" {...stroke} />
      <path d="M5.6 11.5 8 12h5.5" {...stroke} />
      <path d="M8 12v8" {...stroke} />
      <path d="M13.5 12c1.5 1 2 2.6 1.5 4.3" {...stroke} />
      <path d="M15 16.3c-.8 1-1.2 1.8-1 3.2" {...stroke} />
    </svg>
  );
}

export function StraddlePlancheIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="4.2" cy="10.5" r="1.6" {...stroke} />
      <path d="M5.6 11.5 8 12h5" {...stroke} />
      <path d="M8 12v8" {...stroke} />
      <path d="M13 12 19 8.5" {...stroke} />
      <path d="M13 12 19 15.5" {...stroke} />
    </svg>
  );
}

export function FullPlancheIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="4.2" cy="10.5" r="1.6" {...stroke} />
      <path d="M5.6 11.5 8 12h12" {...stroke} />
      <path d="M8 12v8" {...stroke} />
    </svg>
  );
}

const smallStroke = { ...stroke, strokeWidth: 1.7 };

export function HoldTypeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="8.2" {...smallStroke} />
      <path d="M10 9v6M14 9v6" {...smallStroke} />
    </svg>
  );
}

export function PressTypeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 18h4" {...smallStroke} />
      <path d="M8 18 18 8" {...smallStroke} />
      <path d="M12 8h6v6" {...smallStroke} />
    </svg>
  );
}

export function PushUpTypeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 3v7M9 7l3 3 3-3" {...smallStroke} />
      <path d="M12 21v-7M9 17l3-3 3 3" {...smallStroke} />
    </svg>
  );
}
