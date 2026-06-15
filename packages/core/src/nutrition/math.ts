/**
 * Pure nutrition math. No I/O, no framework deps — safe to run in the browser,
 * in Supabase Edge Functions, or (ported) on iOS.
 */
import { ACTIVITY_MULTIPLIERS } from '../types/enums';
import type { ActivityLevel, GoalType, PrimaryGoal, Sex, UnitPref } from '../types/enums';
import type { NutritionFacts, NutritionPer100g } from '../types/nutrition';

/** Calories per gram of each macronutrient (Atwater factors). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

/** Energy density of body mass change (kcal per kg). ~3500 kcal/lb. */
export const KCAL_PER_KG = 7700;

const round = (n: number, dp = 1): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Scale per-100g nutrition to an arbitrary gram weight. */
export function scaleNutritionByGrams(
  per100g: NutritionPer100g,
  grams: number,
): NutritionFacts {
  const k = grams / 100;
  return {
    calories: round(per100g.calories * k, 0),
    protein_g: round(per100g.protein_g * k),
    carbs_g: round(per100g.carbs_g * k),
    fat_g: round(per100g.fat_g * k),
    fiber_g: per100g.fiber_g != null ? round(per100g.fiber_g * k) : undefined,
    sugar_g: per100g.sugar_g != null ? round(per100g.sugar_g * k) : undefined,
    sodium_mg: per100g.sodium_mg != null ? round(per100g.sodium_mg * k, 0) : undefined,
  };
}

/** Sum a list of nutrition facts (e.g. all entries in a meal or a day). */
export function sumNutrition(items: readonly NutritionFacts[]): NutritionFacts {
  return items.reduce<NutritionFacts>(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein_g: acc.protein_g + n.protein_g,
      carbs_g: acc.carbs_g + n.carbs_g,
      fat_g: acc.fat_g + n.fat_g,
      fiber_g: (acc.fiber_g ?? 0) + (n.fiber_g ?? 0),
      sugar_g: (acc.sugar_g ?? 0) + (n.sugar_g ?? 0),
      sodium_mg: (acc.sodium_mg ?? 0) + (n.sodium_mg ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 },
  );
}

/** Estimate calories from macros (sanity-check / fallback when calories missing). */
export function caloriesFromMacros(macros: Pick<NutritionFacts, 'protein_g' | 'carbs_g' | 'fat_g'>): number {
  return Math.round(
    macros.protein_g * KCAL_PER_GRAM.protein +
      macros.carbs_g * KCAL_PER_GRAM.carbs +
      macros.fat_g * KCAL_PER_GRAM.fat,
  );
}

/** Percent of total calories from each macro. Returns 0s when calories is 0. */
export function macroCaloriePercents(n: NutritionFacts): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const p = n.protein_g * KCAL_PER_GRAM.protein;
  const c = n.carbs_g * KCAL_PER_GRAM.carbs;
  const f = n.fat_g * KCAL_PER_GRAM.fat;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: round((p / total) * 100, 0),
    carbs: round((c / total) * 100, 0),
    fat: round((f / total) * 100, 0),
  };
}

/** Age in whole years from an ISO date of birth, relative to `on`. */
export function ageFromDob(dobIso: string, on: Date): number {
  const dob = new Date(dobIso);
  let age = on.getFullYear() - dob.getFullYear();
  const m = on.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--;
  return age;
}

