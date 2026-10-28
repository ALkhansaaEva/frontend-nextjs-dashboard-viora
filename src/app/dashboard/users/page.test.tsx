// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import UsersPage from './page';
import { usersService } from '@/services';

const mockUseUsers = vi.fn();

vi.mock('@/hooks', () => ({ useUsers: (params: unknown) => mockUseUsers(params) }));
vi.mock('@/services', () => ({ usersService: { getUserRoles: vi.fn() } }));
vi.mock('@/components/language-context', () => ({ useLanguage: () => ({ t: (key: string) => key, isRTL: false }) }));
vi.mock('@/components/skeletons', () => ({ TableSkeleton: () => <div data-testid="skeleton" /> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUsers.mockReturnValue({
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      data: {
        data: [
          {
            id: 'd55f9f95-d87b-4075-b76c-e3e0f450d004',
            immutableUserId: '82825',
            email: '66montazr@gmail.com',
            nickname: 'Layla Customer',
            avatar: null,
            status: 'active',
            createdAt: '2026-01-02T00:00:00.000Z',
            roles: [{ code: 'player', name: 'Player' }],
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  afterEach(cleanup);

  it('renders role summaries by their human name instead of the raw object', () => {
    render(<UsersPage />);

    expect(screen.getByText('Player')).toBeDefined();
  });

  it('does not request roles per row', () => {
    render(<UsersPage />);

    expect(usersService.getUserRoles).not.toHaveBeenCalled();
  });

  it('shows initials when the user has no avatar', () => {
    render(<UsersPage />);

    expect(screen.getByText('LC')).toBeDefined();
  });

  it('shows the immutable id next to the display name', () => {
    render(<UsersPage />);

    expect(screen.getByText('#82825')).toBeDefined();
  });
});
