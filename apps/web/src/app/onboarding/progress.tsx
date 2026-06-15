'use client';

/** Slim segmented progress indicator for the wizard. */
export function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: i < current ? 'var(--accent)' : 'var(--surface-3)',
              transition: 'background var(--dur) var(--ease)',
            }}
          />
        ))}
      </div>
      <div className="eyebrow" style={{ fontSize: 10 }}>
        Step {current} of {total}
      </div>
    </div>
  );
}
