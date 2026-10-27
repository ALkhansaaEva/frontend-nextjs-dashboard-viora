'use client';

import { Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ReportCategorySchema } from '@/dto/reports/reports.dto';

interface ReportsFiltersSectionProps {
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
}

const statusOptions = [
  { value: '', label: 'All Reports' },
  { value: 'open', label: 'Open Review' },
  { value: 'investigating', label: 'Under Investigation' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

// Derived from the DTO enum so the select can never offer a category the
// backend `ReportCategory` column does not accept.
const categoryOptions = [
  { value: '', label: 'All Categories' },
  ...ReportCategorySchema.options.map((value) => ({
    value,
    label: value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
  })),
];

export function ReportsFiltersSection({
  searchQuery,
  statusFilter,
  categoryFilter,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
}: ReportsFiltersSectionProps) {
  return (
    <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search the loaded page only — GET /reports has no search param"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-5 h-5 shrink-0 text-gray-400" />
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              options={statusOptions}
              className="w-44 bg-transparent border-none"
            />
            <Select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              options={categoryOptions}
              className="w-52 bg-transparent border-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
