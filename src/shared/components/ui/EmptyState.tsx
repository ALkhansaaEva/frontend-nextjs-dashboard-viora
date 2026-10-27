'use client';

import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ message, icon, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'col-span-full flex flex-col items-center justify-center py-12 text-center',
      className
    )}>
      {icon && <div className="mb-3 text-gray-300 dark:text-gray-600">{icon}</div>}
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export default EmptyState;
