'use client';

import { memo, ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}

function BarChartComponent({ data, height: _height = 200, className }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const hasAnyValue = data.some(d => d.value > 0);
  const minHeightPercent = 15;

  const colorClasses: Record<string, string> = {
    'bg-indigo-500': 'bg-gradient-to-t from-indigo-600 to-indigo-400',
    'bg-amber-500': 'bg-gradient-to-t from-amber-600 to-amber-400',
    'bg-blue-500': 'bg-gradient-to-t from-blue-600 to-blue-400',
    'bg-red-500': 'bg-gradient-to-t from-red-600 to-red-400',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-between h-full gap-4 md:gap-6 px-2 md:px-4">
        {data.map((item, index) => {
          const hasValue = item.value > 0;
          const barHeight = hasValue ? Math.max((item.value / maxValue) * 100, minHeightPercent) : 4;
          const colorClass = colorClasses[item.color || 'bg-indigo-500'] || 'bg-gradient-to-t from-indigo-600 to-indigo-400';

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 md:gap-3">
              <div className="w-full flex items-end justify-center h-full min-h-[100px] md:min-h-[120px]">
                <div
                  className={cn(
                    'w-full max-w-16 md:max-w-20 rounded-t-2xl shadow-md transition-all duration-500 ease-out hover:shadow-lg hover:-translate-y-1 cursor-pointer relative overflow-hidden group',
                    colorClass,
                    !hasValue && 'bg-gray-200 dark:bg-gray-700'
                  )}
                  style={{ height: `${hasAnyValue ? barHeight : minHeightPercent}%` }}
                  title={item.value.toLocaleString()}
                >
                  {hasValue && (
                    <div className="absolute -top-6 md:-top-7 left-1/2 -translate-x-1/2 text-xs md:text-sm font-extrabold text-gray-800 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {item.value}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-center space-y-0.5 md:space-y-1 w-full">
                <span className={cn(
                  'block leading-tight font-bold',
                  hasValue ? 'text-base md:text-lg text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                )}>
                  {item.value}
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight block">
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const BarChart = memo(BarChartComponent);

interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  className?: string;
  showArea?: boolean;
}

function LineChartComponent({
  data,
  labels,
  height = 120,
  color = 'indigo',
  className,
  showArea = true,
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-gray-400', className)}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 100;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  const colorMap: Record<string, { stroke: string; fill: string }> = {
    indigo: { stroke: 'stroke-indigo-500', fill: 'fill-indigo-500/10' },
    blue: { stroke: 'stroke-blue-500', fill: 'fill-blue-500/10' },
    green: { stroke: 'stroke-green-500', fill: 'fill-green-500/10' },
    red: { stroke: 'stroke-red-500', fill: 'fill-red-500/10' },
    amber: { stroke: 'stroke-amber-500', fill: 'fill-amber-500/10' },
  };

  const colorKey = colorMap[color] ? color : 'indigo';
  const { stroke: strokeClass, fill: fillClass } = colorMap[colorKey]!;

  return (
    <div className={cn('w-full relative', className)} style={{ height }}>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {showArea && (
          <path d={areaD} className={fillClass} />
        )}
        <path
          d={pathD}
          className={cn('fill-none stroke-2', strokeClass)}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            className={strokeClass}
          />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between mt-1">
          {labels.map((label, i) => (
            <span key={i} className="text-xs text-gray-400">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const LineChart = memo(LineChartComponent);

interface DonutChartProps {
  value: number;
  maxValue: number;
  size?: number;
  color?: string;
  className?: string;
  children?: ReactNode;
}

function DonutChartComponent({
  value,
  maxValue,
  size = 120,
  color = 'indigo',
  className,
  children,
}: DonutChartProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={colorMap[color] || colorMap.indigo}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-lg font-bold">{Math.round(percentage)}%</span>
        )}
      </div>
    </div>
  );
}

export const DonutChart = memo(DonutChartComponent);

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: ReactNode;
  className?: string;
}

function StatCardComponent({ label, value, trend, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800',
        'border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {trend !== undefined && (
          <p
            className={cn(
              'text-xs mt-1',
              trend >= 0 ? 'text-green-500' : 'text-red-500'
            )}
          >
            {trend >= 0 ? '+' : ''}
            {trend}%
          </p>
        )}
      </div>
      {icon && <div className="text-gray-400">{icon}</div>}
    </div>
  );
}

export const StatCard = memo(StatCardComponent);