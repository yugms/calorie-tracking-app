import { macroCaloriePercents, type NutritionFacts } from '@calorie/core';

function MacroBar({ label, grams, pct, color }: { label: string; grams: number; pct: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {Math.round(grams)}g
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export function CalorieSummary({
  food,
  target,
  burned,
}: {
  food: NutritionFacts;
  target: number | null;
  burned: number;
}) {
  const consumed = Math.round(food.calories);
  const pct = target && target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const remaining = target != null ? target - consumed + Math.round(burned) : null;
  const macros = macroCaloriePercents(food);

  return (
    <section className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--surface-2) 0deg)`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: '50%',
              background: 'var(--surface)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{consumed}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {target ? `of ${target} kcal` : 'kcal'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          {remaining != null ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {remaining >= 0 ? remaining : 0}
                <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
                  {' '}
                  kcal left
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {consumed} eaten · {Math.round(burned)} burned
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <div className="muted" style={{ fontSize: 13 }}>
                Set a calorie goal in{' '}
                <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Settings
                </a>{' '}
                to track remaining.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <MacroBar label="Protein" grams={food.protein_g} pct={macros.protein} color="#3b82f6" />
            <MacroBar label="Carbs" grams={food.carbs_g} pct={macros.carbs} color="#f59e0b" />
            <MacroBar label="Fat" grams={food.fat_g} pct={macros.fat} color="#ef4444" />
          </div>
        </div>
      </div>
    </section>
  );
}
