'use client';

import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

interface QuickActionProps {
  icon: ReactNode;
  label: string;
  href: string;
}

export function QuickAction({ icon, label, href }: QuickActionProps) {
  return (
    <Link 
      href={href}
      className={cn(
        'group flex flex-col items-center justify-center p-4 rounded-2xl',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        'hover:border-indigo-300 dark:hover:border-indigo-600'
      )}
    >
      <div className={cn(
        'p-3 rounded-xl mb-3 bg-gray-50 dark:bg-gray-700/50',
        'transition-colors duration-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30'
      )}>
        <div className={cn(
          'text-gray-500 dark:text-gray-400',
          'transition-colors duration-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
        )}>
          {icon}
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
        {label}
      </span>
    </Link>
  );
}

export function QuickActionsGrid({ actions }: { actions: Array<{ icon: ReactNode; label: string; href: string }> }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {actions.map((action) => (
        <QuickAction key={action.href} {...action} />
      ))}
    </div>
  );
}