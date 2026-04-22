'use client';

import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: 'indigo' | 'yellow' | 'blue' | 'red' | 'green' | 'purple';
  href?: string;
}

const colorStyles = {
  indigo: {
    bg: 'bg-indigo-500',
    light: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-800',
  },
  yellow: {
    bg: 'bg-amber-500',
    light: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800',
  },
  blue: {
    bg: 'bg-blue-500',
    light: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800',
  },
  red: {
    bg: 'bg-red-500',
    light: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-800',
  },
  green: {
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-800',
  },
  purple: {
    bg: 'bg-violet-500',
    light: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-100 dark:border-violet-800',
  },
};

export function StatCard({ title, value, icon, color, href }: StatCardProps) {
  const styles = colorStyles[color];
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  const card = (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-800',
      'transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
      styles.border
    )}>
      <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -mr-8 -mt-8', styles.bg)} />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'p-2.5 rounded-xl',
            styles.light
          )}>
            <div className={styles.text}>
              {icon}
            </div>
          </div>
          <div className={cn(
            'w-2 h-2 rounded-full opacity-50',
            styles.bg
          )} />
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {displayValue}
          </p>
        </div>
      </div>
      
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        styles.bg
      )} />
    </div>
  );

  return href ? <Link href={href} className="block">{card}</Link> : card;
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {children}
    </div>
  );
}