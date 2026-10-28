'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowUpRight, ChevronDown, Clock, MessageSquare, Send,
  StickyNote, UserPlus, UserRound, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { QueryErrorNotice, asApiError } from '@/shared/components/ui/QueryState';
import { CopyId } from '@/shared/components/ui/UserIdentityCell';
import { UserSelector } from '@/shared/components/ui/UserSelector';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import { supportService, type TicketDetail, type TicketParticipant } from '@/services/support.service';
import { TICKET_STATUSES, type TicketStatus } from '@/dto/support/support.dto';
import { humanizeToken } from '@/shared/lib/labels';
import { cn } from '@/shared/lib/utils';
import { ticketStatusVariant } from '../ticket-status';
import { useTicketEvents } from '../useTicketEvents';

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
  value: status,
  label: humanizeToken(status),
}));

const BACK_HREF = '/dashboard/support';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

/** Avatar with a deterministic initials fallback; never renders a broken image. */
function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = !!url && !failed;
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-black/5"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote avatar host is user-provided
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function PersonRow({ person, fallbackId }: { person?: TicketParticipant | null; fallbackId: string }) {
  const name = person?.username || `User ${fallbackId.slice(0, 8)}`;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} url={person?.avatarUrl} size={28} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">{name}</span>
        {person?.immutableUserId && (
          <span className="block text-[11px] text-gray-400">#{person.immutableUserId}</span>
        )}
      </span>
    </span>
  );
}

