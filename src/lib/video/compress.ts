import { playSegment } from "./playback";

// 1080p de côté : c'est la résolution que consomment réellement les
// réseaux, et largement au-dessus de ce dont MediaPipe a besoin pour
// détecter une pose. Filmer en 4K sur un téléphone récent produit des
// fichiers 4 fois plus lourds sans aucun gain d'analyse.
const MAX_DIMENSION = 1080;
const FPS = 30;

// ~6 bits/pixel/frame : suffisant pour rester net sur du mouvement corporel
// tout en divisant nettement le poids par rapport à l'encodage d'origine
// d'un téléphone.
const BITS_PER_PIXEL = 6;
const MIN_BITRATE = 2_000_000;
const MAX_BITRATE = 12_000_000;

const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickSupportedMimeType(): string | null {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const revoke = () => URL.revokeObjectURL(url);

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadedmetadata = () => resolve({ video, revoke });
    video.onerror = () => {
      revoke();
      reject(new Error("Vidéo illisible."));
    };
  });
}

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
};

// Ré-encode uniquement le segment analysé, à 1080p maximum.
//
// Avant, la vidéo d'origine était téléversée en entier alors que seul le
// segment découpé est utilisé : filmer deux minutes pour analyser six
// secondes consommait le quota de stockage (1 Go sur le plan gratuit) et
// dépassait souvent la limite de 50 Mo par fichier.
//
// L'audio est volontairement abandonné : il n'a aucun usage dans l'analyse
// et représente une part non négligeable du poids.
//
// Renvoie null si le navigateur ne sait pas encoder de vidéo — l'appelant
// retombe alors sur le fichier d'origine plutôt que d'échouer.
export async function compressVideoSegment({
  file,
  rangeStart,
  rangeEnd,
  onProgress,
}: {
  file: File;
  rangeStart: number;
  rangeEnd: number;
  onProgress?: (percent: number) => void;
}): Promise<CompressionResult | null> {
  const mimeType = pickSupportedMimeType();
  if (!mimeType) return null;

  const { video, revoke } = await loadVideo(file);

  try {
    const duration = Number.isFinite(video.duration) ? video.duration : rangeEnd;
    const from = Math.max(0, Math.min(rangeStart, duration));
    const to = Math.min(duration, Math.max(rangeEnd, from + 0.1));

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const videoBitsPerSecond = Math.min(
      MAX_BITRATE,
      Math.max(MIN_BITRATE, Math.round(canvas.width * canvas.height * BITS_PER_PIXEL))
    );

    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recorded = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = (e) => reject(e);
    });

    // Timeslice : sans argument, MediaRecorder accumule tout en mémoire et
    // ne fait le travail d'encodage qu'au stop(), ce qui produit une longue
    // attente invisible en fin de traitement.
    recorder.start(1000);

    const span = to - from;
    await playSegment({
      video,
      from,
      to,
      drawFrame(mediaTime) {
        onProgress?.(
          Math.min(99, Math.round(((mediaTime - from) / span) * 99))
        );
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      },
    });

    recorder.stop();
    const blob = await recorded;
    onProgress?.(100);

    // Un encodage plus lourd que l'original n'a aucun intérêt (vidéo déjà
    // très compressée, ou segment couvrant tout le clip) : on le signale à
    // l'appelant en renvoyant quand même les tailles, à lui de trancher.
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = file.name.replace(/\.[^.]+$/, "");

    return {
      file: new File([blob], `${baseName}-segment.${extension}`, { type: blob.type }),
      originalBytes: file.size,
      compressedBytes: blob.size,
    };
  } finally {
    video.pause();
    revoke();
  }
}
