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

// Les illustrations ne sont plus posées dans un carré. Un carré met le corps
// à l'échelle sur sa plus grande dimension : un corps compact comme la tuck
// planche le remplit, un corps allongé comme la full n'en occupe qu'une
// bande et paraît deux fois plus petit dans la même grille. Et comme la
// vignette affiche l'image en object-contain dans une boîte plus large que
// haute, tout l'espace horizontal restant était perdu.
//
// On cadre donc au plus juste sur le contenu, en gardant son rapport de
// forme. Chaque figure remplit alors sa tuile, quelle que soit sa silhouette.
const LONG_SIDE = 640; // plus grand côté de l'image produite
const MARGIN_RATIO = 0.04; // marge autour du contenu, en fraction de ce côté
const ALPHA_FLOOR = 30; // en dessous : fond, totalement transparent (le fond des
// illustrations est un bleu nuit qui monte jusqu'à 25, pas un noir pur)
const ALPHA_CEIL = 65; // au dessus : sujet, totalement opaque
// Le reflet au sol et le halo de barre sont conservés : ils font partie du
// style. Ils ne peuvent pas pour autant être traités comme le corps. Un halo
// est une lumière, il doit éclaircir le fond ; opacifié comme le reste, il
// devient une tache bleu nuit posée sur la carte ardoise, plus sombre que le
// fond qu'il est censé illuminer. On lui donne donc une opacité
// proportionnelle à son intensité, seule approximation possible d'un rendu
// additif dans un PNG, et le résultat s'éclaircit bien sur un fond sombre.
//
// Le sujet, lui, reste franchement opaque, sans quoi ses zones d'ombre
// laisseraient passer le fond. On le reconnaît à son canal rouge, nul dans
// le décor et supérieur à 120 sur le corps, en gardant à part les points
// d'articulation : eux aussi d'un cyan sans rouge, ils s'en distinguent par
// une intensité qui sature au dessus de 245.
const RED_FLOOR = 25;
const RED_CEIL = 55;
const BRIGHT_FLOOR = 195;
const BRIGHT_CEIL = 230;
// Plancher du halo. Les illustrations portent, en plus du reflet au sol, une
// brume diffuse autour du sujet. Sur fond noir elle ne se voit pas ; rendue
// en semi-transparent sur la carte ardoise, elle devenait un nuage laiteux
// tout autour du personnage. Elle se distingue du reflet par l'intensité :
// la brume vit entre 30 et 120, le reflet monte de 150 à 250. On ne garde
// donc que ce qui brille franchement.
const GLOW_FLOOR = 120;
const GLOW_CEIL = 255; // intensité au dessus de laquelle un halo est opaque
// Une bande de pixels dont la masse est sous cette fraction de celle du sujet
// n'est ni un reflet ni un membre détaché, mais du bruit d'encodage.
const NOISE_BAND_RATIO = 0.02;

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
// Masque du corps seul, décor exclu : c'est lui qui décide du cadrage, pour
// que toutes les figures s'affichent à la même échelle dans la grille.
const subjectMask = new Uint8Array(W * H);
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
  // 1 sur le corps, 0 sur le décor lumineux
  const subject = Math.max(redGate, brightGate);
  const glow = Math.min(1, Math.max(0, (lum - GLOW_FLOOR) / (GLOW_CEIL - GLOW_FLOOR)));
  const a = Math.round(255 * Math.max(subject * brightness, glow));
  // Cadrage : seul le critère du rouge entre en compte, pas l'intensité. Le
  // cœur d'un reflet est assez lumineux pour passer pour du sujet, et la
  // boîte englobante descendait alors jusqu'au sol. Les points
  // d'articulation en sont exclus au passage, sans effet : ils sont posés
  // sur le corps, jamais au delà.
  if (redGate * brightness > 0.5) subjectMask[i] = 1;
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
// Le reflet au sol est conservé, y compris quand il flotte détaché sous le
// sujet : c'est un parti pris visuel. Seules les bandes négligeables sont
// écartées, elles ne viennent pas de l'illustration mais de son encodage.
let firstRow = main.start;
let lastRow = main.end;
for (const b of bands) {
  if (b.mass < main.mass * NOISE_BAND_RATIO) continue;
  if (b.start < firstRow) firstRow = b.start;
  if (b.end > lastRow) lastRow = b.end;
}
for (let y = 0; y < H; y++) {
  if (y >= firstRow && y <= lastRow) continue;
  for (let x = 0; x < W; x++) rgba[(y * W + x) * 4 + 3] = 0;
}

// Boîte englobante du corps, décor exclu : c'est elle qui fixe la marge, pour
// que le personnage soit cadré de la même façon d'une figure à l'autre.
let x0 = W, x1 = 0, y0 = H, y1 = 0;
for (let y = firstRow; y <= lastRow; y++) {
  for (let x = 0; x < W; x++) {
    if (subjectMask[y * W + x]) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}

const subjectW = x1 - x0 + 1;
const subjectH = y1 - y0 + 1;

// Le décor conservé est intégré au cadre s'il tient dans la marge. Au delà,
// il est coupé : un reflet qui flotte loin sous le sujet étirerait le cadre
// et rapetisserait d'autant le personnage, ce qui est précisément le défaut
// qu'on corrige. La coupe tombe alors dans du fond, sans bord visible.
const margin = Math.round(MARGIN_RATIO * Math.max(subjectW, subjectH));
let cx0 = x0, cx1 = x1, cy0 = y0, cy1 = y1;
for (let y = Math.max(0, y0 - margin); y <= Math.min(H - 1, y1 + margin); y++) {
  for (let x = Math.max(0, x0 - margin); x <= Math.min(W - 1, x1 + margin); x++) {
    if (rgba[(y * W + x) * 4 + 3] > 8) {
      if (x < cx0) cx0 = x;
      if (x > cx1) cx1 = x;
      if (y < cy0) cy0 = y;
      if (y > cy1) cy1 = y;
    }
  }
}
cx0 = Math.max(0, cx0 - margin);
cy0 = Math.max(0, cy0 - margin);
cx1 = Math.min(W - 1, cx1 + margin);
cy1 = Math.min(H - 1, cy1 + margin);

const cropW = cx1 - cx0 + 1;
const cropH = cy1 - cy0 + 1;
const scale = LONG_SIDE / Math.max(cropW, cropH);
const outW = Math.max(1, Math.round(cropW * scale));
const outH = Math.max(1, Math.round(cropH * scale));

await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: cx0, top: cy0, width: cropW, height: cropH })
  .resize(outW, outH, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(
  `${outName} : source ${W}x${H}, corps ${subjectW}x${subjectH}, sortie ${outW}x${outH}`
);
