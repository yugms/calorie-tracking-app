import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavLinks } from '@/components/nav-links';
import { ThemeToggle } from '@/components/theme-toggle';
import { TimezoneSync } from '@/components/timezone-sync';

function BrandMark() {
  return (
    <span
      aria-hidden
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        background: 'var(--accent)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3c4 1.5 6.5 4.5 6.5 8.5 0 1-.3 2-.7 2.9-2.2-.6-4-2.2-4.8-4.3-.6 2.2-2.2 4-4.4 4.7-.4-1-.6-2-.6-3.2C8 7.5 9.5 4.5 12 3z" />
        <path d="M12 13v8" />
      </svg>
    </span>
  );
}

/** Protected layout: guarantees a session for everything under (app). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Gate the app behind a completed profile.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.onboarded_at) redirect('/onboarding');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TimezoneSync />

      <header
        style={{
          height: 60,
          borderBottom: '1px solid var(--border)',
          background: 'var(--header-bg)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: 12,
        }}
      >
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, letterSpacing: '-0.02em' }}>
          <BrandMark />
          <span className="hide-sm" style={{ fontSize: 16 }}>
            Calorie Tracker
          </span>
        </a>

        <div className="hide-sm">
          <NavLinks variant="pill" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="muted hide-sm" style={{ fontSize: 13 }} title={user.email ?? undefined}>
            {user.email}
          </span>
          <ThemeToggle />
          <form action="/auth/signout" method="post" style={{ display: 'flex' }}>
            <button
              type="submit"
              className="icon-btn"
              aria-label="Sign out"
              title="Sign out"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          padding: '28px 20px 104px',
        }}
      >
        {children}
      </main>

      <NavLinks variant="tabs" />
    </div>
  );
}
