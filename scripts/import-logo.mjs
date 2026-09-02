// Prépare le logo CalisIQ pour l'application à partir d'un visuel carré
// livré sur fond noir.
//
// Le visuel source empile deux choses : un emblème (l'athlète en planche dans
// son anneau, avec la carte de score) et le mot-logo « CalisIQ ». L'app a
// besoin des deux séparément — le verrou complet pour les écrans, l'emblème
// seul pour l'icône, où le mot-logo serait illisible à 192 px.
//
// Le fond est un noir franc (luminance 0 à 4), le sujet démarre bien au
// dessus : un simple seuil de luminance suffit à détourer, sans la
// machinerie de séparation corps/décor qu'exigent les illustrations de
// figures (voir import-figure-image.mjs).
//
// Usage : node scripts/import-logo.mjs <source.png>

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ALPHA_FLOOR = 8; // en dessous : fond
const ALPHA_CEIL = 30; // au dessus : sujet plein
// Ligne de partage entre l'emblème et le mot-logo, en fraction de la hauteur
// source. Mesurée sur le creux de pixels allumés entre les deux blocs.
const SPLIT_RATIO = 0.687;
// Fond des icônes : la couleur de fond déclarée par le manifest, pour que
// l'icône se fonde dans l'écran de démarrage au lieu de flasher dessus.
const ICON_BG = { r: 11, g: 15, b: 25, alpha: 1 };

const srcPath = process.argv[2];
if (!srcPath) {
  console.error("Usage : node scripts/import-logo.mjs <source.png>");
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const { data, info } = await sharp(srcPath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 3];
  const g = data[i * 3 + 1];
  const b = data[i * 3 + 2];
  const lum = Math.max(r, g, b);
  const a = Math.round(
    255 * Math.min(1, Math.max(0, (lum - ALPHA_FLOOR) / (ALPHA_CEIL - ALPHA_FLOOR)))
  );
  rgba[i * 4] = r;
  rgba[i * 4 + 1] = g;
  rgba[i * 4 + 2] = b;
  rgba[i * 4 + 3] = a;
}

// Boîte englobante du contenu opaque, dans une zone donnée.
function contentBox(fromRow, toRow, fromCol = 0, toCol = W - 1) {
  let x0 = W,
    x1 = 0,
    y0 = H,
    y1 = 0;
  for (let y = fromRow; y <= toRow; y++) {
    for (let x = fromCol; x <= toCol; x++) {
      if (rgba[(y * W + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Taille de sortie des logos. Ils sont affichés à 300 px de large au plus
// grand (l'écran de connexion), donc 800 px couvre déjà les écrans à forte
// densité. Le visuel source fait 1254 px de côté et pèse 1,5 Mo une fois
// détouré : le servir tel quel ferait payer un mégaoctet inutile à chaque
// ouverture de l'app, pour des pixels que personne ne verra jamais.
const LOGO_MAX_SIDE = 800;

async function writeCrop(box, outName) {
  const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(box.width, box.height));
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract(box)
    .resize(Math.round(box.width * scale), Math.round(box.height * scale))
    // Palette quantifiée : le logo est un aplat de bleus et de blancs sur du
    // vide, il ne perd rien à 256 couleurs et le fichier est divisé par dix.
    .png({ palette: true, quality: 92, effort: 10 })
    .toFile(path.join(publicDir, outName));
  console.log(
    `${outName} : ${Math.round(box.width * scale)}x${Math.round(box.height * scale)}`
  );
  return box;
}

const splitRow = Math.round(H * SPLIT_RATIO);
const fullBox = contentBox(0, H - 1);
const emblemBox = contentBox(0, splitRow);
// Le « IQ » cyan et sa loupe, découpés dans le mot-logo. C'est la seule
// partie du visuel qui tient dans une icône : mesuré sur la maquette, l'athlète
// et son anneau deviennent une bouillie illisible dès 32 px, alors que deux
// lettres pleines et une loupe restent nettes. Le « Calis » argenté qui précède
// s'arrête avant cette colonne, d'où la découpe.
const markBox = contentBox(splitRow, H - 1, Math.round(W * 0.62), W - 1);

await writeCrop(fullBox, "logo-full.png");
await writeCrop(emblemBox, "logo-emblem.png");
await writeCrop(markBox, "logo-mark.png");

// Icônes. Elles portent le glyphe « IQ » et non l'emblème complet : une icône
// est vue à 32 px dans un onglet et à 48 px dans un tiroir d'applications, où
// l'illustration détaillée ne raconte plus rien.
//
// Le glyphe est posé sur le fond de marque plutôt que laissé transparent : une
// icône transparente prend la couleur du lanceur, blanche sur beaucoup
// d'Android, et le cyan y disparaîtrait.
//
// Deux jeux, parce qu'Android recadre les icônes « maskable » en cercle ou en
// goutte : la version normale respire à 14 % du bord, la maskable garde 24 %
// pour que rien d'utile ne tombe dans la découpe.
const emblem = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract(markBox)
  .png()
  .toBuffer();

async function writeIcon(size, padRatio, outName) {
  const inner = Math.round(size * (1 - 2 * padRatio));
  const scaled = await sharp(emblem)
    .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const meta = await sharp(scaled).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background: ICON_BG },
  })
    .composite([
      {
        input: scaled,
        left: Math.round((size - (meta.width ?? inner)) / 2),
        top: Math.round((size - (meta.height ?? inner)) / 2),
      },
    ])
    .png({ palette: true, quality: 92, effort: 10 })
    .toFile(path.join(publicDir, outName));
  console.log(`${outName} : ${size}x${size}`);
}

async function writeAppIcon(size, padRatio, outName) {
  const inner = Math.round(size * (1 - 2 * padRatio));
  const scaled = await sharp(emblem).resize(inner, inner, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(scaled).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background: ICON_BG },
  })
    .composite([
      {
        input: scaled,
        left: Math.round((size - (meta.width ?? inner)) / 2),
        top: Math.round((size - (meta.height ?? inner)) / 2),
      },
    ])
    .png({ palette: true, quality: 92, effort: 10 })
    .toFile(path.join(root, "src", "app", outName));
  console.log(`src/app/${outName} : ${size}x${size}`);
}

await writeIcon(192, 0.14, "icon-192.png");
await writeIcon(512, 0.14, "icon-512.png");
await writeIcon(512, 0.24, "icon-maskable-512.png");

// Conventions de fichiers Next : src/app/icon.png alimente l'onglet du
// navigateur, src/app/apple-icon.png l'écran d'accueil iOS. Next génère les
// balises <link> tout seul à partir de ces deux noms.
await writeAppIcon(512, 0.14, "icon.png");
await writeAppIcon(180, 0.14, "apple-icon.png");
