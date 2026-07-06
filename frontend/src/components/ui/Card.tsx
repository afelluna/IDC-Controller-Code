




import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={cn(
        'overflow-hidden flex flex-col',
        className
      )}
      style={{
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
