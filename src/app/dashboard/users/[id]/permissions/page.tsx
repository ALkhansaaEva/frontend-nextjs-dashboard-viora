'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Key, ShieldX, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { adminService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks';

interface PermissionOverride {
  permissionCode: string;
  type: 'grant' | 'revoke';
  reason?: string;
  createdAt: string;
  createdBy: string;
}

export default function UserPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const checkPermission = useHasPermission();
  const canManageOverrides = checkPermission('manage_permissions');

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [permissionCode, setPermissionCode] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: effectivePermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['user-effective-permissions', userId],
    queryFn: () => adminService.getUserEffectivePermissions(userId),
    staleTime: 15000,
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ['user-permission-overrides', userId],
    queryFn: () => adminService.getUserPermissionOverrides(userId),
    staleTime: 15000,
  });

  const grantMutation = useMutation({
    mutationFn: () => adminService.grantPermissionOverride(userId, permissionCode, overrideReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides', userId] });
      setShowGrantModal(false);
      setPermissionCode('');
      setOverrideReason('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => adminService.revokePermissionOverride(userId, permissionCode, overrideReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides', userId] });
      setShowRevokeModal(false);
      setPermissionCode('');
      setOverrideReason('');
    },
  });

  const removeOverrideMutation = useMutation({
    mutationFn: (permCode: string) => adminService.removePermissionOverride(userId, permCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-permission-overrides', userId] });
      setDeleteTarget(null);
    },
  });

  if (permsLoading || overridesLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push(`/dashboard/users/${userId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('permissions')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              {t('effectivePermissions') || 'Effective Permissions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {effectivePermissions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('noData')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {effectivePermissions.map((perm: string) => (
                  <Badge key={perm} variant="outline" className="font-mono text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                {t('overrides') || 'Permission Overrides'}
              </span>
              {canManageOverrides && (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => setShowGrantModal(true)}>
                    <Plus className="w-3 h-3 mr-1" /> {t('grant') || 'Grant'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setShowRevokeModal(true)}>
                    <ShieldX className="w-3 h-3 mr-1" /> {t('revoke') || 'Revoke'}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overrides.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">{t('noData')}</p>
            ) : (
              <div className="space-y-2">
                {overrides.map((ov: PermissionOverride) => (
                  <div
                    key={`${ov.permissionCode}-${ov.type}`}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={ov.type === 'grant' ? 'success' : 'danger'}>
                        {ov.type === 'grant' ? '+' : '-'}
                      </Badge>
                      <div>
                        <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{ov.permissionCode}</p>
                        {ov.reason && <p className="text-xs text-gray-500">{ov.reason}</p>}
                        <p className="text-xs text-gray-400">{new Date(ov.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {canManageOverrides && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(ov.permissionCode)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showGrantModal} onClose={() => setShowGrantModal(false)} title={t('grantPermission') || 'Grant Permission'}>
        <div className="space-y-4">
          <Input
            placeholder="permission_code"
            value={permissionCode}
            onChange={(e) => setPermissionCode(e.target.value)}
            className="w-full font-mono"
          />
          <Input
            placeholder={t('reason') || 'Reason (optional)'}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGrantModal(false)}>{t('cancel')}</Button>
            <Button onClick={() => grantMutation.mutate()} disabled={!permissionCode}>
              {t('confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRevokeModal} onClose={() => setShowRevokeModal(false)} title={t('revokePermission') || 'Revoke Permission'}>
        <div className="space-y-4">
          <Input
            placeholder="permission_code"
            value={permissionCode}
            onChange={(e) => setPermissionCode(e.target.value)}
            className="w-full font-mono"
          />
          <Input
            placeholder={t('reason') || 'Reason (optional)'}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="w-full"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRevokeModal(false)}>{t('cancel')}</Button>
            <Button onClick={() => revokeMutation.mutate()} disabled={!permissionCode} variant="danger">
              {t('confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('removeOverride') || 'Remove Override'}
        message={`Remove override for "${deleteTarget}"?`}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => { if (deleteTarget) removeOverrideMutation.mutate(deleteTarget); }}
      />
    </div>
  );
}
