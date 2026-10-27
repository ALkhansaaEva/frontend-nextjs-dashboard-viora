'use client';

import { useState } from 'react';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Activity, Database, Server, RotateCcw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import { humanizeToken } from '@/shared/lib/labels';
import healthService from '@/services/health.service';

function bytesToMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

/**
 * System Health — /health/ready + /health/system (modules/common/controllers/
 * health.controller.ts), both admin.read. reset-circuits is admin.write and
 * genuinely mutates production circuit-breaker state (Supabase/Redis/DB/
 * Firebase) — gated behind an explicit confirm modal, not a plain button.
 * A failed /health/ready or /health/system call renders N/A per-field, never
 * a fabricated "down"/"0" — see healthService doc comments.
 */
export default function SystemHealthPage() {
  const toast = useToast();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('admin.read');
  const canReset = hasPermission('admin.write');

  const { data: ready, isLoading: readyLoading, dataUpdatedAt, isError: readyIsError, error: readyError, refetch: readyRefetch } = useQuery({
    queryKey: ['health-ready'],
    queryFn: () => healthService.getReady(),
    enabled: canRead,
    refetchInterval: 30_000,
  });

  const { data: system, isLoading: systemLoading, isError: systemIsError, error: systemError, refetch: systemRefetch } = useQuery({
    queryKey: ['health-system'],
    queryFn: () => healthService.getSystemMetrics(),
    enabled: canRead,
    refetchInterval: 30_000,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const resetMutation = useMutation({
    mutationFn: () => healthService.resetCircuits(),
    onSuccess: (r) => { toast.success(r.message || 'Circuit breakers reset.'); setShowConfirm(false); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Reset failed.'),
  });

  return (
    <div className="space-y-6">
      {(readyIsError || systemIsError) && (
        <QueryErrorNotice error={readyError ?? systemError} onRetry={() => { readyRefetch(); systemRefetch(); }} />
      )}
      <PageHeader
        title="System Health"
        description="Live readiness and system metrics from the backend's /health endpoints."
        icon={<Activity className="w-5 h-5" />}
        action={canReset ? { label: 'Reset circuit breakers', onClick: () => setShowConfirm(true), icon: <RotateCcw className="w-4 h-4" /> } : undefined}
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>admin.read</code>.
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="p-4 pb-0 flex items-center justify-between">
              <CardTitle className="text-sm font-bold">Readiness</CardTitle>
              {dataUpdatedAt > 0 && <span className="text-xs text-gray-400">Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>}
            </CardHeader>
            <CardContent className="p-4">
              {readyLoading ? (
                <p className="text-sm text-gray-400">Checking…</p>
              ) : !ready ? (
                <p className="text-sm text-gray-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> N/A — readiness check failed or unreachable.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant={ready.status === 'ok' ? 'success' : 'danger'} className="text-sm">
                    {ready.status === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> : <XCircle className="w-3.5 h-3.5 mr-1 inline" />}
                    Overall: {humanizeToken(ready.status)}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-sm"><Database className="w-4 h-4" /> Database: <Badge variant={ready.checks.database === 'up' ? 'success' : 'danger'}>{humanizeToken(ready.checks.database)}</Badge></span>
                  <span className="flex items-center gap-1.5 text-sm"><Server className="w-4 h-4" /> Redis: <Badge variant={ready.checks.redis === 'up' ? 'success' : 'danger'}>{humanizeToken(ready.checks.redis)}</Badge></span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-bold">Process</CardTitle></CardHeader>
              <CardContent className="p-4">
                {systemLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : !system ? (
                  <p className="text-sm text-gray-400">N/A — system metrics unreachable.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Uptime</dt><dd className="text-right font-mono">{formatUptime(system.uptime)}</dd>
                    <dt className="text-gray-500">Heap used</dt><dd className="text-right font-mono">{bytesToMb(system.memory.heapUsed)} MB</dd>
                    <dt className="text-gray-500">Heap total</dt><dd className="text-right font-mono">{bytesToMb(system.memory.heapTotal)} MB</dd>
                    <dt className="text-gray-500">RSS</dt><dd className="text-right font-mono">{bytesToMb(system.memory.rss)} MB</dd>
                    <dt className="text-gray-500">External</dt><dd className="text-right font-mono">{bytesToMb(system.memory.external)} MB</dd>
                  </dl>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-bold">Redis</CardTitle></CardHeader>
              <CardContent className="p-4">
                {systemLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : !system ? (
                  <p className="text-sm text-gray-400">N/A — system metrics unreachable.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Connected</dt><dd className="text-right"><Badge variant={system.redis.connected ? 'success' : 'danger'}>{String(system.redis.connected)}</Badge></dd>
                    <dt className="text-gray-500">Enabled</dt><dd className="text-right"><Badge variant={system.redis.enabled ? 'success' : 'default'}>{String(system.redis.enabled)}</Badge></dd>
                    <dt className="text-gray-500">Consecutive failures</dt><dd className="text-right font-mono">{system.redis.consecutiveFailures}</dd>
                    <dt className="text-gray-500">Last ping</dt><dd className="text-right font-mono">{system.redis.lastPingMs != null ? `${system.redis.lastPingMs} ms` : 'N/A'}</dd>
                  </dl>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-bold">RBAC permission cache</CardTitle></CardHeader>
              <CardContent className="p-4">
                {systemLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : !system ? (
                  <p className="text-sm text-gray-400">N/A — system metrics unreachable.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Hit rate</dt><dd className="text-right font-mono">{(system.rbac.cacheHitRate * 100).toFixed(1)}%</dd>
                    <dt className="text-gray-500">Miss rate</dt><dd className="text-right font-mono">{(system.rbac.cacheMissRate * 100).toFixed(1)}%</dd>
                    <dt className="text-gray-500">Total hits</dt><dd className="text-right font-mono">{system.rbac.totalHits}</dd>
                    <dt className="text-gray-500">Total misses</dt><dd className="text-right font-mono">{system.rbac.totalMisses}</dd>
                  </dl>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-bold">WebSocket pub/sub</CardTitle></CardHeader>
              <CardContent className="p-4">
                {systemLoading ? (
                  <p className="text-sm text-gray-400">Loading…</p>
                ) : !system ? (
                  <p className="text-sm text-gray-400">N/A — system metrics unreachable.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Registered users</dt><dd className="text-right font-mono">{system.pubsub.registeredUsers}</dd>
                    <dt className="text-gray-500">Registered games</dt><dd className="text-right font-mono">{system.pubsub.registeredGames}</dd>
                    <dt className="text-gray-500">Registered rooms</dt><dd className="text-right font-mono">{system.pubsub.registeredRooms}</dd>
                    <dt className="text-gray-500">Redis-backed</dt><dd className="text-right"><Badge variant={system.pubsub.isRedisEnabled ? 'success' : 'default'}>{String(system.pubsub.isRedisEnabled)}</Badge></dd>
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Reset circuit breakers?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This immediately trips the Supabase, Redis, Database, and Firebase circuit breakers back closed
            in the running backend process. Only do this if you understand why a breaker is currently open.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button variant="danger" disabled={resetMutation.isPending} onClick={() => resetMutation.mutate()}>
              {resetMutation.isPending ? 'Resetting…' : 'Reset now'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
