import type { Metadata } from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';

const description =
  'Hourguard tracks work hours, measures productivity, and turns time into invoices — automatically. A HireJPS Store product.';

export const metadata: Metadata = {
  metadataBase: new URL('https://hourguard.hirejps.com'),
  title: {
    default: 'Hourguard — Time Tracking by HireJPS',
    template: '%s · Hourguard',
  },
  description,
  applicationName: 'Hourguard',
  keywords: ['time tracking', 'employee monitoring', 'productivity', 'invoicing', 'HireJPS'],
  openGraph: {
    title: 'Hourguard — Time Tracking by HireJPS',
    description,
    url: 'https://hourguard.hirejps.com',
    siteName: 'Hourguard',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hourguard — Time Tracking by HireJPS',
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-[#fafafa] antialiased font-sans">{children}</body>
    </html>
  );
}
