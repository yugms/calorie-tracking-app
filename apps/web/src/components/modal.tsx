'use client';

import { useEffect, useRef } from 'react';

/** Lightweight, dependency-free modal with backdrop, Esc-to-close, focus trap. */
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // Move focus into the dialog (first field, else the panel itself).
    const first = focusables()[0];
    (first ?? panelRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="sheet-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--backdrop)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
        animation: 'backdrop-in var(--dur) var(--ease-out)',
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="sheet-panel"
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '90dvh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          boxShadow: 'var(--shadow-lg)',
          padding: '10px 20px calc(20px + env(safe-area-inset-bottom))',
          animation: 'sheet-up var(--dur-slow) var(--ease)',
          outline: 'none',
        }}
      >
        {/* iOS grabber */}
        <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 12px' }}>
          <span style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="h2" style={{ fontSize: 18 }}>
            {title}
          </h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close" style={{ width: 30, height: 30, color: 'var(--text-secondary)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
      <style>{`@media (min-width: 540px) {
        .sheet-overlay { align-items: center !important; padding: 24px; }
        .sheet-panel { border-radius: var(--radius-lg) !important; border-bottom: 1px solid var(--border) !important; }
        .sheet-panel > div[aria-hidden] { display: none !important; }
      }`}</style>
    </div>
  );
}
