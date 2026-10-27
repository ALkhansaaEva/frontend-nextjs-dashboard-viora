'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, MessageSquare, Clock,
  Search, Filter, ArrowRight, Plus
} from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Modal } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { useToast } from '@/store/toast.store';
import { supportService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { humanizeToken } from '@/shared/lib/labels';
import { TableSkeleton } from '@/components/skeletons';
import { TICKET_STATUSES, type TicketStatus } from '@/dto/support/support.dto';
import TicketDetailDrawer, { ticketStatusVariant } from './TicketDetailDrawer';

const LIST_LIMIT = 10;

const statusOptions = [
  { value: '', label: 'All Statuses' },
  ...TICKET_STATUSES.map((status) => ({ value: status, label: humanizeToken(status) })),
];

export default function SupportPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['support', 'tickets', statusFilter, offset],
    queryFn: () => supportService.getTickets({ status: statusFilter || undefined, limit: LIST_LIMIT, offset }),
    staleTime: 30000,
  });

  const total = data?.total ?? 0;
  const page = Math.floor(offset / LIST_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(total / LIST_LIMIT));

  // The backend exposes no search param, and the list is offset-paged, so this
  // narrows the rows already loaded for the current page.
  const query = search.trim().toLowerCase();
  const tickets = (data?.tickets ?? []).filter((ticket) =>
    !query ||
    ticket.subject.toLowerCase().includes(query) ||
    ticket.id.toLowerCase().includes(query) ||
    (ticket.ticketNumber ?? '').toLowerCase().includes(query)
  );

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      supportService.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        category: category.trim() || undefined,
      }),
    onSuccess: () => {
      setCreateOpen(false);
      setSubject('');
      setMessage('');
      setCategory('');
      setOffset(0);
      void queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Ticket created.');
    },
    onError: (err) => toast.error('Could not create the ticket.', err),
  });

  if (isError) {

    return (

      <div className="space-y-6">

        <QueryErrorNotice error={error} onRetry={() => refetch()} />

      </div>

    );

  }


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
           <Button className="rounded-2xl shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)}>
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
                   placeholder="Filter this page by subject, ticket number or ID..."
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
                    setStatusFilter(e.target.value as TicketStatus | '');
                    setOffset(0);
                  }}
                  options={statusOptions}
                  className="w-48 bg-transparent border-none"
                />
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Feed */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {tickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: index * 0.05 }}
              layout
              role="button"
              tabIndex={0}
              aria-label={`Open ticket: ${ticket.subject}`}
              onClick={() => setOpenTicketId(ticket.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpenTicketId(ticket.id);
                }
              }}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-2xl"
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
                           #{ticket.ticketNumber}
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
                    <Badge variant={ticketStatusVariant(ticket.status)} className="px-3 py-1 capitalize border-primary/10">
                      {humanizeToken(ticket.status)}
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

        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold">{query ? 'No match on this page' : t('noData')}</h3>
            <p className="mt-2 text-sm">
              {query
                ? 'Clear the filter or turn the page to look through the rest of the queue.'
                : 'Communication channels are clear. No active tickets found.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Container */}
      {total > LIST_LIMIT && (
        <div className="flex items-center justify-between px-2 pt-6">
           <div className="text-sm font-medium text-gray-500">
              Reviewing page {page} of {totalPages}
           </div>
           <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(o => Math.max(0, o - LIST_LIMIT))}
                className="rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + LIST_LIMIT >= total}
                onClick={() => setOffset(o => o + LIST_LIMIT)}
                className="rounded-xl"
              >
                More
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
           </div>
        </div>
      )}

      <TicketDetailDrawer ticketId={openTicketId} onClose={() => setOpenTicketId(null)} />

      {/* Create Ticket — POST /support/tickets { subject, message, category? } */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Ticket" size="md">
        <div className="space-y-3">
          <Input
            label="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Short summary of the issue"
          />
          <div>
            <label htmlFor="new-ticket-message" className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              Message
            </label>
            <textarea
              id="new-ticket-message"
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the problem in detail…"
              className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <Input
            label="Category (optional)"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="payments"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              isLoading={createMutation.isPending}
              disabled={subject.trim().length < 3 || message.trim().length < 5}
              onClick={() => createMutation.mutate()}
            >
              {t('create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
