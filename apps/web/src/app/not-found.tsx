import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-sm p-8">
        <p className="text-6xl font-display font-bold text-brand mb-4">404</p>
        <h1 className="text-xl font-display font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-white/50 mb-6">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/dashboard" className="btn-brand px-6 py-2.5 text-sm inline-block">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
