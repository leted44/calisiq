// Prépare une illustration de figure pour public/figures/.
//
// Les illustrations sont générées sur fond noir, mais l'application les
// affiche en object-contain sur une carte ardoise avec un halo cyan quand la
// figure est sélectionnée : un fond opaque ferait un rectangle noir et le
// halo dessinerait le contour du cadre au lieu du corps. Le script détoure
// donc le sujet, retire le reflet au sol quand il est détaché du corps, et
// normalise au format des images déjà en place (640x640 RGBA, sujet mis à
// l'échelle sur 580 px et centré).
//
// Usage : node scripts/import-figure-image.mjs <source> <nom-de-sortie.png>

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CANVAS = 640; // format des illustrations existantes
const CONTENT = 580; // sujet mis à l'échelle sur cette taille, soit 30 px de marge
const ALPHA_FLOOR = 30; // en dessous : fond, totalement transparent (le fond des
// illustrations est un bleu nuit qui monte jusqu'à 25, pas un noir pur)
const ALPHA_CEIL = 65; // au dessus : sujet, totalement opaque
const GAP_MIN = 60; // hauteur de vide qui sépare un reflet au sol du sujet
// Le reflet au sol et le halo de barre sont d'un bleu pur : leur canal rouge
// est à zéro, alors que le corps monte au dessus de 120. Une porte sur le
// rouge élimine donc le décor sans entamer le sujet, y compris quand le
// reflet touche les mains et qu'aucune bande vide ne permet de le découper.
const RED_FLOOR = 25;
const RED_CEIL = 55;
// Mais les points d'articulation sont eux aussi d'un cyan quasi sans rouge :
// la porte seule les creusait en trous noirs au milieu du corps. Ils s'en
// distinguent par l'intensité — ils saturent au dessus de 245, quand le
// reflet au sol plafonne vers 180 — donc un pixel franchement lumineux est
// conservé quel que soit son rouge.
const BRIGHT_FLOOR = 195;
const BRIGHT_CEIL = 230;

const [srcPath, outName] = process.argv.slice(2);
if (!srcPath || !outName) {
  console.error("Usage : node scripts/import-figure-image.mjs <source> <sortie.png>");
  process.exit(1);
}

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "figures"
);
const outPath = path.join(outDir, outName);

const { data, info } = await sharp(srcPath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// Alpha construit sur la luminance : le sujet est clair sur un fond noir, et
// la rampe entre les deux seuils conserve les bords doux plutôt que de les
// escalier. Les pixels de bord restent sombres, ce qui est sans conséquence
// puisque le fond de l'application est sombre lui aussi.
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 3];
  const g = data[i * 3 + 1];
  const b = data[i * 3 + 2];
  const lum = Math.max(r, g, b);
  const brightness = Math.min(
    1,
    Math.max(0, (lum - ALPHA_FLOOR) / (ALPHA_CEIL - ALPHA_FLOOR))
  );
  const redGate = Math.min(1, Math.max(0, (r - RED_FLOOR) / (RED_CEIL - RED_FLOOR)));
  const brightGate = Math.min(
    1,
    Math.max(0, (lum - BRIGHT_FLOOR) / (BRIGHT_CEIL - BRIGHT_FLOOR))
  );
  const a = Math.round(255 * brightness * Math.max(redGate, brightGate));
  rgba[i * 4] = r;
  rgba[i * 4 + 1] = g;
  rgba[i * 4 + 2] = b;
  rgba[i * 4 + 3] = a;
}

// Masse de pixels par ligne, pour séparer le sujet de ce qui n'en fait pas
// partie : un reflet au sol, une retombée de halo, un pixel parasite. On
// découpe en bandes continues, on garde la plus dense (le sujet), puis on lui
// rattache ses voisines proches : un bras levé peut être séparé du tronc par
// quelques lignes vides, un reflet au sol l'est par une large bande noire.
const ROW_MIN = 4; // moins de quatre pixels francs sur la ligne : bruit
const rowMass = new Array(H).fill(0);
for (let y = 0; y < H; y++) {
  let n = 0;
  for (let x = 0; x < W; x++) if (rgba[(y * W + x) * 4 + 3] > 128) n++;
  rowMass[y] = n;
}
const bands = [];
for (let y = 0; y < H; y++) {
  if (rowMass[y] < ROW_MIN) continue;
  let end = y;
  while (end + 1 < H && rowMass[end + 1] >= ROW_MIN) end++;
  let mass = 0;
  for (let k = y; k <= end; k++) mass += rowMass[k];
  bands.push({ start: y, end, mass });
  y = end;
}
if (!bands.length) throw new Error('aucun sujet détecté dans ' + srcPath);
const main = bands.reduce((a, b) => (b.mass > a.mass ? b : a));
let firstRow = main.start;
let lastRow = main.end;
for (const b of bands) {
  if (b.end < firstRow && firstRow - b.end <= GAP_MIN) firstRow = b.start;
  if (b.start > lastRow && b.start - lastRow <= GAP_MIN) lastRow = b.end;
}
for (let y = 0; y < H; y++) {
  if (y >= firstRow && y <= lastRow) continue;
  for (let x = 0; x < W; x++) rgba[(y * W + x) * 4 + 3] = 0;
}

// Boîte englobante du sujet conservé
let x0 = W, x1 = 0, y0 = H, y1 = 0;
for (let y = firstRow; y <= lastRow; y++) {
  for (let x = 0; x < W; x++) {
    if (rgba[(y * W + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}

const cropW = x1 - x0 + 1;
const cropH = y1 - y0 + 1;
const scale = CONTENT / Math.max(cropW, cropH);
const targetW = Math.max(1, Math.round(cropW * scale));
const targetH = Math.max(1, Math.round(cropH * scale));

const subject = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: x0, top: y0, width: cropW, height: cropH })
  .resize(targetW, targetH, { fit: "fill" })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: CANVAS,
    height: CANVAS,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    {
      input: subject,
      left: Math.round((CANVAS - targetW) / 2),
      top: Math.round((CANVAS - targetH) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(
  `${outName} : source ${W}x${H}, sujet ${cropW}x${cropH} (lignes ${firstRow}-${lastRow}), sortie ${CANVAS}x${CANVAS}`
);
