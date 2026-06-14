/** @calorie/core — shared domain types, nutrition math, and provider interfaces. */

// Types
export * from './types/enums';
export * from './types/nutrition';
export * from './types/entities';

// Nutrition math
export * from './nutrition/math';

// Provider interfaces (swap points)
export * from './providers/food-provider';
export * from './providers/ai-provider';

// Provider implementations
export * from './providers/impl/usda';
export * from './providers/impl/open-food-facts';
export * from './providers/impl/composite';
