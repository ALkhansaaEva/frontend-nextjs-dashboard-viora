'use client';

import type { ReactNode } from 'react';
import { AlertCircle, Ban, Loader2, Inbox, WifiOff } from 'lucide-react';

/**
 * Shared Loading / Forbidden / Error / Empty renderer for list surfaces.
 *
 * WHY THIS EXISTS — the Agents page bug this was written for:
 *
 *   const { data: agents = [] } = useQuery({ ... });   // isError never read
 *   ...
 *   agents.length === 0 ? <EmptyState message="No agents yet" /> : <table/>
 *
 * When the request 401s, 403s, times out, or the backend 500s, react-query
 * leaves `data` undefined, the `= []` default kicks in, and the page renders
 * a confident "No agents yet — create the first agent above." An operator
 * cannot tell a genuinely empty catalog from a broken request, a missing
 * permission, or a dead API. Every list page must distinguish them.
 *
 * Diagnostics shown are safe: HTTP status, backend error code, correlation id
 * and the normalized message — never a stack trace.
 */
export interface NormalizedApiError {
  message?: string;
  statusCode?: number;
  code?: string;
  requestId?: string;
}

/** Pulls the api-client's normalizeError shape out of an unknown react-query error. */
export function asApiError(error: unknown): NormalizedApiError {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    return {
      message: typeof e.message === 'string' ? e.message : undefined,
      statusCode: typeof e.statusCode === 'number' ? e.statusCode : undefined,
      code: typeof e.code === 'string' ? e.code : undefined,
      requestId: typeof e.requestId === 'string' ? e.requestId : undefined,
    };
  }
  return { message: typeof error === 'string' ? error : undefined };
}

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  /** False when the caller already knows the user lacks the required permission. */
  allowed?: boolean;
  /** Permission code shown in the forbidden state. */
  requiredPermission?: string;
  isEmpty: boolean;
  emptyMessage: string;
  loadingMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/**
 * Renders exactly one of: forbidden → loading → error → empty → children.
 * Order matters: a permission problem is not a loading problem, and an error
 * is never allowed to fall through to the empty state.
 */
export function QueryState({
  isLoading,
  isError,
  error,
  allowed = true,
  requiredPermission,
  isEmpty,
  emptyMessage,
  loadingMessage = 'Loading…',
  onRetry,
  children,
}: QueryStateProps) {
  if (!allowed) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <Ban className="h-6 w-6 text-gray-400" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Not permitted</p>
        <p className="text-xs text-gray-500">
          {requiredPermission ? (
            <>
              This view requires <code className="font-mono">{requiredPermission}</code>.
            </>
          ) : (
            'You do not have permission to view this data.'
          )}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        {loadingMessage}
      </div>
    );
  }

  if (isError) {
    const e = asApiError(error);
    const isForbidden = e.statusCode === 401 || e.statusCode === 403;
    const isNetwork = e.statusCode === 0;
    const Icon = isNetwork ? WifiOff : isForbidden ? Ban : AlertCircle;
    const heading = isForbidden
      ? 'Not authorized'
      : isNetwork
        ? 'Cannot reach the API'
        : 'Failed to load';

    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <Icon className="h-6 w-6 text-red-500" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{heading}</p>
        {e.message && <p className="max-w-md text-xs text-gray-600 dark:text-gray-300">{e.message}</p>}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-gray-400">
          {e.statusCode !== undefined && e.statusCode > 0 && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">HTTP {e.statusCode}</span>
          )}
          {e.code && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">{e.code}</span>
          )}
          {e.requestId && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">req {e.requestId}</span>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <Inbox className="h-6 w-6 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Standalone error notice for pages whose layout cannot be wrapped wholesale
 * in <QueryState>. Same diagnostics contract: HTTP status, backend code,
 * request id — never a stack trace. Render it INSTEAD of the content when
 * isError is true; never after a `data ?? []` fallback.
 */
export function QueryErrorNotice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const e = asApiError(error);
  const forbidden = e.statusCode === 403;
  const offline = e.statusCode === undefined && !e.message;
  const Icon = forbidden ? Ban : offline ? WifiOff : AlertCircle;
  const heading = forbidden
    ? 'You do not have permission for this data'
    : offline
      ? 'Backend unreachable'
      : 'Request failed';
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      <Icon className="h-6 w-6 text-red-500" />
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{heading}</p>
      {e.message && (
        <p className="max-w-md text-xs text-gray-600 dark:text-gray-300">{e.message}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-gray-400">
        {e.statusCode !== undefined && e.statusCode > 0 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">
            HTTP {e.statusCode}
          </span>
        )}
        {e.code && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">{e.code}</span>
        )}
        {e.requestId && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-800">
            req {e.requestId}
          </span>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default QueryState;
