import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  computeAngles,
  medianAngles,
  detectHoldWindow,
  type PoseAngles,
  type HoldWindow,
} from "./angles";
import {
  scoreAngles,
  globalScore,
  globalScoreWithMajorFault,
  scoreReps,
  type CriterionScore,
} from "./scoring";
import {
  pickWeakestCriterion,
  recommendationsFor,
  type Recommendation,
} from "./recommendations";
import type { Progression } from "./grid";
import {
  isRepProgression,
  REP_SCORING_GRID,
  type AnyProgression,
} from "./grid";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { detectReps } from "./repAnalysis";
import { drawAngleLabels } from "./canvasHud";
import { seekTo } from "@/lib/video/playback";
import type { Lang } from "@/lib/i18n/config";

// Avertissements dans la langue demandée. Accès direct aux dictionnaires
// plutôt qu'au contexte React, qui n'existe pas ici : l'analyse tourne sur
// une boucle d'animation, hors de tout composant.
const w = (lang: Lang) => DICTIONARIES[lang].warnings;

// Note minimale, sur le critère le plus faible, pour qu'une image compte
// comme montrant la figure. Deux sur dix : assez bas pour accepter une
// exécution médiocre, assez haut pour rejeter une position qui n'a rien à
// voir, comme une suspension avant l'entrée en figure.
const IN_FIGURE_FLOOR = 2;

let sharedLandmarkerPromise: Promise<PoseLandmarker> | null = null;

export function getLandmarker() {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    ).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          // Modèle "heavy" (le plus précis des 3 tiers MediaPipe, plus lourd
          // que "full") : les figures de calisthénie (inversées, membres
          // repliés) s'éloignent beaucoup des poses "debout" habituelles,
          // la précision supplémentaire compte plus que la vitesse de
          // chargement ici.
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    );
  }
  return sharedLandmarkerPromise;
}


export type PoseAnalysisResult =
  | {
      ok: true;
      framesAnalyzed: number;
      detectionRate: number;
      warning: string | null;
      holdWindow: HoldWindow;
      holdDurationSeconds: number | null;
      // Nombre de répétitions détectées, sur un exercice dynamique. Null sur
      // un hold, où la notion n'a pas de sens — comme holdDurationSeconds est
      // null sur un exercice à répétitions. Les deux ne coexistent jamais.
      repCount: number | null;
      // Instant vidéo de fin de chaque répétition. Permet à l'export d'animer
      // un compteur qui s'incrémente au fil de la lecture, comme le chrono le
      // fait sur un hold, plutôt que d'afficher le total dès la première image.
      repTimes: number[] | null;
      /**
       * Notes cumulées après chaque répétition : l'entrée k contient la
       * notation de la série réduite à ses k+1 premières répétitions.
       *
       * Sert au HUD de l'export à faire évoluer les barres pendant la
       * lecture. Ce ne sont pas des valeurs décoratives : chacune est la
       * vraie note de ce qui a été exécuté jusque-là, et la dernière est
       * exactement la note finale.
       */
      repProgressScores: CriterionScore[][] | null;
      // Bornes temporelles (dans le référentiel de la vidéo entière, pas
      // de la plage rognée) du hold réellement détecté — utilisées par
      // l'export vidéo pour que le chrono affiché ne défile que pendant la
      // figure elle-même, pas pendant la mise en place ou la sortie.
      holdStartSeconds: number | null;
      holdEndSeconds: number | null;
      summaryAngles: PoseAngles;
      scores: CriterionScore[];
      globalScoreValue: number;
      recommendations: Recommendation[];
      representativeFrameDataUrl: string | null;
      // Landmarks bruts déjà calculés pendant l'analyse, réutilisés par
      // l'export vidéo annotée pour éviter de refaire tourner l'inférence
      // pose (coûteuse) une seconde fois image par image.
      landmarksFrames: NormalizedLandmark[][];
      // Instant vidéo de chaque entrée de landmarksFrames. Permet à
      // l'export de retrouver le bon squelette par le temps plutôt qu'en
      // supposant un espacement régulier entre les images analysées.
      landmarksTimes: number[];
    }
  | {
      ok: false;
      framesAnalyzed: number;
      detectionRate: number;
      warning: string;
    };

