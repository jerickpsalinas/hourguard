export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-32 rounded bg-white/[0.08] mb-2" />
              <div className="h-3 w-48 rounded bg-white/[0.06]" />
            </div>
            <div className="h-6 w-16 rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-card animate-pulse">
      <div className="border-b border-white/[0.08] px-4 py-3 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 w-20 rounded bg-white/[0.08]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-white/[0.06] px-4 py-3 flex gap-8">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 w-24 rounded bg-white/[0.06]" />
          ))}
        </div>
      ))}
    </div>
  );
}
