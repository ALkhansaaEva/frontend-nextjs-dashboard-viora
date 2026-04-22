'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Shield, Crown, UserCog, Users, HelpCircle, Star, Filter, LayoutGrid, UserCheck, UserX, PlusCircle, MinusCircle, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { adminService } from '@/services';
import { useHasPermission, useRoles as useFetchRoles, useCreateRole, useUpdateRole, useDeleteRole, usePermissions as useFetchPermissions, useAssignPermission, useRevokePermission, useAdminUsers as useFetchAdminUsers, useAssignRoleToUser, useRevokeRoleFromUser } from '@/hooks';
import { RoleCard } from './RoleCard';
import type { Role, CreateRoleRequest } from '@/types';

const ROLE_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgGradient: string; label: string; labelAr: string }> = {
  super_admin: { icon: Crown, color: 'text-amber-500', bgGradient: 'from-amber-500/20 to-orange-500/20', label: 'Super Admin', labelAr: 'مدير عام' },
  admin: { icon: Shield, color: 'text-purple-500', bgGradient: 'from-purple-500/20 to-indigo-500/20', label: 'Administrator', labelAr: 'مدير' },
  moderator: { icon: UserCog, color: 'text-blue-500', bgGradient: 'from-blue-500/20 to-cyan-500/20', label: 'Moderator', labelAr: 'مشرف' },
  support: { icon: HelpCircle, color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20', label: 'Support', labelAr: 'دعم فني' },
  manager: { icon: Users, color: 'text-orange-500', bgGradient: 'from-orange-500/20 to-red-500/20', label: 'Manager', labelAr: 'مدير قسم' },
  user: { icon: Star, color: 'text-gray-500', bgGradient: 'from-gray-500/20 to-slate-500/20', label: 'User', labelAr: 'مستخدم' },
};

const DEFAULT_ROLE_CONFIG = { icon: Shield, color: 'text-primary', bgGradient: 'from-primary/20 to-primary/10', label: 'Custom Role', labelAr: 'دور مخصص' };

const getRoleTypeConfig = (code: string) => {
  return ROLE_TYPE_CONFIG[code] || DEFAULT_ROLE_CONFIG;
};

interface RolesListProps {
  roles?: Role[];
  isLoading?: boolean;
  refetch?: () => void;
}

export function RolesList({ roles: initialRoles, isLoading: initialLoading, refetch: initialRefetch }: RolesListProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const hasPermission = useHasPermission();
  const canManageRoles = hasPermission('manage_roles');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<CreateRoleRequest>({ code: '', name: '', level: 10 });
  const [editRole, setEditRole] = useState({ name: '', description: '', priority: 10, level: 10 });
  const [selectedPermission, setSelectedPermission] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);

  const { data: rolesData, isLoading, refetch } = useFetchRoles();
  const roles = initialRoles ?? rolesData;
  const loading = initialLoading ?? isLoading;
  const doRefetch = initialRefetch ?? refetch;

  const { data: permissionsData } = useFetchPermissions();
  const { data: adminUsersData, isLoading: adminUsersLoading, refetch: refetchAdminUsers } = useFetchAdminUsers({ limit: 100 });

  const { data: roleUserCounts } = useQuery<Record<string, number>>({
    queryKey: ['role-user-counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const role of roles ?? []) {
        try {
          const res = await adminService.getUsersByRole(role.code);
          counts[role.code] = res.total || 0;
        } catch {
          counts[role.code] = 0;
        }
      }
      return counts;
    },
    enabled: !!roles && roles.length > 0,
    staleTime: 60000,
  });

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();
  const assignPermissionMutation = useAssignPermission();
  const revokePermissionMutation = useRevokePermission();
  const assignRoleToUserMutation = useAssignRoleToUser();
  const revokeRoleFromUserMutation = useRevokeRoleFromUser();

  const filteredRoles = useMemo(() => {
    let result = roles ?? [];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (role) =>
          (role.name || '').toLowerCase().includes(searchLower) ||
          role.code.toLowerCase().includes(searchLower)
      );
    }

    if (filterType !== 'all') {
      result = result.filter((role) => {
        const config = getRoleTypeConfig(role.code);
        return config.label.toLowerCase() === filterType.toLowerCase();
      });
    }

    return result;
  }, [roles, search, filterType]);

  const roleTypes = useMemo(() => {
    const types = new Set<string>();
    (roles ?? []).forEach((role) => {
      const config = getRoleTypeConfig(role.code);
      types.add(config.label);
    });
    return Array.from(types);
  }, [roles]);

  const handleDeleteRole = () => {
    if (roleToDelete) {
      deleteRoleMutation.mutate(roleToDelete.code, {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          setRoleToDelete(null);
          doRefetch?.();
        },
      });
    }
  };

  const handleCreateRole = () => {
    createRoleMutation.mutate(newRole, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewRole({ code: '', name: '', level: 10 });
        doRefetch?.();
      },
    });
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setEditRole({
      name: role.name ?? '',
      description: role.description ?? '',
      priority: typeof role.priority === 'number' ? role.priority : 10,
      level: typeof role.level === 'number' ? role.level : 10,
    });
    setShowEditModal(true);
  };

  const handleViewRole = (code: string) => {
    router.push(`/dashboard/roles/${code}`);
  };

  const handleEditRole = () => {
    if (selectedRole && editRole.name) {
      updateRoleMutation.mutate({
        code: selectedRole.code,
        data: editRole
      }, {
        onSuccess: () => {
          setShowEditModal(false);
          setSelectedRole(null);
          doRefetch?.();
        },
      });
    }
  };

  const handleDelete = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const handleManageUsers = (role: Role) => {
    setSelectedRole(role);
    setSelectedUser('');
    setShowAssignUserModal(true);
  };

  const openManageModal = (role: Role) => {
    if (role) {
      router.push(`/dashboard/roles/${role.code}`);
    } else if (selectedRoleCode) {
      router.push(`/dashboard/roles/${selectedRoleCode}`);
    }
  };

  const openAssignUserModalFn = (role: Role) => {
    if (role) {
      setSelectedRole(role);
      setSelectedRoleCode(role.code);
      setSelectedUser('');
      setUserSearch('');
      setShowAssignUserModal(true);
      refetchAdminUsers();
    } else if (selectedRoleCode) {
      const currentRole = (roles ?? []).find(r => r.code === selectedRoleCode);
      setSelectedRole(currentRole || null);
      setSelectedUser('');
      setUserSearch('');
      setShowAssignUserModal(true);
      refetchAdminUsers();
    }
  };

  const updateSelectedRole = async () => {
    if (selectedRoleCode) {
      await doRefetch?.();
      const currentRoles = rolesData ?? roles ?? [];
      const updatedRole = currentRoles.find(r => r.code === selectedRoleCode);
      setSelectedRole(updatedRole || null);
    }
  };

  const handleAssignPermission = async () => {
    if (!selectedRole?.code || !selectedPermission) return;
    await assignPermissionMutation.mutateAsync({ 
      roleCode: selectedRole.code, 
      permissionCode: selectedPermission 
    });
    await updateSelectedRole();
  };

  const handleRevokePermission = async () => {
    if (!selectedRole?.code || !selectedPermission) return;
    await revokePermissionMutation.mutateAsync({ 
      roleCode: selectedRole.code, 
      permissionCode: selectedPermission 
    });
    await updateSelectedRole();
  };

  const handleRevokeDirect = async (permCode: string) => {
    if (!selectedRole?.code) return;
    setShowManageModal(true);
    await revokePermissionMutation.mutateAsync({ 
      roleCode: selectedRole.code, 
      permissionCode: permCode 
    });
    await updateSelectedRole();
  };

  const handleAssignUser = async () => {
    if (!selectedRole?.code || !selectedUser) return;
    await assignRoleToUserMutation.mutateAsync({ 
      userId: selectedUser, 
      roleCode: selectedRole.code 
    });
    setShowAssignUserModal(false);
    setSelectedUser('');
  };

  const handleRevokeUser = async () => {
    if (!selectedRole?.code || !selectedUser) return;
    await revokeRoleFromUserMutation.mutateAsync({ 
      userId: selectedUser, 
      roleCode: selectedRole.code 
    });
    setShowAssignUserModal(false);
    setSelectedUser('');
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
            {t('roles')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('rolesDescription') || 'Manage roles and permissions for your administrative network.'}
          </p>
        </div>
        {canManageRoles && (
          <div className="flex flex-wrap gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                {t('createRole')}
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm">
          <CardContent className="p-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={t('search') + '...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary/20 text-lg transition-all"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('filter')}:</span>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant={filterType === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('all')}
              className={`rounded-full px-4 py-2 ${filterType === 'all' ? 'shadow-lg shadow-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              {t('all')} <span className="ml-1.5 opacity-70">({(roles ?? []).length})</span>
            </Button>
          </motion.div>
          {roleTypes.map((type) => {
            const config = Object.values(ROLE_TYPE_CONFIG).find(c => c.label === type) || DEFAULT_ROLE_CONFIG;
            const IconComponent = config.icon;
            return (
              <motion.div key={type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={filterType === type.toLowerCase() ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterType(type.toLowerCase())}
                  className={`rounded-full px-4 py-2 ${filterType === type.toLowerCase() ? `shadow-lg ${config.bgGradient}` : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <IconComponent className={`w-4 h-4 mr-1.5 ${filterType === type.toLowerCase() ? config.color : 'text-gray-500'}`} />
                  {type} <span className="ml-1.5 opacity-70">({(roles ?? []).filter(r => getRoleTypeConfig(r.code).label === type).length})</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredRoles.map((role, index) => (
            <motion.div
              key={role.code}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{
                duration: 0.3,
                delay: index * 0.03,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              layout
              whileHover={{ y: -4 }}
            >
              <RoleCard
                role={role}
                canManage={canManageRoles}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onClick={handleViewRole}
                onAssignPermission={openManageModal as any}
                onAssignUser={openAssignUserModalFn as any}
                userCount={roleUserCounts?.[role.code]}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredRoles.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-full mb-4">
            <Star className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('noData')}</h3>
          <p className="text-gray-500 mt-2">{t('noRolesMatch') || 'No roles match your search criteria.'}</p>
        </motion.div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('createRole')} size="lg">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role Code"
              value={newRole.code}
              onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
              placeholder="e.g., system_admin"
            />
            <Input
              label={t('name') || 'Display Name'}
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              placeholder="e.g., System Administrator"
            />
          </div>
          <div className="flex items-end gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
            <div className="flex-1">
              <Input
                label="Priority Level"
                type="number"
                value={newRole.level}
                onChange={(e) => setNewRole({ ...newRole, level: parseInt(e.target.value) || 10 })}
                placeholder="10"
              />
            </div>
            <p className="text-xs text-gray-400 mb-2 italic">Higher numbers indicate greater authority.</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              className="w-full"
              onClick={handleCreateRole}
              disabled={!newRole.code || !newRole.name || createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? 'Deploying...' : 'Initialize New Role'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-32">{t('cancel')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Calibrate: ${selectedRole?.name || selectedRole?.code}`} size="lg">
        <div className="space-y-6">
          <Input
            label={t('name') || 'Display Name'}
            value={editRole.name}
            onChange={(e) => setEditRole({ ...editRole, name: e.target.value })}
            placeholder="e.g., Senior Admin"
          />
          <Input
            label={t('description') || 'Security Briefing'}
            value={editRole.description}
            onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
            placeholder="Update role briefing..."
          />
          <Input
            label="Priority Level"
            type="number"
            value={editRole.priority}
            onChange={(e) => setEditRole({ ...editRole, priority: parseInt(e.target.value) || 10 })}
            placeholder="10"
          />
          <div className="flex gap-3 pt-4">
            <Button
              className="w-full"
              onClick={handleEditRole}
              disabled={!editRole.name || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="w-32">{t('cancel')}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title={t('managePermissions') || `Manage: ${selectedRole?.name || selectedRole?.code}`} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('selectPermission') || 'Select Permission'}
            </label>
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{t('choose') || 'Choose...'}</option>
              {(permissionsData ?? [])
                .filter(p => {
                  const rolePerms = selectedRole?.permissions ?? [];
                  if (rolePerms.includes('*')) return false;
                  return !rolePerms.includes(p.code);
                })
                .map((perm) => (
                <option key={perm.code} value={perm.code}>
                  {perm.name || perm.code}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleAssignPermission}
              disabled={!selectedPermission || assignPermissionMutation.isPending || (selectedRole?.permissions ?? []).includes('*') || (selectedRole?.permissions ?? []).includes(selectedPermission)}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {assignPermissionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4 mr-2" />
              )}
              {assignPermissionMutation.isPending ? t('assigning') : t('assignPermission') || 'Assign'}
            </Button>
            {(selectedRole?.permissions ?? []).includes('*') ? (
                <span className="text-xs text-green-600 font-bold">All Permissions</span>
              ) : selectedRole?.permissions?.includes(selectedPermission) ? (
                <Button
                  variant="outline"
                  onClick={handleRevokePermission}
                  disabled={!selectedPermission || revokePermissionMutation.isPending}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {revokePermissionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MinusCircle className="w-4 h-4 mr-2" />
                  )}
                  {revokePermissionMutation.isPending ? t('revoking') : t('revokePermission') || 'Revoke'}
                </Button>
              ) : null}
</div>

          {selectedRole?.permissions && selectedRole?.permissions?.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('currentPermissions') || 'Current Permissions'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedRole?.permissions?.includes('*') ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 font-bold">
                    All Permissions (*)
                  </span>
                ) : (
                  selectedRole?.permissions?.map((permCode) => (
                    <span
                      key={permCode}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    >
                      {permCode}
                      <button
                        onClick={() => handleRevokeDirect(permCode)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleManageUsers(selectedRole!)}
              className="text-blue-600 hover:text-blue-700 w-full justify-center"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {t('manageUsers') || 'Manage Users'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAssignUserModal} onClose={() => { setShowAssignUserModal(false); setSelectedUser(''); }} title={t('assignUser') || `Assign User to: ${selectedRole?.name || selectedRole?.code}`} size="lg">
        <div className="space-y-4">
          <Input
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full"
          />
          
          {adminUsersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !adminUsersData?.data || adminUsersData.data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('noData') || 'No users found'}</p>
              <p className="text-xs mt-2">API: /admin/users</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y">
              {(adminUsersData.data)
                .filter(u => {
                  const searchLower = userSearch.toLowerCase();
                  return !userSearch || 
                    (u.nickname?.toLowerCase().includes(searchLower)) ||
                    (u.email?.toLowerCase().includes(searchLower)) ||
                    u.id.toLowerCase().includes(searchLower);
                })
                .map((user) => (
                  <label 
                    key={user.id} 
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedUser === user.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}
                  >
                    <input
                      type="radio"
                      name="selectedUser"
                      value={user.id}
                      checked={selectedUser === user.id}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-4 h-4 text-violet-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {user.nickname || user.email || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{user.immutableUserId}</span>
                  </label>
                ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleAssignUser}
              disabled={!selectedUser || assignRoleToUserMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {assignRoleToUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              {assignRoleToUserMutation.isPending ? t('assigning') : t('assignUser') || 'Assign Role'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRevokeUser}
              disabled={!selectedUser || revokeRoleFromUserMutation.isPending}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {revokeRoleFromUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserX className="w-4 h-4 mr-2" />
              )}
              {revokeRoleFromUserMutation.isPending ? t('revoking') : t('revokeUser') || 'Remove Role'}
            </Button>
          </div>

          <div className="text-xs text-gray-400 text-center pt-2">
            {adminUsersData?.total ? `${adminUsersData.total} users total` : ''}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setRoleToDelete(null);
        }}
        onConfirm={handleDeleteRole}
        title={t('deleteRole') || 'Delete Role'}
        message={`Are you sure you want to delete the role "${roleToDelete?.name || roleToDelete?.code}"? This action cannot be undone.`}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="danger"
      />
    </div>
  );
}

export default RolesList;