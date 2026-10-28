// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserDetailPage from './page';
import { adminService, usersService } from '@/services';

const user = {
  id: 'd55f9f95-d87b-4075-b76c-e3e0f450d004',
  immutableUserId: '82825',
  email: '66montazr@gmail.com',
  nickname: 'Layla Customer',
  avatar: null,
  status: 'active',
  createdAt: '2026-01-02T00:00:00.000Z',
  wallet: { userId: 'd55f9f95-d87b-4075-b76c-e3e0f450d004', gameCurrency: '10' },
};

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '82825' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/hooks', () => ({ useHasPermission: () => () => true }));
vi.mock('@/components/language-context', () => ({ useLanguage: () => ({ t: (key: string) => key, isRTL: false }) }));
vi.mock('@/components/skeletons', () => ({ PageSkeleton: () => <div data-testid="skeleton" /> }));
vi.mock('@/services', () => ({
  usersService: {
    getUserById: vi.fn(),
    getUserRoleDetails: vi.fn(),
    assignRole: vi.fn(),
    revokeRole: vi.fn(),
    adjustBalance: vi.fn(),
    updateStatus: vi.fn(),
  },
  adminService: {
    getRoles: vi.fn(),
    getUserInventory: vi.fn(),
    getUserPurchases: vi.fn(),
    getUserLoadout: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UserDetailPage />
    </QueryClientProvider>,
  );
}

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersService.getUserById).mockResolvedValue(user as never);
    vi.mocked(usersService.getUserRoleDetails).mockResolvedValue([] as never);
    vi.mocked(adminService.getRoles).mockResolvedValue([] as never);
    vi.mocked(adminService.getUserInventory).mockResolvedValue([
      { id: 'inv-1', itemId: 'f13235fa-18b7-44d6-98a4-d18539285266', name: 'Golden Frame', quantity: 3, status: 'active' },
    ] as never);
    vi.mocked(adminService.getUserPurchases).mockResolvedValue([
      { id: 'p-1', itemName: undefined, itemId: 'e619fe3d-3950-43a1-920f-2bcd58e4218b', createdAt: '2026-01-03T00:00:00.000Z' },
    ] as never);
    vi.mocked(adminService.getUserLoadout).mockResolvedValue([{ id: 'l-1', name: 'Crown', slot: 'head' }] as never);
  });

  afterEach(cleanup);

  it('renders the immutable id, not the internal uuid', async () => {
    renderPage();

    expect(await screen.findByText('82825')).toBeDefined();
    expect(
      (usersService.getUserById as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0],
    ).toBe('82825');
  });

  it('shows the resolved catalog name for inventory and loadout', async () => {
    renderPage();

    expect(await screen.findByText('Golden Frame')).toBeDefined();
    expect(await screen.findByText('Crown')).toBeDefined();
  });

  it('falls back instead of printing a raw reference uuid', async () => {
    renderPage();

    expect(await screen.findByText(/Unknown item/)).toBeDefined();
    expect(screen.queryByText('e619fe3d-3950-43a1-920f-2bcd58e4218b')).toBeNull();
  });
});
