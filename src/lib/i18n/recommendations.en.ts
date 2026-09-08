import type { TieredRecommendations } from "@/lib/pose/recommendations";

// Recommandations d'exercices en anglais.
//
// Généré depuis la structure française, table par table, pour qu'aucune
// entrée ne puisse manquer : la génération échoue si une seule chaîne n'a pas
// de traduction. Les commentaires qui documentent les choix restent côté
// français, où ils sont à leur place ; les dupliquer ici les ferait diverger.
export const recommendationsEn: Record<
  string,
  Record<string, TieredRecommendations>
> = {
  PLANCHE: {
  shoulder_protraction: {
    faible: [
      {
        exercice: "Planche lean (progressive lean against a wall or on the floor)",
        raison:
          "Shoulders not far enough past the wrists means too little load on the forearms and an unstable hold.",
      },
      {
        exercice: "Scapula push-up",
        raison: "Builds the scapular control that good protraction depends on.",
      },
    ],
    bon: [
      {
        exercice: "Pseudo planche push-up, slow tempo (3s at the bottom)",
        raison:
          "The protraction is there but still a little short. The slow tempo forces you to find the last few degrees.",
      },
    ],
    optimal: [
      {
        exercice: "Keep the cue \"push the floor far in front\" on longer holds",
        raison: "Protraction is already excellent; the point now is holding it over time.",
      },
    ],
  },
  pelvis_deviation_sag: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "The hips drop instead of staying aligned from shoulder to ankle.",
      },
      {
        exercice: "Isometric tuck planche with the cue \"navel to spine\"",
        raison: "Builds the core strength needed to stop the hips dropping.",
      },
    ],
    bon: [
      {
        exercice: "Hollow body hold with a pause at the end of the set, legs straighter",
        raison: "The drop is slight. A little more core tension at the end of the set closes the last gap.",
      },
    ],
    optimal: [
      {
        exercice: "Nothing to fix on the core, just watch for fatigue at the end of the hold",
        raison: "Alignment is already near perfect; the only risk left is letting go at the end of the effort.",
      },
    ],
  },
  pelvis_deviation_pike: {
    faible: [
      {
        exercice: "Straddle planche with the cue \"push the heels backwards\"",
        raison: "The hips rise into a pike instead of staying aligned from shoulder to ankle.",
      },
    ],
    bon: [
      {
        exercice: "Same position with the cue \"open the hips slightly forward\"",
        raison: "A slight pike remains. A cue adjustment is enough, no need to step back to an easier exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Nothing to fix, just watch for the pike creeping in as you tire",
        raison: "Alignment is already near perfect.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Isometric tuck hold (palms on the floor)",
        raison: "Builds control of the hip-knee angle specific to your current progression.",
      },
      {
        exercice: "Progressive L-sit",
        raison: "Develops the hip flexor strength needed to hold the target angle.",
      },
    ],
    bon: [
      {
        exercice: "Same position, close the hip angle by a few degrees each set",
        raison: "The angle is close to target. A gradual adjustment rather than a new exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Hip angle already under control, work on hold duration at this angle instead",
        raison: "Nothing to fix here; the priority moves from technique to endurance.",
      },
    ],
  },

  hip_angle_open: {
    faible: [
      {
        exercice: "Isometric tuck hold with the cue \"round the back, draw the hips towards the chest\"",
        raison:
          "The hips are too open for this progression. A tighter, rounder tuck makes the position more stable.",
      },
      {
        exercice: "Progressive L-sit, knees drawn well in to the chest",
        raison: "Develops the hip flexion strength needed to tighten the tuck.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"round the back a little more\" each set",
        raison: "The angle is close to target. Tighten the tuck rather than change exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Tuck tightness already under control, work on hold duration instead",
        raison: "Nothing to fix here; the priority moves from technique to endurance.",
      },
    ],
  },
  hip_angle_closed: {
    faible: [
      {
        exercice: "Isometric tuck hold with the cue \"open the hips very slightly\"",
        raison:
          "The tuck is tighter than the target. Too much hip flexion hurts balance just as much as too little.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"open the hips very slightly\" each set",
        raison: "The angle is close to target; a fine adjustment is enough.",
      },
    ],
    optimal: [
      {
        exercice: "Hip angle already under control, work on hold duration at this angle instead",
        raison: "Nothing to fix here; the priority moves from technique to endurance.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Isolated triceps work (diamond push-ups, dips)",
        raison: "Elbows bent to make up for a lack of strength, which invalidates the figure at a high level.",
      },
      {
        exercice: "Shorten the hold and put form before time",
        raison: "A short hold with straight arms beats a long one propped up by bent elbows.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"actively lock the elbows\" from the first second of the hold",
        raison: "The bend is slight and usually appears after a few seconds. An active lockout cue fixes it.",
      },
    ],
    optimal: [
      {
        exercice: "Lockout already excellent, nothing to add here",
        raison: "The arms stay straight for the whole hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Hamstring stretching plus straight-leg core work",
        raison:
          "Knees bent. The legs must stay straight even in a tuck, otherwise the next step (straddle, full) will be harder to carry over.",
      },
      {
        exercice: "Progressive straddle-L, legs locked",
        raison: "Builds the habit of keeping the knees straight under tension.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"active toes\" to finish straightening the legs",
        raison: "The remaining bend is small; an active cue fixes the rest.",
      },
    ],
    optimal: [
      {
        exercice: "Legs already well locked, nothing to add here",
        raison: "The leg line stays clean throughout the hold.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Isometric hold in the target position with the cue \"push into the floor\"",
        raison:
          "The body is not parallel enough to the ground for this progression, usually a shoulder strength issue rather than a technical one.",
      },
    ],
    bon: [
      {
        exercice: "Same position, aim to bring the feet down a few more centimetres",
        raison: "The line is close to horizontal. A fine adjustment rather than a step back to an easier exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Body line already excellent, work on hold duration in this position instead",
        raison: "Nothing to fix on body alignment.",
      },
    ],
  },
  },
  HANDSTAND: {
  shoulder_flexion: {
    faible: [
      {
        exercice: "Chest-to-wall handstand",
        raison:
          "Not enough shoulder opening. Push hard into the floor and try to cover your ears with your shoulders so you do not arch the back.",
      },
      {
        exercice: "Pike push-up",
        raison: "Strengthens the shoulders through the overhead range that full opening needs.",
      },
    ],
    bon: [
      {
        exercice: "Chest-to-wall handstand with the cue \"push the floor harder, ears covered\"",
        raison: "The opening is nearly there; an end-range cue closes the remaining gap.",
      },
    ],
    optimal: [
      {
        exercice: "Shoulder opening already excellent, nothing to add here",
        raison: "The arms stay properly stacked overhead for the whole hold.",
      },
    ],
  },
  pelvis_deviation_sag: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "The hips arch into a banana handstand instead of staying aligned from shoulder to ankle.",
      },
      {
        exercice: "Chest-to-wall handstand with the cue \"squeeze the glutes, navel in\"",
        raison: "Builds the core strength needed to keep a straight line upside down.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"squeeze the glutes\" from the first seconds of the hold",
        raison: "The arch is slight and usually appears late in the hold. An early cue fixes it.",
      },
    ],
    optimal: [
      {
        exercice: "Body line already straight, nothing to add here",
        raison: "The core holds well for the whole hold.",
      },
    ],
  },
  pelvis_deviation_pike: {
    faible: [
      {
        exercice: "Back-to-wall handstand with the cue \"push the floor, hips open\"",
        raison: "The hips are folded too far forward instead of staying aligned from shoulder to ankle.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"open the hips a little more\"",
        raison: "The fold is slight; a cue adjustment is enough.",
      },
    ],
    optimal: [
      {
        exercice: "Body line already straight, nothing to add here",
        raison: "Alignment is already near perfect.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "Builds the core strength that keeps the hip-knee line straight in balance.",
      },
      {
        exercice: "Chest-to-wall handstand, back flat against the wall",
        raison: "Gives a physical reference for what a genuinely straight body line feels like.",
      },
    ],
    bon: [
      {
        exercice: "Chest-to-wall handstand, cue \"lengthen the hip\" at the end of the hold",
        raison: "Hip opening is nearly complete; an end-range cue is enough.",
      },
    ],
    optimal: [
      {
        exercice: "Hip-knee line already straight, nothing to add here",
        raison: "The balance does not rely on a hip compensation.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Negative handstand push-up against a wall",
        raison: "Elbows bent to make up for a lack of shoulder strength, which invalidates the figure at a high level.",
      },
      {
        exercice: "Shorten the hold and put straight arms before time",
        raison: "A short hold with locked arms beats a long one propped up by bent elbows.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"actively lock the elbows\" from the first second of the hold",
        raison: "The bend is slight; an active lockout cue fixes the rest.",
      },
    ],
    optimal: [
      {
        exercice: "Lockout already excellent, nothing to add here",
        raison: "The arms stay straight for the whole hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Chest-to-wall handstand, legs active and straight",
        raison: "Knees bent, which breaks the vertical line of the body and makes balancing harder.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"active toes, legs pushing towards the ceiling\"",
        raison: "The remaining bend is small; an active cue is enough to finish straightening the legs.",
      },
    ],
    optimal: [
      {
        exercice: "Legs already well locked, nothing to add here",
        raison: "The vertical line stays clean throughout the hold.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Chest-to-wall handstand to feel the vertical line",
        raison: "The body is not vertical enough. A physical reference helps correct the overall line.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"reach even further towards the ceiling\"",
        raison: "The line is close to vertical. A fine adjustment rather than going back to the wall.",
      },
    ],
    optimal: [
      {
        exercice: "Line already vertical, work on free-standing hold duration instead",
        raison: "Nothing to fix on body alignment.",
      },
    ],
  },
  },
  FRONT_LEVER: {
  hip_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold (knees to chest, hanging from the bar)",
        raison: "Builds control of the hip-knee angle specific to your current progression.",
      },
      {
        exercice: "Ice cream makers (eccentric row towards the tuck position)",
        raison: "Develops the pulling strength needed to hold the target angle without breaking down.",
      },
    ],
    bon: [
      {
        exercice: "Same position, close the hip angle by a few degrees each set",
        raison: "The angle is close to target. A gradual adjustment rather than a new exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Hip angle already under control, work on hold duration at this angle instead",
        raison: "Nothing to fix here; the priority moves from technique to endurance.",
      },
    ],
  },

  hip_angle_open: {
    faible: [
      {
        exercice: "Tuck front lever hold with the cue \"round the back, knees deep to the chest\"",
        raison:
          "The hips are too open for this progression. A tighter, rounder tuck makes the position more holdable.",
      },
      {
        exercice: "Ice cream makers, emphasising the most tucked position",
        raison: "Develops the pulling strength needed to tighten the tuck without breaking down.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"round the back a little more\" each set",
        raison: "The angle is close to target. Tighten the tuck rather than change exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Tuck tightness already under control, work on hold duration instead",
        raison: "Nothing to fix here; the priority moves from technique to endurance.",
      },
    ],
  },
  hip_angle_closed: {
    faible: [
      {
        exercice: "Tuck front lever hold with the cue \"open the hips very slightly\"",
        raison:
          "The tuck is tighter than the target. Too much hip flexion hurts control just as much as too little.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"open the hips very slightly\" each set",
        raison: "The angle is close to target; a fine adjustment is enough.",
      },
    ],
    optimal: [
      {
        exercice: "Hip angle already under control, work on hold duration at this angle instead",
        raison: "Nothing to fix here; the priority moves from technique to endurance.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Straight-arm pulldown (cable or band, arms locked)",
        raison:
          "Strengthens the lats with straight arms, exactly the strength missing when the elbows bend instead of staying locked.",
      },
      {
        exercice: "Shorten the hold and put form before time",
        raison: "A short hold with straight arms beats a long one propped up by bent elbows.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"actively lock the elbows\" from the moment you pull into position",
        raison: "The bend is slight; an active lockout cue fixes the rest.",
      },
    ],
    optimal: [
      {
        exercice: "Lockout already excellent, nothing to add here",
        raison: "The arms stay straight for the whole hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Hamstring stretching plus straight-leg core work while hanging",
        raison: "Knees bent. The legs must stay straight for this variation.",
      },
      {
        exercice: "Progressive straddle-L, legs locked",
        raison: "Builds the habit of keeping the knees straight under tension.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"active toes\" to finish straightening the legs",
        raison: "The remaining bend is small; an active cue fixes the rest.",
      },
    ],
    optimal: [
      {
        exercice: "Legs already well locked, nothing to add here",
        raison: "The leg line stays clean throughout the hold.",
      },
    ],
  },

  torso_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold with the cue \"chest open, hips level with the shoulders\"",
        raison:
          "The torso is not horizontal enough. That is the foundation of the figure, before the legs matter at all.",
      },
      {
        exercice: "Ice cream makers (straight-arm eccentric row)",
        raison: "Develops the pulling strength needed to hold the torso horizontal.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"lift the chest slightly\" at the end of the hold",
        raison: "The torso is nearly horizontal; a fine adjustment is enough.",
      },
    ],
    optimal: [
      {
        exercice: "Torso already properly horizontal, work on hold duration instead",
        raison: "Nothing to fix on torso alignment.",
      },
    ],
  },
  straightest_knee_angle: {
    faible: [
      {
        exercice: "Hamstring stretching plus an \"active toes\" cue on the straight leg",
        raison:
          "The leg that should be straight stays bent, which shortens the lever and misrepresents the real difficulty of the figure.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"lock the knee\" from the moment you pull into position",
        raison: "The remaining bend is small; an active cue is enough to finish straightening.",
      },
    ],
    optimal: [
      {
        exercice: "Straight leg already well locked, nothing to add here",
        raison: "The leg line stays clean throughout the hold.",
      },
    ],
  },
  straightest_leg_hip_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold with the cue \"drive the straight leg's heel far behind you\"",
        raison:
          "The straight leg stays folded towards the chest instead of extending the torso, so the lever is shorter than the figure suggests.",
      },
    ],
    bon: [
      {
        exercice: "Same position, cue \"lengthen the hip\" on the straight leg",
        raison: "The opening is nearly complete; an end-range cue closes the gap.",
      },
    ],
    optimal: [
      {
        exercice: "Straight-leg hip already well open, work on duration",
        raison: "Nothing to fix on this leg's alignment.",
      },
    ],
  },
  bent_knee_angle: {
    faible: [
      {
        exercice: "Switch variation: both your legs are straight, this is a full front lever",
        raison:
          "The knee that should stay tucked is nearly straight. The figure you performed is harder than the one selected, and scored in this category it gets a mark that does not describe it.",
      },
    ],
    bon: [
      {
        exercice: "Bring the knee back against your chest and keep it tight for the whole hold",
        raison:
          "The knee opens up during the hold, almost always as fatigue sets in. Yet it is what defines the variation: letting it drift changes the figure mid-hold.",
      },
    ],
    optimal: [
      {
        exercice: "Tucked leg stays tight — nothing to fix on that side",
        raison: "That leg holds its position cleanly from start to finish.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Skin the cat plus an isometric hold in the target position",
        raison:
          "The body is not parallel enough to the ground for this progression, usually a core and pulling strength issue rather than a technical one.",
      },
    ],
    bon: [
      {
        exercice: "Same position, aim to lift the feet slightly back to horizontal",
        raison: "The line is close to horizontal. A fine adjustment rather than a step back to an easier exercise.",
      },
    ],
    optimal: [
      {
        exercice: "Body line already excellent, work on hold duration in this position instead",
        raison: "Nothing to fix on body alignment.",
      },
    ],
  },
  },
  DRAGON_FLAG: {
  pelvis_sag: {
    faible: [
      {
        exercice: "Hollow body hold, 3 x 30s, lower back pressed into the floor",
        raison:
          "The hips drop because the lower back arches. Holding the hollow position on the floor teaches the body the exact placement that is missing in the air.",
      },
      {
        exercice: "Slow dead bug, 3 x 8 per side",
        raison:
          "Works on holding the hips while the legs travel away, which is exactly where a dragon flag gives way.",
      },
    ],
    bon: [
      {
        exercice: "Tuck dragon flag with a 3s pause, navel drawn in",
        raison:
          "The core almost holds. The pause forces it to hold exactly where it starts to fail.",
      },
    ],
    optimal: [
      {
        exercice: "Full 6s descent, legs straight",
        raison:
          "The core is locked in; the room to progress is in time under tension.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Negative dragon flag, 5 second descent",
        raison:
          "The hips break because the core fails before the descent ends. Slow eccentrics build exactly the range that gives way.",
      },
      {
        exercice: "Hollow body hold, 3 x 30s",
        raison:
          "If the hollow position does not hold on the floor, it will not hold upside down either.",
      },
    ],
    bon: [
      {
        exercice: "Tuck dragon flag with 3s pauses halfway down",
        raison:
          "The line is nearly there. The pauses force you to hold it where it starts to give.",
      },
    ],
    optimal: [
      {
        exercice: "Extend the hold time rather than opening up further",
        raison: "The hips are locked; the challenge becomes core endurance.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Dragon flag with legs together, toes pointed",
        raison:
          "Bent knees shorten the lever and misrepresent the stated difficulty.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"drive the heels towards the far wall\"",
        raison: "The legs almost fully straighten; this cue finds the last few degrees.",
      },
    ],
    optimal: [
      {
        exercice: "Nothing to fix on the knees",
        raison: "Clean leg line.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Tuck then straddle dragon flag before the full version",
        raison:
          "The body stays too high: the current lever is beyond your core strength. Shorten it before lengthening it.",
      },
    ],
    bon: [
      {
        exercice: "Negatives to horizontal with an assisted return",
        raison: "The descent is good; the last few degrees to horizontal are missing.",
      },
    ],
    optimal: [
      {
        exercice: "Work on hold time at this angle",
        raison: "The angle is excellent; time under tension is what will make the difference now.",
      },
    ],
  },
  torso_angle: {
    faible: [
      {
        exercice: "Negative tuck dragon flag, shoulders pressed firmly into the bench",
        raison:
          "The torso stays too upright: the rotation must happen around the shoulders, not the hips.",
      },
    ],
    bon: [
      {
        exercice: "Isometric pauses at the end of the descent",
        raison: "The torso lowers well; control is missing over the last few degrees.",
      },
    ],
    optimal: [
      {
        exercice: "Move up to the next variation",
        raison: "The torso is low and controlled; the tuck is no longer moving you forward.",
      },
    ],
  },
  straightest_knee_angle: {
    faible: [
      {
        exercice: "Hold with the working leg resting on a low support, 3 x 20 s per side",
        raison:
          "The knee bends because the leg gives out before the core does. The support takes part of the load away and leaves time to lock the extension.",
      },
      {
        exercice: "Active quad lock on the floor, 8 x 5 s per leg",
        raison:
          "Straightening a knee is a muscular action, not a position you fall into. Train it on its own before demanding it under tension.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"toes pulled toward you, knee squeezed\" from the moment you enter the position",
        raison: "The extension is nearly complete; it is lost over the last few degrees.",
      },
    ],
    optimal: [
      {
        exercice: "Working leg locked out — extend the hold",
        raison: "That leg draws a clean line; it is no longer the limit.",
      },
    ],
  },
  straightest_leg_hip_angle: {
    faible: [
      {
        exercice: "Hollow body with one leg straight and the other tucked, 3 x 20 s per side",
        raison:
          "The hip closes to shorten the lever, the natural reflex once the position gets hard. On the floor the same shape can be held without the fear of falling, and the placement sinks in.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"push the heel far away\" on the straight leg",
        raison: "The opening is nearly complete; an end-range cue closes the gap.",
      },
    ],
    optimal: [
      {
        exercice: "Straight leg well in line with the torso — work on duration",
        raison: "There is nothing left to reposition on that alignment.",
      },
    ],
  },
  bent_knee_angle: {
    faible: [
      {
        exercice: "Switch variation: both your legs are straight",
        raison:
          "The knee that should stay tucked is nearly straight. You are performing the variation above, and scored in this category it gets a mark that does not describe it.",
      },
    ],
    bon: [
      {
        exercice: "Bring the knee back against your chest and keep it tight for the whole hold",
        raison:
          "The knee opens up during the hold, almost always as fatigue sets in. Yet it is what defines the variation.",
      },
    ],
    optimal: [
      {
        exercice: "Tucked leg stays tight — nothing to fix on that side",
        raison: "That leg holds its position from start to finish.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Straight-arm side support on a low bar, 3 x 15 s per side",
        raison:
          "The bottom arm bends and the body sags toward the pole. That arm is the one pushing: until it takes the load with a locked elbow, the figure keeps collapsing.",
      },
      {
        exercice: "Human flag negatives, slow descent with locked elbows",
        raison: "Forces you to hold the extension at the exact moment it gives way.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"push the pole away\" on the bottom arm",
        raison: "The elbows hold; a few degrees are still left to lock.",
      },
    ],
    optimal: [
      {
        exercice: "Arms locked out — move the work onto hold duration",
        raison: "The anchor is solid; it is no longer what limits the hold.",
      },
    ],
  },
  },
  REP: {
  rep_lockout: {
    faible: [
      {
        exercice: "Pause for one second at the bottom of every rep",
        raison:
          "Starting again without full extension skips the hardest part of the movement, the part that builds strength.",
      },
      {
        exercice: "Cut the number of reps and go for the full range",
        raison: "Five complete reps beat twelve cut short.",
      },
    ],
    bon: [
      {
        exercice: "Controlled 3 second descent",
        raison: "The extension is nearly complete; the slow tempo finds the last few degrees.",
      },
    ],
    optimal: [
      {
        exercice: "Nothing to fix on the extension",
        raison: "Every rep starts again from a full position.",
      },
    ],
  },
  rep_peak: {
    faible: [
      {
        exercice: "Reduce the difficulty until you can complete the range",
        raison:
          "The reps are cut short at the top: the current load is beyond what you can take all the way.",
      },
    ],
    bon: [
      {
        exercice: "One second pause at the top of every rep",
        raison: "The range is nearly there; the pause stops you cutting the end of the movement.",
      },
    ],
    optimal: [
      {
        exercice: "Full range, you can add volume",
        raison: "The reps are taken all the way.",
      },
    ],
  },
  rep_control: {
    faible: [
      {
        exercice: "Strict reps with a one second pause at the bottom",
        raison:
          "The hips swing: the movement is thrown. The pause kills the momentum and forces you to start from strength alone.",
      },
      {
        exercice: "Hollow body hold, 3 x 30s",
        raison: "The swing comes from a torso that is not braced; that is where the work belongs.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"squeeze glutes and abs before you pull\"",
        raison: "The swing is slight; a bracing cue is often enough to remove it.",
      },
    ],
    optimal: [
      {
        exercice: "Nothing to fix, the body stays braced",
        raison: "The reps are pulled, not thrown.",
      },
    ],
  },
  rep_form: {
    faible: [
      {
        exercice: "Front plank 3 x 40s, then go back to the set",
        raison:
          "The body stays broken at the hips throughout: this is a core problem rather than an arm strength one, and it shortens the range.",
      },
      {
        exercice: "Cue \"squeeze the glutes, one line from shoulders to heels\"",
        raison:
          "The break is often unconscious. A verbal cue before each set is usually enough to fix it.",
      },
    ],
    bon: [
      {
        exercice: "Film yourself from the side and check the line mid-rep",
        raison:
          "The position is decent but slips at times, usually at the hardest point of the movement.",
      },
    ],
    optimal: [
      {
        exercice: "Nothing to fix, the body stays aligned",
        raison: "The position holds from the first rep to the last.",
      },
    ],
  },
  rep_protraction: {
    faible: [
      {
        exercice: "Static planche lean, 4 x 15 s, shoulders pushed far past the hands",
        raison:
          "The shoulders do not travel far enough past the wrists: the weight stays on the hands instead of loading the arms, and the movement is a push-up, not a planche push-up.",
      },
      {
        exercice: "Pseudo planche push-up, slow tempo, 4 x 6",
        raison:
          "Trains the exact missing action, the forward shoulder lean, at an intensity where you can still control it.",
      },
    ],
    bon: [
      {
        exercice: "Cue \"push the floor far behind you\" on every rep",
        raison:
          "The lean is there on the first rep and fades during the set, often as early as the second.",
      },
    ],
    optimal: [
      {
        exercice: "Shoulder lean held through the whole set — make the set longer",
        raison: "The position holds from start to finish; it is no longer the limit.",
      },
    ],
  },
  rep_tempo: {
    faible: [
      {
        exercice: "Stop the set two reps before failure",
        raison:
          "The tempo collapses at the end of the set: the last reps come from compensation rather than strength.",
      },
    ],
    bon: [
      {
        exercice: "Count your tempo, 2 seconds up and 2 seconds down",
        raison: "Consistency is decent; a counted tempo will make it clean.",
      },
    ],
    optimal: [
      {
        exercice: "Tempo under control, you can lengthen the set",
        raison: "Consistency holds from start to finish.",
      },
    ],
  },
  },
};
