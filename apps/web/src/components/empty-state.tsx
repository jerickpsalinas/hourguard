import { ReactNode } from 'react';

// Friendly empty state with an icon, message, and optional call to action.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string; // SVG path `d`
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card p-10 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 mb-4">
        <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <p className="font-display font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-white/50 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
