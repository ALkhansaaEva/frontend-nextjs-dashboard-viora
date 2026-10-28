// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TicketDetail } from '@/services/support.service';
import TicketDetailPage from './page';

const getTicket = vi.fn();
const replyToTicket = vi.fn();
const updateStatus = vi.fn();
const assignTicket = vi.fn();
const addNote = vi.fn();
const escalateTicket = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ticket-1' }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : String(href)} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

vi.mock('@/services/support.service', () => ({
  supportService: {
    getTicket: (...args: unknown[]) => getTicket(...args),
    replyToTicket: (...args: unknown[]) => replyToTicket(...args),
    updateStatus: (...args: unknown[]) => updateStatus(...args),
    assignTicket: (...args: unknown[]) => assignTicket(...args),
    addNote: (...args: unknown[]) => addNote(...args),
    escalateTicket: (...args: unknown[]) => escalateTicket(...args),
  },
}));

vi.mock('@/app/dashboard/support/useTicketEvents', () => ({
  useTicketEvents: () => 'offline',
}));

vi.mock('@/hooks/usePermissions', () => ({
  useHasPermission: () => () => true,
}));

vi.mock('@/store/toast.store', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('@/shared/components/ui/UserSelector', () => ({
  UserSelector: () => <div data-testid="user-selector" />,
}));

const ticket: TicketDetail = {
  id: 'ticket-1',
  ticketNumber: '42',
  subject: 'Payment not credited',
  status: 'open',
  category: 'billing',
  requesterUserId: 'user-1',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:05:00.000Z',
  requester: {
    id: 'user-1',
    immutableUserId: '000123',
    username: 'Layla Customer',
    avatarUrl: null,
    level: 12,
  },
  messages: [
    {
      id: 'm1',
      ticketId: 'ticket-1',
      senderUserId: 'user-1',
      message: 'My payment did not arrive',
      isInternal: false,
      createdAt: '2026-10-01T10:00:00.000Z',
      sender: { id: 'user-1', username: 'Layla Customer', avatarUrl: null },
    },
    {
      id: 'm2',
      ticketId: 'ticket-1',
      senderUserId: 'agent-1',
      message: 'Checking it now',
      isInternal: false,
      createdAt: '2026-10-01T10:03:00.000Z',
      sender: { id: 'agent-1', username: 'Agent Sam', avatarUrl: null },
    },
  ],
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TicketDetailPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  // jsdom has no layout engine, so the browser-only scroll API is stubbed.
  Element.prototype.scrollIntoView = vi.fn();
  getTicket.mockResolvedValue(ticket);
});

describe('ticket detail page', () => {
  it('renders metadata, the customer and the conversation in order', async () => {
    renderPage();

    expect(await screen.findByText('Payment not credited')).toBeTruthy();
    expect(screen.getAllByText('#42').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Layla Customer').length).toBeGreaterThan(0);
    // Avatar fallback for a customer with no picture.
    expect(screen.getAllByText('LC').length).toBeGreaterThan(0);

    const bodies = screen
      .getAllByText(/My payment did not arrive|Checking it now/)
      .map((node) => node.textContent);
    expect(bodies).toEqual(['My payment did not arrive', 'Checking it now']);
    expect(getTicket).toHaveBeenCalledWith('ticket-1');
  });

  it('sends a reply to this ticket and clears the composer on success', async () => {
    replyToTicket.mockResolvedValue({ ok: true });
    renderPage();
    await screen.findByText('Payment not credited');

    const composer = screen.getByPlaceholderText(/Write a reply/) as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: 'Thanks, fixed now' } });
    fireEvent.click(screen.getByLabelText('Send reply'));

    await waitFor(() =>
      expect(replyToTicket).toHaveBeenCalledWith('ticket-1', 'Thanks, fixed now'),
    );
  });

  it('keeps the draft when the reply fails', async () => {
    replyToTicket.mockRejectedValue(new Error('network down'));
    renderPage();
    await screen.findByText('Payment not credited');

    const composer = screen.getByPlaceholderText(/Write a reply/) as HTMLTextAreaElement;
    fireEvent.change(composer, { target: { value: 'Please retry me' } });
    fireEvent.click(screen.getByLabelText('Send reply'));

    await waitFor(() => expect(replyToTicket).toHaveBeenCalled());
    await waitFor(() => expect(composer.value).toBe('Please retry me'));
  });

  it('shows a not-found state for a missing ticket', async () => {
    getTicket.mockRejectedValue(
      Object.assign(new Error('Ticket not found'), { statusCode: 404 }),
    );
    renderPage();

    expect(await screen.findByText('Ticket not found')).toBeTruthy();
  });

  it('shows an empty conversation state when a ticket has no messages', async () => {
    getTicket.mockResolvedValue({ ...ticket, messages: [] });
    renderPage();

    expect(await screen.findByText('No messages yet')).toBeTruthy();
  });
});
