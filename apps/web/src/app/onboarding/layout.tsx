import { TimezoneSync } from '@/components/timezone-sync';

/**
 * Minimal full-screen shell for the onboarding wizard — deliberately free of the
 * app header/nav so the flow is focused and distraction-free.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TimezoneSync />
      {children}
    </div>
  );
}
