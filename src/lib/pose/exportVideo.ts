import {
  PoseLandmarker,
  DrawingUtils,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { scoreAngles, globalScore, type CriterionScore } from "./scoring";
import { getLandmarker } from "./runAnalysis";
import { seekTo, playSegment } from "@/lib/video/playback";
import { createVideoWriter } from "@/lib/video/writer";
import { computeAngles } from "./angles";
import { drawAngleLabels } from "./canvasHud";
import { buildTargetPose, type TargetPose } from "./targetPose";
import type { Progression } from "./grid";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Plafond de résolution de l'export.
//
// L'export sortait auparavant en 1080p quelle que soit la source, au motif
// qu'Instagram et TikTok recompressent de toute façon. C'était vrai pour la
// republication, mais faux pour l'utilisateur : une vidéo filmée en 4K
// revenait dégradée, et le fichier téléchargé n'était plus utilisable pour
// autre chose que le réseau social. On exporte donc désormais à la
// résolution native de la source, plafonnée à l'UHD.
//
// Deux effets à connaître. Le rendu par image coûte quatre fois plus cher en
// 4K qu'en 1080p, l'export est donc plus long. Et si l'encodeur de l'appareil
// refuse la résolution native, createVideoWriter redescend automatiquement
// par paliers (voir writer.ts) : on ne perd jamais l'export, seulement des
// pixels.
const MAX_EXPORT_DIMENSION = 3840;

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Épaules",
  shoulder_flexion: "Épaules",
  pelvis_deviation: "Bassin",
  hip_angle: "Hanches",
  knee_angle: "Genoux",
  elbow_angle: "Coudes",
  body_line_angle: "Axe",
  torso_angle: "Tronc",
  straightest_knee_angle: "Jambe tendue",
  straightest_leg_hip_angle: "Hanche (jambe tendue)",
  bent_knee_angle: "Jambe repliée",
};

// Palette feu tricolore, saturée pour un rendu net en incrustation vidéo
// (les teintes trop pâles se noient dans une image en fond) — teintes
// choisies pour correspondre à une référence fournie par l'utilisateur :
// vert vif pour optimal, jaune saturé pour bon, orange franc pour faible.
function scoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 5) return "#eab308";
  return "#f97316";
}

// Dessine plusieurs segments de texte à des tailles/couleurs différentes
// bout à bout (ex. "1.1" en grand + "s" en petit) comme un seul bloc aligné
// sur x selon align. Le canvas ne permet pas de mélanger les tailles dans
// un seul fillText, d'où ce petit layout manuel.
function drawMixedText(
  ctx: CanvasRenderingContext2D,
  parts: { text: string; font: string; color: string }[],
  x: number,
  y: number,
  align: "left" | "center" | "right" = "left"
) {
  const widths = parts.map((p) => {
    ctx.font = p.font;
    return ctx.measureText(p.text).width;
  });
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  let cursor = align === "center" ? x - totalWidth / 2 : align === "right" ? x - totalWidth : x;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  parts.forEach((p, i) => {
    ctx.font = p.font;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, cursor, y);
    cursor += widths[i];
  });
}

