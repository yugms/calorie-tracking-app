import { getCustomFoods, getDayData } from '@/lib/data/queries';
import { normalizeIsoDate } from '@/lib/date';
import { serverToday } from '@/lib/timezone';
import { CalorieSummary } from './components/calorie-summary';
import { DateNav } from './components/date-nav';
import { MealSection } from './components/meal-section';
import { WaterCard } from './components/water-card';
import { ExerciseCard } from './components/exercise-card';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  // Default to the user's local "today" (server runs in UTC; tz comes from a cookie).
  const date = normalizeIsoDate(dateParam, await serverToday());

  const [day, customFoods] = await Promise.all([getDayData(date), getCustomFoods()]);
  const waterTarget = day.profile?.daily_water_target_ml ?? 2000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <DateNav date={date} />

      <CalorieSummary
        food={day.totals.food}
        target={day.profile?.daily_calorie_target ?? null}
        burned={day.totals.exerciseKcal}
      />

      {day.meals.map((group) => (
        <MealSection
          key={group.meal}
          meal={group.meal}
          entries={group.entries}
          calories={group.totals.calories}
          date={date}
          customFoods={customFoods}
        />
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <WaterCard date={date} entries={day.water} totalMl={day.totals.waterMl} targetMl={waterTarget} />
        <ExerciseCard date={date} entries={day.exercise} totalKcal={day.totals.exerciseKcal} />
      </div>
    </div>
  );
}
