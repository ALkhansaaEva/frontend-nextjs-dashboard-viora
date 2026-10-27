// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryState, QueryErrorNotice } from '@/shared/components/ui/QueryState';

afterEach(() => cleanup());

describe('QueryState', () => {
  it('renders loading before anything else', () => {
    render(
      <QueryState isLoading isError={false} isEmpty={false} emptyMessage="empty">
        <div>content</div>
      </QueryState>,
    );
    expect(screen.queryByText('content')).toBeNull();
  });

  it('renders forbidden when not allowed', () => {
    render(
      <QueryState isLoading={false} isError={false} allowed={false} isEmpty emptyMessage="empty">
        <div>content</div>
      </QueryState>,
    );
    expect(screen.getByText(/not permitted/i)).toBeDefined();
    expect(screen.queryByText('content')).toBeNull();
  });

  it('never falls through to empty state when the request failed', () => {
    render(
      <QueryState
        isLoading={false}
        isError
        error={{ message: 'boom', statusCode: 500 }}
        isEmpty
        emptyMessage="No agents yet"
      >
        <div>content</div>
      </QueryState>,
    );
    expect(screen.queryByText('No agents yet')).toBeNull();
    expect(screen.getByText(/failed to load/i)).toBeDefined();
    expect(screen.getByText('HTTP 500')).toBeDefined();
  });

  it('renders empty state only on genuine success-with-no-rows', () => {
    render(
      <QueryState isLoading={false} isError={false} isEmpty emptyMessage="No agents yet">
        <div>content</div>
      </QueryState>,
    );
    expect(screen.getByText('No agents yet')).toBeDefined();
  });

  it('renders children on success with rows', () => {
    render(
      <QueryState isLoading={false} isError={false} isEmpty={false} emptyMessage="empty">
        <div>content</div>
      </QueryState>,
    );
    expect(screen.getByText('content')).toBeDefined();
  });
});

describe('QueryErrorNotice', () => {
  it('shows 403 as forbidden without wiping anything', () => {
    render(<QueryErrorNotice error={{ statusCode: 403, message: 'denied' }} />);
    expect(screen.getByText(/permission for this data/i)).toBeDefined();
  });
});
