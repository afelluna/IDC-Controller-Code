




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
        'bg-[#f0f1f3] rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
