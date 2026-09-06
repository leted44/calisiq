import type { Dictionary } from "./fr";

// Dictionnaire anglais. Son type est celui du français : toute clé ajoutée
// là-bas et absente ici casse la compilation, ce qui évite les traductions
// partielles qui passent inaperçues.
//
// Traduit dans le registre de l'app : tutoiement français rendu par un ton
// direct en anglais, pas de vouvoiement guindé ni de jargon.
export const en: Dictionary = {
  meta: {
    description: "Biomechanical analysis of your calisthenics movements",
  },
  nav: {
    home: "Home",
    history: "History",
    progress: "Progress",
    profile: "Profile",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    back: "Back",
    close: "Close",
    loading: "Loading...",
    retry: "Try again",
    yes: "Yes",
    no: "No",
    optional: "optional",
    seconds: (n: number) => `${n}s`,
  },
  profile: {
    title: "Profile",
    language: "App language",
    languageHint:
      "Changes the language across the whole interface. Your history and analyses are not affected.",
    logout: "Sign out",
    deleteAccount: "Delete my account",
  },
};
