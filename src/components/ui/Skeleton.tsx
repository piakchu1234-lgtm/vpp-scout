import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

/**
 * Premium Skeleton Loader Component
 *
 * Lightweight shimmer effect for data placeholders during loading states.
 * Creates a smooth, professional loading experience that makes 2-second
 * data fetches feel instantaneous.
 *
 * USAGE:
 * ```tsx
 * {isLoading ? (
 *   <Skeleton className="h-4 w-32" />
 * ) : (
 *   <span>{actualData}</span>
 * )}
 * ```
 *
 * VARIANTS:
 * - text: Short rounded bar (default)
 * - circular: Perfect circle
 * - rectangular: Full-width block
 *
 * ANIMATION:
 * - Uses Tailwind's animate-pulse (1.5s breathing)
 * - Soft grey with subtle transparency
 * - Rounded edges for premium feel
 */
export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'bg-slate-800/50 animate-pulse';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const sizeStyles: React.CSSProperties = {};
  if (width) sizeStyles.width = typeof width === 'number' ? `${width}px` : width;
  if (height) sizeStyles.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={sizeStyles}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton variants for common use cases
 */

// Short text line (e.g., "1,430 m²")
export function SkeletonText({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-4 w-24 ${className}`} />;
}

// Medium text line (e.g., "General Residential Zone")
export function SkeletonTextMedium({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-4 w-40 ${className}`} />;
}

// Long text line (e.g., full address)
export function SkeletonTextLong({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-5 w-full ${className}`} />;
}

// Data card skeleton (e.g., property details card)
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/[0.02] rounded-lg p-4 space-y-3 ${className}`}>
      <Skeleton className="h-3 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

// Property attribute skeleton (label + value pair)
export function SkeletonAttribute({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Skeleton className="h-3 w-20" /> {/* Label */}
      <Skeleton className="h-4 w-32" /> {/* Value */}
    </div>
  );
}
