'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye, Clock, CheckCircle2, XCircle, ArrowRight, Flag } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import type { Report } from '@/types';

interface ReportsListSectionProps {
  reports: Report[];
  onSelectReport: (report: Report) => void;
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  pending: 'warning',
  investigating: 'info',
  resolved: 'success',
  dismissed: 'default',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  investigating: Eye,
  resolved: CheckCircle2,
  dismissed: XCircle,
};

export function ReportsListSection({ reports, onSelectReport }: ReportsListSectionProps) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
        <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">No Reports</h3>
        <p className="text-gray-500 dark:text-gray-400">Your sector is currently clean. All reports processed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {reports.map((report, index) => {
          const StatusIcon = statusIcons[report.status] || Clock;
          const statusColor = statusColors[report.status] || 'default';
          const leftBarColor =
            report.status === 'pending'
              ? 'bg-amber-500'
              : report.status === 'investigating'
                ? 'bg-blue-500'
                : report.status === 'resolved'
                  ? 'bg-emerald-500'
                  : 'bg-gray-500';

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectReport(report)}
            >
              <Card className="group border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all duration-300 cursor-pointer overflow-hidden relative">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${leftBarColor}`} />
                <CardContent className="p-5 flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {report.reporter?.nickname || 'Station ' + report.reporterId.slice(0, 4)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400 truncate">
                        Target: {report.reportedUser?.nickname || report.reportedUserId.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Flag className="w-3.5 h-3.5" />
                        {report.reason || 'Generic violation'}
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(report.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <Badge
                      variant={statusColor}
                      className="px-3 py-1 flex items-center gap-1.5 capitalize font-medium"
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {report.status}
                    </Badge>
                    <div className="p-2 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors">
                      <Eye className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
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