export async function runPoseAnalysis({
  video,
  canvas,
  progression,
  rangeStart,
  rangeEnd,
  onProgress,
  onLiveAngles,
  lang = "fr",
  signal,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  // null = mode mesure : renvoie les angles réels sans les noter (figure
  // pas encore calibrée, utilisé pour collecter des échantillons)
  progression: AnyProgression | null;
  rangeStart?: number;
  rangeEnd?: number;
  onProgress?: (percent: number) => void;
  onLiveAngles?: (angles: PoseAngles) => void;
  // Langue des avertissements. Paramètre et non contexte : l'analyse tourne
  // hors de React, sur une boucle d'animation.
  lang?: Lang;
  // Permet d'annuler une analyse en cours (ex. l'utilisateur se rend
  // compte d'une erreur pendant le traitement) sans attendre la fin.
  signal?: AbortSignal;
}): Promise<PoseAnalysisResult> {
  const landmarker = await getLandmarker();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context2d = canvas.getContext("2d");
  if (!context2d) throw new Error(DICTIONARIES[lang].media.canvasAnalysisFailed);
  const ctx: CanvasRenderingContext2D = context2d;
  const drawingUtils = new DrawingUtils(ctx);

  const frames: NormalizedLandmark[][] = [];
  // Instant vidéo de chaque entrée de `frames`, même longueur, même ordre.
  const frameTimes: number[] = [];
  const angles: PoseAngles[] = [];
  let attempted = 0;

  const start = rangeStart ?? 0;
  const end = rangeEnd ?? video.duration;

  video.currentTime = start;
  await video.play();

  await new Promise<void>((resolve, reject) => {
    function loop() {
      if (signal?.aborted) {
        video.pause();
        reject(new DOMException(w(lang).cancelled, "AbortError"));
        return;
      }

      if (video.paused || video.ended || video.currentTime >= end) {
        video.pause();
        resolve();
        return;
      }

      attempted += 1;
      if (end > start) {
        onProgress?.(
          Math.min(
            100,
            Math.round(((video.currentTime - start) / (end - start)) * 100)
          )
        );
      }

      const result = landmarker.detectForVideo(video, performance.now());
      // Instant réel de la vidéo au moment de la détection. Cette boucle
      // tourne sur requestAnimationFrame pendant une lecture en temps réel,
      // donc les images ne sont PAS capturées à intervalles réguliers : la
      // cadence varie selon la charge de l'inférence. Sans cet horodatage,
      // l'export qui repositionne les squelettes ne peut que supposer un
      // espacement uniforme, d'où un décalage progressif entre le corps et
      // son squelette.
      const frameTime = video.currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < result.landmarks.length; i++) {
        const landmarks = result.landmarks[i];
        frames.push(landmarks);
        frameTimes.push(frameTime);
        // Coordonnées métriques 3D du même corps, quand le modèle les fournit.
        // Elles rendent les angles articulaires indépendants de la position de
        // la caméra ; leur absence fait simplement retomber sur le 2D.
        const a = computeAngles(landmarks, result.worldLandmarks?.[i]);
        angles.push(a);
        onLiveAngles?.(a);

        drawingUtils.drawLandmarks(landmarks, { radius: 3 });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
        drawAngleLabels(ctx, canvas, landmarks, a);
      }

      requestAnimationFrame(loop);
    }
    loop();
  });

  const detectionRate = attempted > 0 ? frames.length / attempted : 0;

  if (frames.length === 0) {
    return {
      ok: false,
      framesAnalyzed: 0,
      detectionRate: 0,
      warning:
        w(lang).noBodyVideo,
    };
  }

  // Filtre de forme passé à la détection de fenêtre.
  //
  // Une image compte comme « dans la figure » quand son critère le PLUS FAIBLE
  // reste au-dessus d'un plancher. La moyenne ne suffisait pas : quelqu'un
  // suspendu bras tendus avant son front lever obtient un excellent score de
  // coude, ce qui remonte la moyenne alors que la hanche, elle, dit clairement
  // qu'il n'est pas dans la figure. C'est le critère le plus bas qui trahit
  // une position absente, pas la moyenne.
  //
  // Sans progression — mode mesure de la calibration — aucun filtre : on
  // cherche alors les angles réels sans présumer d'une figure.
  const isInFigure =
    progression !== null && !isRepProgression(progression)
      ? (index: number) => {
          const scores = scoreAngles(
            angles[index],
            progression as Progression
          ).filter((s) => Number.isFinite(s.score));
          if (scores.length === 0) return false;
          return Math.min(...scores.map((s) => s.score)) >= IN_FIGURE_FLOOR;
        }
      : undefined;

  const window = detectHoldWindow(frames, { isInFigure, times: frameTimes });
  const holdAngles = angles.slice(window.start, window.end + 1);
  const median = medianAngles(holdAngles);
  // Si aucun segment immobile assez long n'est trouvé, detectHoldWindow
  // retombe sur la vidéo entière (voir angles.ts) — dans ce cas la "durée"
  // ne correspond à aucun hold réel, mieux vaut ne rien afficher que de
  // faire croire que la figure a été tenue pendant tout le clip.
  //
  // Bornes lues sur les instants réellement horodatés plutôt que déduites
  // d'une règle de trois sur l'indice : les images d'analyse n'étant pas
  // capturées à intervalles réguliers, la conversion proportionnelle
  // décalait le début et la fin du hold, et faussait donc sa durée.
  const holdStartSeconds = window.detected ? frameTimes[window.start] : null;
  const holdEndSeconds = window.detected
    ? frameTimes[Math.min(window.end, frameTimes.length - 1)]
    : null;
  const holdDurationSeconds =
    holdStartSeconds !== null && holdEndSeconds !== null
      ? Math.max(0, holdEndSeconds - holdStartSeconds)
      : null;

  const warningParts: string[] = [];
  if (detectionRate < 0.5) {
    warningParts.push(
      w(lang).lowDetection(Math.round(detectionRate * 100))
    );
  }
  // La fenêtre existe mais rien n'y ressemblait à la figure : la mesure est
  // faite quand même, sur le segment le plus immobile, et il faut le dire.
  // C'est presque toujours le signe d'une variation mal choisie.
  if (window.detected && !window.matchedFigure) {
    warningParts.push(w(lang).figureNeverMatched);
  }
  if (!window.detected) {
    warningParts.push(
      w(lang).noStableHold
    );
  }
  // En straddle, les deux jambes doivent être écartées de part et d'autre
  // du corps ; si la caméra filme presque dans l'axe de cet écartement,
  // elles se superposent à l'écran et les angles genou/axe du corps
  // deviennent peu fiables — on prévient plutôt que d'afficher un score
  // silencieusement faussé.
  const isStraddleVariant =
    progression === "straddle_planche" || progression === "straddle_front_lever";
  if (isStraddleVariant && median.legOcclusionRisk) {
    warningParts.push(
      w(lang).legOcclusion
    );
  }
  // Figure à une jambe alors que les deux sont tendues : la personne
  // exécute en réalité une variation plus difficile (full front lever).
  // Le critère bent_knee_angle le sanctionne déjà, mais son effet est
  // dilué par la moyenne des autres critères, tous excellents dans ce cas.
  // Un score de 7/10 ne dirait pas à l'utilisateur qu'il s'est trompé de
  // catégorie, et fausserait sa courbe de progression.
  if (progression === "one_leg_front_lever" && median.bentKneeAngle > 150) {
    warningParts.push(
      w(lang).notSingleLegFrontLever
    );
  }

  // Dragon flag soumis dans la mauvaise catégorie, dans les deux sens.
  //
  // Le cas s'est présenté sur des échantillons réels : la même vidéo à une
  // jambe repliée, notée 9,8 en Single Leg et 3,5 en Full. La grille du Full
  // la descend bien, mais pas assez, parce que deux de ses critères restent
  // à 10 et diluent les deux qui voient la faute. Plafonner la note globale
  // dès qu'un critère s'effondre a été mesuré sur ces mêmes échantillons et
  // dégrade l'ensemble : un Full soumis en Single Leg, que l'utilisateur note
  // 7 parce que la figure exécutée est plus dure, tomberait à 2.
  //
  // Le bon outil est donc celui déjà employé pour le front lever : nommer
  // l'erreur de catégorie au lieu de la traduire en points.
  if (progression === "full_dragon_flag" && median.bentKneeAngle < 150) {
    warningParts.push(
      w(lang).notFullDragonFlag
    );
  }
  if (progression === "one_leg_dragon_flag" && median.bentKneeAngle > 150) {
    warningParts.push(
      w(lang).notSingleLegDragonFlag
    );
  }

  const warning = warningParts.length > 0 ? warningParts.join(" ") : null;

  const midIndex = Math.floor((window.start + window.end) / 2);
  const representativeFrameDataUrl = await captureFrame(
    video,
    frames[midIndex],
    start,
    end,
    frames.length,
    midIndex
  );

  if (progression === null) {
    return {
      ok: true,
      framesAnalyzed: frames.length,
      detectionRate,
      warning,
      holdWindow: window,
      holdDurationSeconds,
      holdStartSeconds,
      holdEndSeconds,
      repCount: null,
      repTimes: null,
      repProgressScores: null,
      summaryAngles: median,
      scores: [],
      globalScoreValue: 0,
      recommendations: [],
      representativeFrameDataUrl,
      landmarksFrames: frames,
      landmarksTimes: frameTimes,
    };
  }

  // Un handstand exige un corps inversé (mains au sol, pieds en l'air) —
  // sans ce contrôle, une personne simplement debout donne aussi un axe du
  // corps proche de 90° et se ferait noter comme un handstand valide.
  if (progression === "handstand" && !median.isInvertedPose) {
    return {
      ok: false,
      framesAnalyzed: frames.length,
      detectionRate,
      warning:
        w(lang).notHandstand,
    };
  }

  // --- Voie dynamique ---
  //
  // Placée avant le scoring des holds, et se terminant par un return : le
  // reste de la fonction reste donc typé sur les seules progressions de hold,
  // sans qu'aucune ligne existante n'ait à changer.
  if (isRepProgression(progression)) {
    const thresholds = REP_SCORING_GRID[progression];

    // Seul l'angle de HANCHE passe en 3D. Pas le coude, pas le genou.
    //
    // CE QUI EST DÉGÉNÉRÉ EN 2D, ET CE QUI NE L'EST PAS
    //
    // Vu de face, un handstand push-up projette épaule, hanche et genou
    // presque sur une même verticale. Trois points quasi alignés donnent un
    // angle hypersensible : quelques pixels de bruit déplacent la mesure de
    // plusieurs degrés, et le critère de contrôle, qui mesure l'écart type de
    // cet angle, y mesurait le tremblement de détection avant l'élan.
    //
    // Le coude, lui, se lit très bien sous n'importe quel angle : c'est une
    // flexion ample entre trois points jamais alignés. Les notes d'extension
    // et d'amplitude étaient d'ailleurs justes sur la vidéo qui a révélé le
    // problème, alors que le contrôle était à zéro.
    //
    // POURQUOI NE PAS TOUT BASCULER
    //
    // Essayé, et cassé : substituer aussi le coude a fait tomber la détection
    // à zéro répétition sur cette même vidéo. Le signal 3D du coude ne
    // franchissait plus les seuils de la grille, qui sont exprimés en valeurs
    // 2D. Autrement dit l'estimation de profondeur du modèle, sa sortie la
    // plus fragile, ne tient pas sur un corps inversé — cas rare dans ses
    // données d'entraînement. On ne s'en remet donc qu'où le 2D est
    // réellement dégénéré.
    //
    // Conséquence utile : aucun exercice n'utilise la hanche comme pilote de
    // détection (tous sont sur le coude ou le genou, voir REP_SCORING_GRID),
    // donc cette substitution ne peut pas déplacer une répétition. Elle ne
    // change que le contrôle et la forme, les deux critères qui en avaient
    // besoin.
    const hip3dCount = angles.filter((a) =>
      Number.isFinite(a.hipAngle3d)
    ).length;
    // Exigé sur la grande majorité des images, pas seulement quelques-unes :
    // un tableau troué mélangerait deux unités de mesure dans la même série.
    const has3dHip = hip3dCount >= angles.length * 0.8;
    const repAngles = has3dHip
      ? angles.map((a) => ({ ...a, hipAngle: a.hipAngle3d }))
      : angles;

    const reps = detectReps(repAngles, thresholds);

    if (reps.length === 0) {
      return {
        ok: false,
        framesAnalyzed: frames.length,
        detectionRate,
        warning:
          w(lang).noReps,
      };
    }

    const repScores = scoreReps({
      angles: repAngles,
      reps,
      frameTimes,
      thresholds,
    });
    // La même notation rejouée sur les k premières répétitions, pour chaque k.
    // Coût négligeable — une série dépasse rarement la vingtaine — et c'est ce
    // qui permet à l'export de montrer un calcul qui se construit plutôt qu'un
    // verdict posé dès la première image.
    const repProgressScores = reps.map((_, k) =>
      scoreReps({
        angles: repAngles,
        reps: reps.slice(0, k + 1),
        frameTimes,
        thresholds,
      })
    );
    const weakestRep = pickWeakestCriterion(repScores);
    const repWarnings = [...warningParts];

    // Angle de prise de vue. Ces mouvements se jugent dans le plan sagittal
    // (flexion du coude, ouverture de hanche), donc de profil. Filmé de face,
    // ce plan est vu par la tranche : le passage en 3D limite les dégâts sur
    // les angles, mais la détection elle-même reste moins fiable, une épaule
    // masquant l'autre. Le dire plutôt que d'afficher une note silencieusement
    // fragile — c'est déjà ce qui est fait pour le straddle.
    //
    // Le seuil est provisoire, faute d'échantillons réels : 0,65 correspond à
    // environ 40 degrés d'écart au profil.
    // Médiane prise sur TOUTE la vidéo et non sur la fenêtre de hold : la
    // position de la caméra est une propriété du plan entier, alors que cette
    // fenêtre n'a aucun sens sur une série et peut ne couvrir que quelques
    // images.
    const facings = angles
      .map((a) => a.shoulderFacing)
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    const facing = facings.length
      ? facings[Math.floor(facings.length / 2)]
      : NaN;
    if (Number.isFinite(facing) && facing > 0.65) {
      repWarnings.push(
        w(lang).tooFrontOn
      );
    }
    if (reps.length < 3) {
      repWarnings.push(
        w(lang).fewReps(reps.length)
      );
    }

    return {
      ok: true,
      framesAnalyzed: frames.length,
      detectionRate,
      warning: repWarnings.length > 0 ? repWarnings.join(" ") : null,
      holdWindow: window,
      // Un hold n'a pas de répétitions, une série n'a pas de durée de hold.
      holdDurationSeconds: null,
      holdStartSeconds: null,
      holdEndSeconds: null,
      repCount: reps.length,
      repTimes: reps.map(
        (r) => frameTimes[Math.min(r.end, frameTimes.length - 1)]
      ),
      repProgressScores,
      summaryAngles: median,
      scores: repScores,
      globalScoreValue: globalScoreWithMajorFault(repScores),
      recommendations: recommendationsFor(
        weakestRep.critere,
        weakestRep.score,
        median.pelvisSagSign,
        weakestRep.valeurMesuree - weakestRep.valeurCible,
        progression,
        lang
      ),
      representativeFrameDataUrl,
      landmarksFrames: frames,
      landmarksTimes: frameTimes,
    };
  }

  const scores = scoreAngles(median, progression);
  const weakest = pickWeakestCriterion(scores);
  const recommendations = recommendationsFor(
    weakest.critere,
    weakest.score,
    median.pelvisSagSign,
    weakest.valeurMesuree - weakest.valeurCible,
    progression,
    lang
  );

  return {
    ok: true,
    framesAnalyzed: frames.length,
    detectionRate,
    warning,
    holdWindow: window,
    holdDurationSeconds,
    holdStartSeconds,
    holdEndSeconds,
    repCount: null,
    repTimes: null,
    repProgressScores: null,
    summaryAngles: median,
    scores,
    globalScoreValue: globalScore(scores),
    recommendations,
    representativeFrameDataUrl,
    landmarksFrames: frames,
    landmarksTimes: frameTimes,
  };
}