function roundedRectPath(
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

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

// Carte compacte centrée en haut (figure + chrono du hold en grand) et
// carte pleine largeur en bas (score global + une barre de progression par
// critère) — inspiré d'une référence fournie par l'utilisateur. Tailles
// proportionnelles à une largeur de référence de 400px pour rester
// lisibles sur toutes les résolutions d'export.
function drawHud(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  {
    figureLabel,
    elapsedSeconds,
    globalScoreValue,
    scores,
  }: {
    figureLabel: string;
    elapsedSeconds: number;
    globalScoreValue: number;
    scores: CriterionScore[];
  }
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 400;
  const margin = 16 * scale;
  const radius = 14 * scale;
  // Fond plus transparent que la première version : la priorité est de
  // bien voir la personne exécuter la figure, le HUD reste un repère
  // discret en surimpression, pas un écran d'app qui recouvre la vidéo.
  const cardBackground = "rgba(2,6,23,0.62)";

  // --- Carte haut-centre : nom de la figure + chrono du hold, en petit ---
  const topPaddingX = 14 * scale;
  const figureFont = `700 ${11 * scale}px sans-serif`;
  const holdLabelFont = `700 ${7 * scale}px sans-serif`;
  const timerFont = `700 ${20 * scale}px sans-serif`;
  const timerSuffixFont = `600 ${10 * scale}px sans-serif`;

  ctx.font = figureFont;
  const figureLabelWidth = ctx.measureText(figureLabel).width;
  ctx.font = timerFont;
  const timerWidth = ctx.measureText(elapsedSeconds.toFixed(1)).width;
  ctx.font = timerSuffixFont;
  const timerSuffixWidth = ctx.measureText("s").width;

  const topContentWidth = Math.max(
    figureLabelWidth,
    timerWidth + timerSuffixWidth,
    50 * scale
  );
  const topCardWidth = topContentWidth + topPaddingX * 2;
  const topCardHeight = 62 * scale;
  const topCardX = (w - topCardWidth) / 2;
  const topCardY = margin;
  const topCenterX = topCardX + topCardWidth / 2;

  fillRoundedRect(ctx, topCardX, topCardY, topCardWidth, topCardHeight, radius, cardBackground);
  // Léger contour bleu, comme sur la référence visuelle du user — un
  // encadré subtil qui donne à la carte du timer une identité colorée
  // sans peser visuellement.
  roundedRectPath(ctx, topCardX, topCardY, topCardWidth, topCardHeight, radius);
  ctx.lineWidth = 1.2 * scale;
  ctx.strokeStyle = "rgba(56,189,248,0.55)";
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8fafc";
  ctx.font = figureFont;
  ctx.fillText(figureLabel, topCenterX, topCardY + 17 * scale);

  ctx.fillStyle = "#94a3b8";
  ctx.font = holdLabelFont;
  ctx.fillText("HOLD", topCenterX, topCardY + 28 * scale);

  drawMixedText(
    ctx,
    [
      { text: elapsedSeconds.toFixed(1), font: timerFont, color: "#38bdf8" },
      { text: "s", font: timerSuffixFont, color: "#38bdf8" },
    ],
    topCenterX,
    topCardY + 52 * scale,
    "center"
  );

  // --- Carte bas pleine largeur : score global + barres par critère, en discret ---
  const cardPadding = 12 * scale;
  const cardWidth = w - margin * 2;
  const headerHeight = 22 * scale;
  const rowHeight = 21 * scale;
  const cardHeight = headerHeight + scores.length * rowHeight + cardPadding * 2;
  const cardX = margin;
  const cardY = h - margin - cardHeight;

  fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius, cardBackground);

  const headerY = cardY + cardPadding + 10 * scale;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 ${9 * scale}px sans-serif`;
  ctx.fillText("SCORE", cardX + cardPadding, headerY);

  const globalColor = scoreColor(globalScoreValue);
  drawMixedText(
    ctx,
    [
      { text: globalScoreValue.toFixed(1), font: `700 ${12 * scale}px sans-serif`, color: globalColor },
      { text: "/10", font: `600 ${8 * scale}px sans-serif`, color: globalColor },
    ],
    cardX + cardWidth - cardPadding,
    headerY,
    "right"
  );

  const labelWidth = 70 * scale;
  const valueWidth = 44 * scale;
  const barGap = 8 * scale;
  const barX = cardX + cardPadding + labelWidth + barGap;
  const barWidth = cardWidth - cardPadding * 2 - labelWidth - valueWidth - barGap * 2;
  const barHeight = 6 * scale;
  const rowsTop = cardY + cardPadding + headerHeight;

  scores.forEach((s, i) => {
    const rowCenterY = rowsTop + i * rowHeight + rowHeight / 2;
    const textY = rowCenterY + 3 * scale;
    const barY = rowCenterY - barHeight / 2;
    const fillColor = scoreColor(s.score);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `600 ${10 * scale}px sans-serif`;
    ctx.fillText(CRITERE_LABELS[s.critere], cardX + cardPadding, textY);

    fillRoundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2, "rgba(148,163,184,0.25)");
    const filledWidth = Math.max(
      barHeight,
      (Math.max(0, Math.min(10, s.score)) / 10) * barWidth
    );
    fillRoundedRect(ctx, barX, barY, filledWidth, barHeight, barHeight / 2, fillColor);

    drawMixedText(
      ctx,
      [
        { text: s.score.toFixed(1), font: `700 ${10 * scale}px sans-serif`, color: fillColor },
        { text: "/10", font: `500 ${7 * scale}px sans-serif`, color: fillColor },
      ],
      cardX + cardWidth - cardPadding,
      textY,
      "right"
    );
  });

  // --- Filigrane de marque, coin haut-droit ---
  // Présent sur chaque frame : c'est le levier de croissance organique de
  // l'app (toute vidéo republiée sur Instagram/TikTok porte la marque).
  // À rendre désactivable quand l'offre payante existera.
  drawWatermark(ctx, canvas);
}

// Filigrane discret : point cyan + "CALISIQ", volontairement léger pour
// ne pas parasiter la vidéo tout en restant lisible après la
// recompression des réseaux sociaux.
function drawWatermark(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const scale = w / 400;
  const margin = 16 * scale;
  const text = "CALISIQ";
  const font = `700 ${9 * scale}px sans-serif`;
  const dotRadius = 2.5 * scale;
  const gap = 5 * scale;

  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  const rightEdge = w - margin;
  const dotX = rightEdge - textWidth - gap - dotRadius;
  const centerY = margin + 9 * scale;

  ctx.save();
  ctx.globalAlpha = 0.85;

  // Halo léger pour rester lisible sur un fond clair comme sur un fond
  // sombre, sans avoir à poser un rectangle opaque.
  ctx.shadowColor = "rgba(2,6,23,0.9)";
  ctx.shadowBlur = 4 * scale;

  ctx.beginPath();
  ctx.arc(dotX, centerY - 3 * scale, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#22d3ee";
  ctx.fill();

  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = font;
  ctx.fillText(text, rightEdge, centerY);

  ctx.restore();
}

// Écran de révélation apposé après la fin du hold : un vrai moment de
// conclusion (score final en grand, dans un encadré coloré selon le
// niveau) plutôt qu'une coupure brutale sur la dernière frame de sortie.
// cardOpacity permet un fondu d'apparition ; le fond assombrit l'image
// existante plutôt que de la remplacer, pour un enchaînement plus fluide.
function drawOutro(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  {
    figureLabel,
    globalScoreValue,
    holdDurationSeconds,
    scores,
    cardOpacity,
  }: {
    figureLabel: string;
    globalScoreValue: number;
    // Durée réelle du hold à afficher à côté du score final ; null si la
    // détection n'a rien identifié de stable (voir hold-window plus haut).
    holdDurationSeconds: number | null;
    // Détail par critère (mêmes labels/couleurs que le HUD en direct) —
    // affiché en dernier bloc pour rappeler d'où vient le score final.
    scores: CriterionScore[];
    cardOpacity: number;
  }
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 400;
  const tierColor = scoreColor(globalScoreValue);

  ctx.fillStyle = "rgba(2,6,23,0.72)";
  ctx.fillRect(0, 0, w, h);

  // Hauteurs de chaque section, empilées : plus simple à faire évoluer
  // que des offsets Y absolus (ajouter/retirer un bloc ne casse plus
  // tout le reste).
  const cardWidth = Math.min(w - 32 * scale, 280 * scale);
  const cardPaddingX = 20 * scale;
  const titleSectionHeight = 44 * scale;
  const scoreSectionHeight = 78 * scale;
  const holdSectionHeight = holdDurationSeconds !== null ? 62 * scale : 0;
  const detailRowHeight = 20 * scale;
  const detailSectionHeight =
    scores.length > 0
      ? 18 * scale + scores.length * detailRowHeight + 8 * scale
      : 0;
  const brandSectionHeight = 22 * scale;
  const cardHeight =
    titleSectionHeight +
    scoreSectionHeight +
    holdSectionHeight +
    detailSectionHeight +
    brandSectionHeight;

  const cardX = (w - cardWidth) / 2;
  const cardY = (h - cardHeight) / 2;
  const centerX = w / 2;

  ctx.globalAlpha = cardOpacity;

  roundedRectPath(ctx, cardX, cardY, cardWidth, cardHeight, 20 * scale);
  ctx.fillStyle = "rgba(8,15,32,0.92)";
  ctx.fill();
  ctx.lineWidth = 2.5 * scale;
  ctx.strokeStyle = tierColor;
  ctx.stroke();

  ctx.textBaseline = "alphabetic";
  // drawMixedText remet ctx.textAlign à "left" à chaque appel, donc on
  // re-force explicitement l'alignement voulu avant chaque fillText.
  let cursorY = cardY;

  // --- Section 1 : nom de la figure ---
  cursorY += 30 * scale;
  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.font = `700 ${14 * scale}px sans-serif`;
  ctx.fillText(figureLabel, centerX, cursorY);
  cursorY += (titleSectionHeight - 30 * scale);

  // --- Section 2 : score final ---
  cursorY += 16 * scale;
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 ${10 * scale}px sans-serif`;
  ctx.fillText("SCORE FINAL", centerX, cursorY);

  cursorY += 46 * scale;
  drawMixedText(
    ctx,
    [
      { text: globalScoreValue.toFixed(1), font: `800 ${40 * scale}px sans-serif`, color: tierColor },
      { text: "/10", font: `700 ${16 * scale}px sans-serif`, color: tierColor },
    ],
    centerX,
    cursorY,
    "center"
  );
  cursorY += scoreSectionHeight - 62 * scale;

  // --- Section 3 : hold tenu (masquée si aucun hold détecté) ---
  if (holdDurationSeconds !== null) {
    const separatorY = cursorY + 8 * scale;
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(cardX + 32 * scale, separatorY);
    ctx.lineTo(cardX + cardWidth - 32 * scale, separatorY);
    ctx.stroke();

    cursorY += 26 * scale;
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = `700 ${9 * scale}px sans-serif`;
    ctx.fillText("HOLD TENU", centerX, cursorY);

    cursorY += 24 * scale;
    drawMixedText(
      ctx,
      [
        { text: holdDurationSeconds.toFixed(1), font: `700 ${22 * scale}px sans-serif`, color: "#38bdf8" },
        { text: "s", font: `600 ${11 * scale}px sans-serif`, color: "#38bdf8" },
      ],
      centerX,
      cursorY,
      "center"
    );
    cursorY += holdSectionHeight - 58 * scale;
  }

  // --- Section 4 : détail par critère (identique au HUD en direct) ---
  if (scores.length > 0) {
    const separatorY = cursorY + 4 * scale;
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(cardX + 32 * scale, separatorY);
    ctx.lineTo(cardX + cardWidth - 32 * scale, separatorY);
    ctx.stroke();

    const labelWidth = 66 * scale;
    const valueWidth = 40 * scale;
    const barGap = 8 * scale;
    const barX = cardX + cardPaddingX + labelWidth + barGap;
    const barWidth = cardWidth - cardPaddingX * 2 - labelWidth - valueWidth - barGap * 2;
    const barHeight = 5 * scale;

    cursorY += 18 * scale;
    scores.forEach((s) => {
      const rowCenterY = cursorY + detailRowHeight / 2;
      const textY = rowCenterY + 3 * scale;
      const barY = rowCenterY - barHeight / 2;
      const fillColor = scoreColor(s.score);

      ctx.textAlign = "left";
      ctx.fillStyle = "#e2e8f0";
      ctx.font = `600 ${9 * scale}px sans-serif`;
      ctx.fillText(CRITERE_LABELS[s.critere], cardX + cardPaddingX, textY);

      fillRoundedRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2, "rgba(148,163,184,0.25)");
      const filledWidth = Math.max(
        barHeight,
        (Math.max(0, Math.min(10, s.score)) / 10) * barWidth
      );
      fillRoundedRect(ctx, barX, barY, filledWidth, barHeight, barHeight / 2, fillColor);

      drawMixedText(
        ctx,
        [
          { text: s.score.toFixed(1), font: `700 ${9 * scale}px sans-serif`, color: fillColor },
        ],
        cardX + cardWidth - cardPaddingX,
        textY,
        "right"
      );

      cursorY += detailRowHeight;
    });
    cursorY += 8 * scale;
  }

  // --- Section 5 : marque ---
  ctx.textAlign = "center";
  ctx.fillStyle = "#475569";
  ctx.font = `700 ${9 * scale}px sans-serif`;
  ctx.fillText("CALISIQ", centerX, cardY + cardHeight - 12 * scale);

  ctx.globalAlpha = 1;
}

