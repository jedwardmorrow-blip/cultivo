function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

function SkeletonStatCard() {
  return (
    <div className="bg-cult-surface border border-cult-border rounded-lg p-5">
      <SkeletonBar className="h-3 w-20 mb-3" />
      <SkeletonBar className="h-8 w-16 mb-2" />
      <SkeletonBar className="h-3 w-28" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <SkeletonBar className="h-4 w-24" />
      <SkeletonBar className="h-4 w-32" />
      <SkeletonBar className="h-4 w-20" />
      <SkeletonBar className="h-4 w-16 ml-auto" />
    </div>
  );
}

export function PageSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'table' | 'cards' }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <SkeletonBar className="h-8 w-48 mb-2" />
        <SkeletonBar className="h-4 w-72" />
      </div>

      {(variant === 'dashboard' || variant === 'cards') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      )}

      <div className="bg-cult-surface border border-cult-border rounded-lg overflow-hidden">
        {variant === 'table' && (
          <div className="px-5 py-3 border-b border-cult-border flex gap-4">
            <SkeletonBar className="h-3 w-16" />
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="h-3 w-16" />
            <SkeletonBar className="h-3 w-12 ml-auto" />
          </div>
        )}
        <div className="divide-y divide-cult-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </div>
      </div>

      {variant === 'dashboard' && (
        <div className="bg-cult-surface border border-cult-border rounded-lg p-6">
          <SkeletonBar className="h-4 w-32 mb-4" />
          <div className="space-y-3">
            <SkeletonBar className="h-3 w-full" />
            <SkeletonBar className="h-3 w-4/5" />
            <SkeletonBar className="h-3 w-3/5" />
          </div>
        </div>
      )}
    </div>
  );
}
