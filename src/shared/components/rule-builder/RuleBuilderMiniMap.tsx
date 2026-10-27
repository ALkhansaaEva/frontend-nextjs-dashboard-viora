'use client';

import { MiniMap, type Node } from '@xyflow/react';
import type { RuleNodeCardData } from './RuleNodeCard';

const KIND_COLORS = {
  trigger: '#4f46e5',
  condition: '#0891b2',
  logic: '#7c3aed',
  counter: '#d97706',
  aggregation: '#ea580c',
  window: '#0284c7',
  action: '#059669',
} as const;

const EXECUTION_COLORS = {
  SUCCESS: '#10b981',
  NO_OP: '#0ea5e9',
  FALSE_GATE: '#f59e0b',
  SKIPPED_UPSTREAM: '#94a3b8',
  FAILED: '#ef4444',
} as const;

export function ruleMiniMapNodeColor(node: Node): string {
  const data = node.data as RuleNodeCardData | undefined;
  if (data?.execution) return EXECUTION_COLORS[data.execution.status];
  const descriptor = data?.descriptor;
  return descriptor ? KIND_COLORS[descriptor.kind] : '#64748b';
}

/**
 * Responsive MiniMap presentation kept separate from RuleBuilder so its
 * viewport contract can be regression-tested without mounting the full graph.
 */
export const RULE_BUILDER_MINIMAP_CLASS_NAME = [
  'block',
  '!bottom-3 !right-3 !m-0',
  '!h-20 !w-28',
  'sm:!h-20 sm:!w-28',
  'md:!h-24 md:!w-36',
  '2xl:!h-28 2xl:!w-44',
  '!overflow-hidden !rounded-lg !border !border-gray-200 !bg-white/90 !shadow-sm',
  'dark:!border-gray-700 dark:!bg-gray-900/90',
].join(' ');

export function RuleBuilderMiniMap({ isDark }: { isDark: boolean }) {
  return (
    <MiniMap
      position="bottom-right"
      pannable
      zoomable
      nodeColor={ruleMiniMapNodeColor}
      nodeStrokeWidth={1}
      nodeStrokeColor={isDark ? '#e2e8f0' : '#334155'}
      nodeBorderRadius={6}
      maskColor={isDark ? 'rgba(3, 7, 18, 0.56)' : 'rgba(248, 250, 252, 0.58)'}
      maskStrokeColor={isDark ? '#818cf8' : '#4f46e5'}
      maskStrokeWidth={1.5}
      className={RULE_BUILDER_MINIMAP_CLASS_NAME}
    />
  );
}

export default RuleBuilderMiniMap;