/** Mifflin-St Jeor Basal Metabolic Rate (kcal/day). */
export function bmrMifflinStJeor(params: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const { sex, weightKg, heightCm, ageYears } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  // Female offset used for 'female'; the +5 male offset used otherwise.
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

/** Total Daily Energy Expenditure = BMR × activity multiplier. */
export function tdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

/**
 * Suggested daily calorie target from TDEE and goal.
 * Lose: −500 kcal/day (~0.45 kg/week). Gain: +400 kcal/day. Maintain: TDEE.
 */
export function calorieTargetForGoal(tdeeKcal: number, goal: GoalType): number {
  switch (goal) {
    case 'lose':
      return Math.max(1200, tdeeKcal - 500);
    case 'gain':
      return tdeeKcal + 400;
    case 'maintain':
    default:
      return tdeeKcal;
  }
}

/** Map the richer onboarding goal down to the BMR/TDEE math's goal direction. */
export function goalTypeForPrimary(goal: PrimaryGoal): GoalType {
  switch (goal) {
    case 'lose':
      return 'lose';
    case 'gain':
      return 'gain';
    case 'maintain':
    case 'perform':
    default:
      return 'maintain';
  }
}

/**
 * Safe minimum daily calories (a "floor" below which targets are capped).
 * Conventional clinical minimums: ~1500 kcal men, ~1200 kcal women.
 */
export function calorieFloorForSex(sex: Sex): number {
  return sex === 'male' ? 1500 : 1200;
}

/**
 * Daily calorie target from TDEE given a goal direction and a desired weekly
 * rate of weight change. Applies a deficit/surplus of `kgPerWeek` worth of body
 * mass per week, then clamps to the safe floor. `floored` flags when the
 * requested rate was too aggressive and the target was capped.
 */
export function calorieTargetFromRate(params: {
  tdee: number;
  sex: Sex;
  goal: GoalType;
  kgPerWeek: number;
}): { target: number; floored: boolean } {
  const { tdee, sex, goal, kgPerWeek } = params;
  const dailyDelta = (Math.abs(kgPerWeek) * KCAL_PER_KG) / 7;
  let raw = tdee;
  if (goal === 'lose') raw = tdee - dailyDelta;
  else if (goal === 'gain') raw = tdee + dailyDelta;

  const floor = calorieFloorForSex(sex);
  if (goal === 'lose' && raw < floor) {
    return { target: floor, floored: true };
  }
  return { target: Math.round(raw), floored: false };
}

/**
 * Split a daily calorie target into protein/carbs/fat gram targets. Protein is
 * set per kg of body weight by goal; fat is ~27% of calories; carbs take the
 * remainder (Atwater 4/4/9, never negative).
 */
export function macroTargetsForCalories(params: {
  calories: number;
  weightKg: number;
  primaryGoal: PrimaryGoal;
}): { protein_g: number; carbs_g: number; fat_g: number } {
  const { calories, weightKg, primaryGoal } = params;
  const proteinPerKg =
    primaryGoal === 'lose' ? 2.0 : primaryGoal === 'maintain' ? 1.6 : 1.8;
  const protein_g = Math.round(weightKg * proteinPerKg);
  const fat_g = Math.round((calories * 0.27) / KCAL_PER_GRAM.fat);
  const remaining =
    calories - protein_g * KCAL_PER_GRAM.protein - fat_g * KCAL_PER_GRAM.fat;
  const carbs_g = Math.max(0, Math.round(remaining / KCAL_PER_GRAM.carbs));
  return { protein_g, carbs_g, fat_g };
}

// --- Unit conversions (storage is always metric) ----------------------------
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function lbToKg(lb: number): number {
  return round(lb * KG_PER_LB, 2);
}
export function kgToLb(kg: number): number {
  return round(kg / KG_PER_LB, 1);
}
export function ftInToCm(ft: number, inches: number): number {
  return round((ft * 12 + inches) * CM_PER_IN, 1);
}
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalIn = cm / CM_PER_IN;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn - ft * 12);
  // Carry 12" up to the next foot.
  return inches === 12 ? { ft: ft + 1, inches: 0 } : { ft, inches };
}

/**
 * Default unit system for a locale/region. Imperial only for the handful of
 * countries that use it day-to-day; metric everywhere else. Pass an ISO 3166
 * region code (e.g. `'US'`) — derive it from `new Intl.Locale(navigator.language).region`.
 */
export function defaultUnitsForLocale(region: string | null | undefined): UnitPref {
  const imperial = new Set(['US', 'LR', 'MM']);
  return region && imperial.has(region.toUpperCase()) ? 'imperial' : 'metric';
}
