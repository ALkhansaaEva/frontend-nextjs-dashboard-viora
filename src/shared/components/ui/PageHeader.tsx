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
        ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-4'
        : 'mb-6',
      className
    )}>
      <div className={cn(
        variant === 'row' ? '' : 'space-y-1'
      )}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0">
          {Array.isArray(action) ? (
            action.map((a, i) => (
              <Button key={i} onClick={a.onClick}>
                {a.icon}
                {a.label}
              </Button>
            ))
          ) : (
            <Button onClick={action.onClick}>
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
