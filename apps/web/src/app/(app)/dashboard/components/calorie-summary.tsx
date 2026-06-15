import { macroCaloriePercents, type NutritionFacts } from '@calorie/core';

/** A thin SVG progress ring with rounded caps. */
function Ring({
  pct,
  size,
  stroke,
  color,
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset var(--dur-slow) var(--ease)' }}
        />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MacroMini({ label, grams, pct, color }: { label: string; grams: number; pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <Ring pct={pct} size={56} stroke={6} color={color}>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>
          {Math.round(grams)}
        </span>
      </Ring>
      <span className="eyebrow" style={{ fontSize: 10 }}>
        {label}
      </span>
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
    <section className="card card-lg" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <Ring pct={pct} size={140} stroke={12} color="var(--accent)">
          <div>
            {remaining != null ? (
              <>
                <div className="display" style={{ fontSize: 34 }}>
                  {remaining >= 0 ? remaining : 0}
                </div>
                <div className="eyebrow" style={{ marginTop: 2 }}>
                  Left
                </div>
              </>
            ) : (
              <>
                <div className="display tnum" style={{ fontSize: 34 }}>
                  {consumed}
                </div>
                <div className="eyebrow" style={{ marginTop: 2 }}>
                  kcal
                </div>
              </>
            )}
          </div>
        </Ring>

        <div style={{ flex: 1, minWidth: 190 }}>
          {remaining != null ? (
            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow">Remaining</div>
              <div className="tnum" style={{ fontSize: 15, marginTop: 6, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{consumed}</span> eaten ·{' '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{Math.round(burned)}</span> burned ·{' '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{target}</span> goal
              </div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
              Set a calorie goal in{' '}
              <a href="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Settings
              </a>{' '}
              to track what&apos;s left.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <MacroMini label="Protein" grams={food.protein_g} pct={macros.protein} color="var(--protein)" />
            <MacroMini label="Carbs" grams={food.carbs_g} pct={macros.carbs} color="var(--carbs)" />
            <MacroMini label="Fat" grams={food.fat_g} pct={macros.fat} color="var(--fat)" />
          </div>
        </div>
      </div>
    </section>
  );
}
