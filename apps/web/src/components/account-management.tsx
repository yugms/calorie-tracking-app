'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/modal';
import { deleteAccount, resetAccount } from '@/lib/actions/onboarding';

export function AccountManagement() {
  const router = useRouter();
  const [showReset, setShowReset] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function doReset() {
    setError(null);
    startTransition(async () => {
      try {
        await resetAccount();
        try {
          localStorage.removeItem('onboarding:draft');
        } catch {
          /* ignore */
        }
        setShowReset(false);
        router.push('/onboarding');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reset account.');
      }
    });
  }

  function doDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
        setShowDelete(false);
        router.push('/login');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete account.');
      }
    });
  }

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="eyebrow">Account</div>

      {/* Reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Reset account data</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            Clears all logs, weight history, and custom foods, and restarts onboarding. Like a fresh account.
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setShowReset(true)} style={{ flexShrink: 0 }}>
          Reset
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Delete */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Delete account</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            Permanently erase your account and every record. This can&apos;t be undone.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmText('');
            setShowDelete(true);
          }}
          className="btn"
          style={{ flexShrink: 0, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
        >
          Delete
        </button>
      </div>

      {/* Reset confirmation */}
      <Modal open={showReset} onClose={() => !pending && setShowReset(false)} title="Reset account data?">
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 0 }}>
          This permanently deletes all your food logs, water, exercise, weight history, and custom foods, then restarts
          onboarding. Your login stays the same. This can&apos;t be undone.
        </p>
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowReset(false)} disabled={pending}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={doReset} disabled={pending}>
            {pending ? 'Resetting…' : 'Reset data'}
          </button>
        </div>
      </Modal>

      {/* Delete confirmation (typed) */}
      <Modal open={showDelete} onClose={() => !pending && setShowDelete(false)} title="Delete account?">
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, marginTop: 0 }}>
          This permanently erases your account and all data across every device. There is no recovery. Type{' '}
          <strong style={{ color: 'var(--text)' }}>DELETE</strong> to confirm.
        </p>
        <input
          className="input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoCapitalize="characters"
          aria-label="Type DELETE to confirm"
        />
        {error && (
          <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDelete(false)} disabled={pending}>
            Cancel
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              background: 'var(--danger)',
              color: '#fff',
              opacity: confirmText.trim().toUpperCase() === 'DELETE' && !pending ? 1 : 0.5,
            }}
            onClick={doDelete}
            disabled={pending || confirmText.trim().toUpperCase() !== 'DELETE'}
          >
            {pending ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
