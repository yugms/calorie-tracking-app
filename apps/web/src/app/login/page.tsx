import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c4 1.5 6.5 4.5 6.5 8.5 0 1-.3 2-.7 2.9-2.2-.6-4-2.2-4.8-4.3-.6 2.2-2.2 4-4.4 4.7-.4-1-.6-2-.6-3.2C8 7.5 9.5 4.5 12 3z" />
              <path d="M12 13v8" />
            </svg>
          </div>
          <h1 className="h1" style={{ fontSize: 27 }}>
            Calorie Tracker
          </h1>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 15 }}>
            Log meals in seconds.
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 20 }}>
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </main>
  );
}
