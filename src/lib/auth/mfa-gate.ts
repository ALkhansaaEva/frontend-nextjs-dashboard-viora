/**
 * MFA step-up signal.
 *
 * The backend gates admin-scoped permissions on an `aal2` session and answers
 * `403 AUTH_FORBIDDEN` with "MFA verification required" for an `aal1` token.
 * The API client cannot open UI itself, so it publishes this signal and the
 * global `MfaGate` performs the real factor challenge.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function isMfaRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    message?: unknown;
    response?: { status?: number; data?: unknown };
    statusCode?: number;
  };
  const body = candidate.response?.data;
  const bodyMessage =
    body && typeof body === 'object'
      ? (body as { message?: unknown }).message ??
        ((body as { error?: { message?: unknown } }).error?.message)
      : undefined;
  const status = candidate.statusCode ?? candidate.response?.status;
  const message =
    typeof bodyMessage === 'string'
      ? bodyMessage
      : typeof candidate.message === 'string'
        ? candidate.message
        : '';
  return status === 403 && message.toLowerCase().includes('mfa verification required');
}

export function requestMfaStepUp(): void {
  for (const listener of listeners) listener();
}

export function onMfaStepUp(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
