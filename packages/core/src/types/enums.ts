/**
 * Shared enumerations. Kept as `const` objects + union types so they are usable
 * as runtime values (e.g. iterating meal types in the UI) and as static types.
 */

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Where a logged entry originated. Drives UI badges and AI audit. */
export const ENTRY_SOURCES = ['manual', 'barcode', 'nlp', 'photo'] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

/** Which catalog a food row came from. */
export const FOOD_SOURCES = ['usda', 'off', 'custom'] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

export const SEXES = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Sex = (typeof SEXES)[number];

/** Used to scale BMR → TDEE for calorie targets. */
export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOAL_TYPES = ['lose', 'maintain', 'gain'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

/**
 * The richer goal shown in onboarding. Maps down to a {@link GoalType} for the
 * BMR/TDEE math via {@link goalTypeForPrimary}.
 */
export const PRIMARY_GOALS = ['lose', 'maintain', 'gain', 'perform'] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

/** Dietary profile chosen during onboarding. */
export const DIET_PROFILES = [
  'standard',
  'vegetarian',
  'vegan',
  'plant_based',
  'keto',
  'custom',
] as const;
export type DietProfile = (typeof DIET_PROFILES)[number];

/** Common exclusions / allergens offered as a multi-select in onboarding. */
export const COMMON_EXCLUSIONS = [
  'dairy',
  'eggs',
  'gluten',
  'peanuts',
  'tree_nuts',
  'soy',
  'shellfish',
  'fish',
  'pork',
  'red_meat',
  'sesame',
] as const;
export type Exclusion = (typeof COMMON_EXCLUSIONS)[number];

export const UNIT_PREFS = ['metric', 'imperial'] as const;
export type UnitPref = (typeof UNIT_PREFS)[number];

export const EXERCISE_INTENSITIES = ['low', 'moderate', 'high'] as const;
export type ExerciseIntensity = (typeof EXERCISE_INTENSITIES)[number];

export const AI_JOB_TYPES = ['text', 'photo'] as const;
export type AiJobType = (typeof AI_JOB_TYPES)[number];

export const AI_JOB_STATUSES = ['pending', 'parsed', 'confirmed', 'failed'] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

/** Multipliers applied to BMR to estimate Total Daily Energy Expenditure. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
