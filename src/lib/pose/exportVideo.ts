import {
  PoseLandmarker,
  DrawingUtils,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { scoreAngles, globalScore, type CriterionScore } from "./scoring";
import { getLandmarker, seekTo } from "./runAnalysis";
import { computeAngles } from "./angles";
import { drawAngleLabels } from "./canvasHud";
import type { Progression } from "./grid";

const EXPORT_FPS = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// requestVideoFrameCallback n'est pas encore dans tous les lib.dom.d.ts —
// typé ici a minima plutôt que d'élargir le lib cible du projet pour ça.
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void
  ) => number;
};

// Taille max de sortie, alignée sur ce que consomment réellement Instagram/
// TikTok (1080x1920 en portrait) — exporter en UHD natif (souvent 2160x3840
// sur un téléphone récent) n'apporte aucune qualité visible une fois republié
// (le réseau recompresse de toute façon) et multiplie par 4 le travail de
// rendu par frame, l'une des causes du saccadé à l'enregistrement.
const MAX_EXPORT_DIMENSION = 1080;

// MP4 en priorité : format fiable pour republier sur Instagram/réseaux sociaux.
// WebM en repli pour les navigateurs qui ne savent pas encoder de MP4.
const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickSupportedMimeType(): string {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Épaules",
  shoulder_flexion: "Épaules",
  pelvis_deviation: "Bassin",
  hip_angle: "Hanches",
  knee_angle: "Genoux",
  elbow_angle: "Coudes",
  body_line_angle: "Axe",
};

