import { Muxer, ArrayBufferTarget } from "mp4-muxer";

// Écriture de la vidéo exportée.
//
// MediaRecorder produisait un MP4 fragmenté dont l'en-tête déclarait une
// durée fausse (typiquement celle du premier fragment). Les lecteurs
// tolérants jouaient quand même le fichier en entier, mais les importeurs
// stricts — Instagram notamment — s'arrêtaient à la durée annoncée et ne
// prenaient qu'une fraction de la vidéo.
//
// On encode donc nous-mêmes avec WebCodecs et on assemble le MP4 avec un
// muxer qui écrit un en-tête complet et correct (fastStart "in-memory" :
// les métadonnées sont placées en tête de fichier, durée comprise).
// MediaRecorder reste en repli pour les navigateurs sans WebCodecs.

const CODEC_CANDIDATES = [
  "avc1.42002A", // Baseline 4.2 — le plus largement décodable
  "avc1.4D002A", // Main 4.2
  "avc1.64002A", // High 4.2
];

const RECORDER_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export type VideoWriter = {
  /** Enregistre l'état actuel du canvas comme une image de la vidéo. */
  addFrame: () => void;
  /** Termine l'encodage et renvoie le fichier final. */
  finish: () => Promise<Blob>;
};

function pickRecorderMimeType(): string {
  for (const type of RECORDER_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

async function pickCodec(
  width: number,
  height: number,
  bitrate: number
): Promise<string | null> {
  if (typeof VideoEncoder === "undefined") return null;
  for (const codec of CODEC_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        avc: { format: "avc" },
      });
      if (support.supported) return codec;
    } catch {
      // Configuration rejetée par ce navigateur : on essaie la suivante.
    }
  }
  return null;
}

// Vérifie que ce navigateur encode réellement ce canvas avec cette config,
// sur un encodeur jetable.
//
// Deux raisons de ne pas se fier à isConfigSupported() seul. Il est
// déclaratif et annonce "supporté" des configurations que l'encodeur
// matériel refuse ensuite image par image. Et surtout, il ne dit rien de
// la `decoderConfig` : le muxer en a besoin pour écrire l'en-tête MP4
// (description du codec, espace colorimétrique), et un encodeur peut
// produire des images tout en ne la fournissant jamais — c'est exactement
// ce qui faisait échouer l'export à la toute fin, une fois toutes les
// images déjà perdues.
async function canActuallyEncode(
  canvas: HTMLCanvasElement,
  config: VideoEncoderConfig
): Promise<boolean> {
  let usable = false;
  let failed = false;
  try {
    const probe = new VideoEncoder({
      output: (_chunk, meta) => {
        // `description` est le bloc avcC dont le muxer a besoin ; sans lui
        // le fichier produit serait illisible.
        if (meta?.decoderConfig?.description) usable = true;
      },
      error: () => {
        failed = true;
      },
    });
    probe.configure(config);
    const frame = new VideoFrame(canvas, { timestamp: 0 });
    probe.encode(frame, { keyFrame: true });
    frame.close();
    await probe.flush();
    probe.close();
  } catch {
    return false;
  }
  return usable && !failed;
}

async function createWebCodecsWriter(
  canvas: HTMLCanvasElement,
  bitrate: number
): Promise<VideoWriter | null> {
  // Les dimensions du canvas sont forcées paires en amont (H.264 l'exige) ;
  // on encode donc exactement la taille du canvas, sans réajustement qui
  // créerait un écart entre la config et les images fournies.
  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0 || width % 2 !== 0 || height % 2 !== 0) {
    return null;
  }

  const codec = await pickCodec(width, height, bitrate);
  if (!codec) return null;

  const config: VideoEncoderConfig = {
    codec,
    width,
    height,
    bitrate,
    // Format "avc" explicite : en annexb, le navigateur ne fournit pas de
    // `description` dans la decoderConfig, et le muxer ne peut alors pas
    // écrire l'en-tête MP4. La valeur par défaut varie selon l'encodeur
    // retenu (matériel ou logiciel), donc on ne la laisse pas au hasard.
    avc: { format: "avc" },
  };
  if (!(await canActuallyEncode(canvas, config))) return null;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    // En-tête complet écrit en tête de fichier, avec la vraie durée : c'est
    // précisément ce qui manquait à la sortie de MediaRecorder.
    fastStart: "in-memory",
  });

  let failure: Error | null = null;
  let chunkCount = 0;
  let gotDecoderConfig = false;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      chunkCount += 1;
      if (meta?.decoderConfig?.description) gotDecoderConfig = true;
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      failure = e;
    },
  });
  encoder.configure(config);

  const startedAt = performance.now();
  let frameCount = 0;

  return {
    addFrame() {
      if (failure || encoder.state !== "configured") return;
      // addFrame est appelée depuis un callback du navigateur
      // (requestVideoFrameCallback) : une exception qui s'en échappe est
      // avalée sans remonter jusqu'à l'appelant. On la capture donc ici
      // pour pouvoir la signaler à la fin, au lieu de terminer sur un
      // fichier vide et une erreur incompréhensible.
      try {
        // Horodatage sur le temps réel écoulé plutôt que sur un compteur
        // d'images : les trois phases de l'export (figure, ralenti, écran
        // final) n'ont pas la même cadence de rendu, et c'est ce timing
        // réel qu'on veut restituer.
        const timestamp = Math.round((performance.now() - startedAt) * 1000);
        const frame = new VideoFrame(canvas, { timestamp });
        // Image-clé périodique : sans ça, un fichier long devient
        // impossible à parcourir et certains lecteurs refusent de démarrer
        // ailleurs qu'au tout début.
        encoder.encode(frame, { keyFrame: frameCount % 60 === 0 });
        frame.close();
        frameCount += 1;
      } catch (e) {
        failure = e as Error;
      }
    },

    async finish() {
      await encoder.flush();
      encoder.close();
      if (failure) throw failure;
      // Sans image encodée, ou sans description du codec, le muxer
      // échouerait sur une erreur interne obscure ("colorSpace of null").
      // On préfère un message qui dit ce qui s'est réellement passé.
      if (chunkCount === 0) {
        throw new Error("Aucune image n'a pu être encodée.");
      }
      if (!gotDecoderConfig) {
        throw new Error("Encodeur vidéo incomplet sur cet appareil.");
      }
      muxer.finalize();
      const { buffer } = muxer.target as ArrayBufferTarget;
      return new Blob([buffer], { type: "video/mp4" });
    },
  };
}

function createRecorderWriter(
  canvas: HTMLCanvasElement,
  bitrate: number
): VideoWriter {
  const mimeType = pickRecorderMimeType();
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
    requestFrame?: () => void;
  };
  const manual = typeof track?.requestFrame === "function";
  const effectiveStream = manual ? stream : canvas.captureStream(30);

  const recorder = new MediaRecorder(effectiveStream, {
    mimeType,
    videoBitsPerSecond: bitrate,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(e);
  });

  recorder.start(1000);

  return {
    addFrame() {
      if (manual) track.requestFrame!();
    },
    async finish() {
      recorder.stop();
      return recorded;
    },
  };
}

export async function createVideoWriter(
  canvas: HTMLCanvasElement,
  bitrate: number
): Promise<VideoWriter> {
  const webCodecs = await createWebCodecsWriter(canvas, bitrate).catch(() => null);
  return webCodecs ?? createRecorderWriter(canvas, bitrate);
}
