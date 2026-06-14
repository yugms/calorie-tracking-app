import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Calorie Tracker', template: '%s · Calorie Tracker' },
  description: 'A sleek, minimalist calorie & fitness tracker.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Calories',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
