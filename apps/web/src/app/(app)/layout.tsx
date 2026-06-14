import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Protected layout: guarantees a session for everything under (app). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          height: 60,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <span aria-hidden>🥗</span>
            <span style={{ letterSpacing: '-0.02em' }}>Calorie Tracker</span>
          </a>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { href: '/dashboard', label: 'Today' },
              { href: '/foods', label: 'Foods' },
              { href: '/settings', label: 'Settings' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="muted"
                style={{ fontSize: 14, fontWeight: 600, padding: '6px 10px', borderRadius: 8 }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="muted" style={{ fontSize: 13 }} title={user.email ?? undefined}>
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ width: 'auto', height: 36, padding: '0 14px', fontSize: 13 }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main style={{ flex: 1, width: '100%', maxWidth: 760, margin: '0 auto', padding: '28px 20px 64px' }}>
        {children}
      </main>
    </div>
  );
}
