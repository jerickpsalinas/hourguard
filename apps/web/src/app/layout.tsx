import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hourguard — HireJPS',
  description: 'Time tracking and employee monitoring dashboard by HireJPS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-[#fafafa] antialiased font-sans">{children}</body>
    </html>
  );
}
