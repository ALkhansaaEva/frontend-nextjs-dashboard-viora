'use client';

import { useState, useCallback, memo } from 'react';
import { Copy, Check, Trash2, Key, Shield, Eye, Globe, DoorOpen, Wallet, Settings, MessageSquare, Users, FileText, Zap } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import type { Permission } from '@/types';

interface PermissionCardProps {
  permission: Permission;
  canManage: boolean;
  onDelete: (permission: Permission) => void;
}

const PERMISSION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgGradient: string }> = {
  manage: { icon: Key, color: 'text-red-500', bgGradient: 'from-red-500/20 to-orange-500/20' },
  view: { icon: Eye, color: 'text-blue-500', bgGradient: 'from-blue-500/20 to-cyan-500/20' },
  global: { icon: Globe, color: 'text-orange-500', bgGradient: 'from-orange-500/20 to-amber-500/20' },
  room: { icon: DoorOpen, color: 'text-purple-500', bgGradient: 'from-purple-500/20 to-indigo-500/20' },
  adjust: { icon: Wallet, color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20' },
  balance: { icon: Wallet, color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20' },
  transaction: { icon: Wallet, color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20' },
  settings: { icon: Settings, color: 'text-gray-500', bgGradient: 'from-gray-500/20 to-slate-500/20' },
  chat: { icon: MessageSquare, color: 'text-pink-500', bgGradient: 'from-pink-500/20 to-rose-500/20' },
  user: { icon: Users, color: 'text-indigo-500', bgGradient: 'from-indigo-500/20 to-purple-500/20' },
  report: { icon: FileText, color: 'text-amber-500', bgGradient: 'from-amber-500/20 to-yellow-500/20' },
  match: { icon: Zap, color: 'text-cyan-500', bgGradient: 'from-cyan-500/20 to-sky-500/20' },
};

const DEFAULT_CONFIG = { icon: Shield, color: 'text-primary', bgGradient: 'from-primary/20 to-primary/10' };

const getPermissionConfig = (code: string) => {
  const lowerCode = code.toLowerCase();
  for (const key of Object.keys(PERMISSION_CONFIG)) {
    if (lowerCode.includes(key)) {
      return PERMISSION_CONFIG[key];
    }
  }
  return DEFAULT_CONFIG;
};

const getPermissionTypeLabel = (code: string): string => {
  const lowerCode = code.toLowerCase();
  if (lowerCode.includes('manage')) return 'Management';
  if (lowerCode.includes('view')) return 'View Access';
  if (lowerCode.includes('global')) return 'Global';
  if (lowerCode.includes('room')) return 'Room';
  if (lowerCode.includes('adjust') || lowerCode.includes('balance') || lowerCode.includes('transaction')) return 'Finance';
  if (lowerCode.includes('settings')) return 'Settings';
  if (lowerCode.includes('chat') || lowerCode.includes('message')) return 'Chat';
  if (lowerCode.includes('user')) return 'User';
  if (lowerCode.includes('report')) return 'Report';
  if (lowerCode.includes('match')) return 'Match';
  return 'System';
};

function PermissionCardComponent({ permission, canManage, onDelete }: PermissionCardProps) {
  const [copied, setCopied] = useState(false);
  const config = getPermissionConfig(permission.code);
  const IconComponent = config!.icon;

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(permission.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [permission.code]);

  return (
    <Card className="group relative overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer">
      <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity bg-gradient-to-bl ${config!.bgGradient}`}>
        <IconComponent size={120} className={`${config!.color} rotate-12`} />
      </div>

      <CardContent className="p-3 flex flex-col h-full relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${config!.bgGradient} ${config!.color} group-hover:scale-110 transition-transform duration-300`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
            {getPermissionTypeLabel(permission.code)}
          </span>
        </div>

        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
          {permission.name || permission.code}
        </h3>

        <code className="text-[10px] font-mono text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded w-fit mb-2">
          {permission.code}
        </code>

        {permission.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex-grow line-clamp-2 mb-3">
            {permission.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full w-9 h-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full w-9 h-9 p-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(permission);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const PermissionCard = memo(PermissionCardComponent);
export default PermissionCard;