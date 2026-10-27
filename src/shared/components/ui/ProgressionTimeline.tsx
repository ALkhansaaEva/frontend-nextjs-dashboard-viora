'use client';

import { memo } from 'react';
import { Gift, Lock } from 'lucide-react';

/**
 * Visual progression timeline — a milestone strip, NOT a React Flow graph.
 * Rule-graph semantics live exclusively in the RuleBuilder; this component
 * only renders ordered level milestones (threshold + reward presence) and
 * reports selection. Direction stays logical left-to-right even under RTL
 * pages so level order reads unambiguously.
 */
export interface ProgressionMilestone {
  level: number;
  /** Display-ready threshold (already string-safe; never coerced here). */
  threshold: string;
  hasReward: boolean;
  /** Optional secondary line (e.g. mic slots, seats). */
  detail?: string;
  /** Optional status badge text (e.g. DRAFT/PUBLISHED). */
  statusText?: string;
}

interface ProgressionTimelineProps {
  milestones: ProgressionMilestone[];
  selectedLevel?: number | null;
  onSelect?: (level: number) => void;
  /** Label under thresholds, default "XP". */
  thresholdLabel?: string;
  disabled?: boolean;
  /** Cap shown as a terminal marker (from the active level-cap policy). */
  maxLevel?: number;
}

function formatThreshold(value: string): string {
  if (!/^[0-9]+$/.test(value)) return value;
  try {
    return BigInt(value).toLocaleString('en-US');
  } catch {
    return value;
  }
}

export const ProgressionTimeline = memo(function ProgressionTimeline({
  milestones,
  selectedLevel,
  onSelect,
  thresholdLabel = 'XP',
  disabled,
  maxLevel,
}: ProgressionTimelineProps) {
  if (!milestones.length) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        No levels configured.
      </p>
    );
  }
  return (
    <div dir="ltr" className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-start gap-0 px-1 pt-2">
        {milestones.map((milestone, index) => {
          const selected = milestone.level === selectedLevel;
          return (
            <li key={milestone.level} className="flex items-start">
              {index > 0 && (
                <div
                  aria-hidden
                  className="mt-4 h-0.5 w-10 shrink-0 bg-gray-300 dark:bg-gray-700"
                />
              )}
              <button
                type="button"
                disabled={disabled || !onSelect}
                onClick={() => onSelect?.(milestone.level)}
                aria-pressed={selected}
                title={`Level ${milestone.level}`}
                className={`group flex w-20 flex-col items-center gap-1 rounded-lg px-1 py-1 text-center transition-colors ${
                  selected
                    ? 'bg-indigo-50 ring-1 ring-indigo-400 dark:bg-indigo-950/40'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  L{milestone.level}
                </span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200">
                  {formatThreshold(milestone.threshold)}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                  {thresholdLabel}
                </span>
                <span className="flex h-4 items-center">
                  {milestone.hasReward ? (
                    <Gift className="h-3.5 w-3.5 text-amber-500" aria-label="Has reward bundle" />
                  ) : (
                    <Lock className="h-3 w-3 text-gray-300 dark:text-gray-600" aria-label="No reward" />
                  )}
                </span>
                {milestone.detail && (
                  <span className="max-w-[76px] truncate text-[10px] text-gray-400">
                    {milestone.detail}
                  </span>
                )}
                {milestone.statusText && (
                  <span className="rounded bg-gray-100 px-1 text-[9px] font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {milestone.statusText}
                  </span>
                )}
              </button>
            </li>
          );
        })}
        {maxLevel !== undefined && maxLevel > milestones.length && (
          <li className="flex items-start" aria-hidden>
            <div className="mt-4 h-0.5 w-10 shrink-0 bg-gray-200 dark:bg-gray-800" />
            <div className="flex w-20 flex-col items-center gap-1 px-1 py-1 text-center opacity-60">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-gray-600">
                L{maxLevel}
              </span>
              <span className="text-[10px] text-gray-400">cap</span>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
});

export default ProgressionTimeline;
