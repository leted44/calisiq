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
    notAnalysable: "Pas encore analysable",
    approximate: "Note approximative : seuils pas encore validés sur des figures réelles",
    difficulty: "Difficulté",
    notAnalysableLong:
      "Pas encore analysable, la notation de cette variation reste à construire.",
    approximateLong:
      "Note approximative : les seuils de cette variation n'ont pas encore été validés sur des figures réelles.",
    notAvailableYet:
      "L'analyse pour cette variation n'est pas encore disponible — ses critères de score sont en cours de calibration.",
    videoSection: "Vidéo",
    videoHint:
      "MP4, MOV, WebM · seul le segment que tu analyses est conservé dans l'historique, allégé automatiquement",
    import: "Importer",
    record: "Se filmer",
    stop: "Arrêter",
    countdown: (n: number) => `Décompte : ${n}s`,
    startRecording: "Démarrer l'enregistrement",
    switchCamera: "Changer de caméra",
    trimSection: "Découpe",
    change: "Changer",
    saveToPhone: "Enregistrer sur le téléphone",
    whenDone: "Quand as-tu réalisé cette figure ?",
    whenDoneHint:
      "Utilisé pour ton historique et ta progression — pratique si tu importes une vidéo filmée il y a un moment.",
    trimHint: "Sélectionne uniquement le passage à analyser",
    trimStart: (v: string) => `Début : ${v}`,
    trimDuration: (v: string) => `Durée : ${v}`,
    saveFailed: (msg: string) => `Échec de l'enregistrement : ${msg}`,
    preparingVideo: (pct: number) => `Préparation de la vidéo... ${pct}%`,
    savedToHistory: "Enregistré dans ton historique",
    reanalyse: "Réanalyser cette vidéo",
    reanalyseSavedHint:
      "Vérifie la cohérence du résultat, sans re-sauvegarder. Le score déjà enregistré dans l'historique n'est pas modifié.",
    reanalyseHint: "Vérifie la cohérence du résultat avant de l'enregistrer.",
    soon: "Bientôt",
    exerciseTypes: "Types d'exercice",
    figures: "Figures",
    favourites: "Favoris",
    progression: "Progression",
    errors: {
      unreadableFile: "Impossible de lire ce fichier vidéo.",
      unreadableVideo: "Impossible de lire cette vidéo. Essaie un autre fichier.",
      camera: (msg: string) => `Impossible d'accéder à la caméra : ${msg}`,
      noOtherCamera: "Aucune autre caméra disponible sur cet appareil.",
      qualityChange:
        "Impossible de changer la qualité — réessaie ou choisis une résolution plus basse.",
      sessionExpired: "Session expirée, reconnecte-toi.",
      tooLarge:
        "Vidéo non sauvegardée : même après découpe, elle dépasse la limite de 50 Mo. Réduis la durée du segment analysé.",
      noVideo: "Choisis ou filme une vidéo.",
      segmentTooShort: (s: number) =>
        `Le segment sélectionné est trop court : il faut au moins ${s}s pour capturer un hold stable.`,
      analysisFailed: (msg: string) => `L'analyse a échoué : ${msg}`,
    },
    comingSoon: "Bientôt disponible",
    addFavorite: (name: string) => `Ajouter ${name} aux favoris`,
    removeFavorite: (name: string) => `Retirer ${name} des favoris`,
  },
  criteria: {
    labels: {
      rep_lockout: "Extension",
      rep_peak: "Amplitude",
      rep_control: "Contrôle",
      rep_form: "Forme",
      rep_tempo: "Tempo",
      shoulder_protraction: "Épaules",
      shoulder_flexion: "Épaules",
      pelvis_deviation: "Bassin",
      pelvis_sag: "Gainage",
      hip_angle: "Hanches",
      knee_angle: "Genoux",
      elbow_angle: "Coudes",
      body_line_angle: "Axe du corps",
      torso_angle: "Tronc",
      straightest_knee_angle: "Jambe tendue",
      straightest_leg_hip_angle: "Hanche jambe tendue",
      bent_knee_angle: "Jambe repliée",
    } as Record<string, string>,
    titles: {
      rep_lockout: "Extension complète",
      rep_peak: "Amplitude du mouvement",
      rep_control: "Contrôle du corps",
      rep_form: "Tenue du corps",
      rep_tempo: "Régularité du tempo",
      shoulder_protraction: "Protraction des épaules",
      shoulder_flexion: "Ouverture des épaules",
      pelvis_deviation: "Alignement du bassin",
      pelvis_sag: "Bassin qui s'affaisse",
      hip_angle: "Position des hanches",
      knee_angle: "Extension des jambes",
      elbow_angle: "Verrouillage des coudes",
      body_line_angle: "Alignement du corps",
      torso_angle: "Alignement du tronc",
      straightest_knee_angle: "Extension de la jambe tendue",
      straightest_leg_hip_angle: "Ouverture de hanche (jambe tendue)",
      bent_knee_angle: "Repli de la jambe libre",
    } as Record<string, string>,
  },
  result: {
    tierExcellent: "Excellent niveau",
    tierGood: "Bon niveau",
    tierWork: "Encore du travail",
    reps: "Répétitions",
    hold: "Hold",
    summary: "Résumé",
    detail: "Détail par catégorie",
    // Type de retour annoté : sans lui, TypeScript infère l union des deux
    // chaînes françaises et refuse toute autre langue.
    completedReps: (n: number): string =>
      n > 1 ? "répétitions complètes" : "répétition complète",
    globalScore: "Score global",
    measured: (v: string) => `mesuré ${v}`,
    target: (v: string) => `cible ${v}`,
    weakPoint: "Point faible",
    priority: "À travailler en priorité",
  },
  warnings: {
    cancelled: "Analyse annulée.",
    noBodyVideo:
      "Aucun corps détecté dans cette vidéo. Vérifie que tu es entièrement visible dans le cadre, avec un bon éclairage.",
    noBodyImage:
      "Aucun corps détecté sur cette image. Vérifie que la personne est entièrement visible.",
    lowDetection: (pct: number) =>
      `Corps détecté seulement sur ${pct}% des frames — vérifie le cadrage et l'angle de caméra pour un résultat fiable.`,
    noStableHold:
      "Aucune position stable assez longue détectée — la durée du hold n'a pas pu être mesurée. Filme si possible avec le téléphone posé/stable plutôt qu'à la main.",
    noReps:
      "Aucune répétition complète détectée. Filme de profil, corps entier visible, et va au bout du mouvement dans les deux sens — les répétitions partielles ne sont pas comptées.",
    fewReps: (n: number) =>
      `Seulement ${n} répétition${n > 1 ? "s" : ""} détectée${n > 1 ? "s" : ""} : la régularité du tempo n'a pas beaucoup de sens sur une série aussi courte.`,
    notHandstand:
      "Position debout détectée, pas un handstand. Pour analyser un handstand, les mains doivent être au sol et les pieds en l'air (position inversée).",
    legOcclusion:
      "Une jambe peut être mal détectée ou superposée à l'autre sur cette vidéo — pour un straddle, filme légèrement de biais (pas totalement de face ni de profil) pour bien distinguer les deux jambes, sinon les angles genou et axe du corps peuvent être faussés.",
    notSingleLegFrontLever:
      "Les deux jambes sont tendues sur cette vidéo : c'est un Full Front Lever, pas un Single Leg. Change de variation pour obtenir un score juste — le Single Leg attend une jambe tendue et l'autre repliée.",
    notFullDragonFlag:
      "Une jambe est repliée sur cette vidéo : c'est un Single Leg Dragon Flag, pas un Full. Change de variation pour obtenir un score juste.",
    notSingleLegDragonFlag:
      "Les deux jambes sont tendues sur cette vidéo : c'est un Full Dragon Flag, pas un Single Leg. Change de variation pour obtenir un score juste.",
    tooFrontOn:
      "Vidéo filmée trop de face pour cet exercice. Filme de profil, corps entier dans le cadre : la flexion des bras et l'ouverture de hanche se voient de côté, pas de face. Les notes de contrôle et de forme restent approximatives sur cette prise.",
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
