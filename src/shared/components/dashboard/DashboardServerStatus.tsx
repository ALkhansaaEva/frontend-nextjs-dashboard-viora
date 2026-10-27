'use client';

import { useLanguage } from '@/components/language-context';
import { Database, Server, HardDrive, Zap, Activity } from 'lucide-react';

interface ServerStatusCardProps {
  heapUsed: string;
  heapTotal: string;
  memoryFree: string;
  redis: { active: boolean; label: string };
  activeConnections: number;
}

export function ServerStatusCard({ heapUsed, heapTotal, memoryFree, redis, activeConnections }: ServerStatusCardProps) {
  const { isRTL } = useLanguage();

const metrics = [
    {
      label: isRTL ? 'المستخدم' : 'Used',
      value: heapUsed,
      subValue: `${Math.round((parseFloat(heapUsed) / parseFloat(heapTotal)) * 100)}%`,
      icon: <HardDrive className="w-5 h-5" />,
      color: 'amber'
    },
    {
      label: isRTL ? 'المتاح' : 'Free',
      value: memoryFree,
      subValue: `${Math.round((parseFloat(memoryFree) / parseFloat(heapTotal)) * 100)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'emerald'
    },
    {
      label: isRTL ? 'الاتصالات' : 'Connections',
      value: activeConnections.toString(),
      subValue: 'active',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      color: activeConnections > 0 ? 'blue' : 'gray'
    },
    {
      label: 'Redis',
      value: redis.active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive'),
      subValue: redis.active ? '✓' : '✗',
      icon: <Database className="w-5 h-5" />,
      color: redis.active ? 'emerald' : 'red'
    }
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; light: string }> = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', light: 'bg-blue-50 dark:bg-blue-900/20' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', light: 'bg-amber-50 dark:bg-amber-900/20' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', light: 'bg-emerald-50 dark:bg-emerald-900/20' },
    red: { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', light: 'bg-red-50 dark:bg-red-900/20' },
    gray: { bg: 'bg-gray-500', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', light: 'bg-gray-50 dark:bg-gray-800/20' },
  };

  const defaultColors = { bg: 'bg-gray-500', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', light: 'bg-gray-50 dark:bg-gray-800/20' };

  const getColors = (color: string) => colorMap[color] || defaultColors;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{isRTL ? 'حالة الخادم' : 'Server Status'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'الأداء والموردات' : 'Performance & Resources'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        {metrics.map((metric, index) => {
          const colors = getColors(metric.color);
          return (
            <div 
              key={index}
              className={`relative overflow-hidden rounded-xl p-3 ${colors.light} border ${colors.border} hover:scale-[1.01] transition-transform`}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${colors.text}`}>
                    {metric.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{metric.label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{metric.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${colors.text}`}>
                    {metric.subValue}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Activity className="w-3.5 h-3.5" />
            <span>{isRTL ? 'المراقبة نشطة' : 'Monitoring active'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">v2.4.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}