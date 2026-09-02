// Prépare le logo CalisIQ à partir du visuel carré livré sur fond noir.
//
// Le visuel empile deux choses : un emblème (l'athlète en planche dans son
// anneau, avec la carte de score) et le mot-logo « CalisIQ ». L'app a besoin
// des deux séparément, plus du seul glyphe « IQ » pour les icônes, où le reste
// serait illisible.
//
// AUCUN DÉTOURAGE, et c'est le point important.
//
// Deux tentatives précédentes ont abîmé le visuel et sont à ne pas refaire.
// Un seuil de luminance rendait transparents les noirs qui appartiennent au
// sujet — cheveux, short, parallettes — que le fond de la page traversait
// ensuite : les cheveux ressortaient à 3 d'opacité sur 255 et l'ensemble
// prenait un voile de fumée. Un remplissage depuis les bords a échoué
// autrement : les noirs du corps communiquent avec le fond par les endroits où
// le liseré lumineux s'interrompt, et la transparence a fui jusque dans le
// torse.
//
// Une illustration lumineuse sur fond noir ne se détoure pas, elle se compose
// en mode `screen` : le noir pur n'ajoute alors rien et disparaît de lui-même,
// exactement, tandis que les lumières s'additionnent au fond. Les fichiers
// produits ici sont donc opaques et strictement identiques à l'original, à la
// mise à l'échelle près. C'est l'affichage qui fait le travail — voir la
// classe `mix-blend-screen` posée sur les <img> dans l'app.
//
// Usage : node scripts/import-logo.mjs <source.png>

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Luminance à partir de laquelle un pixel compte comme du contenu pour le
// cadrage. Le visuel baigne dans un halo diffus qui court jusqu'aux bords ;
// cadrer dessus donnerait un logo minuscule perdu au milieu du vide.
const CONTENT_MIN_LUM = 45;
// Ligne de partage entre l'emblème et le mot-logo, en fraction de la hauteur
// source. Mesurée sur le creux de pixels allumés entre les deux blocs.
const SPLIT_RATIO = 0.687;
// Colonne à partir de laquelle commence le « IQ » cyan, en fraction de la
// largeur. Le « Calis » argenté s'arrête avant.
const MARK_START_RATIO = 0.62;
// Les logos sont affichés à 330 px de large au plus grand (l'écran de
// connexion), donc 800 px couvre les écrans à forte densité.
const LOGO_MAX_SIDE = 800;
// Les logos sortent en WebP : l'image est opaque, photoréaliste et pleine de
// dégradés, donc 912 Ko en PNG contre 90 en WebP pour un rendu indiscernable.
// Qualité tenue haut exprès — vérifié, les noirs restent à 0 après encodage,
// ce qu'exige la composition en `screen` : le moindre bruit dans le noir
// s'ajouterait au fond et se verrait comme un voile.
const LOGO_QUALITY = 92;
// Fond des icônes : la couleur déclarée par le manifest, pour que l'icône se
// fonde dans l'écran de démarrage au lieu de flasher dessus.
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

// Boîte englobante du contenu lumineux, dans une zone donnée.
function contentBox(fromRow, toRow, fromCol = 0, toCol = W - 1) {
  let x0 = W,
    x1 = 0,
    y0 = H,
    y1 = 0;
  for (let y = fromRow; y <= toRow; y++) {
    for (let x = fromCol; x <= toCol; x++) {
      const i = (y * W + x) * 3;
      const lum = Math.max(data[i], data[i + 1], data[i + 2]);
      if (lum >= CONTENT_MIN_LUM) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const source = sharp(srcPath).removeAlpha();

async function writeCrop(box, outName) {
  const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(box.width, box.height));
  const width = Math.round(box.width * scale);
  const height = Math.round(box.height * scale);
  await source
    .clone()
    .extract(box)
    .resize(width, height)
    .webp({ quality: LOGO_QUALITY, effort: 6 })
    .toFile(path.join(publicDir, outName));
  console.log(`${outName} : ${width}x${height}`);
}

const splitRow = Math.round(H * SPLIT_RATIO);
const fullBox = contentBox(0, H - 1);
const emblemBox = contentBox(0, splitRow);
const markBox = contentBox(splitRow, H - 1, Math.round(W * MARK_START_RATIO), W - 1);

await writeCrop(fullBox, "logo-full.webp");
await writeCrop(emblemBox, "logo-emblem.webp");
await writeCrop(markBox, "logo-mark.webp");

// Icônes. Elles portent le glyphe « IQ » et non l'emblème complet : une icône
// est vue à 32 px dans un onglet et à 48 px dans un tiroir d'applications, où
// l'illustration détaillée ne raconte plus rien.
//
// Le glyphe est posé sur le fond de marque en mode `screen`, comme dans l'app :
// le noir du découpage s'efface au profit du fond, sans halo rectangulaire.
// Deux jeux, parce qu'Android recadre les icônes « maskable » en cercle ou en
// goutte : la version normale respire à 14 % du bord, la maskable garde 24 %.
const mark = await source.clone().extract(markBox).png().toBuffer();

async function writeIcon(size, padRatio, outPath) {
  const inner = Math.round(size * (1 - 2 * padRatio));
  const scaled = await sharp(mark)
    .resize(inner, inner, { fit: "inside" })
    .png()
    .toBuffer();
  const meta = await sharp(scaled).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background: ICON_BG },
  })
    .composite([
      {
        input: scaled,
        blend: "screen",
        left: Math.round((size - (meta.width ?? inner)) / 2),
        top: Math.round((size - (meta.height ?? inner)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`${path.basename(outPath)} : ${size}x${size}`);
}

await writeIcon(192, 0.14, path.join(publicDir, "icon-192.png"));
await writeIcon(512, 0.14, path.join(publicDir, "icon-512.png"));
await writeIcon(512, 0.24, path.join(publicDir, "icon-maskable-512.png"));

// Conventions de fichiers Next : src/app/icon.png alimente l'onglet du
// navigateur, src/app/apple-icon.png l'écran d'accueil iOS. Next génère les
// balises <link> tout seul à partir de ces deux noms.
const appDir = path.join(root, "src", "app");
await writeIcon(512, 0.14, path.join(appDir, "icon.png"));
await writeIcon(180, 0.14, path.join(appDir, "apple-icon.png"));
