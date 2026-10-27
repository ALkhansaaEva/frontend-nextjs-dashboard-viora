'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, CheckCircle2, XCircle, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { CopyId } from '@/shared/components/ui/UserIdentityCell';
import type { Report, User } from '@/types';

interface ReportsListSectionProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning',
  investigating: 'info',
  resolved: 'success',
  dismissed: 'default',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  open: Clock,
  investigating: Eye,
  resolved: CheckCircle2,
  dismissed: XCircle,
};

const leftBarColors: Record<string, string> = {
  open: 'bg-amber-500',
  investigating: 'bg-blue-500',
  resolved: 'bg-emerald-500',
  dismissed: 'bg-gray-500',
};

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** Compact "3 hours ago" age. Empty string when createdAt is missing/invalid. */
function compactAge(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

function label(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/**
 * The list already ships `reporterUser`/`targetUser`, so the row shows that
 * relation directly — no per-row identity lookup, and an unresolved relation
 * degrades to the raw id instead of blanking.
 */
function Party({ user, userId }: { user?: User; userId: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {user?.nickname || label('unknown user')}
      </p>
      <CopyId id={userId} />
    </div>
  );
}

export function ReportsListSection({ reports, onSelectReport }: ReportsListSectionProps) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No Reports</h3>
        <p className="text-gray-500 dark:text-gray-400">Nothing matches the current filters on this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {reports.map((report, index) => {
          const StatusIcon = statusIcons[report.status] || Clock;
          const age = compactAge(report.createdAt);

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectReport(report)}
            >
              <Card className="group relative overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/40 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftBarColors[report.status] ?? 'bg-gray-500'}`} />
                <CardContent className="py-3 pl-5 pr-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Party user={report.reporterUser} userId={report.reporterUserId} />
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
                      <Party user={report.targetUser} userId={report.targetUserId} />
                    </div>
                    <div className="flex-1 min-w-0 border-l border-gray-100 dark:border-gray-800 pl-3">
                      <Badge variant="outline" className="text-[10px] py-0 mb-1">
                        {label(report.category)}
                      </Badge>
                      <p
                        className="text-xs text-gray-500 dark:text-gray-400 truncate"
                        title={report.description || undefined}
                      >
                        {report.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={statusColors[report.status] ?? 'default'} className="capitalize font-medium">
                      <StatusIcon className="w-3.5 h-3.5 mr-1" />
                      {report.status}
                    </Badge>
                    {age && (
                      <span className="flex items-center gap-1 text-xs text-gray-400" title={report.createdAt}>
                        <Clock className="w-3.5 h-3.5" />
                        {age}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectReport(report); }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Review
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
