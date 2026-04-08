import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-stone-200 rounded-2xl ${className}`} />
);

export const BitesSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="space-y-4">
        <Skeleton className="aspect-[4/5] rounded-[2rem]" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