// Articulations à mettre en évidence pendant le ralenti, selon le critère
// le plus faible. Indices MediaPipe Pose (11/12 épaules, 13/14 coudes,
// 23/24 hanches, 25/26 genoux, 27/28 chevilles).
const CRITERION_LANDMARKS: Record<CriterionScore["critere"], number[]> = {
  shoulder_protraction: [11, 12],
  shoulder_flexion: [11, 12],
  pelvis_deviation: [23, 24],
  hip_angle: [23, 24],
  knee_angle: [25, 26],
  elbow_angle: [13, 14],
  body_line_angle: [11, 23, 27],
  torso_angle: [11, 23],
  straightest_knee_angle: [25, 26],
  straightest_leg_hip_angle: [23, 24],
  bent_knee_angle: [25, 26],
};

// Découpe un texte en lignes qui tiennent dans maxWidth (le canvas n'a
// aucun retour à la ligne automatique).
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Surcouche du ralenti : anneaux pulsants sur les articulations fautives
// + bandeau explicatif. C'est ce qui transforme un score en coaching —
// on montre l'endroit exact du défaut au lieu de le décrire en degrés.
function drawWeakPointOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  {
    landmarks,
    critere,
    score,
    cue,
    phase,
  }: {
    landmarks: NormalizedLandmark[] | undefined;
    critere: CriterionScore["critere"];
    score: number;
    cue: string | null;
    // 0..1, avance en boucle pour animer la pulsation des anneaux.
    phase: number;
  }
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 400;
  const accent = scoreColor(score);

  if (landmarks) {
    const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    for (const index of CRITERION_LANDMARKS[critere]) {
      const point = landmarks[index];
      if (!point) continue;
      const x = point.x * w;
      const y = point.y * h;

      ctx.save();
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.35 + 0.4 * pulse;
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.arc(x, y, (10 + 8 * pulse) * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Bandeau bas : titre "point faible" + critère + score + conseil.
  const margin = 16 * scale;
  const cardPadding = 14 * scale;
  const cardWidth = w - margin * 2;
  const cueFont = `500 ${10 * scale}px sans-serif`;
  ctx.font = cueFont;
  const cueLines = cue ? wrapText(ctx, cue, cardWidth - cardPadding * 2) : [];
  const lineHeight = 14 * scale;
  const cardHeight =
    cardPadding * 2 + 34 * scale + cueLines.length * lineHeight;
  const cardX = margin;
  const cardY = h - margin - cardHeight;

  fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 14 * scale, "rgba(2,6,23,0.82)");
  roundedRectPath(ctx, cardX, cardY, cardWidth, cardHeight, 14 * scale);
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = `700 ${9 * scale}px sans-serif`;
  ctx.fillText("POINT FAIBLE", cardX + cardPadding, cardY + cardPadding + 8 * scale);

  ctx.textAlign = "left";
  ctx.fillStyle = "#f8fafc";
  ctx.font = `700 ${13 * scale}px sans-serif`;
  ctx.fillText(
    CRITERE_LABELS[critere],
    cardX + cardPadding,
    cardY + cardPadding + 27 * scale
  );

  drawMixedText(
    ctx,
    [
      { text: score.toFixed(1), font: `700 ${13 * scale}px sans-serif`, color: accent },
      { text: "/10", font: `600 ${9 * scale}px sans-serif`, color: accent },
    ],
    cardX + cardWidth - cardPadding,
    cardY + cardPadding + 27 * scale,
    "right"
  );

  cueLines.forEach((line, i) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = cueFont;
    ctx.fillText(
      line,
      cardX + cardPadding,
      cardY + cardPadding + 44 * scale + i * lineHeight
    );
  });

  drawWatermark(ctx, canvas);
}

