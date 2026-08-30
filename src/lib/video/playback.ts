// Mécanique de lecture d'un segment vidéo, partagée par l'analyse, l'export
// annoté et la compression avant upload. Extraite ici pour que ces trois
// usages partagent exactement les mêmes filets de sécurité : ils ont chacun
// coûté un bug de blocage en production avant d'être trouvés.

// requestVideoFrameCallback n'est pas encore dans tous les lib.dom.d.ts —
// typé a minima plutôt que d'élargir le lib cible du projet pour ça.
export type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: { mediaTime: number }) => void
  ) => number;
};

export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    function onSeeked() {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

// Joue un segment en appelant drawFrame à chaque image réellement décodée.
//
// Piloté par requestVideoFrameCallback plutôt que par seek manuel ou par
// requestAnimationFrame. Seeker image par image force le navigateur à
// redécoder depuis l'image-clé précédente, ce qui coûte largement plus
// qu'un cycle d'image et produit un rendu au ralenti. rAF a le défaut
// inverse : il tourne sur l'horloge d'affichage, indépendante de la vidéo,
// et saute donc des portions de la source si le dessin prend du retard.
// requestVideoFrameCallback se déclenche exactement une fois par frame
// vidéo décodée : aucun seek, aucune horloge indépendante.
export async function playSegment({
  video,
  from,
  to,
  playbackRate = 1,
  drawFrame,
}: {
  video: HTMLVideoElement;
  from: number;
  to: number;
  playbackRate?: number;
  drawFrame: (mediaTime: number) => void;
}): Promise<void> {
  const supportsFrameCallback =
    typeof (video as VideoWithFrameCallback).requestVideoFrameCallback === "function";

  await seekTo(video, from);
  video.playbackRate = playbackRate;
  await video.play();

  await new Promise<void>((resolve) => {
    function reachedEnd() {
      return video.paused || video.ended || video.currentTime >= to;
    }

    // requestVideoFrameCallback ne se redéclenche que s'il existe une
    // prochaine frame à présenter : si la vidéo atteint sa fin et se met en
    // pause juste après avoir présenté l'avant-dernière image, il n'y a
    // plus jamais de "prochaine frame" pour déclencher un dernier appel —
    // la boucle attendrait alors indéfiniment un callback qui ne vient
    // plus. Les événements 'ended'/'pause' servent de filet, et un timeout
    // de sécurité couvre tout autre blocage imprévu.
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
      Math.max(5000, ((to - from) * 1000 * 3) / playbackRate)
    );
    video.addEventListener("ended", finish);
    video.addEventListener("pause", finish);

    if (supportsFrameCallback) {
      const videoWithCallback = video as Required<VideoWithFrameCallback>;
      function onFrame(_now: number, metadata: { mediaTime: number }) {
        if (settled || reachedEnd()) {
          finish();
          return;
        }
        drawFrame(metadata.mediaTime);
        if (!settled) videoWithCallback.requestVideoFrameCallback(onFrame);
      }
      videoWithCallback.requestVideoFrameCallback(onFrame);
    } else {
      function loop() {
        if (settled || reachedEnd()) {
          finish();
          return;
        }
        drawFrame(video.currentTime);
        if (!settled) requestAnimationFrame(loop);
      }
      loop();
    }
  });

  video.playbackRate = 1;
}
