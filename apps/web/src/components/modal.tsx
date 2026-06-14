'use client';

import { useEffect } from 'react';

/** Lightweight, dependency-free modal with backdrop + Esc-to-close. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '88dvh',
          overflowY: 'auto',
          borderRadius: '18px 18px 0 0',
          padding: 20,
          animation: 'sheet-up 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'var(--surface-2)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--text-muted)',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes sheet-up { from { transform: translateY(12px); opacity: 0.6 } to { transform: translateY(0); opacity: 1 } }
        @media (min-width: 520px) { [role="dialog"] { align-items: center !important; padding: 24px !important } [role="dialog"] > .card { border-radius: 18px !important } }`}</style>
    </div>
  );
}
