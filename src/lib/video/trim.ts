import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string" && err.length > 0) return new Error(err);
  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}" && json !== "null") return new Error(json);
  } catch {
    // ignore
  }
  return new Error(
    "Erreur inconnue (probablement un abort interne de ffmpeg.wasm, souvent lié à un environnement navigateur non supporté)"
  );
}

function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      // Import dynamique : ces packages assument un environnement navigateur
      // (Worker) et cassent au rendu serveur/build s'ils sont importés en haut du fichier.
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null;
      throw toError(err);
    });
  }
  return ffmpegPromise;
}

// Découpe un segment [start, end] (secondes) sans recompression (copie de flux,
// rapide) — la coupe s'aligne sur les keyframes les plus proches, précision
// à quelques centaines de ms près, suffisant pour une analyse de pose.
export async function trimVideoFile(
  file: File,
  start: number,
  end: number
): Promise<File> {
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await getFFmpeg();

  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    logs.push(message);
  };
  ffmpeg.on("log", onLog);

  try {
    const extension = file.name.match(/\.\w+$/)?.[0] ?? ".mp4";
    const inputName = `input${extension}`;
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const exitCode = await ffmpeg.exec([
      "-ss",
      start.toFixed(2),
      "-i",
      inputName,
      "-t",
      (end - start).toFixed(2),
      "-c",
      "copy",
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error(
        `ffmpeg a échoué (code ${exitCode}) : ${logs.slice(-5).join(" | ") || "aucun log"}`
      );
    }

    const data = await ffmpeg.readFile(outputName);
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    const bytes =
      typeof data === "string" ? new TextEncoder().encode(data) : data;

    if (bytes.length === 0) {
      throw new Error(
        `Fichier découpé vide. Logs : ${logs.slice(-5).join(" | ") || "aucun log"}`
      );
    }

    return new File([new Uint8Array(bytes)], "trimmed.mp4", {
      type: "video/mp4",
    });
  } catch (err) {
    throw toError(err);
  } finally {
    ffmpeg.off("log", onLog);
  }
}
