'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { ArrowLeft, Shield, Coins, Key, Ban, MicOff, Package, ShoppingCart, Backpack, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { usersService, adminService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks';

const statusColors: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  suspended: 'warning',
  banned: 'danger',
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const hasPermission = useHasPermission();
  const canManageRoles = hasPermission('manage_roles');
  const canAdjustBalance = hasPermission('adjust_balance');
  const canBanUser = hasPermission('global_ban');
  const canMuteUser = hasPermission('global_mute');
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [confirmRevokeRole, setConfirmRevokeRole] = useState<string | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState<'gold' | 'gems'>('gold');
  const [selectedRole, setSelectedRole] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersService.getUserById(userId),
    staleTime: 30000,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => usersService.getUserRoleDetails(userId),
    staleTime: 30000,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['all-roles'],
    queryFn: () => adminService.getRoles(),
    staleTime: 60000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['user-inventory', userId],
    queryFn: () => adminService.getUserInventory(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['user-purchases', userId],
    queryFn: () => adminService.getUserPurchases(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  const { data: loadout = [] } = useQuery({
    queryKey: ['user-loadout', userId],
    queryFn: () => adminService.getUserLoadout(userId),
    enabled: !!userId,
    staleTime: 30000,
  });

  const derivedPermissions = useMemo(() => {
    const perms = new Set<string>();
    userRoles.forEach((role: any) => {
      (role.permissions || []).forEach((p: string) => {
        if (p === '*') perms.add('*');
        else perms.add(p);
      });
    });
    return Array.from(perms);
  }, [userRoles]);

  const assignRoleMutation = useMutation({
    mutationFn: (roleCode: string) => usersService.assignRole(userId, roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      setShowRoleModal(false);
      setSelectedRole('');
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: (roleCode: string) => usersService.revokeRole(userId, roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    },
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: () => usersService.adjustBalance(userId, {
      currency: balanceCurrency === 'gold' ? 'gold' : 'gems',
      amount: balanceAmount.toString(),
      action: balanceAction,
      reason: 'Admin adjustment',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      setShowBalanceModal(false);
      setBalanceAmount('');
    },
  });

  const handleAssignRole = () => {
    if (selectedRole) assignRoleMutation.mutate(selectedRole);
  };

  const handleRevokeRole = (roleCode: string) => {
    revokeRoleMutation.mutate(roleCode);
  };

  const handleAdjustBalance = () => {
    const amount = parseInt(balanceAmount);
    if (amount && amount > 0) adjustBalanceMutation.mutate();
  };

  const availableRoles = allRoles.filter(
    (r) => !userRoles.some((ur) => ur.code === r.code)
  );

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600 dark:text-gray-400">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/users')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('details')}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
{user.avatar ? (
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <Image src={user.avatar} alt={user.nickname || 'User'} width={64} height={64} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{(user.nickname || 'U')[0]?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{user.nickname || 'Unknown'}</p>
                <Badge variant={statusColors[user.status] || 'default'}>{t(user.status)}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('email')}</p>
              <p className="text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ID</p>
              <p className="text-gray-900 dark:text-white font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('createdAt')}</p>
              <p className="text-gray-900 dark:text-white">{(() => { const d = new Date(user.createdAt); return isNaN(d.getTime()) ? '—' : d.toLocaleString(); })()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('roles')}
              </span>
              {canManageRoles && (
                <Button size="sm" onClick={() => setShowRoleModal(true)}>{t('assign')}</Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userRoles.map((role) => (
                <div key={role.code} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{role.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{role.description}</p>
                  </div>
                  {canManageRoles && (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmRevokeRole(role.code)}>
                      {t('remove')}
                    </Button>
                  )}
                </div>
              ))}
              {userRoles.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">{t('noData')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {derivedPermissions.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t('permissions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {derivedPermissions.map((perm) => (
                  <Badge key={perm} variant="outline" className="font-mono text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {canAdjustBalance && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Wallet
                </span>
                <Button size="sm" onClick={() => setShowBalanceModal(true)}>{t('adjust')}</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('gold')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{user.wallet?.gold?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('gems')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{user.wallet?.gems?.toLocaleString() || 0}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {(canBanUser || canMuteUser) && (
          <Card>
            <CardHeader>
              <CardTitle>{t('moderation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canBanUser && (
                <Button variant="danger" className="w-full">
                  <Ban className="w-4 h-4 mr-2" />
                  {t('ban')}
                </Button>
              )}
              {canMuteUser && (
                <Button variant="outline" className="w-full">
                  <MicOff className="w-4 h-4 mr-2" />
                  {t('mute')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {canManageRoles && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t('permissionOverrides') || 'Permission Overrides'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/dashboard/users/${userId}/permissions`)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('manageOverrides') || 'Manage Overrides'}
              </Button>
            </CardContent>
          </Card>
        )}

        {inventory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                {t('inventory') || 'Inventory'} ({inventory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {inventory.slice(0, 30).map((item: any, idx: number) => (
                  <div key={item.id || idx} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{item.name || item.itemId || `Item #${idx + 1}`}</p>
                    {item.quantity && <p className="text-xs text-gray-500">x{item.quantity}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {purchases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {t('purchases') || 'Purchases'} ({purchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {purchases.slice(0, 20).map((purchase: any, idx: number) => (
                  <div key={purchase.id || idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <span className="text-gray-900 dark:text-white font-medium truncate">{purchase.itemName || purchase.itemId || `Purchase #${idx + 1}`}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loadout.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Backpack className="w-4 h-4" />
                {t('loadout') || 'Loadout'} ({loadout.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {loadout.map((item: any, idx: number) => (
                  <div key={item.slot || item.id || idx} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {item.name || item.itemId || item.slot || `Slot #${idx + 1}`}
                    </p>
                    {item.slot && <p className="text-[10px] text-gray-400 uppercase">{item.slot}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={t('assignRole')}>
        {canManageRoles ? (
          <>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={[
                { value: '', label: t('select') + '...' },
                ...availableRoles.map((r) => ({ value: r.code, label: r.name || r.code }))
              ]}
              className="w-full"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>{t('cancel')}</Button>
              <Button onClick={handleAssignRole} disabled={!selectedRole}>{t('confirm')}</Button>
            </div>
          </>
        ) : (
          <p className="text-gray-500">{t('noPermission')}</p>
        )}
      </Modal>

      <Modal isOpen={showBalanceModal} onClose={() => setShowBalanceModal(false)} title={t('adjustBalance')}>
        <Select
          value={balanceCurrency}
          onChange={(e) => setBalanceCurrency(e.target.value as 'gold' | 'gems')}
          options={[
            { value: 'gold', label: t('gold') },
            { value: 'gems', label: t('gems') },
          ]}
          className="w-full mb-4"
        />
        <Select
          value={balanceAction}
          onChange={(e) => setBalanceAction(e.target.value as 'add' | 'deduct')}
          options={[
            { value: 'add', label: t('add') || 'Add' },
            { value: 'deduct', label: t('subtract') || 'Subtract' },
          ]}
          className="w-full mb-4"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={balanceAmount}
          onChange={(e) => setBalanceAmount(e.target.value)}
          className="w-full mb-4"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBalanceModal(false)}>{t('cancel')}</Button>
          <Button onClick={handleAdjustBalance} disabled={!balanceAmount}>{t('confirm')}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmRevokeRole}
        onOpenChange={(open) => !open && setConfirmRevokeRole(null)}
        title={t('revokeRole')}
        message={`Are you sure you want to revoke the role "${confirmRevokeRole}" from this user?`}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => {
          if (confirmRevokeRole) handleRevokeRole(confirmRevokeRole);
        }}
      />
    </div>
  );
}