'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type ViewMode = 'grid' | 'table';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'p-1.5 rounded transition-all',
          value === 'grid'
            ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('table')}
        className={cn(
          'p-1.5 rounded transition-all',
          value === 'table'
            ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        )}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ViewToggle;
