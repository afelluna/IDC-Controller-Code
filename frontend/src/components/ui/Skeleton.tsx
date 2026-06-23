import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Reusable shimmer placeholder for loading states.
 * Use in place of content when data is being fetched.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg', className)}
      style={{ backgroundColor: 'var(--bg-elevated)' }}
    />
  );
}
