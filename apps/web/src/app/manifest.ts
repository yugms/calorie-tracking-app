import type { MetadataRoute } from 'next';

/** Web app manifest — makes the tracker installable to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Calorie Tracker',
    short_name: 'Calories',
    description: 'A sleek, minimalist calorie & fitness tracker.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#16a34a',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
