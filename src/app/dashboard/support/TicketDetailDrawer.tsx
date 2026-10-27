'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Clock, MessageSquare, Send, StickyNote, UserPlus } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { CopyId, UserIdentityCell } from '@/shared/components/ui/UserIdentityCell';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { UserSelector } from '@/shared/components/ui/UserSelector';
import { useToast } from '@/store/toast.store';
import { supportService, type TicketDetail } from '@/services/support.service';
import { TICKET_STATUSES, type TicketStatus } from '@/dto/support/support.dto';
import { humanizeToken } from '@/shared/lib/labels';
import { useTicketEvents, type TicketStreamStatus } from './useTicketEvents';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const STATUS_VARIANTS: Record<TicketStatus, BadgeVariant> = {
  open: 'warning',
  in_progress: 'info',
  waiting_on_user: 'danger',
  resolved: 'success',
  closed: 'default',
};

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({ value: status, label: humanizeToken(status) }));

/** Shared with the list page so a status never renders in two different colours. */
export function ticketStatusVariant(status: string): BadgeVariant {
  return STATUS_VARIANTS[status as TicketStatus] ?? 'default';
}

interface TicketDetailDrawerProps {
  /** Active ticket, or null when the drawer is closed. */
  ticketId: string | null;
  onClose: () => void;
}

const fieldLabel = 'block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400';

/** Human sender name; falls back to a truncated id, never blank. */
function SenderName({ userId }: { userId: string }) {
  const { data } = useUserIdentity(userId);
  return (
    <span className="font-medium text-gray-700 dark:text-gray-200">
      {data?.nickname || data?.email || `${userId.slice(0, 8)}…`}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {children}
    </div>
  );
}

/**
 * Detail + action surface for one ticket (GET /support/tickets/:id).
 *
 * Mounted per ticket by the list page: every action below maps to a live
 * support route and refreshes both the detail and the list.
 */
export default function TicketDetailDrawer({ ticketId, onClose }: TicketDetailDrawerProps) {
  const queryClient = useQueryClient();
  const streamStatus = useTicketEvents(ticketId, () => {
    void queryClient.invalidateQueries({
      queryKey: ['support', 'ticket', ticketId],
    });
  });

  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => supportService.getTicket(ticketId!),
    enabled: !!ticketId,
    staleTime: 15000,
    // Push updates arrive over SSE; polling is only the fallback when the
    // stream is reconnecting (or the deployment has no stream support).
    refetchInterval: streamStatus === 'live' ? false : ticketId ? 15000 : false,
  });

  // Prefix match: refetches this detail and the list behind it.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['support'] });
  };

  return (
    <Modal
      isOpen={!!ticketId}
      onClose={onClose}
      title={ticket ? `Ticket ${ticket.ticketNumber ?? ticket.id.slice(0, 8)}` : 'Ticket'}
      size="lg"
    >
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading ticket…</p>
      ) : isError ? (
        <QueryErrorNotice error={error} onRetry={() => void refetch()} />
      ) : ticket ? (
        <TicketDetailBody key={ticket.id} ticket={ticket} onChanged={refresh} streamStatus={streamStatus} />
      ) : null}
    </Modal>
  );
}

