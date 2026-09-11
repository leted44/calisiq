import type { ScoreTier } from "@/lib/pose/report";

// Textes du rapport d'analyse en anglais.
//
// Ce sont des textes de domaine et non d'habillage : ils suivent la grille de
// notation, pas les écrans. D'où ce fichier distinct du dictionnaire
// d'interface, comme pour les noms de figures.
type Descriptions = Record<string, Record<ScoreTier, string>>;

export const reportEn = {
  tierLabels: {
    optimal: "Optimal",
    bon: "Good",
    faible: "Needs work",
  } as Record<ScoreTier, string>,

  critereDefinitions: {
    rep_lockout:
      "Angle reached in the extended position, averaged over the set. Measures whether each rep starts from a full extension.",
    rep_peak:
      "Angle reached in the flexed position, averaged over the set. Measures whether each rep is taken all the way.",
    rep_control:
      "Standard deviation of the hip angle over the set. Measures swing: a hip that oscillates gives away a movement thrown rather than pulled.",
    rep_form:
      "Mean hip angle over the set. Measures how the body is held during the movement, where control measures the swing.",
    rep_protraction:
      "Mean forward lean of the shoulders past the wrists during the set, relative to torso length. This is what separates a planche push-up from an ordinary one: the other criteria only look at the elbow, the hip and the rhythm.",
    rep_tempo:
      "Consistency of rep duration, as a percentage. A set that fades gets slower on the last reps.",
    elbow_angle:
      "Shoulder-elbow-wrist angle. Measures whether the arm is locked out (close to 180 degrees) or bent.",
    hip_angle:
      "Shoulder-hip-knee angle. Defines how far the body is folded or extended at the hips.",
    knee_angle:
      "Hip-knee-ankle angle. Measures whether the leg is straight (close to 180 degrees) or bent.",
    shoulder_protraction:
      "Horizontal gap between shoulder and wrist, relative to torso length. Measures how far the shoulders travel past the hands.",
    shoulder_flexion:
      "Hip-shoulder-wrist angle. Measures how far the arm opens overhead.",
    pelvis_deviation:
      "Gap between the hips and the straight shoulder-to-ankle line. Detects hips that drop (sag) or rise (pike).",
    pelvis_sag:
      "How far the hips drop below the shoulder-to-ankle line, relative to body length. Unlike the hip angle, which cannot tell an arched back from a closed hip, this criterion only looks at the drop.",
    body_line_angle:
      "Angle of the whole body (shoulder to ankle) against the horizontal. Measures how well the body is aligned for the target progression.",
    torso_angle:
      "Angle of the torso alone (shoulder to hip) against the horizontal. Used on figures where the legs are not in the same position, and where a shoulder-to-ankle line would mean nothing.",
    straightest_knee_angle:
      "Knee angle of the straighter leg. On a single-leg figure it carries the difficulty; averaging both legs would describe neither.",
    straightest_leg_hip_angle:
      "Shoulder-hip-knee angle on the side of the straight leg. Measures whether that leg extends the torso rather than folding towards it.",
    bent_knee_angle:
      "Knee angle of the leg that must stay tucked. This is what separates a single-leg figure from a two-legged one: without it, a harder position would score perfectly in the wrong category.",
  } as Record<string, string>,

  planche: {
    shoulder_protraction: {
      optimal: "Shoulders well past the wrists, the load is properly transferred onto the arms.",
      bon: "Decent protraction, still some room to push the shoulders further forward.",
      faible: "Shoulders not far enough past the wrists, not enough load on the arms and an unstable hold.",
    },
    pelvis_deviation: {
      optimal: "Hips perfectly aligned between shoulders and ankles.",
      bon: "Hips broadly aligned, slightly off the ideal line.",
      faible: "The hips drift clearly off the shoulder-hip-ankle line.",
    },
    hip_angle: {
      optimal: "Hip-knee angle very close to the target for this variation.",
      bon: "Hip-knee angle reasonably close to the target.",
      faible: "The hip-knee angle drifts from what this variation expects.",
    },
    knee_angle: {
      optimal: "Legs well extended, full lever.",
      bon: "Legs almost straight, a little bend remains.",
      faible: "Legs clearly bent, the lever is shortened and the figure is easier.",
    },
    elbow_angle: {
      optimal: "Arms locked out, the position is held on structure rather than on strength.",
      bon: "Arms nearly locked, a slight bend remains.",
      faible: "Arms bent, the hold rests on the biceps instead of the locked joint.",
    },
    body_line_angle: {
      optimal: "Body horizontal, the line is clean from shoulders to ankles.",
      bon: "Body close to horizontal, slightly tilted.",
      faible: "Body far from horizontal, this is not yet the target position.",
    },
  } as Descriptions,

  handstand: {
    shoulder_flexion: {
      optimal: "Shoulders fully open, arms overhead, ears covered by the shoulders.",
      bon: "Decent shoulder opening, still some room to push into the floor.",
      faible: "Not enough shoulder opening, with a risk of arching the back to compensate.",
    },
    pelvis_deviation: {
      optimal: "Body line perfectly straight, no arch.",
      bon: "Body line broadly straight, slightly off.",
      faible: "The body arches clearly, a banana handstand instead of a straight line.",
    },
    hip_angle: {
      optimal: "Hips well open, body stacked vertically.",
      bon: "Hips reasonably open, slight fold.",
      faible: "Hips folded, watch out for the banana handstand.",
    },
    elbow_angle: {
      optimal: "Arms well extended, properly locked out.",
      bon: "Arms almost straight, slight bend.",
      faible: "Elbows bent, the position is held by the arms rather than by balance.",
    },
    knee_angle: {
      optimal: "Knees well extended, clean vertical line.",
      bon: "Knees almost straight, slight bend.",
      faible: "Knees bent, which breaks the vertical line of the body.",
    },
    body_line_angle: {
      optimal: "Body properly vertical.",
      bon: "Body broadly vertical, slightly off.",
      faible: "The body is not vertical enough.",
    },
  } as Descriptions,

  front_lever: {
    hip_angle: {
      optimal: "Hip-knee angle very close to the target for this variation.",
      bon: "Hip-knee angle reasonably close to the target.",
      faible: "The hip-knee angle drifts from what this variation expects.",
    },
    elbow_angle: {
      optimal: "Arms well extended, properly locked out.",
      bon: "Arms almost straight, slight bend.",
      faible: "Elbows bent, the position is held by the arms rather than by back strength.",
    },
    knee_angle: {
      optimal: "Knees well extended.",
      bon: "Knees almost straight, slight bend.",
      faible: "Knees bent, the legs must stay straight for this variation.",
    },
    body_line_angle: {
      optimal: "Body nicely parallel to the ground for this progression.",
      bon: "Body broadly parallel to the ground, slightly off.",
      faible: "The body is not parallel enough to the ground for this progression.",
    },
  } as Descriptions,

  dragon_flag: {
    pelvis_sag: {
      optimal: "Core held throughout, the hips never drop below the body line.",
      bon: "The hips drop a little at the end of the range, the core broadly holds.",
      faible:
        "The hips drop and the lower back arches. This is the fault that invalidates the figure, and the one that gets people hurt: a dragon flag is held hollow, not arched.",
    },
    hip_angle: {
      optimal: "Body line locked, no break at the hips.",
      bon: "Slight break at the hips, the line broadly holds.",
      faible:
        "The body breaks at the hips, the classic way to shorten the lever and spare the core.",
    },
    knee_angle: {
      optimal: "Legs well extended, full lever.",
      bon: "Knees almost straight, slight bend.",
      faible: "Knees bent, the lever is shortened and the figure is easier than it looks.",
    },
    body_line_angle: {
      optimal: "Body close to horizontal, the lever is at its longest.",
      bon: "Body well lowered, a few degrees still to go.",
      faible: "The body stays too upright, the current angle is beyond what your core can hold.",
    },
    torso_angle: {
      optimal: "Torso low and controlled, the rotation happens around the shoulders.",
      bon: "Torso properly lowered, still some room.",
      faible: "Torso too upright, the rotation happens around the hips instead of the shoulders.",
    },
  } as Descriptions,

  reps: {
    rep_lockout: {
      optimal: "Every rep starts from a full extension.",
      bon: "Almost full extension at the bottom of each rep.",
      faible: "The reps do not start from a full extension, the range is cut short at the bottom.",
    },
    rep_peak: {
      optimal: "Reps taken all the way.",
      bon: "Decent range, a few degrees missing at the top.",
      faible: "Reps cut short at the top, the movement is not taken to its end.",
    },
    rep_control: {
      optimal: "Body braced, no swing.",
      bon: "Slight hip swing, the movement is still broadly pulled.",
      faible: "The hips swing clearly, the reps are thrown rather than pulled.",
    },
    rep_form: {
      optimal: "Body held straight across the whole set.",
      bon: "Broadly correct position, with a slight break at the hips.",
      faible:
        "The body stays broken at the hips through the reps, the range is shortened and the figure is easier than it looks.",
    },
    rep_protraction: {
      optimal: "Shoulders well past the wrists across the whole set.",
      bon: "The shoulder lean is there but fades over the set.",
      faible:
        "The shoulders do not travel far enough past the wrists: this is a push-up, not a planche push-up.",
    },
    rep_tempo: {
      optimal: "Steady tempo from the first rep to the last.",
      bon: "Broadly steady tempo, with a slight slowdown.",
      faible: "The tempo degrades sharply, the last reps are much slower than the first.",
    },
  } as Descriptions,
};
