import type { TicketStatus } from '@/dto/support/support.dto';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const STATUS_VARIANTS: Record<TicketStatus, BadgeVariant> = {
  open: 'warning',
  in_progress: 'info',
  waiting_on_user: 'danger',
  resolved: 'success',
  closed: 'default',
};

/** One status colour for every surface that renders a ticket. */
export function ticketStatusVariant(status: string): BadgeVariant {
  return STATUS_VARIANTS[status as TicketStatus] ?? 'default';
}