function CustomerPanel({ ticket, canSeeUsers }: { ticket: TicketDetail; canSeeUsers: boolean }) {
  const requester = ticket.requester ?? null;
  const name = requester?.username || `User ${ticket.requesterUserId.slice(0, 8)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} url={requester?.avatarUrl} size={56} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Requester{requester?.immutableUserId ? ` · #${requester.immutableUserId}` : ''}
            {requester?.level ? ` · Level ${requester.level}` : ''}
          </p>
        </div>
      </div>

      <dl className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Ticket</dt>
          <dd className="font-mono text-[11px] text-gray-700 dark:text-gray-200">
            {ticket.ticketNumber ? `#${ticket.ticketNumber}` : ticket.id.slice(0, 8)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Created</dt>
          <dd className="text-gray-700 dark:text-gray-200">{new Date(ticket.createdAt).toLocaleString()}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
          <dd className="text-gray-700 dark:text-gray-200">{new Date(ticket.updatedAt).toLocaleString()}</dd>
        </div>
        {ticket.category && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Category</dt>
            <dd className="text-gray-700 dark:text-gray-200">{ticket.category}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <dt className="text-gray-500 dark:text-gray-400">Customer ID</dt>
          <dd><CopyId id={ticket.requesterUserId} label="Copy customer id" /></dd>
        </div>
      </dl>

      {canSeeUsers && requester?.immutableUserId && (
        <Link
          href={`/dashboard/users/${requester.immutableUserId}`}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <UserRound className="h-3.5 w-3.5" />
          Open customer profile
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function TicketActions({ ticket }: { ticket: TicketDetail }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['support'] });

  const statusMutation = useMutation({
    mutationFn: () => supportService.updateStatus(ticket.id, { status }),
    onSuccess: () => {
      refresh();
      toast.success(`Status set to ${humanizeToken(status)}.`);
    },
    onError: (err) => toast.error('Could not change the status.', err),
  });

  const assignMutation = useMutation({
    mutationFn: () => supportService.assignTicket(ticket.id, assignee),
    onSuccess: () => {
      refresh();
      toast.success('Ticket assigned.');
    },
    onError: (err) => toast.error('Could not assign the ticket.', err),
  });

  const noteMutation = useMutation({
    mutationFn: () => supportService.addNote(ticket.id, note),
    onSuccess: () => {
      setNote('');
      // Notes live in ticket_internal_notes; the detail route does not return them.
      toast.success('Internal note saved.', 'Notes are not returned by the ticket detail route.');
    },
    onError: (err) => toast.error('Could not save the note.', err),
  });

  const escalateMutation = useMutation({
    mutationFn: () => supportService.escalateTicket(ticket.id, reason),
    onSuccess: () => {
      setReason('');
      refresh();
      toast.success('Ticket escalated.');
    },
    onError: (err) => toast.error('Could not escalate the ticket.', err),
  });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Manage ticket</span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      <div className={cn('mt-4 space-y-4', !open && 'hidden lg:block')}>
        <div className="space-y-1.5">
          <label htmlFor="ticket-status" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Status
          </label>
          <div className="flex gap-2">
            <Select
              id="ticket-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TicketStatus)}
              options={STATUS_OPTIONS}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending || status === ticket.status}
              onClick={() => statusMutation.mutate()}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">Assign agent</span>
          <UserSelector value={assignee} onChange={setAssignee} />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={assignMutation.isPending || !assignee}
            onClick={() => assignMutation.mutate()}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign
          </Button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ticket-note" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Internal note
          </label>
          <textarea
            id="ticket-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={noteMutation.isPending || note.trim().length === 0}
            onClick={() => noteMutation.mutate()}
          >
            <StickyNote className="mr-1.5 h-3.5 w-3.5" /> Save note
          </Button>
        </div>

        <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <label htmlFor="ticket-reason" className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Escalation reason
          </label>
          <Input
            id="ticket-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why does this need escalation?"
          />
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            disabled={escalateMutation.isPending || reason.trim().length === 0}
            onClick={() => escalateMutation.mutate()}
          >
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Escalate
          </Button>
        </div>
      </div>
    </div>
  );
}

function Conversation({ ticket }: { ticket: TicketDetail }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [ticket.messages.length]);

  if (ticket.messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
        <div className="opacity-60">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No messages yet</p>
          <p className="mt-1 text-xs text-gray-400">Send the first reply to open the conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
      {ticket.messages.map((message) => {
        const isRequester = message.senderUserId === ticket.requesterUserId;

        if (message.isInternal) {
          return (
            <div key={message.id} className="flex justify-center">
              <div className="max-w-[85%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <span className="font-semibold">Internal note</span>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{message.message}</p>
                <time className="mt-1 block text-[10px] opacity-70" dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleString()}
                </time>
              </div>
            </div>
          );
        }

        const name = message.sender?.username ||
          (isRequester ? ticket.requester?.username : null) ||
          `User ${message.senderUserId.slice(0, 8)}`;

        return (
          <div key={message.id} className={cn('flex gap-2', isRequester ? 'justify-start' : 'justify-end')}>
            {isRequester && <Avatar name={name} url={message.sender?.avatarUrl} size={32} />}
            <div className={cn('max-w-[85%] sm:max-w-[70%]', !isRequester && 'items-end text-right')}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-200">{name}</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:bg-gray-800">
                  {isRequester ? 'customer' : 'agent'}
                </span>
              </div>
              <div
                className={cn(
                  'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                  isRequester
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'bg-primary text-white',
                )}
              >
                {message.message}
              </div>
              <time
                className="mt-1 block text-[10px] text-gray-400"
                dateTime={message.createdAt}
              >
                {new Date(message.createdAt).toLocaleString()}
              </time>
            </div>
            {!isRequester && <Avatar name={name} url={message.sender?.avatarUrl} size={32} />}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function Composer({ ticket }: { ticket: TicketDetail }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reply, setReply] = useState('');

  const replyMutation = useMutation({
    mutationFn: (body: string) => supportService.replyToTicket(ticket.id, body),
    onSuccess: () => {
      setReply('');
      void queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Reply sent.');
    },
    onError: (err) => toast.error('Could not send the reply. Your message was kept.', err),
  });

  const send = useCallback(() => {
    const body = reply.trim();
    if (!body || replyMutation.isPending) return;
    replyMutation.mutate(body);
  }, [reply, replyMutation]);

  return (
    <div className="border-t border-gray-100 bg-white/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-800 dark:bg-gray-900/80 sm:px-6">
      <label htmlFor="ticket-reply" className="sr-only">
        Reply to ticket
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="ticket-reply"
          rows={2}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Write a reply… (Enter to send, Shift+Enter for a new line)"
          className="max-h-40 min-h-[44px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <Button
          onClick={send}
          disabled={replyMutation.isPending || reply.trim().length === 0}
          aria-label="Send reply"
          className="h-11 shrink-0 px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = typeof params?.id === 'string' ? params.id : '';

  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canSeeUsers = hasPermission('users.read') || hasPermission('users.write');

  const streamStatus = useTicketEvents(ticketId, () => {
    void queryClient.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
  });

  const { data: ticket, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => supportService.getTicket(ticketId),
    enabled: !!ticketId,
    staleTime: 15000,
    // SSE drives live updates; polling only covers a reconnecting stream.
    refetchInterval: streamStatus === 'live' ? false : 15000,
  });

  const apiError = isError ? asApiError(error) : null;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={BACK_HREF}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-gray-600 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" /> All tickets
        </Link>
        {ticket && (
          <Badge variant={streamStatus === 'live' ? 'success' : 'outline'}>
            {streamStatus === 'live' ? 'Live' : streamStatus === 'connecting' ? 'Connecting…' : 'Polling'}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : isError ? (
        apiError?.statusCode === 404 ? (
          <div className="rounded-2xl border border-gray-200 p-8 text-center dark:border-gray-800">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Ticket not found</p>
            <p className="mt-1 text-sm text-gray-500">
              It may have been deleted, or the link is wrong.
            </p>
            <Link
              href={BACK_HREF}
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Back to tickets
            </Link>
          </div>
        ) : apiError?.statusCode === 403 ? (
          <div className="rounded-2xl border border-gray-200 p-8 text-center dark:border-gray-800">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">You cannot view this ticket</p>
            <p className="mt-1 text-sm text-gray-500">
              Only the requester or support staff may open it.
            </p>
          </div>
        ) : (
          <QueryErrorNotice error={error} onRetry={() => void refetch()} />
        )
      ) : ticket ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[60dvh] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60 lg:h-[calc(100dvh-11rem)]">
            <header className="border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {ticket.subject}
                </h1>
                <Badge variant={ticketStatusVariant(ticket.status)} className="capitalize">
                  {humanizeToken(ticket.status)}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono">
                  {ticket.ticketNumber ? `#${ticket.ticketNumber}` : ticket.id.slice(0, 8)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleString()}
                </span>
                <PersonRow person={ticket.requester} fallbackId={ticket.requesterUserId} />
              </div>
            </header>

            <Conversation ticket={ticket} />
            <Composer ticket={ticket} />
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
              <CustomerPanel ticket={ticket} canSeeUsers={canSeeUsers} />
            </div>
            <TicketActions ticket={ticket} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
