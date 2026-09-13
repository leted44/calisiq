import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PoseAngles } from "./angles";

const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;

function mid(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  scale: number
) {
  ctx.font = `600 ${13 * scale}px sans-serif`;
  const paddingX = 6 * scale;
  const textWidth = ctx.measureText(text).width;
  const w = textWidth + paddingX * 2;
  const h = 18 * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(2,6,23,0.78)";
  ctx.fill();

  ctx.fillStyle = "#22d3ee";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 0.5 * scale);
}

// Repères d'angle directement sur le squelette (coude, hanche, genou) — pas
// juste un panneau à côté, pour montrer concrètement à quel endroit du
// corps chaque chiffre correspond.
export function drawAngleLabels(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  angles: PoseAngles
) {
  const scale = canvas.width / 500;
  const toPixel = (p: { x: number; y: number }) => ({
    x: p.x * canvas.width,
    y: p.y * canvas.height,
  });

  const elbow = toPixel(mid(landmarks[LEFT_ELBOW], landmarks[RIGHT_ELBOW]));
  const hip = toPixel(mid(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]));
  const knee = toPixel(mid(landmarks[LEFT_KNEE], landmarks[RIGHT_KNEE]));

  // Décale chaque étiquette légèrement du point exact pour ne pas cacher
  // le repère du squelette lui-même.
  drawPill(ctx, elbow.x, elbow.y - 16 * scale, `${angles.elbowAngle.toFixed(0)}°`, scale);
  drawPill(ctx, hip.x, hip.y - 16 * scale, `${angles.hipAngle.toFixed(0)}°`, scale);
  drawPill(ctx, knee.x, knee.y - 16 * scale, `${angles.kneeAngle.toFixed(0)}°`, scale);
}

/**
 * Carte compacte en haut : nom de la figure, et le chiffre qui compte.
 *
 * POURQUOI PENDANT L'ANALYSE, ET PAS SEULEMENT À L'EXPORT
 *
 * Le chrono et le compteur de répétitions n'existaient que dans la vidéo
 * téléchargée, c'est-à-dire après coup et à côté. Or c'est pendant que
 * l'analyse défile qu'on regarde l'écran, et c'est là que voir les secondes
 * monter dit ce que la machine est en train de mesurer. Un pourcentage de
 * progression dit qu'il se passe quelque chose ; un chrono dit quoi.
 *
 * La carte reprend délibérément les proportions et les couleurs de celle de
 * l'export : ce qu'on voit défiler est exactement ce qu'on retrouvera dans la
 * vidéo, à l'image près.
 */
export function drawLiveCounter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  {
    figureLabel,
    unitLabel,
    value,
    suffix = "",
    secondary = null,
  }: {
    figureLabel: string;
    /** « HOLD » ou « REPS » : ce que mesure le grand chiffre. */
    unitLabel: string;
    value: string;
    suffix?: string;
    /**
     * Seconde mesure, en petit sous la première. Sur un hold, la part de la
     * tenue restée parfaitement immobile : c'est elle qui décide de la note,
     * alors que le grand chiffre dit ce qui a été tenu. Les deux comptent, et
     * leur écart est lui-même une information.
     */
    secondary?: string | null;
  }
) {
  const scale = canvas.width / 400;
  const marge = 16 * scale;
  const rayon = 14 * scale;
  const paddingX = 14 * scale;

  const policeFigure = `700 ${11 * scale}px sans-serif`;
  const policeUnite = `700 ${7 * scale}px sans-serif`;
  const policeValeur = `700 ${20 * scale}px sans-serif`;
  const policeSuffixe = `600 ${10 * scale}px sans-serif`;
  const policeSecondaire = `600 ${8 * scale}px sans-serif`;

  ctx.save();

  ctx.font = policeFigure;
  const largeurFigure = ctx.measureText(figureLabel).width;
  ctx.font = policeValeur;
  const largeurValeur = ctx.measureText(value).width;
  ctx.font = policeSuffixe;
  const largeurSuffixe = suffix ? ctx.measureText(suffix).width : 0;
  ctx.font = policeSecondaire;
  const largeurSecondaire = secondary ? ctx.measureText(secondary).width : 0;

  const contenu = Math.max(
    largeurFigure,
    largeurValeur + largeurSuffixe,
    largeurSecondaire,
    50 * scale
  );
  const largeur = contenu + paddingX * 2;
  const hauteur = (secondary ? 74 : 62) * scale;
  const x = (canvas.width - largeur) / 2;
  const y = marge;
  const cx = x + largeur / 2;

  roundedRect(ctx, x, y, largeur, hauteur, rayon);
  ctx.fillStyle = "rgba(2,6,23,0.62)";
  ctx.fill();
  ctx.lineWidth = 1.2 * scale;
  ctx.strokeStyle = "rgba(56,189,248,0.55)";
  ctx.stroke();

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.font = policeFigure;
  ctx.fillText(figureLabel, cx, y + 17 * scale);

  ctx.fillStyle = "#94a3b8";
  ctx.font = policeUnite;
  ctx.fillText(unitLabel, cx, y + 28 * scale);

  // Valeur et suffixe posés côte à côte à partir de la gauche : centrer
  // chacun séparément les ferait se chevaucher.
  const baseX = cx - (largeurValeur + largeurSuffixe) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#38bdf8";
  ctx.font = policeValeur;
  ctx.fillText(value, baseX, y + 52 * scale);
  if (suffix) {
    ctx.font = policeSuffixe;
    ctx.fillText(suffix, baseX + largeurValeur, y + 52 * scale);
  }

  if (secondary) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = policeSecondaire;
    ctx.fillText(secondary, cx, y + 65 * scale);
  }

  ctx.restore();
}
