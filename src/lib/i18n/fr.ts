import { figuresFr } from "./figures.fr";

// Dictionnaire français, source de vérité.
//
// Le type du dictionnaire anglais est dérivé de celui-ci (`typeof fr`), donc
// une clé ajoutée ici et oubliée là-bas ne compile pas. C'est ce qui empêche
// une traduction de se dégrader en silence au fil des ajouts.
//
// Les valeurs paramétrées sont des fonctions plutôt que des chaînes à trous :
// l'ordre des mots change d'une langue à l'autre, et une fonction laisse
// chaque langue placer ses variables où sa grammaire l'exige.
export const fr = {
  ...figuresFr,
  meta: {
    description: "Analyse biomécanique de tes mouvements de calisthénie",
  },
  nav: {
    home: "Accueil",
    history: "Historique",
    progress: "Progrès",
    profile: "Profil",
  },
  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    back: "Retour",
    close: "Fermer",
    loading: "Chargement...",
    retry: "Réessayer",
    yes: "Oui",
    no: "Non",
    optional: "facultatif",
    seconds: (n: number) => `${n} s`,
  },
  analysis: {
    comingSoon: "Bientôt disponible",
    addFavorite: (name: string) => `Ajouter ${name} aux favoris`,
    removeFavorite: (name: string) => `Retirer ${name} des favoris`,
  },
  install: {
    installedTitle: "CalisIQ est bien installé",
    installedHint: "Tu la lances depuis ton écran d'accueil",
    title: "Installer CalisIQ",
    iosSafariHint: "Deux gestes, dans Safari",
    iosStep1Before: "Touche ",
    iosStep1Action: "Partager",
    iosStep1After: ", dans la barre en bas de l'écran",
    iosStep2Before: "Choisis ",
    iosStep2Action: "Sur l'écran d'accueil",
    iosOtherHint: "Sur iPhone, l'installation passe par Safari",
    iosOtherBody:
      "Ouvre cette adresse dans Safari, puis reviens ici : le mode d'emploi s'affichera.",
    copyLink: "Copier l'adresse",
    linkCopied: "Adresse copiée",
    promptHint: "Un seul geste, directement depuis ici",
    helpHint: "Voir comment l'ajouter à ton écran d'accueil",
    helpStep1: "Ouvre le menu de ton navigateur, les trois points en haut à droite.",
    helpStep2:
      "Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
    helpWarning:
      "Cette option n'existe pas dans les navigateurs intégrés à Instagram ou TikTok : ouvre le lien dans Chrome d'abord.",
  },
  auth: {
    signingOut: "Déconnexion...",
  },
  profile: {
    title: "Profil",
    signedInAs: "Connecté en tant que",
    editProfile: "Modifier mon profil",
    subscription: "Abonnement",
    subscriptionHint: "Débloquer l'analyse illimitée",
    tierFree: "Gratuit",
    tierPro: "Pro",
    info: "Informations",
    height: "Taille",
    weight: "Poids",
    birthDate: "Date de naissance",
    gender: "Sexe",
    genderMale: "Homme",
    genderFemale: "Femme",
    genderOther: "Autre",
    stats: "Statistiques",
    statsHint: "Usage réel de l'application",
    calibration: "Calibration",
    language: "Langue de l'application",
    languageHint:
      "Change la langue de toute l'interface. Ton historique et tes analyses ne sont pas affectés.",
    logout: "Se déconnecter",
    deleteAccount: "Supprimer mon compte",
  },
};

// Pas de `as const` : il figerait chaque valeur en type littéral, et le
// dictionnaire anglais ne pourrait alors contenir que le texte français.
// Ce qui doit être contraint, ce sont les clés, et elles le sont déjà.
export type Dictionary = typeof fr;
