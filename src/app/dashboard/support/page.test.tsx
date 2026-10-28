// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getTickets = vi.fn();

vi.mock('@/services', () => ({
  supportService: {
    getTickets: (...args: unknown[]) => getTickets(...args),
    createTicket: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : String(href)} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/language-context', () => ({
  useLanguage: () => ({ t: (key: string) => key, isRTL: false }),
}));

vi.mock('@/store/toast.store', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

import SupportPage from './page';

const ticket = {
  id: '7f3c1a90-11b2-4c8d-9e44-abc123456789',
  ticketNumber: '42',
  requesterUserId: 'user-1',
  subject: 'Payment not credited',
  category: 'billing',
  status: 'open',
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:05:00.000Z',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SupportPage />
    </QueryClientProvider>,
  );
}

describe('support ticket list', () => {
  beforeEach(() => {
    getTickets.mockResolvedValue({ tickets: [ticket], total: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('links each ticket row to its dedicated detail route', async () => {
    renderPage();

    const link = await screen.findByRole('link', { name: /Payment not credited/i });
    expect(link.getAttribute('href')).toBe(`/dashboard/support/${ticket.id}`);
  });

  it('falls back to a short id when the ticket number is missing', async () => {
    getTickets.mockResolvedValue({
      tickets: [{ ...ticket, ticketNumber: null, subject: 'No number ticket' }],
      total: 1,
    });

    renderPage();

    await screen.findByRole('link', { name: /No number ticket/i });
    expect(screen.queryByText('#undefined')).toBeNull();
    expect(screen.getAllByText(`#${ticket.id.slice(0, 8)}`).length).toBeGreaterThan(0);
  });
});
