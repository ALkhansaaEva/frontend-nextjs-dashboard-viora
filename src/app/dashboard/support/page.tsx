'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, MessageSquare, Clock, 
  Search, Filter, ArrowRight, LifeBuoy, Plus
} from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { supportService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'default',
};

const priorityColors: Record<string, 'default' | 'warning' | 'danger' | 'info'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  urgent: 'info',
};

export default function SupportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['support', page, statusFilter],
    queryFn: () => supportService.getTickets({ page, limit: 10, status: statusFilter || undefined }),
    staleTime: 30000,
  });

  const handlePageChange = (newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
    queryClient.invalidateQueries({ queryKey: ['support'] });
  };

  const filteredTickets = (data?.data || []).filter((ticket: { subject: string }) => 
    ticket.subject.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('support')}</h1>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent underline decoration-primary/30 decoration-4 underline-offset-8">
            {t('support')} Hub
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Address user concerns and technical anomalies in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="rounded-2xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
              <LifeBuoy className="w-4 h-4 mr-2" />
              Guidelines
           </Button>
           <Button className="rounded-2xl shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
           </Button>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="border-none bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
             <div className="relative flex-1 group w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                <Input 
                   placeholder="Search by ticket subject or ID..." 
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="pl-11 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                />
             </div>
             <div className="flex items-center gap-3 w-full md:w-auto">
                <Filter className="w-5 h-5 text-gray-400" />
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    const url = new URL(window.location.href);
                    url.searchParams.set('page', '1');
                    window.history.pushState({}, '', url);
                  }}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'open', label: 'Open' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                  className="w-48 bg-transparent border-none"
                />
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Feed */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: index * 0.05 }}
              layout
              onClick={() => router.push(`/dashboard/support/${ticket.id}`)}
              className="cursor-pointer"
            >
              <Card 
                className="group border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-5 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1 font-mono uppercase tracking-widest text-[10px]">
                           ID: {ticket.id.slice(0, 8)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <Badge variant={priorityColors[ticket.priority || 'low'] || 'default'} className="px-3 py-1 capitalize">
                      {ticket.priority || 'low'}
                    </Badge>
                    <Badge variant={statusColors[ticket.status] || 'default'} className="px-3 py-1 capitalize border-primary/10">
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-800 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                       <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold">{t('noData')}</h3>
            <p className="mt-2 text-sm">Communication channels are clear. No active tickets found.</p>
          </div>
        )}
      </div>

      {/* Pagination Container */}
      {data && data.total > 10 && (
        <div className="flex items-center justify-between px-2 pt-6">
           <div className="text-sm font-medium text-gray-500">
              Reviewing page {data.page} of {data.totalPages}
           </div>
           <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={data.page <= 1} 
                onClick={() => handlePageChange(data.page - 1)}
                className="rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={data.page >= data.totalPages} 
                onClick={() => handlePageChange(data.page + 1)}
                className="rounded-xl"
              >
                More
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}