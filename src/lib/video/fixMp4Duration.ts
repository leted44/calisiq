// Répare la durée déclarée d'un MP4 produit par MediaRecorder.
//
// Constaté sur un fichier réel exporté par l'application (8,30 s de
// contenu) :
//   mvhd : durée 8304, échelle 1000  -> 8,30 s   (correct)
//   tkhd : durée 8304, échelle 1000  -> 8,30 s   (correct)
//   mdhd : durée 8304, échelle 30000 -> 0,28 s   (faux)
//
// La durée de la piste média a été écrite avec la valeur exprimée dans
// l'échelle du film au lieu de la sienne. Les lecteurs qui se fient à
// mdhd affichent donc une durée absurde, refusent de se déplacer dans la
// vidéo, et les importeurs stricts tronquent au moment de la lecture.
//
// On recalcule la vraie durée en additionnant les durées d'images
// déclarées dans les fragments (source de vérité), puis on réécrit mvhd,
// tkhd et mdhd de façon cohérente. Correction sur place : aucune boîte ne
// change de taille, donc aucun décalage à propager.
//
// En cas de structure inattendue, le fichier est renvoyé tel quel : mieux
// vaut une durée fausse qu'un fichier corrompu.

type Box = { type: string; start: number; headerSize: number; size: number };

function readBoxes(view: DataView, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = view.getUint32(offset);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      size = Number(view.getBigUint64(offset + 8));
      headerSize = 16;
    }
    // size 0 signifie "jusqu'à la fin du fichier"
    if (size === 0) size = end - offset;
    if (size < headerSize || offset + size > end) break;

    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );
    boxes.push({ type, start: offset, headerSize, size });
    offset += size;
  }
  return boxes;
}

function findBox(view: DataView, start: number, end: number, type: string): Box | null {
  return readBoxes(view, start, end).find((b) => b.type === type) ?? null;
}

// Descend une chaîne de conteneurs, ex. ["trak", "mdia", "mdhd"].
function findPath(view: DataView, box: Box, path: string[]): Box | null {
  let current: Box | null = box;
  for (const type of path) {
    if (!current) return null;
    current = findBox(
      view,
      current.start + current.headerSize,
      current.start + current.size,
      type
    );
  }
  return current;
}

// Somme des durées d'images de tous les fragments, exprimée dans l'échelle
// de la piste média. C'est la seule valeur qu'on peut considérer comme
// fiable, les en-têtes étant justement ce qu'on cherche à corriger.
function totalDurationFromFragments(view: DataView, fileEnd: number): number | null {
  let total = 0;
  let found = false;

  for (const box of readBoxes(view, 0, fileEnd)) {
    if (box.type !== "moof") continue;
    const traf = findBox(view, box.start + box.headerSize, box.start + box.size, "traf");
    if (!traf) continue;
    const trun = findBox(view, traf.start + traf.headerSize, traf.start + traf.size, "trun");
    if (!trun) continue;

    const flags = view.getUint32(trun.start + trun.headerSize) & 0xffffff;
    const sampleCount = view.getUint32(trun.start + trun.headerSize + 4);

    // Durée par image absente : on ne peut rien déduire de ce fragment.
    if (!(flags & 0x000100)) continue;

    let offset = trun.start + trun.headerSize + 8;
    if (flags & 0x000001) offset += 4; // data_offset
    if (flags & 0x000004) offset += 4; // first_sample_flags

    let entrySize = 4; // sample_duration
    if (flags & 0x000200) entrySize += 4;
    if (flags & 0x000400) entrySize += 4;
    if (flags & 0x000800) entrySize += 4;

    if (offset + sampleCount * entrySize > trun.start + trun.size) continue;

    for (let i = 0; i < sampleCount; i++) {
      total += view.getUint32(offset + i * entrySize);
    }
    found = true;
  }

  return found && total > 0 ? total : null;
}

function readVersionAndTimescaleDuration(
  view: DataView,
  box: Box
): { version: number; timescaleOffset: number; durationOffset: number } {
  const version = view.getUint8(box.start + box.headerSize);
  // Après version(1) + flags(3) : creation_time et modification_time
  // (4 octets chacun en version 0, 8 en version 1), puis timescale, durée.
  const base = box.start + box.headerSize + 4;
  return version === 0
    ? { version, timescaleOffset: base + 8, durationOffset: base + 12 }
    : { version, timescaleOffset: base + 16, durationOffset: base + 20 };
}

function writeDuration(view: DataView, offset: number, version: number, value: number) {
  if (version === 0) {
    view.setUint32(offset, Math.min(value, 0xfffffffe));
  } else {
    view.setBigUint64(offset, BigInt(Math.round(value)));
  }
}

// Renvoie true si les durées ont effectivement été réécrites.
export function fixMp4Duration(buffer: ArrayBuffer): boolean {
  try {
    const view = new DataView(buffer);
    const moov = findBox(view, 0, buffer.byteLength, "moov");
    if (!moov) return false;

    const mvhd = findBox(view, moov.start + moov.headerSize, moov.start + moov.size, "mvhd");
    const trak = findBox(view, moov.start + moov.headerSize, moov.start + moov.size, "trak");
    if (!mvhd || !trak) return false;

    const mdhd = findPath(view, trak, ["mdia", "mdhd"]);
    const tkhd = findPath(view, trak, ["tkhd"]);
    if (!mdhd) return false;

    // Fichier non fragmenté (sortie de notre encodeur WebCodecs) : les
    // durées y sont déjà correctes, rien à faire.
    const mediaDuration = totalDurationFromFragments(view, buffer.byteLength);
    if (mediaDuration === null) return false;

    const mdhdFields = readVersionAndTimescaleDuration(view, mdhd);
    const mediaTimescale = view.getUint32(mdhdFields.timescaleOffset);
    if (mediaTimescale === 0) return false;

    const seconds = mediaDuration / mediaTimescale;

    // Durée de la piste média, dans sa propre échelle.
    writeDuration(view, mdhdFields.durationOffset, mdhdFields.version, mediaDuration);

    // Durée du film et de la piste, dans l'échelle du film.
    const mvhdFields = readVersionAndTimescaleDuration(view, mvhd);
    const movieTimescale = view.getUint32(mvhdFields.timescaleOffset);
    if (movieTimescale > 0) {
      const movieDuration = Math.round(seconds * movieTimescale);
      writeDuration(view, mvhdFields.durationOffset, mvhdFields.version, movieDuration);

      if (tkhd) {
        const version = view.getUint8(tkhd.start + tkhd.headerSize);
        // tkhd : version(1) + flags(3) + creation + modification + track_id
        // + reserved, puis la durée.
        const durationOffset =
          tkhd.start + tkhd.headerSize + 4 + (version === 0 ? 16 : 24);
        writeDuration(view, durationOffset, version, movieDuration);
      }
    }

    return true;
  } catch {
    // Structure inattendue : on préfère un fichier intact avec une durée
    // fausse plutôt qu'un fichier abîmé.
    return false;
  }
}

// Applique la correction à un Blob MP4. `fixed` dit si la durée a
// réellement été réécrite, ce qui permet à l'interface de savoir si le
// fichier est publiable tel quel.
export async function withFixedDuration(
  blob: Blob
): Promise<{ blob: Blob; fixed: boolean }> {
  if (!blob.type.includes("mp4")) return { blob, fixed: false };
  try {
    const buffer = await blob.arrayBuffer();
    const fixed = fixMp4Duration(buffer);
    if (!fixed) return { blob, fixed: false };
    return { blob: new Blob([buffer], { type: blob.type }), fixed: true };
  } catch {
    return { blob, fixed: false };
  }
}
