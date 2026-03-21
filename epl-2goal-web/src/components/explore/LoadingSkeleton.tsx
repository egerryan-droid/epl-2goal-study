'use client';

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-6">
            <div className="h-3 w-16 rounded bg-white/10 mb-3" />
            <div className="h-8 w-24 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="glass rounded-xl p-8">
        <div className="h-4 w-48 rounded bg-white/10 mb-6" />
        <div className="h-64 w-full rounded bg-white/5" />
      </div>

      {/* Secondary content skeleton */}
      <div className="glass rounded-xl p-8">
        <div className="h-4 w-32 rounded bg-white/10 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
