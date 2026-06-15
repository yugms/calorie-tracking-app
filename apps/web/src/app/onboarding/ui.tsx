'use client';

/** Shared presentational pieces for the onboarding wizard. */

/** A large, tappable single-select option card with an immediate selected state. */
export function OptionCard({
  active,
  onClick,
  emoji,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <button type="button" className="opt-card" data-active={active} onClick={onClick} aria-pressed={active}>
      <span
        aria-hidden
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          fontSize: 22,
          background: active ? 'var(--surface)' : 'var(--surface-2)',
          flexShrink: 0,
        }}
      >
        {emoji}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{title}</span>
        {subtitle && (
          <span className="muted" style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </span>
        )}
      </span>
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          border: active ? 'none' : '1.5px solid var(--border-strong)',
          background: active ? 'var(--accent)' : 'transparent',
        }}
      >
        {active && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
    </button>
  );
}

/** A labelled field wrapper. */
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <label className="label">{label}</label>
      {children}
      {hint && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/** Step heading: small eyebrow + title + optional subtitle. */
export function StepHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="h1" style={{ fontSize: 25, marginTop: 6 }}>
        {title}
      </h1>
      {subtitle && (
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
