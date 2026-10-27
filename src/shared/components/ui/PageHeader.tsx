'use client';

import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/Button';

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: PageHeaderAction | PageHeaderAction[];
  className?: string;
  variant?: 'row' | 'stack';
}

export function PageHeader({ icon, title, description, action, className, variant = 'row' }: PageHeaderProps) {
  return (
    <div className={cn(
      variant === 'row'
        ? 'flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4'
        : 'mb-4 sm:mb-6',
      className
    )}>
      <div className={cn(
        'min-w-0',
        variant === 'row' ? '' : 'space-y-1'
      )}>
        <h1 className="flex items-center gap-2 break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl dark:text-white">
          {icon && <span className="shrink-0">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          {Array.isArray(action) ? (
            action.map((a, i) => (
              <Button key={i} onClick={a.onClick} className="min-w-0 flex-1 whitespace-nowrap sm:flex-none">
                {a.icon}
                {a.label}
              </Button>
            ))
          ) : (
            <Button onClick={action.onClick} className="w-full whitespace-nowrap sm:w-auto">
              {action.icon}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
