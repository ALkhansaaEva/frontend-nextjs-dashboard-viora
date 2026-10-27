'use client';

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/Button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading,
  searchable,
  searchPlaceholder = 'Search...',
  onSearch,
  pagination,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!e.target.value) {
      onSearch?.('');
    }
  }, [onSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    onSearch?.('');
  }, [onSearch]);

  const pageStart = useMemo(() => {
    if (!pagination) return 0;
    return (pagination.page - 1) * pagination.limit + 1;
  }, [pagination]);

  const pageEnd = useMemo(() => {
    if (!pagination) return data.length;
    return Math.min(pagination.page * pagination.limit, pagination.total);
  }, [pagination, data.length]);

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-700 px-4 flex items-center gap-4">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      {searchable && (
        <form onSubmit={handleSearch} className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className={cn(
                "w-full h-10 ps-10 pe-10 rounded-lg",
                "bg-gray-50 dark:bg-gray-900",
                "border border-gray-200 dark:border-gray-700",
                "text-gray-900 dark:text-white",
                "placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-sm text-gray-700 dark:text-gray-300",
                        column.className
                      )}
                    >
{column.render
              ? column.render(item)
              : String((item as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">{pageStart}</span> to{' '}
            <span className="font-medium">{pageEnd}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> results
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-2"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;