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

export function HandstandPushUpIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="16.5" r="1.6" {...stroke} />
      <path d="M9.5 15 12 12l2.5 3" {...stroke} />
      <path d="M12 12V9" {...stroke} />
      <path d="M12 9V3" {...stroke} />
      <path d="M8 20h8" {...stroke} />
      <path d="M12 20v-3" {...stroke} />
    </svg>
  );
}

export function OneArmHandstandIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="16.5" r="1.6" {...stroke} />
      <path d="M12 15v-6" {...stroke} />
      <path d="M12 9V3" {...stroke} />
      <path d="M12 9 17 6" {...stroke} />
      <path d="M9.5 20h5" {...stroke} />
      <path d="M12 20v-3" {...stroke} />
    </svg>
  );
}

// Front lever : même langage visuel que la planche (tête + ligne de corps
// horizontale + jambes selon la variation), mais suspendu sous une barre en
// haut plutôt qu'appuyé sur les mains en bas.
export function FrontLeverFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 3h13" {...stroke} />
      <path d="M6.5 3v6.5" {...stroke} />
      <path d="M15.5 3v6.5" {...stroke} />
      <circle cx="5" cy="11" r="1.6" {...stroke} />
      <path d="M6.4 12 9 12.5h6.5" {...stroke} />
    </svg>
  );
}

export function TuckFrontLeverIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M2 3h6" {...stroke} />
      <path d="M5 3v4" {...stroke} />
      <circle cx="5" cy="9" r="1.6" {...stroke} />
      <path d="M6.4 10 9 10.5h4" {...stroke} />
      <path d="M13 10.5c1 1.2 1 2.8 0 4" {...stroke} />
      <path d="M13 14.5c-1 .6-1.5 1.3-1.5 2.5" {...stroke} />
    </svg>
  );
}

export function AdvancedTuckFrontLeverIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M2 3h6" {...stroke} />
      <path d="M5 3v4" {...stroke} />
      <circle cx="5" cy="9" r="1.6" {...stroke} />
      <path d="M6.4 10 9 10.5h5.5" {...stroke} />
      <path d="M14.5 10.5c1.5.8 2 2.2 1.5 3.6" {...stroke} />
      <path d="M16 14.1c-.8.8-1.2 1.5-1 2.7" {...stroke} />
    </svg>
  );
}

export function StraddleFrontLeverIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M2 3h6" {...stroke} />
      <path d="M5 3v4" {...stroke} />
      <circle cx="5" cy="9" r="1.6" {...stroke} />
      <path d="M6.4 10 9 10.5h5" {...stroke} />
      <path d="M14 10.5 20 7.5" {...stroke} />
      <path d="M14 10.5 20 13.5" {...stroke} />
    </svg>
  );
}

export function FullFrontLeverIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M2 3h6" {...stroke} />
      <path d="M5 3v4" {...stroke} />
      <circle cx="5" cy="9" r="1.6" {...stroke} />
      <path d="M6.4 10 9 10.5h12" {...stroke} />
    </svg>
  );
}

export function OneLegFrontLeverIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M2 3h6" {...stroke} />
      <path d="M5 3v4" {...stroke} />
      <circle cx="5" cy="9" r="1.6" {...stroke} />
      <path d="M6.4 10 9 10.5h9" {...stroke} />
      <path d="M18 10.5v5" {...stroke} />
    </svg>
  );
}

export function OneArmFrontLeverIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M2 3h5" {...stroke} />
      <path d="M4.5 3v6" {...stroke} />
      <circle cx="5" cy="9.5" r="1.6" {...stroke} />
      <path d="M6.4 10.5 9 11h12" {...stroke} />
      <path d="M9 11 6 14.5" {...stroke} />
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

export function DragonFlagFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 7h5" {...stroke} />
      <circle cx="5.5" cy="5.2" r="1.5" {...stroke} />
      <path d="M7 7.5 20 15" {...stroke} />
    </svg>
  );
}

export function TuckDragonFlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 7h5" {...stroke} />
      <circle cx="5.5" cy="5.2" r="1.5" {...stroke} />
      <path d="M7 7.5 14 12" {...stroke} />
      <path d="M14 12l3.5-1.5" {...stroke} />
      <path d="M17.5 10.5 16 14" {...stroke} />
    </svg>
  );
}

