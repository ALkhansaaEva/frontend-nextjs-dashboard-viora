'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Shield, Settings, Info, Star, X, Plus, Check, Loader2, Users, Search, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { adminService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission, useAdminUsers, useSetRoleAsDefault } from '@/hooks';

import type { Role, Permission, UpdateRoleRequest, User } from '@/types';

interface RoleDetailsProps {
  roleCode: string;
}

export function RoleDetails({ roleCode }: RoleDetailsProps) {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();

  const [editRole, setEditRole] = useState<UpdateRoleRequest>({ name: '', description: '', priority: 10 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [copiedPerm, setCopiedPerm] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 10;

  const hasPermission = useHasPermission();
  const canManageRoles = hasPermission('manage_roles');

  const { data: role, isLoading: roleLoading, error: roleError } = useQuery<Role>({
    queryKey: ['role', roleCode],
    queryFn: () => adminService.getRole(roleCode),
    enabled: !!roleCode,
  });

  const { data: allPermissions = [] } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: () => adminService.getPermissions(),
    staleTime: 60000,
  });

  const { data: allUsersData, isLoading: allUsersLoading } = useAdminUsers({ limit: 500 });
  const allUsers: User[] = allUsersData?.data || [];

  const { data: roleUsersData, isLoading: roleUsersLoading } = useQuery<{ data: User[]; total: number }>({
    queryKey: ['role-users', roleCode],
    queryFn: async () => {
      const res = await adminService.getUsersByRole(roleCode);
      return { data: res.data || [], total: res.total || 0 };
    },
    enabled: !!roleCode && showUsersModal,
    staleTime: 60000,
  });

  const rolePermissions = role?.permissions ?? [];

  const roleUserIds = useMemo(() => new Set((roleUsersData?.data || []).map(u => u.id)), [roleUsersData]);
  const availableUsers = useMemo(() => {
    return allUsers.filter(u => !roleUserIds.has(u.id));
  }, [allUsers, roleUserIds]);

  const filteredAvailableUsers = useMemo(() => {
    if (!userSearch) return availableUsers;
    const search = userSearch.toLowerCase();
    return availableUsers.filter(u => 
      u.email?.toLowerCase().includes(search) || 
      u.nickname?.toLowerCase().includes(search) ||
      u.immutableUserId?.toLowerCase().includes(search)
    );
  }, [availableUsers, userSearch]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredAvailableUsers.slice(start, start + usersPerPage);
  }, [filteredAvailableUsers, userPage]);

  const totalUserPages = Math.ceil(filteredAvailableUsers.length / usersPerPage);

  const updateRoleMutation = useMutation({
    mutationFn: (data: UpdateRoleRequest) => adminService.updateRole(roleCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', roleCode] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowEditModal(false);
    },
  });

  const assignPermMutation = useMutation({
    mutationFn: (permissionCode: string) => adminService.assignPermissionToRole(roleCode, permissionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', roleCode] });
    },
  });

  const revokePermMutation = useMutation({
    mutationFn: (permissionCode: string) => adminService.revokePermissionFromRole(roleCode, permissionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', roleCode] });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.assignRoleToUser(userId, roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-users', roleCode] });
      queryClient.invalidateQueries({ queryKey: ['all-users-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserSearch('');
      setUserPage(1);
    },
  });

  const revokeUserMutation = useMutation({
    mutationFn: (userId: string) => adminService.revokeRoleFromUser(userId, roleCode),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['role-users', roleCode], (old: { data: User[]; total: number } | undefined) => {
        if (!old) return old;
        const newData = old.data.filter(u => u.id !== variables);
        return { data: newData, total: newData.length };
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const setDefaultMutation = useSetRoleAsDefault();

  const openEditModal = () => {
    if (role) {
      setEditRole({
        name: role.name ?? '',
        description: role.description ?? '',
        priority: typeof role.priority === 'number' ? role.priority : 10,
        level: typeof role.priority === 'number' ? role.priority : 10,
      });
      setShowEditModal(true);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedPerm(code);
    setTimeout(() => setCopiedPerm(null), 1500);
  };

  const getPriorityBadgeVariant = (priority?: number) => {
    if (!priority) return 'default';
    if (priority >= 80) return 'success';
    if (priority >= 60) return 'info';
    if (priority >= 40) return 'warning';
    return 'default';
  };

  if (roleLoading) {
    return <PageSkeleton />;
  }

  if (roleError || !role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-gray-600 dark:text-gray-400">{t('noData')}</p>
        <Button onClick={() => router.push('/dashboard/roles')}>{t('back')}</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/roles')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('back')}
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{role.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{role.code}</p>
        </div>
        {(canManageRoles || hasPermission('*')) && (
          <Button onClick={openEditModal} variant="outline" size="sm">
            <Edit2 className="w-4 h-4 mr-1" />
            {t('edit')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="w-4 h-4" />
              {t('details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('name')}</span>
              <span className="font-medium truncate ml-2">{role.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('priority')}</span>
              <Badge variant={getPriorityBadgeVariant(typeof role.priority === 'number' ? role.priority : undefined)}>
                {role.priority ?? 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('isDefault') || 'Default'}</span>
              <div className="flex items-center gap-2">
                <Badge variant={role.isDefault ? 'info' : 'default'}>{role.isDefault ? 'Yes' : 'No'}</Badge>
                {(canManageRoles || hasPermission('*')) && (
                  <Button
                    variant={role.isDefault ? 'danger' : 'outline'}
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setDefaultMutation.mutate(role.code)}
                    disabled={setDefaultMutation.isPending}
                  >
                    {setDefaultMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : role.isDefault ? (
                      <XCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Star className="w-3 h-3 mr-1" />
                    )}
                    {role.isDefault ? (t('removeDefault') || 'Remove Default') : (t('setAsDefault') || 'Set Default')}
                  </Button>
                )}
              </div>
            </div>
            {role.description && (
              <div className="py-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('description')}</p>
                <p className="text-sm break-words">{role.description}</p>
              </div>
            )}
            {role.isSystem && (
              <Badge variant="warning" className="w-full justify-center">{t('systemRole')}</Badge>
            )}
            {role.createdAt && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('createdAt') || 'Created'}</span>
                <span className="text-xs text-gray-700 dark:text-gray-300">{new Date(role.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            {role.updatedAt && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('updatedAt') || 'Updated'}</span>
                <span className="text-xs text-gray-700 dark:text-gray-300">{new Date(role.updatedAt).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />
              {t('managePermissions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setShowPermissionsModal(true)}
              className="flex flex-col items-start p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-all cursor-pointer text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('permissions')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {t('rolesDescription')}
              </p>
              <Badge variant="outline">{role.permissions?.length || 0} {t('permissions')}</Badge>
            </button>

            <button 
              onClick={() => setShowUsersModal(true)}
              className="flex flex-col items-start p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('manageUsers')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {isRTL ? 'عرض وإدارة المستخدمين' : 'View and manage users with this role'}
              </p>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">{roleUsersData?.total ?? 0} {isRTL ? 'مستخدم' : 'users'}</Badge>
            </button>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={t('editRole')} size="sm">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); updateRoleMutation.mutate(editRole); }}>
          <Input
            label={t('name')}
            value={editRole?.name || ''}
            onChange={(e) => setEditRole({ ...editRole!, name: e.target.value })}
          />
          <Input
            label={t('description')}
            value={editRole?.description || ''}
            onChange={(e) => setEditRole({ ...editRole!, description: e.target.value })}
          />
          <Input
            label={t('priority')}
            type="number"
            value={editRole?.priority || 10}
            onChange={(e) => setEditRole({ ...editRole!, priority: parseInt(e.target.value) || 10, level: parseInt(e.target.value) || 10 })}
          />
          <div className="flex gap-2 pt-2">
            <Button 
              type="submit"
              className="flex-1"
              disabled={!editRole?.name || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {updateRoleMutation.isPending ? t('assigning') : t('saveChanges')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>{t('cancel')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} title={`${t('permissions')} - ${role?.name}`} size="xl">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <Card className="flex-1 min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('assignedPermissions')}</CardTitle>
            </CardHeader>
            <CardContent>
              {rolePermissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {rolePermissions.map((permCode) => {
                    const perm = allPermissions.find(p => p.code === permCode) || { code: permCode, name: permCode, description: '' };
                    return (
                      <div 
                        key={perm.code}
                        className="flex items-center gap-2 p-2 rounded-lg border dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 max-w-full"
                      >
                        <Badge 
                          variant={perm.code === "admin.full_access" ? 'warning' : 'success'}
                          className="cursor-pointer truncate max-w-[120px]"
                          onClick={() => handleCopyCode(perm.code)}
                        >
                          {copiedPerm === perm.code ? <Check className="w-3 h-3" /> : null}
                          {perm.code}
                        </Badge>
                        <span className="text-sm truncate hidden sm:inline">{perm.name}</span>
                          {(canManageRoles && !role.isSystem || hasPermission('*')) && perm.code !== "admin.full_access" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokePermMutation.mutate(perm.code)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-6 w-6"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">{t('noPermissions')}</p>
              )}
            </CardContent>
          </Card>

          {(!role.isSystem || hasPermission('*')) && (
            <Card className="flex-1 min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t('assignPermission')}
                  {!canManageRoles && !hasPermission('*') && <span className="text-xs font-normal text-gray-400 ml-2">({t('restricted')})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {allPermissions
                    .filter((p) => !rolePermissions.includes(p.code))
                    .map((perm) => (
                      <div 
                        key={perm.code}
                        className="flex items-center justify-between p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-mono text-primary font-medium truncate">{perm.code}</p>
                          {perm.name && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{perm.name}</p>}
                        </div>
                        {(canManageRoles || hasPermission('*')) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => assignPermMutation.mutate(perm.code)}
                            disabled={assignPermMutation.isPending}
                            className="shrink-0"
                          >
                            {assignPermMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-xs">{t('restricted')}</Badge>
                        )}
                      </div>
                    ))}
                  {allPermissions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">{t('noData')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Modal>

      <Modal isOpen={showUsersModal} onClose={() => setShowUsersModal(false)} title={`${t('manageUsers')} - ${role?.name}`} size="xl">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <Card className="flex-1 min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('assigned')} {t('manageUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {roleUsersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !roleUsersData?.data || roleUsersData.data.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{isRTL ? 'لا يوجد مستخدمون بهذا الدور' : 'No users with this role'}</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {roleUsersData.data.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {(user.nickname ?? user.email ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.nickname ?? user.email ?? 'Unnamed'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      {canManageRoles && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeUserMutation.mutate(user.id)}
                          disabled={revokeUserMutation.isPending}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                        >
                          {revokeUserMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {roleUsersData?.total !== undefined && roleUsersData.total > 0 && (
                <p className="text-xs text-gray-400 text-center pt-3 mt-2 border-t">
                  {roleUsersData.total} {isRTL ? 'مستخدم' : 'users'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('assignUser')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={isRTL ? 'بحث...' : 'Search...'}
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="pl-9"
                  />
                </div>
                
                {allUsersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : filteredAvailableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {userSearch ? (isRTL ? 'لا توجد نتائج' : 'No results found') : (isRTL ? 'لا يوجد مستخدمون متاحون' : 'No available users')}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                      {paginatedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-medium">
                              {(user.nickname ?? user.email ?? 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.nickname ?? user.email ?? 'Unnamed'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                          {canManageRoles && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => assignUserMutation.mutate(user.id)}
                              disabled={assignUserMutation.isPending}
                              className="shrink-0"
                            >
                              {assignUserMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {totalUserPages > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserPage(p => Math.max(1, p - 1))}
                          disabled={userPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-gray-500">
                          {userPage} / {totalUserPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                          disabled={userPage === totalUserPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Modal>
    </div>
  );
}

export default RoleDetails;