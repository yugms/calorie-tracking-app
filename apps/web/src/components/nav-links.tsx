'use client';

import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Today' },
  { href: '/foods', label: 'Foods' },
  { href: '/settings', label: 'Settings' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav style={{ display: 'flex', gap: 2 }}>
      {LINKS.map((l) => {
        const active = pathname === l.href || (l.href === '/dashboard' && pathname === '/');
        return (
          <a
            key={l.href}
            href={l.href}
            className="nav-link muted"
            data-active={active}
            aria-current={active ? 'page' : undefined}
            style={{ fontSize: 14, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
          >
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
