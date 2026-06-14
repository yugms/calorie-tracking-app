/**
 * Domain entities. These mirror the Postgres tables (snake_case columns) so the
 * same shapes flow from DB → API → web client → (later) the Swift app.
 */
import type {
  ActivityLevel,
  AiJobStatus,
  AiJobType,
  EntrySource,
  ExerciseIntensity,
  FoodSource,
  GoalType,
  MealType,
  Sex,
  UnitPref,
} from './enums';
import type { IsoDate, IsoTimestamp, UUID } from './nutrition';

export interface Profile {
  user_id: UUID;
  display_name: string | null;
  dob: IsoDate | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  daily_calorie_target: number | null;
  daily_water_target_ml: number | null;
  units_pref: UnitPref;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

/**
 * A food in the catalog. Rows may be global (cached from USDA/OFF, `owner_user_id`
 * null) or user-owned custom foods. Nutrition is stored per-100g for clean scaling,
 * plus a default serving for nicer UX.
 */
export interface Food {
  id: UUID;
  owner_user_id: UUID | null;
  source: FoodSource;
  external_id: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  serving_qty: number | null;
  serving_unit: string | null;
  serving_grams: number | null;
  calories: number; // per 100g
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface DailyLog {
  id: UUID;
  user_id: UUID;
  log_date: IsoDate;
  calorie_target_snapshot: number | null;
  water_target_snapshot: number | null;
  notes: string | null;
  created_at: IsoTimestamp;
}

export interface MealEntry {
  id: UUID;
  daily_log_id: UUID;
  user_id: UUID;
  meal_type: MealType;
  food_id: UUID | null;
  description: string;
  quantity: number;
  unit: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: IsoTimestamp;
  source: EntrySource;
  ai_confidence: number | null;
  created_at: IsoTimestamp;
}

export interface WaterEntry {
  id: UUID;
  daily_log_id: UUID;
  user_id: UUID;
  amount_ml: number;
  logged_at: IsoTimestamp;
  created_at: IsoTimestamp;
}

export interface ExerciseEntry {
  id: UUID;
  daily_log_id: UUID;
  user_id: UUID;
  activity_name: string;
  duration_min: number | null;
  calories_burned: number;
  intensity: ExerciseIntensity | null;
  logged_at: IsoTimestamp;
  source: EntrySource;
  created_at: IsoTimestamp;
}

export interface AiJob {
  id: UUID;
  user_id: UUID;
  type: AiJobType;
  input_ref: string; // storage path (photo) or raw text (nlp)
  raw_response: unknown | null;
  status: AiJobStatus;
  created_at: IsoTimestamp;
}
