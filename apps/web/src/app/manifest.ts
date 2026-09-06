import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hourguard — Time Tracking by HireJPS',
    short_name: 'Hourguard',
    description: 'Track work hours, monitor productivity, and turn time into invoices.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#ef4444',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  };
}
