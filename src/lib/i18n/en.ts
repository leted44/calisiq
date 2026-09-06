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
  install: {
    installedTitle: "CalisIQ is installed",
    installedHint: "Launch it from your home screen",
    title: "Install CalisIQ",
    iosSafariHint: "Two taps, in Safari",
    iosStep1Before: "Tap ",
    iosStep1Action: "Share",
    iosStep1After: ", in the bar at the bottom of the screen",
    iosStep2Before: "Choose ",
    iosStep2Action: "Add to Home Screen",
    iosOtherHint: "On iPhone, installing goes through Safari",
    iosOtherBody:
      "Open this address in Safari, then come back here: the instructions will appear.",
    copyLink: "Copy the address",
    linkCopied: "Address copied",
    promptHint: "One tap, right from here",
    helpHint: "See how to add it to your home screen",
    helpStep1: "Open your browser menu, the three dots at the top right.",
    helpStep2: "Choose \"Install app\" or \"Add to Home screen\".",
    helpWarning:
      "This option does not exist in the in-app browsers of Instagram or TikTok: open the link in Chrome first.",
  },
  auth: {
    signingOut: "Signing out...",
  },
  profile: {
    title: "Profile",
    signedInAs: "Signed in as",
    editProfile: "Edit my profile",
    subscription: "Subscription",
    subscriptionHint: "Unlock unlimited analysis",
    tierFree: "Free",
    tierPro: "Pro",
    info: "Details",
    height: "Height",
    weight: "Weight",
    birthDate: "Date of birth",
    gender: "Gender",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    stats: "Statistics",
    statsHint: "Real usage of the app",
    calibration: "Calibration",
    language: "App language",
    languageHint:
      "Changes the language across the whole interface. Your history and analyses are not affected.",
    logout: "Sign out",
    deleteAccount: "Delete my account",
  },
};
