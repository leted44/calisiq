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
  profile: {
    title: "Profil",
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