// Mesure une seule image fixe (photo) au lieu d'une vidéo — même modèle
// partagé (mode VIDEO accepte aussi une source image unique), pas de
// fenêtre de hold puisqu'il n'y a qu'une frame. Renvoie un objet au même
// format que runPoseAnalysis pour réutiliser le même affichage.
export async function measureImage(
  image: HTMLImageElement,
  lang: Lang = "fr"
): Promise<PoseAnalysisResult> {
  const landmarker = await getLandmarker();

  const result = landmarker.detectForVideo(image, performance.now());

  if (result.landmarks.length === 0) {
    return {
      ok: false,
      framesAnalyzed: 0,
      detectionRate: 0,
      warning:
        w(lang).noBodyImage,
    };
  }

  const landmarks = result.landmarks[0];
  const angles = computeAngles(landmarks, result.worldLandmarks?.[0]);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  let representativeFrameDataUrl: string | null = null;
  if (ctx) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);
    drawingUtils.drawLandmarks(landmarks, { radius: 4 });
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
    drawAngleLabels(ctx, canvas, landmarks, angles);
    representativeFrameDataUrl = canvas.toDataURL("image/jpeg", 0.85);
  }

  return {
    ok: true,
    framesAnalyzed: 1,
    detectionRate: 1,
    warning: null,
    holdWindow: { start: 0, end: 0, detected: true, matchedFigure: true },
    holdDurationSeconds: 0,
    holdStartSeconds: 0,
    repCount: null,
    repTimes: null,
    repProgressScores: null,
    holdEndSeconds: 0,
    summaryAngles: angles,
    scores: [],
    globalScoreValue: 0,
    recommendations: [],
    representativeFrameDataUrl,
    landmarksFrames: [landmarks],
    landmarksTimes: [0],
  };
}

async function captureFrame(
  video: HTMLVideoElement,
  landmarks: NormalizedLandmark[] | undefined,
  rangeStart: number,
  rangeEnd: number,
  totalFrames: number,
  index: number
): Promise<string | null> {
  if (!landmarks) return null;

  const targetTime = rangeStart + (index / totalFrames) * (rangeEnd - rangeStart);
  await seekTo(video, targetTime);

  const offscreen = document.createElement("canvas");
  offscreen.width = video.videoWidth;
  offscreen.height = video.videoHeight;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
  const drawingUtils = new DrawingUtils(ctx);
  drawingUtils.drawLandmarks(landmarks, { radius: 3 });
  drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
  drawAngleLabels(ctx, offscreen, landmarks, computeAngles(landmarks));

  return offscreen.toDataURL("image/jpeg", 0.85);
}

export type { Progression };
