import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { SCORING_GRID, type Progression } from "./grid";

// Indices MediaPipe Pose utilisés ici (mêmes que angles.ts).
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

type Point = { x: number; y: number };

// Squelette "cible" simplifié : une chaîne centrale (épaule -> hanche ->
// genou -> cheville) plus un bras, en coordonnées normalisées 0-1 comme
// les landmarks MediaPipe.
export type TargetPose = {
  shoulder: Point;
  hip: Point;
  knee: Point;
  ankle: Point;
  elbow: Point;
  wrist: Point;
};

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function normalize(v: Point): Point {
  const length = Math.hypot(v.x, v.y);
  if (length === 0) return { x: 1, y: 0 };
  return { x: v.x / length, y: v.y / length };
}

function rotate(v: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

// Place une articulation à `length` de `origin`, de sorte que l'angle formé
// avec le segment précédent vaille `angleDeg`. Deux solutions existent
// (rotation horaire ou antihoraire) : on garde celle qui tombe le plus près
// de la position réelle, sinon la jambe du fantôme pourrait basculer du côté
// opposé au corps et donner une pose absurde.
function placeJoint(
  origin: Point,
  towardPrevious: Point,
  length: number,
  angleDeg: number,
  actual: Point
): Point {
  const radians = (angleDeg * Math.PI) / 180;
  const reference = normalize({
    x: towardPrevious.x - origin.x,
    y: towardPrevious.y - origin.y,
  });

  const candidates = [radians, -radians].map((r) => {
    const dir = rotate(reference, r);
    return { x: origin.x + dir.x * length, y: origin.y + dir.y * length };
  });

  return distance(candidates[0], actual) <= distance(candidates[1], actual)
    ? candidates[0]
    : candidates[1];
}

// Construit la position idéale correspondant aux cibles de la grille, en
// réutilisant les longueurs de segments réelles de la personne : le fantôme
// a donc ses proportions et sa place dans le cadre, seuls les angles
// changent. Un pantin générique serait inutilisable comme repère visuel.
export function buildTargetPose(
  landmarks: NormalizedLandmark[],
  progression: Progression
): TargetPose | null {
  if (landmarks.length < 29) return null;
  const grid = SCORING_GRID[progression];

  const shoulder = midpoint(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]);
  const hip = midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]);
  const knee = midpoint(landmarks[LEFT_KNEE], landmarks[RIGHT_KNEE]);
  const ankle = midpoint(landmarks[LEFT_ANKLE], landmarks[RIGHT_ANKLE]);
  const elbow = midpoint(landmarks[LEFT_ELBOW], landmarks[RIGHT_ELBOW]);
  const wrist = midpoint(landmarks[LEFT_WRIST], landmarks[RIGHT_WRIST]);

  const torsoLength = distance(shoulder, hip);
  const thighLength = distance(hip, knee);
  const shinLength = distance(knee, ankle);
  const upperArmLength = distance(shoulder, elbow);
  if (torsoLength === 0) return null;

  // --- Tronc ---
  // Quand la grille impose un axe du corps (straddle, full, handstand), on
  // oriente le tronc à cet angle. En tuck, ce critère n'existe pas (jambes
  // repliées, la ligne épaule-cheville n'a pas de sens) : on garde alors
  // l'orientation réelle du tronc et on ne corrige que les angles.
  let targetHip: Point;
  const bodyLineTarget = grid.body_line_angle_from_horizontal?.target;
  if (bodyLineTarget !== undefined) {
    const actualBody = { x: ankle.x - shoulder.x, y: ankle.y - shoulder.y };
    // Le signe conserve le quadrant réel : sans ça, un handstand (corps vers
    // le haut) et une planche orientée à gauche seraient reconstruits dans
    // la mauvaise direction, l'angle cible étant exprimé sans signe (0-90°).
    const signX = Math.sign(actualBody.x) || 1;
    const signY = Math.sign(actualBody.y) || 1;
    const radians = (bodyLineTarget * Math.PI) / 180;
    targetHip = {
      x: shoulder.x + signX * Math.cos(radians) * torsoLength,
      y: shoulder.y + signY * Math.sin(radians) * torsoLength,
    };
  } else {
    targetHip = hip;
  }

  // --- Jambes ---
  // Sur une figure asymétrique (single leg), la grille n'a pas de hip_angle
  // ni de knee_angle moyennés — ils n'y auraient pas de sens. On utilise
  // alors les cibles de la jambe tendue, et à défaut l'angle réellement
  // observé, pour ne jamais dessiner un fantôme au hasard.
  const hipTarget =
    grid.hip_angle?.target ??
    grid.straightest_leg_hip_angle?.target ??
    angleBetween(shoulder, hip, knee);
  const kneeTarget =
    grid.knee_angle?.target ??
    grid.straightest_knee_angle?.target ??
    angleBetween(targetHip, knee, ankle);

  const targetKnee = placeJoint(targetHip, shoulder, thighLength, hipTarget, knee);
  const targetAnkle = placeJoint(
    targetKnee,
    targetHip,
    shinLength,
    kneeTarget,
    ankle
  );

  // --- Bras ---
  // Toutes les cibles de coude de la grille valent 176-180°, donc un bras
  // tendu : le coude idéal est simplement sur le segment épaule-poignet. À
  // revoir si une progression future vise un coude volontairement fléchi.
  const shoulderToWrist = normalize({
    x: wrist.x - shoulder.x,
    y: wrist.y - shoulder.y,
  });
  const targetElbow = {
    x: shoulder.x + shoulderToWrist.x * upperArmLength,
    y: shoulder.y + shoulderToWrist.y * upperArmLength,
  };

  return {
    shoulder,
    hip: targetHip,
    knee: targetKnee,
    ankle: targetAnkle,
    elbow: targetElbow,
    // Le poignet est le point de contact au sol : il ne bouge pas, c'est
    // l'ancrage physique de la figure.
    wrist,
  };
}

function angleBetween(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 180;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
