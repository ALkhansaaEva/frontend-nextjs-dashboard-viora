'use client';

import { useLanguage } from '@/components/language-context';
import { TrendingUp, Users, Cpu, Activity } from 'lucide-react';
import { LineChart } from '@/shared/components/ui/Charts';

interface PerformanceCardProps {
  users: number;
  memory: string;
}

export function SystemPerformanceCard({ users, memory }: PerformanceCardProps) {
  const { isRTL } = useLanguage();

  const usersData = [120, 150, 180, 200, 250, 300, 280, 320, 350, 380, 400, 420];
  const avgValue = Math.round(usersData.reduce((a, b) => a + b, 0) / usersData.length);
  const maxValue = Math.max(...usersData);
  const minValue = Math.min(...usersData);

  const stats = [
    { 
      label: isRTL ? 'المستخدمين' : 'Users', 
      value: users.toLocaleString(), 
      change: '+12.5%', 
      positive: true,
      icon: Users,
      color: 'blue'
    },
    { 
      label: isRTL ? 'الذاكرة المستخدمة' : 'Memory Used', 
      value: memory, 
      change: '-3.2%', 
      positive: true,
      icon: Cpu,
      color: 'amber'
    },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  };

  const defaultColors = { bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-600 dark:text-gray-400' };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <Activity className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{isRTL ? 'أداء النظام' : 'System Performance'}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'تحليل البيانات' : 'Analytics Overview'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-full">
          <TrendingUp className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">+8.2%</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{isRTL ? 'نشاط المستخدمين' : 'User Activity'}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-violet-600 dark:text-violet-400 font-medium">{isRTL ? 'المتوسط' : 'Avg'}: {avgValue}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{minValue} - {maxValue}</span>
          </div>
        </div>
        <LineChart 
          data={usersData} 
          height={100} 
          color="violet"
          showArea={true}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const colors = colorMap[stat.color] || defaultColors;
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
              <div className={`p-1.5 ${colors.bg} rounded-lg inline-flex mb-1`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <span className={`text-[10px] font-medium ${stat.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{isRTL ? 'آخر 24 ساعة' : 'Last 24 hours'}</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isRTL ? 'تحديث تلقائي' : 'Live'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}