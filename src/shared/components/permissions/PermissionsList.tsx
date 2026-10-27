'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Copy, Check, Shield, Filter, LayoutGrid, Key, Eye, Globe, DoorOpen, Wallet, Settings, Info } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { usePermissions as useFetchPermissions, useCreatePermission, useDeletePermission, useHasPermission } from '@/hooks';
import { PermissionCard } from './PermissionCard';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import type { Permission } from '@/types';

const PERMISSION_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgGradient: string; label: string; labelAr: string }> = {
  management: { icon: Key, color: 'text-red-500', bgGradient: 'from-red-500/20 to-orange-500/20', label: 'Management', labelAr: 'إدارة' },
  view: { icon: Eye, color: 'text-blue-500', bgGradient: 'from-blue-500/20 to-cyan-500/20', label: 'View Access', labelAr: 'عرض' },
  global: { icon: Globe, color: 'text-orange-500', bgGradient: 'from-orange-500/20 to-amber-500/20', label: 'Global', labelAr: 'عالمي' },
  room: { icon: DoorOpen, color: 'text-purple-500', bgGradient: 'from-purple-500/20 to-indigo-500/20', label: 'Room', labelAr: 'غرفة' },
  finance: { icon: Wallet, color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20', label: 'Finance', labelAr: 'مالية' },
  settings: { icon: Settings, color: 'text-gray-500', bgGradient: 'from-gray-500/20 to-slate-500/20', label: 'Settings', labelAr: 'إعدادات' },
};

const DEFAULT_TYPE_CONFIG = { icon: Shield, color: 'text-primary', bgGradient: 'from-primary/20 to-primary/10', label: 'System', labelAr: 'نظام' };

const getPermissionTypeConfig = (code: string) => {
  const lowerCode = code.toLowerCase();
  if (lowerCode.includes('manage')) return PERMISSION_TYPE_CONFIG.management;
  if (lowerCode.includes('view')) return PERMISSION_TYPE_CONFIG.view;
  if (lowerCode.includes('global')) return PERMISSION_TYPE_CONFIG.global;
  if (lowerCode.includes('room')) return PERMISSION_TYPE_CONFIG.room;
  if (lowerCode.includes('adjust') || lowerCode.includes('balance') || lowerCode.includes('transaction')) return PERMISSION_TYPE_CONFIG.finance;
  if (lowerCode.includes('settings')) return PERMISSION_TYPE_CONFIG.settings;
  return DEFAULT_TYPE_CONFIG;
};

interface PermissionsListProps {
  permissions?: Permission[];
  isLoading?: boolean;
}

export function PermissionsList({ permissions: initialPermissions, isLoading: initialLoading }: PermissionsListProps) {
  const { t } = useLanguage();
  
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [newPermission, setNewPermission] = useState({ code: '', name: '', description: '' });

  const { data: permissionsData, isLoading } = useFetchPermissions();
  const canManage = useHasPermission()('manage_permissions');
  const createPermissionMutation = useCreatePermission();
  const deletePermissionMutation = useDeletePermission();
  const permissions = initialPermissions ?? permissionsData;
  const loading = initialLoading ?? isLoading;

  const filteredPermissions = useMemo(() => {
    let result: Permission[] = permissions ?? [];
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (perm) =>
          (perm.name || '').toLowerCase().includes(searchLower) ||
          perm.code.toLowerCase().includes(searchLower) ||
          (perm.description || '').toLowerCase().includes(searchLower)
      );
    }
    
    if (filterType !== 'all') {
      result = result.filter((perm) => {
        const typeInfo = getPermissionTypeConfig(perm.code);
        return typeInfo!.label.toLowerCase() === filterType.toLowerCase();
      });
    }
    
    return result;
  }, [permissions, search, filterType]);

  const permissionTypes = useMemo(() => {
    const types = new Set<string>();
    (permissions ?? []).forEach((perm) => {
      const config = getPermissionTypeConfig(perm.code);
      types.add(config!.label);
    });
    return Array.from(types);
  }, [permissions]);

  const handleCopyAllCodes = async () => {
    const codes = filteredPermissions.map(p => p.code).join(', ');
    await navigator.clipboard.writeText(codes);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
            {t('permissions') || 'Permissions'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('permissionsDescription') || 'Manage system permissions and access rights.'}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={() => setShowCreateModal(true)} className="shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                {t('createPermission') || 'Create Permission'}
              </Button>
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={handleCopyAllCodes} className="shadow-sm">
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('copied') || 'Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {t('copyAll') || 'Copy All'}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="border-none bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm">
          <CardContent className="p-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={t('searchPermissions') || 'Search permissions...'}
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
              {t('all')} <span className="ml-1.5 opacity-70">({(permissions ?? []).length})</span>
            </Button>
          </motion.div>
          {permissionTypes.map((type) => {
            const config = Object.values(PERMISSION_TYPE_CONFIG).find(c => c.label === type) || DEFAULT_TYPE_CONFIG;
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
                  {type} <span className="ml-1.5 opacity-70">({(permissions ?? []).filter(p => getPermissionTypeConfig(p.code)!.label === type).length})</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPermissions.map((permission, index) => (
              <motion.div
                key={permission.id || permission.code}
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
                <PermissionCard
                  permission={permission}
                  canManage={canManage}
                  onDelete={(p) => setDeleteTarget(p)}
                />
              </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPermissions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-full mb-4">
            <Shield className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('noData')}</h3>
          <p className="text-gray-500 mt-2">{t('noPermissionsFound') || 'No permissions found.'}</p>
        </motion.div>
      )}

      <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-sm text-gray-500">
          {t('showing') || 'Showing'} {filteredPermissions.length} {t('of') || 'of'} {(permissions ?? []).length} {t('permissions') || 'permissions'}
        </span>
      </div>

      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t('permissionsManagedOnServer') || 'Permissions are defined on the server. To add or modify permissions, update the backend permission definitions.'}
        </p>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t('deletePermission') || 'Delete Permission'}
        message={`${t('deletePermissionConfirm') || 'Are you sure you want to delete the permission'}: "${deleteTarget?.code}"?`}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            deletePermissionMutation.mutate(deleteTarget.code);
            setDeleteTarget(null);
          }
        }}
      />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('createPermission') || 'Create Permission'}
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="Permission Code"
            value={newPermission.code}
            onChange={(e) => setNewPermission({ ...newPermission, code: e.target.value })}
            placeholder="e.g., users.read, rooms.write"
            error={newPermission.code && !/^[a-z][a-z0-9_]*\.(read|write|execute|delete)$/.test(newPermission.code) ? 'Format: gateway.operation (e.g., users.read)' : undefined}
          />
          <Input
            label={t('name') || 'Display Name'}
            value={newPermission.name}
            onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
            placeholder="e.g., Manage Bans"
          />
          <Input
            label={t('description') || 'Description'}
            value={newPermission.description}
            onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
            placeholder="Optional description"
          />
          <div className="flex gap-3 pt-4">
            <Button
              className="w-full"
              onClick={() => {
                createPermissionMutation.mutate(newPermission, {
                  onSuccess: () => {
                    setShowCreateModal(false);
                    setNewPermission({ code: '', name: '', description: '' });
                  },
                });
              }}
              disabled={!newPermission.code || !newPermission.name || !/^[a-z][a-z0-9_]*\.(read|write|execute|delete)$/.test(newPermission.code) || createPermissionMutation.isPending}
            >
              {createPermissionMutation.isPending ? 'Creating...' : 'Create Permission'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-32">
              {t('cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PermissionsList;