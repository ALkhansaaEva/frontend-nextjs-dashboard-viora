export interface AuthSessionEnvelope {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export function readAuthSessionEnvelope(body: unknown): AuthSessionEnvelope | null {
  if (!body || typeof body !== 'object') return null;
  const envelope = body as { data?: unknown };
  const value =
    envelope.data && typeof envelope.data === 'object'
      ? envelope.data
      : body;
  const holder = value as { session?: unknown };
  const session = (
    holder.session && typeof holder.session === 'object' ? holder.session : value
  ) as {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresIn?: unknown;
  };
  if (typeof session.accessToken !== 'string' || !session.accessToken) {
    return null;
  }

  const expiresIn = Number(session.expiresIn);
  return {
    accessToken: session.accessToken,
    refreshToken:
      typeof session.refreshToken === 'string' && session.refreshToken
        ? session.refreshToken
        : undefined,
    expiresIn:
      Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
  };
}
