/**
 * The starting exercise library.
 *
 * Deliberately not exhaustive — it covers common gym equipment, and you add your own
 * as you go (`isCustom`). A huge seeded list makes search worse, not better.
 *
 * `incrementKg` is the step for the +/- buttons: 2.5 for barbell compounds, 5 for
 * the big lifts, 1 for small isolation work where 2.5 is a large jump.
 */

export interface SeedExercise {
  readonly slug: string;
  readonly name: string;
  readonly primaryMuscle: string;
  readonly secondaryMuscles: readonly string[];
  readonly equipment: string;
  readonly aliases: readonly string[];
  readonly incrementKg: number;
}

export const SEED_EXERCISES: readonly SeedExercise[] = [
  // -- Chest ---------------------------------------------------------------
  { slug: 'bench-press', name: 'Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front-delts'], equipment: 'barbell', aliases: ['bench', 'bp', 'flat bench'], incrementKg: 2.5 },
  { slug: 'incline-bench-press', name: 'Incline Barbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['front-delts', 'triceps'], equipment: 'barbell', aliases: ['incline bench'], incrementKg: 2.5 },
  { slug: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front-delts'], equipment: 'dumbbell', aliases: ['db bench'], incrementKg: 2 },
  { slug: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', primaryMuscle: 'chest', secondaryMuscles: ['front-delts', 'triceps'], equipment: 'dumbbell', aliases: ['incline db'], incrementKg: 2 },
  { slug: 'chest-press-machine', name: 'Chest Press Machine', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: 'machine', aliases: [], incrementKg: 2.5 },
  { slug: 'cable-fly', name: 'Cable Fly', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'cable', aliases: ['pec fly', 'crossover'], incrementKg: 2.5 },
  { slug: 'pec-deck', name: 'Pec Deck', primaryMuscle: 'chest', secondaryMuscles: [], equipment: 'machine', aliases: ['machine fly'], incrementKg: 2.5 },
  { slug: 'dips', name: 'Dips', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front-delts'], equipment: 'bodyweight', aliases: [], incrementKg: 2.5 },

  // -- Back ----------------------------------------------------------------
  { slug: 'deadlift', name: 'Deadlift', primaryMuscle: 'back', secondaryMuscles: ['hamstrings', 'glutes', 'traps'], equipment: 'barbell', aliases: ['dl', 'conventional deadlift'], incrementKg: 5 },
  { slug: 'pull-up', name: 'Pull-up', primaryMuscle: 'lats', secondaryMuscles: ['biceps', 'back'], equipment: 'bodyweight', aliases: ['pullup', 'chin'], incrementKg: 2.5 },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', primaryMuscle: 'lats', secondaryMuscles: ['biceps'], equipment: 'cable', aliases: ['pulldown'], incrementKg: 2.5 },
  { slug: 'barbell-row', name: 'Barbell Row', primaryMuscle: 'back', secondaryMuscles: ['lats', 'biceps'], equipment: 'barbell', aliases: ['bent over row', 'bb row'], incrementKg: 2.5 },
  { slug: 'dumbbell-row', name: 'Dumbbell Row', primaryMuscle: 'back', secondaryMuscles: ['lats', 'biceps'], equipment: 'dumbbell', aliases: ['db row', 'one arm row'], incrementKg: 2 },
  { slug: 'seated-cable-row', name: 'Seated Cable Row', primaryMuscle: 'back', secondaryMuscles: ['lats', 'biceps'], equipment: 'cable', aliases: ['cable row'], incrementKg: 2.5 },
  { slug: 'chest-supported-row', name: 'Chest Supported Row', primaryMuscle: 'back', secondaryMuscles: ['lats', 'biceps'], equipment: 'machine', aliases: ['t-bar row'], incrementKg: 2.5 },
  { slug: 'face-pull', name: 'Face Pull', primaryMuscle: 'rear-delts', secondaryMuscles: ['traps'], equipment: 'cable', aliases: [], incrementKg: 1 },

  // -- Legs ----------------------------------------------------------------
  { slug: 'back-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: 'barbell', aliases: ['squat', 'bb squat'], incrementKg: 5 },
  { slug: 'front-squat', name: 'Front Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'core'], equipment: 'barbell', aliases: [], incrementKg: 2.5 },
  { slug: 'leg-press', name: 'Leg Press', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'machine', aliases: [], incrementKg: 5 },
  { slug: 'hack-squat', name: 'Hack Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'machine', aliases: [], incrementKg: 5 },
  { slug: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], equipment: 'dumbbell', aliases: ['bss', 'split squat'], incrementKg: 2 },
  { slug: 'romanian-deadlift', name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: 'barbell', aliases: ['rdl'], incrementKg: 2.5 },
  { slug: 'leg-curl', name: 'Lying Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine', aliases: ['hamstring curl'], incrementKg: 2.5 },
  { slug: 'seated-leg-curl', name: 'Seated Leg Curl', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: 'machine', aliases: [], incrementKg: 2.5 },
  { slug: 'leg-extension', name: 'Leg Extension', primaryMuscle: 'quads', secondaryMuscles: [], equipment: 'machine', aliases: ['quad extension'], incrementKg: 2.5 },
  { slug: 'hip-thrust', name: 'Hip Thrust', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: 'barbell', aliases: [], incrementKg: 5 },
  { slug: 'calf-raise', name: 'Standing Calf Raise', primaryMuscle: 'calves', secondaryMuscles: [], equipment: 'machine', aliases: ['calves'], incrementKg: 2.5 },

  // -- Shoulders -----------------------------------------------------------
  { slug: 'overhead-press', name: 'Overhead Press', primaryMuscle: 'front-delts', secondaryMuscles: ['triceps', 'chest'], equipment: 'barbell', aliases: ['ohp', 'military press', 'shoulder press'], incrementKg: 2.5 },
  { slug: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', primaryMuscle: 'front-delts', secondaryMuscles: ['triceps'], equipment: 'dumbbell', aliases: ['db press'], incrementKg: 2 },
  { slug: 'lateral-raise', name: 'Lateral Raise', primaryMuscle: 'side-delts', secondaryMuscles: [], equipment: 'dumbbell', aliases: ['side raise', 'lat raise'], incrementKg: 1 },
  { slug: 'cable-lateral-raise', name: 'Cable Lateral Raise', primaryMuscle: 'side-delts', secondaryMuscles: [], equipment: 'cable', aliases: [], incrementKg: 1 },
  { slug: 'rear-delt-fly', name: 'Rear Delt Fly', primaryMuscle: 'rear-delts', secondaryMuscles: [], equipment: 'dumbbell', aliases: ['reverse fly'], incrementKg: 1 },

  // -- Arms ----------------------------------------------------------------
  { slug: 'barbell-curl', name: 'Barbell Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'barbell', aliases: ['bb curl'], incrementKg: 2.5 },
  { slug: 'dumbbell-curl', name: 'Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'dumbbell', aliases: ['db curl'], incrementKg: 1 },
  { slug: 'hammer-curl', name: 'Hammer Curl', primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], equipment: 'dumbbell', aliases: [], incrementKg: 1 },
  { slug: 'preacher-curl', name: 'Preacher Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'machine', aliases: [], incrementKg: 2.5 },
  { slug: 'cable-curl', name: 'Cable Curl', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: 'cable', aliases: [], incrementKg: 2.5 },
  { slug: 'triceps-pushdown', name: 'Triceps Pushdown', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'cable', aliases: ['pushdown', 'rope pushdown'], incrementKg: 2.5 },
  { slug: 'overhead-triceps-extension', name: 'Overhead Triceps Extension', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: 'cable', aliases: ['skull crusher'], incrementKg: 2.5 },
  { slug: 'close-grip-bench', name: 'Close Grip Bench Press', primaryMuscle: 'triceps', secondaryMuscles: ['chest'], equipment: 'barbell', aliases: ['cgbp'], incrementKg: 2.5 },

  // -- Core ----------------------------------------------------------------
  { slug: 'plank', name: 'Plank', primaryMuscle: 'core', secondaryMuscles: [], equipment: 'bodyweight', aliases: [], incrementKg: 1 },
  { slug: 'cable-crunch', name: 'Cable Crunch', primaryMuscle: 'core', secondaryMuscles: [], equipment: 'cable', aliases: [], incrementKg: 2.5 },
  { slug: 'hanging-leg-raise', name: 'Hanging Leg Raise', primaryMuscle: 'core', secondaryMuscles: [], equipment: 'bodyweight', aliases: [], incrementKg: 1 },
];

/**
 * Seeded substitution pairs, by slug.
 *
 * These are starting points only — every swap you actually make raises that pair's
 * score, so the ranking drifts toward your gym and your preferences. The leg press
 * entry is the one from the original brief.
 */
export const SEED_SUBSTITUTES: readonly (readonly [string, string, number])[] = [
  ['leg-press', 'hack-squat', 0.9],
  ['leg-press', 'back-squat', 0.7],
  ['leg-press', 'bulgarian-split-squat', 0.6],
  ['hack-squat', 'leg-press', 0.9],
  ['back-squat', 'hack-squat', 0.8],
  ['back-squat', 'front-squat', 0.8],
  ['back-squat', 'leg-press', 0.7],
  ['bench-press', 'dumbbell-bench-press', 0.9],
  ['bench-press', 'chest-press-machine', 0.8],
  ['dumbbell-bench-press', 'bench-press', 0.9],
  ['incline-bench-press', 'incline-dumbbell-press', 0.9],
  ['overhead-press', 'dumbbell-shoulder-press', 0.9],
  ['lat-pulldown', 'pull-up', 0.9],
  ['pull-up', 'lat-pulldown', 0.9],
  ['barbell-row', 'dumbbell-row', 0.85],
  ['barbell-row', 'chest-supported-row', 0.8],
  ['barbell-row', 'seated-cable-row', 0.8],
  ['seated-cable-row', 'chest-supported-row', 0.85],
  ['romanian-deadlift', 'leg-curl', 0.6],
  ['leg-curl', 'seated-leg-curl', 0.95],
  ['leg-curl', 'romanian-deadlift', 0.6],
  ['lateral-raise', 'cable-lateral-raise', 0.95],
  ['triceps-pushdown', 'overhead-triceps-extension', 0.8],
  ['barbell-curl', 'dumbbell-curl', 0.9],
  ['dumbbell-curl', 'cable-curl', 0.85],
  ['pec-deck', 'cable-fly', 0.9],
  ['cable-fly', 'pec-deck', 0.9],
];
