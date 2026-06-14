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
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              fontSize: 26,
            }}
          >
            🥗
          </div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.02em' }}>Calorie Tracker</h1>
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
