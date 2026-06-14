import { createClient } from '@/lib/supabase/server';
import { MEAL_TYPES } from '@calorie/core';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

/**
 * Phase 1 dashboard shell. Renders the day's structure (calorie ring placeholder,
 * meal sections, water, exercise) with no live data yet — Phase 2 wires up logging.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, daily_calorie_target, daily_water_target_ml')
    .eq('user_id', user!.id)
    .maybeSingle();

  const greeting = profile?.display_name ? `Hi, ${profile.display_name}` : 'Today';
  const target = profile?.daily_calorie_target ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.02em' }}>{greeting}</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Calorie summary placeholder */}
      <section className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: '50%',
            margin: '0 auto 12px',
            display: 'grid',
            placeItems: 'center',
            background:
              'conic-gradient(var(--accent-soft) 0deg, var(--accent-soft) 0deg, var(--surface-2) 0deg)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>0</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {target ? `of ${target} kcal` : 'kcal'}
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {target
            ? 'Start logging to fill your ring.'
            : 'Set a calorie goal in your profile (coming in Phase 2).'}
        </p>
      </section>

      {/* Meal sections */}
      {MEAL_TYPES.map((meal) => (
        <section key={meal} className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{MEAL_LABELS[meal]}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              0 kcal
            </span>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
            No items yet — logging arrives in Phase 2.
          </p>
        </section>
      ))}

      {/* Water + Exercise */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section className="card" style={{ padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>💧 Water</h2>
          <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
            0 / {profile?.daily_water_target_ml ?? 2000} ml
          </p>
        </section>
        <section className="card" style={{ padding: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>🏃 Exercise</h2>
          <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>
            0 kcal burned
          </p>
        </section>
      </div>

      <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 4 }}>
        ✅ Phase 1 complete — authenticated shell. Next: Phase 2 core logging.
      </p>
    </div>
  );
}
