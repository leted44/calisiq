import type { Dictionary } from "./fr";
import { figuresEn } from "./figures.en";

// Dictionnaire anglais. Son type est celui du français : toute clé ajoutée
// là-bas et absente ici casse la compilation, ce qui évite les traductions
// partielles qui passent inaperçues.
//
// Traduit dans le registre de l'app : tutoiement français rendu par un ton
// direct en anglais, pas de vouvoiement guindé ni de jargon.
export const en: Dictionary = {
  ...figuresEn,
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
  analysis: {
    notAnalysable: "Not analysable yet",
    approximate: "Approximate score: thresholds not yet validated on real figures",
    difficulty: "Difficulty",
    notAnalysableLong:
      "Not analysable yet, the scoring for this variation still has to be built.",
    approximateLong:
      "Approximate score: the thresholds for this variation have not been validated on real figures yet.",
    notAvailableYet:
      "Analysis for this variation is not available yet — its scoring criteria are still being calibrated.",
    videoSection: "Video",
    videoHint:
      "MP4, MOV, WebM · only the segment you analyse is kept in your history, compressed automatically",
    import: "Import",
    record: "Record",
    stop: "Stop",
    countdown: (n: number) => `Starting in ${n}s`,
    startRecording: "Start recording",
    switchCamera: "Switch camera",
    trimSection: "Trim",
    change: "Change",
    saveToPhone: "Save to phone",
    whenDone: "When did you do this figure?",
    whenDoneHint:
      "Used for your history and progress — handy when you import a video filmed a while ago.",
    trimHint: "Select only the part you want analysed",
    trimStart: (v: string) => `Start: ${v}`,
    trimDuration: (v: string) => `Length: ${v}`,
    saveFailed: (msg: string) => `Could not save: ${msg}`,
    preparingVideo: (pct: number) => `Preparing the video... ${pct}%`,
    savedToHistory: "Saved to your history",
    reanalyse: "Re-analyse this video",
    reanalyseSavedHint:
      "Checks the result without saving again. The score already in your history is unchanged.",
    reanalyseHint: "Check the result before saving it.",
    soon: "Soon",
    exerciseTypes: "Exercise type",
    figures: "Figures",
    favourites: "Favourites",
    progression: "Progression",
    errors: {
      unreadableFile: "This video file could not be read.",
      unreadableVideo: "This video could not be read. Try another file.",
      camera: (msg: string) => `Could not access the camera: ${msg}`,
      noOtherCamera: "No other camera available on this device.",
      qualityChange:
        "Could not change the quality — try again or pick a lower resolution.",
      sessionExpired: "Session expired, sign in again.",
      tooLarge:
        "Video not saved: even after trimming it exceeds the 50 MB limit. Shorten the segment you analyse.",
      noVideo: "Choose or record a video.",
      segmentTooShort: (s: number) =>
        `The selected segment is too short: at least ${s}s are needed to capture a stable hold.`,
      analysisFailed: (msg: string) => `Analysis failed: ${msg}`,
    },
    comingSoon: "Coming soon",
    addFavorite: (name: string) => `Add ${name} to favourites`,
    removeFavorite: (name: string) => `Remove ${name} from favourites`,
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
