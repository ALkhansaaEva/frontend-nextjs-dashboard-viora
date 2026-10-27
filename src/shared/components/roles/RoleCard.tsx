'use client';

import { memo } from 'react';
import { Crown, Shield, UserCog, Users, HelpCircle, Star, Pencil, Trash2, ArrowRight, ArrowLeft, UserCheck, UsersRound } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { useLanguage } from '@/components/language-context';
import type { Role } from '@/types';

interface RoleCardProps {
  role: Role;
  canManage: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onClick: (code: string) => void;
  onAssignPermission?: (role: Role) => void;
  onAssignUser?: (role: Role) => void;
  userCount?: number;
}

interface RoleConfig {
  icon: React.ElementType;
  color: string;
  bgGradient: string;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  super_admin: { icon: Crown, color: 'text-amber-500', bgGradient: 'from-amber-500/20 to-orange-500/20' },
  admin: { icon: Shield, color: 'text-purple-500', bgGradient: 'from-purple-500/20 to-indigo-500/20' },
  moderator: { icon: UserCog, color: 'text-blue-500', bgGradient: 'from-blue-500/20 to-cyan-500/20' },
  support: { icon: HelpCircle, color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20' },
  manager: { icon: Users, color: 'text-orange-500', bgGradient: 'from-orange-500/20 to-red-500/20' },
  user: { icon: Star, color: 'text-gray-500', bgGradient: 'from-gray-500/20 to-slate-500/20' },
};

const DEFAULT_ROLE_CONFIG = { icon: Shield, color: 'text-primary', bgGradient: 'from-primary/20 to-primary/10' };

const getRoleConfig = (code: string): RoleConfig => {
  return ROLE_CONFIG[code] || DEFAULT_ROLE_CONFIG;
};

const getPriorityBadgeVariant = (priority?: number) => {
  if (!priority) return 'default';
  if (priority >= 80) return 'success';
  if (priority >= 60) return 'info';
  if (priority >= 40) return 'warning';
  return 'default';
};

const getRoleTypeLabel = (code: string): string => {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    moderator: 'Moderator',
    support: 'Support',
    manager: 'Manager',
    user: 'User',
  };
  return labels[code] || 'Custom Role';
};

function RoleCardComponent({ role, canManage, onEdit, onDelete, onClick, onAssignPermission, onAssignUser, userCount }: RoleCardProps) {
  const config = getRoleConfig(role.code);
  const IconComponent = config.icon;
  const { isRTL } = useLanguage();

  return (
    <Card
      className="group h-full relative overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
      onClick={() => onClick(role.code)}
    >
      <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity bg-gradient-to-bl ${config.bgGradient}`}>
        <IconComponent size={120} className={`${config.color} rotate-12`} />
      </div>

      <CardContent className="p-3 flex flex-col h-full relative z-10">
        <div className={`flex items-start justify-between mb-3`}>
          <div className={`p-2 rounded-xl bg-gradient-to-br ${config.bgGradient} ${config.color} group-hover:scale-110 transition-transform duration-300`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-end gap-1">
            {role.isDefault && (
              <Badge variant="info" className="px-2 py-0.5 text-[10px]">
                Default
              </Badge>
            )}
            <Badge variant={getPriorityBadgeVariant(typeof role.priority === 'number' ? role.priority : undefined)} className="px-2 py-0.5 text-[10px]">
              Lvl {role.priority ?? 10}
            </Badge>
            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
              {getRoleTypeLabel(role.code)}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
          {role.name || role.code}
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow line-clamp-2 mb-4">
          {role.description || "No description provided for this security protocol."}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Permissions</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{role.permissions?.includes("admin.full_access") ? "admin.full_access" : role.permissions?.length || 0}</span>
            </div>
            {userCount !== undefined && (
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Users</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{userCount}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Code</span>
              <code className="text-[10px] font-mono text-primary font-medium">{role.code}</code>
            </div>
          </div>

          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {canManage && onAssignPermission && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-9 h-9 p-0 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignPermission(role);
                }}
              >
                <UsersRound className="w-4 h-4" />
              </Button>
            )}
            {canManage && onAssignUser && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full w-9 h-9 p-0 hover:bg-green-50 hover:text-green-500 dark:hover:bg-green-900/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignUser(role);
                }}
              >
                <UserCheck className="w-4 h-4" />
              </Button>
            )}
            {canManage && (
              <>
                {!role.isSystem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(role);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full w-9 h-9 p-0 hover:bg-primary/10 hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(role);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full w-9 h-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {role.isSystem && (
          <div className="absolute top-0 right-0">
            <div className={`bg-gradient-to-r ${config.bgGradient} ${config.color} text-[8px] font-bold uppercase tracking-tighter px-4 py-1 rotate-45 translate-x-3 -translate-y-1 border border-current/20`}>
              System
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const RoleCard = memo(RoleCardComponent);
export default RoleCard;