// Fantôme de la position idéale, superposé en pointillés : montre l'écart
// à corriger là où un chiffre en degrés reste abstrait. Reconstruit avec
// les proportions réelles de la personne (voir buildTargetPose).
function drawGhostPose(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  ghost: TargetPose,
  opacity: number
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 400;
  const toPixels = (p: { x: number; y: number }) => ({ x: p.x * w, y: p.y * h });

  const chain = [
    [ghost.shoulder, ghost.hip],
    [ghost.hip, ghost.knee],
    [ghost.knee, ghost.ankle],
    [ghost.shoulder, ghost.elbow],
    [ghost.elbow, ghost.wrist],
  ];

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.setLineDash([6 * scale, 5 * scale]);
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4ade80";
  ctx.shadowColor = "rgba(74,222,128,0.5)";
  ctx.shadowBlur = 6 * scale;

  for (const [from, to] of chain) {
    const a = toPixels(from);
    const b = toPixels(to);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.fillStyle = "#4ade80";
  for (const joint of [ghost.hip, ghost.knee, ghost.ankle, ghost.elbow]) {
    const p = toPixels(joint);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Légende du fantôme : sans elle, le spectateur ne peut pas deviner que le
// tracé vert en pointillés est la position visée et pas une seconde
// détection.
function drawGhostLegend(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, y: number) {
  const w = canvas.width;
  const scale = w / 400;
  const text = "Position idéale";
  const font = `600 ${9 * scale}px sans-serif`;
  ctx.font = font;
  const lineLength = 16 * scale;
  const gap = 6 * scale;
  const paddingX = 10 * scale;
  const contentWidth = lineLength + gap + ctx.measureText(text).width;
  const badgeWidth = contentWidth + paddingX * 2;
  const badgeHeight = 20 * scale;
  const badgeX = (w - badgeWidth) / 2;

  fillRoundedRect(ctx, badgeX, y, badgeWidth, badgeHeight, badgeHeight / 2, "rgba(2,6,23,0.72)");

  const centerY = y + badgeHeight / 2;
  ctx.save();
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(badgeX + paddingX, centerY);
  ctx.lineTo(badgeX + paddingX + lineLength, centerY);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = font;
  ctx.fillText(text, badgeX + paddingX + lineLength + gap, centerY);
  ctx.textBaseline = "alphabetic";
}

// Badge "RALENTI" en haut, pour que le spectateur comprenne que la vidéo
// n'a pas bugué et qu'on lui rejoue volontairement le moment clé.
function drawSlowMotionBadge(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const scale = w / 400;
  const text = "RALENTI · À CORRIGER";
  const font = `700 ${9 * scale}px sans-serif`;
  ctx.font = font;
  const paddingX = 12 * scale;
  const badgeWidth = ctx.measureText(text).width + paddingX * 2;
  const badgeHeight = 22 * scale;
  const badgeX = (w - badgeWidth) / 2;
  const badgeY = 16 * scale;

  fillRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2, "rgba(2,6,23,0.72)");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#38bdf8";
  ctx.font = font;
  ctx.fillText(text, w / 2, badgeY + badgeHeight / 2);
  ctx.textBaseline = "alphabetic";
}

export async function recordAnnotatedVideo({
  video,
  canvas,
  rangeStart,
  rangeEnd,
  figureLabel,
  globalScoreValue,
  scores,
  progression,
  landmarksFrames,
  landmarksTimes,
  holdStartSeconds,
  holdEndSeconds,
  holdDurationSeconds,
  weakPointCue,
  forceLegacyEncoder,
  onProgress,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  rangeStart: number;
  rangeEnd: number;
  figureLabel: string;
  // Score final (moyenne du hold) : sert de repli tant qu'aucune frame
  // n'a encore été traitée dans la boucle.
  globalScoreValue: number;
  scores: CriterionScore[];
  // Nécessaire pour recalculer un score par frame (voir plus bas) : les
  // cibles/tolérances par critère dépendent de la progression.
  progression: Progression;
  // Landmarks déjà calculés pendant l'analyse (un par frame échantillonnée
  // dans la plage rangeStart-rangeEnd) — réutilisés ici par recherche
  // proportionnelle plutôt que recalculés, pour ne pas faire tourner
  // l'inférence pose une seconde fois pendant l'enregistrement. Absent
  // (ex. export depuis un rapport d'historique sans ré-analyse récente),
  // on retombe sur une détection en direct, plus lente mais fonctionnelle.
  landmarksFrames?: NormalizedLandmark[][];
  // Instant vidéo de chaque squelette, aligné sur landmarksFrames.
  landmarksTimes?: number[];
  // Bornes réelles du hold détecté (référentiel vidéo entière). Si absentes
  // (repli historique sans ré-analyse), le chrono du HUD couvre toute la
  // plage exportée comme avant, faute de mieux.
  holdStartSeconds?: number | null;
  holdEndSeconds?: number | null;
  // Durée finale du hold (secondes) — affichée sur l'écran de révélation
  // à la fin de la vidéo, sous le score final.
  holdDurationSeconds?: number | null;
  // Conseil affiché pendant le ralenti sur le point faible (typiquement la
  // première recommandation de l'analyse).
  weakPointCue?: string | null;
  // Force l'ancienne voie d'encodage (MediaRecorder) : sert à la seconde
  // tentative automatique quand l'encodage moderne a échoué.
  forceLegacyEncoder?: boolean;
  onProgress?: (percent: number) => void;
}): Promise<{ blob: Blob; writesCorrectDuration: boolean }> {
  const hudHoldStart = holdStartSeconds ?? rangeStart;
  const hudHoldEnd = holdEndSeconds ?? rangeEnd;
  const landmarker = landmarksFrames ? null : await getLandmarker();
  const exportScale = Math.min(
    1,
    MAX_EXPORT_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
  );
  // Dimensions forcées paires : H.264 refuse les tailles impaires, et un
  // écart entre la taille configurée sur l'encodeur et celle des images
  // fournies fait échouer l'encodage image par image.
  const toEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  canvas.width = toEven(video.videoWidth * exportScale);
  canvas.height = toEven(video.videoHeight * exportScale);
  const context2d = canvas.getContext("2d");
  if (!context2d) throw new Error("Impossible d'initialiser le canvas d'export.");
  const ctx: CanvasRenderingContext2D = context2d;
  const drawingUtils = new DrawingUtils(ctx);

  // Encode via WebCodecs quand c'est possible, sinon MediaRecorder (voir
  // writer.ts) : la sortie de MediaRecorder déclare une durée fausse dans
  // son en-tête, et les importeurs stricts comme Instagram s'arrêtent à
  // cette durée au lieu de lire la vidéo entière.
  //
  // Attention : cet appel peut réduire la taille du canvas si l'encodeur de
  // l'appareil refuse la résolution d'origine. Tout le dessin qui suit lit
  // canvas.width/height à chaque image, donc s'adapte de lui-même.
  const writer = await createVideoWriter(canvas, forceLegacyEncoder);
  const commitFrame = () => writer.addFrame();

  video.currentTime = rangeStart;
  await seekTo(video, rangeStart);

  // Repli tant qu'aucune frame n'a encore été traitée (ou si une frame n'a
  // pas de landmarks détectés) : le score final sert de valeur de départ,
  // remplacé dès qu'un calcul en direct est disponible.
  let liveScores = scores;
  let liveGlobalScoreValue = globalScoreValue;

  // Recherche du squelette correspondant à un instant donné.
  //
  // Auparavant l'indice était déduit d'une simple règle de trois sur la
  // progression, ce qui suppose que les images analysées sont espacées
  // régulièrement. Elles ne le sont pas : l'analyse tourne sur
  // requestAnimationFrame pendant une lecture en temps réel, et sa cadence
  // varie avec la charge de l'inférence. D'où un squelette qui dérivait
  // progressivement par rapport au corps.
  //
  // On cherche donc l'image horodatée la plus proche. Recherche
  // dichotomique parce que la fonction est appelée à chaque image de
  // l'export, sur des tableaux de plusieurs centaines d'entrées.
  function landmarksAtTime(mediaTime: number): NormalizedLandmark[] | undefined {
    if (!landmarksFrames) {
      return landmarker?.detectForVideo(video, performance.now()).landmarks[0];
    }
    if (landmarksFrames.length === 0) return undefined;
    // Horodatage absent (analyse antérieure à son introduction) : repli sur
    // l'ancien comportement proportionnel, imparfait mais fonctionnel.
    if (!landmarksTimes || landmarksTimes.length !== landmarksFrames.length) {
      const progress = (mediaTime - rangeStart) / (rangeEnd - rangeStart);
      const index = Math.min(
        landmarksFrames.length - 1,
        Math.max(0, Math.floor(progress * landmarksFrames.length))
      );
      return landmarksFrames[index];
    }

    let low = 0;
    let high = landmarksTimes.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (landmarksTimes[mid] < mediaTime) low = mid + 1;
      else high = mid;
    }
    // Entre deux images encadrantes, garder la plus proche dans le temps.
    if (
      low > 0 &&
      Math.abs(landmarksTimes[low - 1] - mediaTime) <
        Math.abs(landmarksTimes[low] - mediaTime)
    ) {
      low -= 1;
    }
    return landmarksFrames[low];
  }

  // --- Passe 1 : la figure, annotée en direct ---
  await playSegment({
    video,
    from: rangeStart,
    to: rangeEnd,
    drawFrame(mediaTime) {
      const elapsed = mediaTime - rangeStart;
      const progress = Math.min(1, Math.max(0, elapsed / (rangeEnd - rangeStart)));
      // Plafonné à 90 : après cette passe il reste le ralenti et l'écran
      // final. 100% n'est envoyé qu'une fois le fichier réellement prêt.
      onProgress?.(Math.min(90, Math.round(progress * 90)));

      const landmarks = landmarksAtTime(mediaTime);

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (landmarks) {
        const liveAngles = computeAngles(landmarks);
        drawingUtils.drawLandmarks(landmarks, { radius: 4, color: "#22d3ee" });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: "#22d3ee",
          lineWidth: 3,
        });
        drawAngleLabels(ctx, canvas, landmarks, liveAngles);

        // Score recalculé à partir de la pose de cette frame précise tant
        // que le hold est en cours : c'est ce qui fait évoluer les barres
        // par critère en direct pendant la figure plutôt qu'un chiffre figé.
        if (mediaTime < hudHoldEnd) {
          liveScores = scoreAngles(liveAngles, progression);
          liveGlobalScoreValue = globalScore(liveScores);
        }
      }

      // Une fois le hold terminé (sortie de figure), on verrouille sur le
      // vrai score final (moyenne du hold complet) plutôt que de continuer
      // à afficher un score recalculé sur une posture de sortie qui n'a
      // plus rien à voir avec la figure évaluée.
      if (mediaTime >= hudHoldEnd) {
        liveScores = scores;
        liveGlobalScoreValue = globalScoreValue;
      }

      // Le chrono affiché ne défile que pendant le hold réel : figé à 0
      // avant que la figure ne soit tenue (mise en place), et figé à la
      // durée finale une fois la figure relâchée (sortie), plutôt que de
      // suivre le temps écoulé sur toute la plage exportée.
      const holdElapsed =
        Math.min(mediaTime, hudHoldEnd) - hudHoldStart;

      drawHud(ctx, canvas, {
        figureLabel,
        elapsedSeconds: Math.max(0, holdElapsed),
        globalScoreValue: liveGlobalScoreValue,
        scores: liveScores,
      });
      commitFrame();
    },
  });

  // --- Passe 2 : ralenti sur la position la mieux tenue ---
  // On rejoue le moment où la figure est le mieux exécutée, en y pointant
  // le critère le plus faible. Viser au contraire la frame la PIRE (version
  // précédente) posait deux problèmes : par définition c'est un cas isolé,
  // donc souvent un raté ponctuel de détection plutôt qu'un vrai défaut, et
  // ce n'est pas représentatif de la technique réellement tenue.
  const weakest = scores.length > 0
    ? scores.reduce((worst, s) => (s.score < worst.score ? s : worst))
    : null;

  if (weakest && landmarksFrames && landmarksFrames.length > 0) {
    const total = landmarksFrames.length;
    const span = rangeEnd - rangeStart;
    const timeAt = (i: number) => rangeStart + (i / total) * span;

    // Le score global par frame indique directement quand le corps est en
    // position : il reste mauvais pendant la mise en place et atteint son
    // plateau une fois la figure tenue. Son maximum est donc le meilleur
    // instant à montrer. (La fenêtre de hold ne suffirait pas : son seuil
    // de mouvement est volontairement permissif pour ne pas rater les
    // holds tremblants, donc elle englobe l'entrée et la sortie.)
    let bestIndex = -1;
    let bestGlobal = -Infinity;
    for (let i = 0; i < total; i++) {
      const t = timeAt(i);
      if (t < hudHoldStart || t > hudHoldEnd) continue;
      const frameGlobal = globalScore(
        scoreAngles(computeAngles(landmarksFrames[i]), progression)
      );
      if (frameGlobal > bestGlobal) {
        bestGlobal = frameGlobal;
        bestIndex = i;
      }
    }

    const worstIndex = bestIndex;
    // Score affiché : celui du rapport final (médiane sur tout le hold),
    // pas la valeur de cette frame précise — pour rester cohérent avec le
    // HUD et l'écran de fin, et éviter d'annoncer deux chiffres différents
    // pour le même critère dans la même vidéo.
    const worstScore = weakest.score;

    if (worstIndex >= 0) {
      const worstTime = timeAt(worstIndex);
      // Borné à la fenêtre du hold et pas à la vidéo entière : sans ça, le
      // demi-seconde de contexte autour du moment clé pouvait repartir sur
      // la phase d'entrée dans la figure, exactement ce qu'on cherche à
      // ne pas montrer comme "erreur".
      const replayFrom = Math.max(hudHoldStart, worstTime - 0.5);
      // Au moins 0.4s de matière, quitte à mordre en dehors de la fenêtre
      // du hold : sur un hold très court, borner des deux côtés pouvait
      // produire un intervalle vide, et le ralenti était alors sauté sans
      // que rien ne le signale.
      const replayTo = Math.max(
        replayFrom + 0.4,
        Math.min(hudHoldEnd, worstTime + 0.5)
      );
      const replayStartedAt = performance.now();

      await playSegment({
        video,
        from: replayFrom,
        to: replayTo,
        // 0.25x : ~1s de vidéo étalée sur ~4s, assez lent pour voir le
        // défaut sans casser le rythme de la vidéo publiée.
        playbackRate: 0.25,
        drawFrame(mediaTime) {
          const landmarks = landmarksAtTime(mediaTime);

          const phase = ((performance.now() - replayStartedAt) / 900) % 1;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (landmarks) {
            // Squelette volontairement atténué ici : l'attention doit aller
            // au fantôme et aux anneaux du point faible, pas au tracé complet.
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
              color: "rgba(34,211,238,0.35)",
              lineWidth: 2,
            });

            // Fantôme de la position idéale : l'écart entre le tracé vert
            // et le corps réel rend le défaut visible d'un coup d'œil.
            const ghost = buildTargetPose(landmarks, progression);
            if (ghost) {
              drawGhostPose(ctx, canvas, ghost, 0.55 + 0.3 * Math.sin(phase * Math.PI * 2));
              drawGhostLegend(ctx, canvas, 44 * (canvas.width / 400));
            }
          }

          drawSlowMotionBadge(ctx, canvas);
          drawWeakPointOverlay(ctx, canvas, {
            landmarks,
            critere: weakest.critere,
            score: worstScore,
            cue: weakPointCue ?? null,
            phase,
          });
          commitFrame();
        },
      });
    }
  }
  onProgress?.(95);

  // Écran de révélation du score final, apposé après la fin du hold plutôt
  // que de couper directement sur la dernière frame (sortie de figure) —
  // fondu d'apparition sur les ~600 premières ms, puis tenu à l'écran.
  // ~25 images/seconde plutôt que 10 : le fondu d'apparition est plus
  // fluide, et surtout la phase produit assez d'images pour peser dans le
  // fichier final au lieu de passer pour un gel d'image.
  const OUTRO_STEP_MS = 40;
  const OUTRO_STEPS = 60;
  const OUTRO_FADE_STEPS = 15;
  for (let i = 0; i < OUTRO_STEPS; i++) {
    const cardOpacity = Math.min(1, (i + 1) / OUTRO_FADE_STEPS);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawOutro(ctx, canvas, {
      figureLabel,
      globalScoreValue,
      holdDurationSeconds: holdDurationSeconds ?? null,
      scores,
      cardOpacity,
    });
    commitFrame();
    await sleep(OUTRO_STEP_MS);
  }

  video.pause();
  const blob = await writer.finish();
  onProgress?.(100);
  return { blob, writesCorrectDuration: writer.writesCorrectDuration };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
