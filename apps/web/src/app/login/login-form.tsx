'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/safe-redirect';

type Mode = 'signin' | 'signup';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Sanitize to an internal path to prevent open-redirect via the query param.
  const redirectedFrom = safeRedirectPath(params.get('redirectedFrom'));

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const supabase = createClient();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) return setError(error.message);
      setMessage('Check your email to confirm your account, then sign in.');
      setMode('signin');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    startTransition(() => {
      router.replace(redirectedFrom);
      router.refresh();
    });
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom)}`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => handleOAuth('apple')} type="button">
           Continue with Apple
        </button>
        <button className="btn btn-secondary" onClick={() => handleOAuth('google')} type="button">
          Continue with Google
        </button>
      </div>

      <div className="divider">or</div>

      <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }} role="alert">
            {error}
          </p>
        )}
        {message && (
          <p style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }} role="status">
            {message}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="muted" style={{ textAlign: 'center', fontSize: 14, margin: 0 }}>
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setMessage(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontSize: 14,
          }}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
