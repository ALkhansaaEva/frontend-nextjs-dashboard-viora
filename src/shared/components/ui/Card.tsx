'use client';

import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, padding = 'md', hover = false, onClick }: CardProps) {
  const paddingStyles = { 
    none: '', 
    sm: 'p-2.5 sm:p-3',
    md: 'p-3 sm:p-4',
    lg: 'p-4 sm:p-6',
  };

  return (
    <div 
      className={cn(
        'min-w-0 max-w-full rounded-xl border border-gray-200 bg-white shadow-sm sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800',
        paddingStyles[padding], 
        hover && 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-3 min-w-0 sm:mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('break-words text-base font-bold text-gray-900 sm:text-lg dark:text-white', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 max-w-full overflow-x-auto overscroll-x-contain', className)}>{children}</div>;
}

export default Card;