function TicketDetailBody({ ticket, onChanged, streamStatus }: { ticket: TicketDetail; onChanged: () => void; streamStatus: TicketStreamStatus }) {
  const toast = useToast();

  const [reply, setReply] = useState('');
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');

  const replyMutation = useMutation({
    mutationFn: () => supportService.replyToTicket(ticket.id, reply),
    onSuccess: () => {
      setReply('');
      onChanged();
      toast.success('Reply sent.');
    },
    onError: (err) => toast.error('Could not send the reply.', err),
  });

  const statusMutation = useMutation({
    mutationFn: () => supportService.updateStatus(ticket.id, { status }),
    onSuccess: () => {
      onChanged();
      toast.success(`Status set to ${humanizeToken(status)}.`);
    },
    onError: (err) => toast.error('Could not change the status.', err),
  });

  const assignMutation = useMutation({
    mutationFn: () => supportService.assignTicket(ticket.id, assignee),
    onSuccess: () => {
      onChanged();
      toast.success('Ticket assigned.');
    },
    onError: (err) => toast.error('Could not assign the ticket.', err),
  });

  const noteMutation = useMutation({
    mutationFn: () => supportService.addNote(ticket.id, note),
    onSuccess: () => {
      setNote('');
      // Notes go to ticket_internal_notes, which GET /support/tickets/:id does
      // not return — say so instead of implying the note joined the thread.
      toast.success('Internal note saved.', 'Notes are not returned by the ticket detail route.');
    },
    onError: (err) => toast.error('Could not save the note.', err),
  });

  const escalateMutation = useMutation({
    mutationFn: () => supportService.escalateTicket(ticket.id, reason),
    onSuccess: () => {
      setReason('');
      onChanged();
      toast.success('Ticket escalated.');
    },
    onError: (err) => toast.error('Could not escalate the ticket.', err),
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold break-words text-gray-900 dark:text-white">{ticket.subject}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Badge variant={ticketStatusVariant(ticket.status)} className="px-3 py-1 capitalize">
            {humanizeToken(ticket.status)}
          </Badge>
          {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
          <Badge variant={streamStatus === 'live' ? 'success' : 'outline'}>
            {streamStatus === 'live'
              ? 'Live'
              : streamStatus === 'connecting'
                ? 'Connecting…'
                : 'Polling'}
          </Badge>
          <CopyId id={ticket.id} label="ID" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className={fieldLabel}>Requester</span>
          <UserIdentityCell userId={ticket.requesterUserId} />
        </div>
        <div className="space-y-1">
          <span className={fieldLabel}>Timeline</span>
          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Updated {new Date(ticket.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      <Section title={`Messages (${ticket.messages.length})`}>
        {ticket.messages.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <MessageSquare className="h-4 w-4" /> No messages on this ticket yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {ticket.messages.map((message) => {
              const isRequester = message.senderUserId === ticket.requesterUserId;
              return (
              <li
                key={message.id}
                className={
                  message.isInternal
                    ? 'rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30'
                    : 'rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50'
                }
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {message.isInternal && <Badge variant="warning">Internal</Badge>}
                  <Badge variant={isRequester ? 'outline' : 'info'}>
                    {isRequester ? 'Requester' : 'Support agent'}
                  </Badge>
                  <SenderName userId={message.senderUserId} />
                  <span>{new Date(message.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1.5 text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                  {message.message}
                </p>
              </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Reply">
        <label htmlFor="ticket-reply" className="sr-only">
          Reply message
        </label>
        <textarea
          id="ticket-reply"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply to the requester…"
          className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            isLoading={replyMutation.isPending}
            disabled={!reply.trim()}
            onClick={() => replyMutation.mutate()}
          >
            <Send className="h-3.5 w-3.5" /> Send reply
          </Button>
        </div>
      </Section>

      <Section title="Change status">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            aria-label="New ticket status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            options={STATUS_OPTIONS}
            className="sm:flex-1"
          />
          <Button size="sm" isLoading={statusMutation.isPending} onClick={() => statusMutation.mutate()}>
            Update status
          </Button>
        </div>
      </Section>

      <Section title="Assign agent">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:flex-1">
            <UserSelector value={assignee} onChange={setAssignee} placeholder="Search users to assign…" />
          </div>
          <Button
            size="sm"
            isLoading={assignMutation.isPending}
            disabled={!assignee}
            onClick={() => assignMutation.mutate()}
          >
            <UserPlus className="h-3.5 w-3.5" /> Assign
          </Button>
        </div>
      </Section>

      <Section title="Internal note">
        <Input
          label="Note (staff only)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Context for the support team…"
        />
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            isLoading={noteMutation.isPending}
            disabled={!note.trim()}
            onClick={() => noteMutation.mutate()}
          >
            <StickyNote className="h-3.5 w-3.5" /> Add note
          </Button>
        </div>
      </Section>

      <Section title="Escalate">
        <Input
          label="Escalation reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why does this need an admin?"
        />
        <div className="flex justify-end">
          <Button
            variant="danger"
            size="sm"
            isLoading={escalateMutation.isPending}
            disabled={!reason.trim()}
            onClick={() => escalateMutation.mutate()}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Escalate
          </Button>
        </div>
      </Section>
    </div>
  );
}
