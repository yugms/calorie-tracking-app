'use client';

import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Today', icon: TodayIcon },
  { href: '/foods', label: 'Foods', icon: FoodsIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href === '/dashboard' && pathname === '/');
}

/** Desktop: segmented pill in the header. Mobile: bottom tab bar. */
export function NavLinks({ variant = 'pill' }: { variant?: 'pill' | 'tabs' }) {
  const pathname = usePathname();

  if (variant === 'tabs') {
    return (
      <nav
        className="show-sm"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          display: 'flex',
          background: 'var(--header-bg)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          const Icon = l.icon;
          return (
            <a
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '10px 0 12px',
                fontSize: 11,
                fontWeight: 600,
                color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                transition: 'color var(--dur-fast) var(--ease)',
              }}
            >
              <Icon active={active} />
              {l.label}
            </a>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="seg" style={{ background: 'var(--surface-2)' }}>
      {LINKS.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <a
            key={l.href}
            href={l.href}
            className="seg-item"
            data-active={active}
            aria-current={active ? 'page' : undefined}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', textDecoration: 'none' }}
          >
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function FoodsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
      <path d="M21 21l-5-5" />
    </svg>
  );
}
function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L16.2 2H11.8l-.4 2.4a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.4h4.4l.4-2.4a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5A7 7 0 0 0 19 12z" />
    </svg>
  );
}
