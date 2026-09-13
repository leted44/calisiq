import { TIER_CANVAS_COLORS, type Tier } from "@/lib/pose/level";
import { LockIcon } from "@/components/icons";

/**
 * Le médaillon d'une figure ou d'un palier.
 *
 * POURQUOI UN HEXAGONE
 *
 * Un cercle, c'est un avatar ; un carré arrondi, c'est une carte. L'hexagone
 * ne ressemble à rien d'autre dans l'application, et c'est exactement ce
 * qu'on demande à un insigne : être reconnu avant d'être lu. La couleur porte
 * le palier, la forme porte l'idée de trophée.
 *
 * Le contour est un hexagone plein sur lequel un second, en retrait de deux
 * pixels, vient poser le fond sombre. C'est le seul moyen d'obtenir une
 * bordure nette sur une forme découpée : ni `border` ni `box-shadow` ne
 * suivent un `clip-path`. Le halo, lui, passe par `drop-shadow`, qui suit la
 * découpe.
 */

const HEXAGONE =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export default function FigureMedal({
  tier,
  size,
  locked = false,
  glow = true,
  children,
}: {
  tier: Tier;
  size: number;
  locked?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const couleur = locked ? "#334155" : TIER_CANVAS_COLORS[tier];

  return (
    <div
      className="relative shrink-0"
      style={{
        width: size,
        height: size,
        // Le halo n'est allumé qu'à partir de « maîtrise » : s'il brillait
        // partout il ne distinguerait plus rien.
        filter:
          glow && !locked && tier !== "foundations" && tier !== "solid"
            ? `drop-shadow(0 0 ${Math.round(size / 6)}px ${couleur}66)`
            : undefined,
      }}
    >
      <div
        className="absolute inset-0"
        style={{ clipPath: HEXAGONE, backgroundColor: couleur }}
      />
      <div
        className="absolute inset-[2px]"
        style={{
          clipPath: HEXAGONE,
          background: locked
            ? "#0b1220"
            : `linear-gradient(155deg, ${couleur}38, #0b1220 72%)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        {locked ? (
          <span style={{ width: size * 0.3, height: size * 0.3 }}>
            <LockIcon className="h-full w-full text-slate-600" />
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
