'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api/api-client';
import { authService } from '@/services/auth.service';
import { useHasPermission } from '@/hooks/usePermissions';

type Json = Record<string, unknown>;

function unwrap(value: unknown): Json {
  if (value && typeof value === 'object' && 'data' in value && (value as Json).data) {
    return (value as Json).data as Json;
  }
  return (value ?? {}) as Json;
}

function errorMessage(error: unknown): string {
  const anyError = error as {
    response?: { data?: { message?: string; errors?: unknown } };
    message?: string;
  };
  const data = anyError?.response?.data;
  const detail = Array.isArray(data?.errors) ? ` (${data.errors.join('; ')})` : '';
  return `${data?.message || anyError?.message || 'Request failed'}${detail}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-200">{children}</div>
    </section>
  );
}

const PROVIDER_SECRET_FIELDS = ['clientSecret', 'privateKey', 'authToken'] as const;

type ProviderRevision = {
  id: string;
  revision: number;
  status: string;
  secretSet?: boolean;
  reason?: string | null;
  lastError?: string | null;
  createdAt?: string;
};

/**
 * OAuth provider control plane (`/admin/auth-providers`).
 *
 * The backend stages revisions; it does NOT activate them synchronously. A
 * STAGED revision is therefore rendered as staged, never as active, and the
 * coordinator requirement is stated instead of implied.
 */
function ProviderPanel({ providers }: { providers: Json[] }) {
  const canWrite = useHasPermission()('admin.write');
  const [openProvider, setOpenProvider] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<Record<string, ProviderRevision[]>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [configText, setConfigText] = useState('');
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async (provider: string) => {
    const data = unwrap(await apiClient.get(`/admin/auth-providers/${provider}/revisions`));
    const rows = Array.isArray(data.revisions) ? (data.revisions as ProviderRevision[]) : [];
    setRevisions((prev) => ({ ...prev, [provider]: rows }));
    return rows;
  }, []);

  async function showRevisions(provider: string) {
    setBusy(true);
    setNotice(null);
    try {
      await refresh(provider);
      setOpenProvider((current) => (current === provider ? null : provider));
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(provider: string) {
    setEditing(provider);
    setConfigText('');
    // Secrets are never loaded back from the server: the API only reports
    // `secretSet`, so the inputs always start empty.
    setSecrets({});
    setReason('');
    setNotice(null);
  }

  async function submit(provider: string, mode: 'validate' | 'stage') {
    let config: Record<string, unknown> = {};
    if (configText.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(configText);
      } catch {
        setNotice({ kind: 'error', text: 'Configuration must be valid JSON.' });
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setNotice({ kind: 'error', text: 'Configuration must be a JSON object.' });
        return;
      }
      config = parsed as Record<string, unknown>;
    }
    const suppliedSecrets = Object.fromEntries(
      Object.entries(secrets).filter(([, value]) => value.length > 0),
    );

    setBusy(true);
    setNotice(null);
    try {
      const body = {
        config,
        ...(Object.keys(suppliedSecrets).length ? { secrets: suppliedSecrets } : {}),
        ...(reason ? { reason } : {}),
      };
      const data = unwrap(
        mode === 'validate'
          ? await apiClient.post(`/admin/auth-providers/${provider}/validate`, body)
          : await apiClient.post(`/admin/auth-providers/${provider}/stage`, body),
      );
      if (mode === 'validate') {
        setNotice({ kind: 'ok', text: `Configuration validated (${String(data.status ?? 'VALIDATED')}).` });
      } else {
        setNotice({
          kind: 'ok',
          text: `Revision ${String(data.revision ?? '?')} is ${String(data.status ?? 'STAGED')}. Staged is not active — the Auth-service coordinator must apply it.`,
        });
        setEditing(null);
        setSecrets({});
        await refresh(provider);
        setOpenProvider(provider);
      }
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function rollback(provider: string) {
    if (!window.confirm(`Stage a rollback of ${provider} to its last applied revision?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const data = unwrap(
        await apiClient.post(`/admin/auth-providers/${provider}/rollback`, {
          ...(reason ? { reason } : {}),
        }),
      );
      setNotice({
        kind: 'ok',
        text: `Rollback revision ${String(data.revision ?? '?')} staged (${String(data.status ?? 'STAGED')}); it is not active until the coordinator applies it.`,
      });
      await refresh(provider);
      setOpenProvider(provider);
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function retry(provider: string, id: string) {
    setBusy(true);
    setNotice(null);
    try {
      await apiClient.post(`/admin/auth-providers/revisions/${id}/retry`);
      setNotice({ kind: 'ok', text: 'Revision re-queued as STAGED.' });
      await refresh(provider);
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p className={notice.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}>{notice.text}</p>
      )}
      {providers.map((provider) => {
        const id = String(provider.id);
        const rows = revisions[id] ?? [];
        return (
          <div key={id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{String(provider.displayName ?? id)}</span>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono text-slate-500">
                  {String(provider.kind)} · {String(provider.strategy)}
                </span>
                <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => void showRevisions(id)}>
                  History
                </button>
                {canWrite && (
                  <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => startEdit(id)}>
                    Stage
                  </button>
                )}
                {canWrite && (
                  <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => void rollback(id)}>
                    Rollback
                  </button>
                )}
              </div>
            </div>

            {openProvider === id && (
              <div className="mt-3 space-y-1 text-xs">
                {rows.length === 0 ? (
                  <p className="text-slate-500">No revisions recorded.</p>
                ) : (
                  rows.map((revision) => (
                    <div key={revision.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-1 dark:border-slate-800">
                      <span>
                        #{revision.revision} · {revision.status} · secret {revision.secretSet ? 'set' : 'not set'}
                        {revision.lastError ? ` · ${revision.lastError}` : ''}
                      </span>
                      {canWrite && ['FAILED', 'ROLLED_BACK'].includes(revision.status) && (
                        <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => void retry(id, revision.id)}>
                          Retry
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {editing === id && (
              <div className="mt-3 space-y-2 text-xs">
                <textarea
                  className="h-32 w-full rounded border border-slate-300 bg-transparent p-2 font-mono dark:border-slate-600"
                  placeholder='{"clientId":"…"}'
                  value={configText}
                  onChange={(event) => setConfigText(event.target.value)}
                />
                {PROVIDER_SECRET_FIELDS.map((field) => (
                  <input
                    key={field}
                    type="password"
                    autoComplete="off"
                    className="w-full rounded border border-slate-300 bg-transparent p-2 font-mono dark:border-slate-600"
                    placeholder={`${field} (leave empty to keep the stored value)`}
                    value={secrets[field] ?? ''}
                    onChange={(event) => setSecrets((prev) => ({ ...prev, [field]: event.target.value }))}
                  />
                ))}
                <input
                  className="w-full rounded border border-slate-300 bg-transparent p-2 dark:border-slate-600"
                  placeholder="Reason (recorded in the audit log)"
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="flex gap-3">
                  <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => void submit(id, 'validate')}>
                    Validate
                  </button>
                  <button type="button" className="underline disabled:opacity-50" disabled={busy} onClick={() => void submit(id, 'stage')}>
                    Stage
                  </button>
                  <button type="button" className="underline" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-slate-500">
        Staging and rollback require admin.write, an MFA (aal2) session, and a configured
        AUTH_PROVIDER_SECRET_KEY for secret-bearing revisions.
      </p>
    </div>
  );
}

export default function SecurityPage() {
  const [factors, setFactors] = useState<Json[]>([]);
  const [enrollment, setEnrollment] = useState<{ factorId: string; secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [devices, setDevices] = useState<Json[]>([]);
  const [deletion, setDeletion] = useState<Json | null>(null);
  const [reason, setReason] = useState('');
  const [providers, setProviders] = useState<Json[]>([]);
  const [providersDenied, setProvidersDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const run = useCallback(async (action: () => Promise<string>) => {
    setBusy(true);
    setNotice(null);
    try {
      setNotice({ kind: 'ok', text: await action() });
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }, []);

  const loadFactors = useCallback(async () => {
    const data = unwrap(await authService.mfaFactors());
    setFactors(Array.isArray(data.totp) ? (data.totp as Json[]) : []);
  }, []);

  const loadDevices = useCallback(async () => {
    const data = unwrap(await authService.listDevices());
    setDevices(Array.isArray(data.devices) ? (data.devices as Json[]) : []);
  }, []);

  const loadDeletion = useCallback(async () => {
    setDeletion(unwrap(await authService.accountDeletionStatus()));
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const data = unwrap(await apiClient.get('/admin/auth-providers'));
      setProviders(Array.isArray(data.providers) ? (data.providers as Json[]) : []);
    } catch {
      setProvidersDenied(true);
    }
  }, []);

  useEffect(() => {
    void loadFactors().catch(() => undefined);
    void loadDevices().catch(() => undefined);
    void loadDeletion().catch(() => undefined);
    void loadProviders();
  }, [loadFactors, loadDevices, loadDeletion, loadProviders]);

  async function enroll() {
    await run(async () => {
      const data = unwrap(await authService.enrollMFA());
      const totp = (data.totp ?? {}) as Json;
      setEnrollment({
        factorId: String(data.id ?? ''),
        secret: String(totp.secret ?? data.secret ?? ''),
        qr: String(totp.qr_code ?? data.qrCode ?? ''),
      });
      return 'Scan the QR code, then enter the 6-digit code to finish enrollment.';
    });
  }

  async function confirmEnrollment() {
    await run(async () => {
      if (!enrollment) throw new Error('Start enrollment first');
      await authService.mfaVerifyEnable(enrollment.factorId, code.trim());
      setEnrollment(null);
      setCode('');
      await loadFactors();
      return 'MFA enabled. The current session must satisfy aal2 before privileged actions.';
    });
  }

  async function disable(factorId: string) {
    if (!window.confirm('Remove this authenticator factor? Privileged actions will require re-enrollment.')) return;
    await run(async () => {
      await authService.mfaDisable(factorId);
      await loadFactors();
      return 'Authenticator removed.';
    });
  }

  async function registerDevice() {
    await run(async () => {
      await authService.registerDevice({
        platform: 'web',
        devicePublicId: crypto.randomUUID(),
        appVersion: 'dashboard',
      });
      await loadDevices();
      return 'Device registered.';
    });
  }

  async function revokeDevice(deviceId: string) {
    if (!window.confirm('Revoke this device? Its realtime session is closed immediately.')) return;
    await run(async () => {
      await authService.revokeDevice(deviceId);
      await loadDevices();
      return 'Device revoked.';
    });
  }

  async function requestDeletion() {
    if (!window.confirm('Schedule account deletion? You will have the grace period to cancel.')) return;
    await run(async () => {
      await authService.requestAccountDeletion(reason.trim() || undefined);
      setReason('');
      await loadDeletion();
      return 'Deletion scheduled. All devices were signed out.';
    });
  }

  async function cancelDeletion() {
    await run(async () => {
      await authService.cancelAccountDeletion();
      await loadDeletion();
      return 'Deletion cancelled.';
    });
  }

  const deletionStatus = String(deletion?.status ?? 'none');
  const pending = deletionStatus === 'pending';

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-800 dark:text-slate-100">
      <h1 className="text-2xl font-semibold">Security settings</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        These controls call the live backend. Nothing is shown as successful until the server confirms it.
      </p>

      {notice && (
        <p
          className={`mt-4 rounded-lg border p-3 text-sm ${
            notice.kind === 'ok'
              ? 'border-emerald-300 text-emerald-800 dark:border-emerald-700 dark:text-emerald-200'
              : 'border-red-300 text-red-800 dark:border-red-700 dark:text-red-200'
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-6 grid gap-6">
        <Card title="Multi-factor authentication">
          <p className="text-slate-600 dark:text-slate-300">
            Authenticator factors: {factors.length === 0 ? 'none' : factors.map((f) => String(f.friendly_name ?? f.id)).join(', ')}
          </p>
          {enrollment ? (
            <div className="space-y-3">
              {enrollment.qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={enrollment.qr} alt="Authenticator QR code" className="h-40 w-40 rounded bg-white p-2" />
              )}
              <p className="break-all font-mono text-xs">{enrollment.secret}</p>
              <div className="flex gap-2">
                <input
                  className="w-40 rounded border border-slate-300 bg-transparent px-3 py-2 font-mono dark:border-slate-600"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                />
                <button
                  className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                  disabled={busy || code.length !== 6}
                  onClick={confirmEnrollment}
                >
                  Verify and enable
                </button>
                <button className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600" onClick={() => setEnrollment(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
              disabled={busy}
              onClick={enroll}
            >
              Add authenticator
            </button>
          )}
          {factors.map((factor) => (
            <div key={String(factor.id)} className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs">{String(factor.id)}</span>
              <button className="text-red-600 underline disabled:opacity-50" disabled={busy} onClick={() => disable(String(factor.id))}>
                Remove
              </button>
            </div>
          ))}
        </Card>

        <Card title="Connected devices">
          <button
            className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-600"
            disabled={busy}
            onClick={registerDevice}
          >
            Register this browser
          </button>
          {devices.length === 0 && <p className="text-slate-500">No active devices.</p>}
          {devices.map((device) => (
            <div key={String(device.id)} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {String(device.platform ?? 'device')} · {String(device.model ?? 'unknown model')}
                </p>
                <p className="font-mono text-xs text-slate-500">{String(device.devicePublicId ?? device.id)}</p>
              </div>
              <button className="text-red-600 underline disabled:opacity-50" disabled={busy} onClick={() => revokeDevice(String(device.id))}>
                Revoke
              </button>
            </div>
          ))}
        </Card>

        <Card title="Account deletion">
          <p>
            Status: <strong>{deletionStatus}</strong>
            {deletion?.scheduledFor ? ` · scheduled for ${String(deletion.scheduledFor)}` : ''}
          </p>
          {pending ? (
            <button className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50 dark:border-slate-600" disabled={busy} onClick={cancelDeletion}>
              Cancel deletion
            </button>
          ) : (
            <div className="space-y-2">
              <input
                className="w-full rounded border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600"
                placeholder="Reason (optional, max 200 characters)"
                maxLength={200}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <button className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-50" disabled={busy} onClick={requestDeletion}>
                Request account deletion
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Read the <a className="underline" href="/account-deletion">account deletion policy</a> before requesting.
          </p>
        </Card>

        <Card title="Authentication providers">
          {providersDenied ? (
            <p className="text-slate-500">Requires admin.read permission.</p>
          ) : providers.length === 0 ? (
            <p className="text-slate-500">No provider status available.</p>
          ) : (
            <ProviderPanel providers={providers} />
          )}
        </Card>
      </div>
    </main>
  );
}
