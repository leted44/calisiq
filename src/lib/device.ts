/**
 * Plateforme et navigateur, lus dans la signature du navigateur.
 *
 * POURQUOI LES ENREGISTRER
 *
 * Un inscrit qui ne lance jamais d'analyse pose une question sans réponse :
 * a-t-il renoncé, ou l'application a-t-elle échoué chez lui ? Ces deux
 * champs tranchent, parce que les échecs connus sont liés à l'appareil et non
 * à la personne.
 *
 * iOS décode la vidéo autrement qu'Android et refuse certains formats ; les
 * navigateurs intégrés à Instagram et TikTok, eux, brident l'accès aux
 * fichiers et à la caméra et ne savent pas installer l'application. Quelqu'un
 * qui ouvre le lien depuis une story Instagram atterrit précisément dans ce
 * cas-là, sans jamais comprendre pourquoi rien ne marche.
 *
 * Si les comptes inactifs se concentrent sur une plateforme ou un navigateur,
 * ce n'est plus un problème d'adoption, c'est un bug.
 *
 * CE QUE CETTE LECTURE NE SAIT PAS FAIRE
 *
 * La signature du navigateur est déclarative : elle se falsifie, et certains
 * navigateurs la tronquent pour des raisons de vie privée. Un iPad récent se
 * présente d'ailleurs comme un Mac, et rien côté serveur ne permet de l'en
 * distinguer — il sera donc compté comme ordinateur. Ces valeurs servent à
 * repérer une tendance, pas à identifier un appareil.
 */

export type Platform = "ios" | "android" | "desktop" | "other";
export type Browser =
  | "safari"
  | "chrome"
  | "firefox"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "other";

export function platformFromUserAgent(ua: string | null): Platform | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(s)) return "ios";
  if (/android/.test(s)) return "android";
  if (/windows|macintosh|linux|cros/.test(s)) return "desktop";
  return "other";
}

export function browserFromUserAgent(ua: string | null): Browser | null {
  if (!ua) return null;
  const s = ua.toLowerCase();

  // Les navigateurs intégrés d'abord : ils empruntent la signature de Safari
  // ou de Chrome et seraient sinon comptés comme tels, ce qui effacerait
  // justement l'information la plus utile.
  if (/instagram/.test(s)) return "instagram";
  if (/tiktok|musical_ly|bytedance/.test(s)) return "tiktok";
  if (/fban|fbav|fb_iab/.test(s)) return "facebook";

  if (/firefox|fxios/.test(s)) return "firefox";
  if (/edg\/|edgios/.test(s)) return "chrome";
  if (/chrome|crios/.test(s)) return "chrome";
  // Safari en dernier : Chrome et Edge portent « safari » dans leur propre
  // signature, l'ordre est donc ce qui rend ce test juste.
  if (/safari/.test(s)) return "safari";

  return "other";
}

/** Libellés courts pour l'affichage administrateur. */
export const PLATFORM_LABELS: Record<Platform, string> = {
  ios: "iOS",
  android: "Android",
  desktop: "Ordinateur",
  other: "Autre",
};

export const BROWSER_LABELS: Record<Browser, string> = {
  safari: "Safari",
  chrome: "Chrome",
  firefox: "Firefox",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  other: "Autre",
};