export function StraddleDragonFlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 7h5" {...stroke} />
      <circle cx="5.5" cy="5.2" r="1.5" {...stroke} />
      <path d="M7 7.5 14 12" {...stroke} />
      <path d="M14 12 21 12" {...stroke} />
      <path d="M14 12 20 17" {...stroke} />
    </svg>
  );
}

export function FullDragonFlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 7h5" {...stroke} />
      <circle cx="5.5" cy="5.2" r="1.5" {...stroke} />
      <path d="M7 7.5 21 15" {...stroke} />
      <path d="M18.5 13.4 20 11.5" {...stroke} />
    </svg>
  );
}

// --- Exercices à répétition ---
// Pictogrammes sobres : la flèche verticale indique le sens du mouvement,
// c'est ce qui les distingue des figures tenues.

export function PullUpFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M3 5h18" {...stroke} />
      <circle cx="12" cy="10" r="1.6" {...stroke} />
      <path d="M9 5.5 12 8.6 15 5.5" {...stroke} />
      <path d="M12 11.6v5" {...stroke} />
      <path d="M20 10v5m0-5-1.6 1.6M20 10l1.6 1.6" {...stroke} />
    </svg>
  );
}

export function DipFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M4 7h5M15 7h5" {...stroke} />
      <circle cx="12" cy="9" r="1.6" {...stroke} />
      <path d="M8 7.5 12 10.6 16 7.5" {...stroke} />
      <path d="M12 10.6v5.5" {...stroke} />
      <path d="M12 16.1 10 20M12 16.1 14 20" {...stroke} />
    </svg>
  );
}

export function PushUpFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="5" cy="9.5" r="1.6" {...stroke} />
      <path d="M6.6 10.2 19 14" {...stroke} />
      <path d="M9 11 9 17M17 13.4 17 17" {...stroke} />
      <path d="M3 20h18" {...stroke} />
    </svg>
  );
}

export function PistolFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="10" cy="4.5" r="1.6" {...stroke} />
      <path d="M10 6.1v5" {...stroke} />
      <path d="M10 11.1 8 15.5 10 20" {...stroke} />
      <path d="M10 11.1 16 12.5" {...stroke} />
      <path d="M4 20h16" {...stroke} />
    </svg>
  );
}

// --- Drapeau (human flag) ---
// Corps horizontal accroché à un mât vertical : c'est le mât qui distingue le
// drapeau du front lever au premier coup d'œil.

export function HumanFlagFigureIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M18 3v18" {...stroke} />
      <path d="M18 7 15 11" {...stroke} />
      <path d="M18 16 15 12.5" {...stroke} />
      <circle cx="14" cy="11.6" r="1.5" {...stroke} />
      <path d="M12.6 11.8 3 12" {...stroke} />
    </svg>
  );
}

export function TuckHumanFlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M18 3v18" {...stroke} />
      <path d="M18 7 15 11" {...stroke} />
      <path d="M18 16 15 12.5" {...stroke} />
      <circle cx="14" cy="11.6" r="1.5" {...stroke} />
      <path d="M12.6 11.8 9 12" {...stroke} />
      <path d="M9 12 7 9.5" {...stroke} />
      <path d="M7 9.5 5 12" {...stroke} />
    </svg>
  );
}

export function StraddleHumanFlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M18 3v18" {...stroke} />
      <path d="M18 7 15 11" {...stroke} />
      <path d="M18 16 15 12.5" {...stroke} />
      <circle cx="14" cy="11.6" r="1.5" {...stroke} />
      <path d="M12.6 11.8 9 12" {...stroke} />
      <path d="M9 12 3 9" {...stroke} />
      <path d="M9 12 3 15" {...stroke} />
    </svg>
  );
}

export function FullHumanFlagIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M18 3v18" {...stroke} />
      <path d="M18 7 15 11" {...stroke} />
      <path d="M18 16 15 12.5" {...stroke} />
      <circle cx="14" cy="11.6" r="1.5" {...stroke} />
      <path d="M12.6 11.8 2.5 12" {...stroke} />
      <path d="M4 11 2.5 12 4 13" {...stroke} />
    </svg>
  );
}
