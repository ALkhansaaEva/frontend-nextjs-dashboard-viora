'use client';

import { Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';

interface ReportsFiltersSectionProps {
  searchQuery: string;
  statusFilter: string;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: string) => void;
}

const statusOptions = [
  { value: '', label: 'All Reports' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'investigating', label: 'Under Investigation' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export function ReportsFiltersSection({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: ReportsFiltersSectionProps) {
  return (
    <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by User ID or Evidence hash..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <Select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              options={statusOptions.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              className="w-48 bg-transparent border-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}