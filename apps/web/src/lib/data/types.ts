import type {
  ExerciseEntry,
  Food,
  MealEntry,
  MealType,
  NutritionFacts,
  Profile,
  WaterEntry,
} from '@calorie/core';

/** Meal entries grouped under a meal type, with that meal's subtotal. */
export interface MealGroup {
  meal: MealType;
  entries: MealEntry[];
  totals: NutritionFacts;
}

/** Everything the dashboard needs for one calendar day. */
export interface DayData {
  date: string; // YYYY-MM-DD
  profile: Pick<
    Profile,
    'display_name' | 'daily_calorie_target' | 'daily_water_target_ml'
  > | null;
  meals: MealGroup[];
  water: WaterEntry[];
  exercise: ExerciseEntry[];
  totals: {
    food: NutritionFacts;
    waterMl: number;
    exerciseKcal: number;
  };
}

export type CustomFood = Food;