// Palette feu tricolore (vert/jaune/rouge) : plus lisible en incrustation
// vidéo qu'un dégradé à 3 teintes proches, et c'est le code couleur que la
// référence utilise pour ses barres de progression.
function scoreColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 5) return "#facc15";
  return "#f87171";
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

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8fafc";
  ctx.font = figureFont;
  ctx.fillText(figureLabel, topCenterX, topCardY + 17 * scale);

  ctx.fillStyle = "#c4b5fd";
  ctx.font = holdLabelFont;
  ctx.fillText("HOLD", topCenterX, topCardY + 28 * scale);

  drawMixedText(
    ctx,
    [
      { text: elapsedSeconds.toFixed(1), font: timerFont, color: "#c4b5fd" },
      { text: "s", font: timerSuffixFont, color: "#c4b5fd" },
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
    cardOpacity,
  }: { figureLabel: string; globalScoreValue: number; cardOpacity: number }
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 400;
  const tierColor = scoreColor(globalScoreValue);

  ctx.fillStyle = "rgba(2,6,23,0.72)";
  ctx.fillRect(0, 0, w, h);

  const cardWidth = Math.min(w - 48 * scale, 220 * scale);
  const cardHeight = 170 * scale;
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

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8fafc";
  ctx.font = `700 ${14 * scale}px sans-serif`;
  ctx.fillText(figureLabel, centerX, cardY + 34 * scale);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 ${10 * scale}px sans-serif`;
  ctx.fillText("SCORE FINAL", centerX, cardY + 52 * scale);

  drawMixedText(
    ctx,
    [
      { text: globalScoreValue.toFixed(1), font: `800 ${46 * scale}px sans-serif`, color: tierColor },
      { text: "/10", font: `700 ${18 * scale}px sans-serif`, color: tierColor },
    ],
    centerX,
    cardY + 116 * scale,
    "center"
  );

  ctx.fillStyle = "#475569";
  ctx.font = `700 ${9 * scale}px sans-serif`;
  ctx.fillText("CALISIQ", centerX, cardY + cardHeight - 16 * scale);

  ctx.globalAlpha = 1;
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
  holdStartSeconds,
  holdEndSeconds,
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
  // Bornes réelles du hold détecté (référentiel vidéo entière). Si absentes
  // (repli historique sans ré-analyse), le chrono du HUD couvre toute la
  // plage exportée comme avant, faute de mieux.
  holdStartSeconds?: number | null;
  holdEndSeconds?: number | null;
  onProgress?: (percent: number) => void;
}): Promise<Blob> {
  const hudHoldStart = holdStartSeconds ?? rangeStart;
  const hudHoldEnd = holdEndSeconds ?? rangeEnd;
  const landmarker = landmarksFrames ? null : await getLandmarker();
  const exportScale = Math.min(
    1,
    MAX_EXPORT_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
  );
  canvas.width = Math.round(video.videoWidth * exportScale);
  canvas.height = Math.round(video.videoHeight * exportScale);
  const context2d = canvas.getContext("2d");
  if (!context2d) throw new Error("Impossible d'initialiser le canvas d'export.");
  const ctx: CanvasRenderingContext2D = context2d;
  const drawingUtils = new DrawingUtils(ctx);

  const mimeType = pickSupportedMimeType();
  // ~9 bits/pixel/frame à 30fps : nettement au-dessus du bitrate par défaut
  // du navigateur, pour un rendu net et publiable plutôt que compressé.
  const videoBitsPerSecond = Math.min(
    25_000_000,
    Math.max(6_000_000, Math.round(canvas.width * canvas.height * 9))
  );
  const canvasStream = canvas.captureStream(EXPORT_FPS);
  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(e);
  });

  // Piloté par requestVideoFrameCallback plutôt que par seek manuel ou par
  // requestAnimationFrame : seeker image par image s'est révélé bien pire
  // (chercher une position précise force le navigateur à redécoder depuis
  // l'image-clé précédente, ce qui peut coûter largement plus qu'un cycle
  // d'image selon la vidéo — d'où le rendu au ralenti observé). rAF seul a
  // le défaut inverse : il tourne sur l'horloge d'affichage, indépendante
  // de la vidéo, et peut donc sauter des portions de la source si le dessin
  // prend du retard. requestVideoFrameCallback se déclenche exactement une
  // fois par frame vidéo réellement décodée pendant une lecture normale —
  // aucun seek, aucune horloge indépendante, la durée de sortie suit
  // naturellement la vraie durée de lecture.
  const supportsFrameCallback =
    typeof (video as VideoWithFrameCallback).requestVideoFrameCallback === "function";

  video.currentTime = rangeStart;
  await seekTo(video, rangeStart);
  // Timeslice de 1s : sans argument, MediaRecorder n'encode et ne livre
  // rien pendant l'enregistrement, il accumule tout en mémoire et ne fait
  // le travail d'encodage réel qu'au moment de stop() — d'où l'attente
  // invisible après 99%. Avec un timeslice, l'encodage est étalé pendant
  // l'enregistrement (visible dans la progression 0-99%), et il ne reste
  // au stop() que le dernier fragment (~1s) à finaliser.
  recorder.start(1000);
  await video.play();

  // Repli tant qu'aucune frame n'a encore été traitée (ou si une frame n'a
  // pas de landmarks détectés) : le score final sert de valeur de départ,
  // remplacé dès qu'un calcul en direct est disponible.
  let liveScores = scores;
  let liveGlobalScoreValue = globalScoreValue;

  await new Promise<void>((resolve) => {
    function drawFrame(mediaTime: number) {
      const elapsed = mediaTime - rangeStart;
      const progress = Math.min(1, Math.max(0, elapsed / (rangeEnd - rangeStart)));
      // Plafonné à 99 : la dernière frame dessinée n'est pas encore la
      // vidéo finale, il reste l'assemblage du fichier par le navigateur
      // (recorder.stop() + flush) une fois la boucle de dessin terminée.
      // 100% n'est envoyé qu'une fois ce fichier réellement prêt, plus bas.
      onProgress?.(Math.min(99, Math.round(progress * 100)));

      let landmarks: NormalizedLandmark[] | undefined;
      if (landmarksFrames) {
        const frameIndex = Math.min(
          landmarksFrames.length - 1,
          Math.max(0, Math.floor(progress * landmarksFrames.length))
        );
        landmarks = landmarksFrames[frameIndex];
      } else {
        landmarks = landmarker?.detectForVideo(video, performance.now()).landmarks[0];
      }

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
    }

    function finishedRange() {
      return video.paused || video.ended || video.currentTime >= rangeEnd;
    }

    // requestVideoFrameCallback ne se redéclenche que s'il existe une
    // prochaine frame à présenter : si la vidéo atteint sa fin et se met en
    // pause juste après avoir présenté l'avant-dernière image, il n'y a
    // plus jamais de "prochaine frame" pour déclencher un dernier appel —
    // la boucle attendrait alors indéfiniment un callback qui ne vient
    // plus, sans jamais résoudre l'export. Les événements 'ended'/'pause'
    // du lecteur servent de filet pour terminer proprement dans ce cas, et
    // un timeout de sécurité couvre tout autre blocage imprévu.
    let settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(safetyTimeout);
      video.removeEventListener("ended", finish);
      video.removeEventListener("pause", finish);
      video.pause();
      resolve();
    }
    const safetyTimeout = setTimeout(
      finish,
      Math.max(5000, (rangeEnd - rangeStart) * 1000 * 3)
    );
    video.addEventListener("ended", finish);
    video.addEventListener("pause", finish);

    if (supportsFrameCallback) {
      const videoWithCallback = video as Required<VideoWithFrameCallback>;
      function onFrame(_now: number, metadata: { mediaTime: number }) {
        if (settled || finishedRange()) {
          finish();
          return;
        }
        drawFrame(metadata.mediaTime);
        if (!settled) videoWithCallback.requestVideoFrameCallback(onFrame);
      }
      videoWithCallback.requestVideoFrameCallback(onFrame);
    } else {
      function loop() {
        if (settled || finishedRange()) {
          finish();
          return;
        }
        drawFrame(video.currentTime);
        if (!settled) requestAnimationFrame(loop);
      }
      loop();
    }
  });

  // Écran de révélation du score final, apposé après la fin du hold plutôt
  // que de couper directement sur la dernière frame (sortie de figure) —
  // fondu d'apparition sur les ~600 premières ms, puis tenu à l'écran.
  const OUTRO_STEP_MS = 100;
  const OUTRO_STEPS = 20;
  const OUTRO_FADE_STEPS = 6;
  for (let i = 0; i < OUTRO_STEPS; i++) {
    const cardOpacity = Math.min(1, (i + 1) / OUTRO_FADE_STEPS);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawOutro(ctx, canvas, { figureLabel, globalScoreValue, cardOpacity });
    await sleep(OUTRO_STEP_MS);
  }

  recorder.stop();
  video.pause();
  const blob = await recorded;
  onProgress?.(100);
  return blob;
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
