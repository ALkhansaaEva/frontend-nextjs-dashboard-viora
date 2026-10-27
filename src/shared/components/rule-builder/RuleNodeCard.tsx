'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { NODE_KIND_META, humaniseNodeType } from '@/shared/config/rule-nodes';
import { PORT_TYPE_META, handleOffsetPercent } from '@/shared/lib/rule-ports';
import { summariseNodeConfiguration } from '@/shared/lib/rule-node-configuration';
import type { RuleNodeDescriptor, RuleNodeExecutionResult, RuleNodePort } from '@/types/rules';

export interface RuleNodeCardData extends Record<string, unknown> {
  type: string;
  descriptor: RuleNodeDescriptor;
  config: Record<string, unknown>;
  /** Error count attributed to this node by the validator. */
  issueCount: number;
  summary?: string;
  /** Non-persistent backend preview result for this node instance. */
  execution?: RuleNodeExecutionResult;
}

const EXECUTION_META = {
  SUCCESS: { label: 'Success', border: 'border-emerald-500', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  NO_OP: { label: 'No-op', border: 'border-sky-500', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  FALSE_GATE: { label: 'False gate', border: 'border-amber-500', badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  SKIPPED_UPSTREAM: { label: 'Skipped', border: 'border-slate-400', badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
  FAILED: { label: 'Failed', border: 'border-red-600', badge: 'bg-red-500/15 text-red-700 dark:text-red-300' },
} as const;

/**
 * A single node on the rule canvas.
 *
 * Handles are rendered ONE PER DESCRIPTOR PORT, using the port key as the
 * React Flow handle id and the port's backend `dataType` for colour/label.
 *
 * This previously drew a single unnamed target handle on the left and a single
 * unnamed source handle on the right, gated only on `maximumInputs > 0` /
 * `kind === 'action'`. That discarded the entire published port contract — most
 * visibly the trigger's second output, `context` (EVENT_CONTEXT), which is the
 * port every downstream node reads event fields from. With no `context` handle
 * there was no way to express or even see event-context propagation on the
 * canvas, and every edge was untyped.
 *
 * Ports are a descriptive contract, not a second wiring model — see the
 * architecture note in shared/lib/rule-ports.ts before changing this.
 */
function RuleNodeCardComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as RuleNodeCardData;
  const { descriptor, type, issueCount } = nodeData;
  const summary =
    nodeData.summary ??
    summariseNodeConfiguration(descriptor, nodeData.config);
  const meta = NODE_KIND_META[descriptor.kind];
  const hasIssues = issueCount > 0;
  const executionMeta = nodeData.execution ? EXECUTION_META[nodeData.execution.status] : null;

  const inputs = descriptor.inputs ?? [];
  const outputs = descriptor.outputs ?? [];
  // Reserve vertical room so multi-port nodes never overlap their own handles.
  const portRows = Math.max(inputs.length, outputs.length);
  const minHeight = portRows > 1 ? 22 + portRows * 17 : undefined;

  return (
    <div
      data-rule-node-id={id}
      className={cn(
        'relative min-w-[156px] max-w-[188px] rounded-lg border bg-white text-gray-900 sm:min-w-[168px] sm:max-w-[210px]',
        'shadow-md transition-[border-color,box-shadow] duration-150 dark:bg-slate-800 dark:text-slate-50 dark:shadow-black/30',
        hasIssues ? 'border-red-500/70' : executionMeta?.border ?? meta.borderClass,
        selected && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-950',
      )}
      style={minHeight ? { minHeight } : undefined}
    >
      {inputs.map((port, index) => (
        <PortHandle
          key={`in-${port.key}`}
          port={port}
          direction="target"
          index={index}
          total={inputs.length}
          showLabel={inputs.length > 1}
        />
      ))}

      <div className="px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1',
              meta.chipClass,
            )}
          >
            {descriptor.kind}
          </span>
          <div className="flex items-center gap-1.5">
            {executionMeta && (
              <span
                className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase', executionMeta.badge)}
                title={`Preview: ${nodeData.execution?.status}`}
              >
                {executionMeta.label}
              </span>
            )}
            {hasIssues && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400"
                title={`${issueCount} validation ${issueCount === 1 ? 'issue' : 'issues'}`}
              >
                <AlertCircle className="h-3 w-3" />
                {issueCount}
              </span>
            )}
          </div>
        </div>

        <p className="mt-1 truncate text-[13px] font-semibold text-gray-900 dark:text-white" title={type}>
          {descriptor.label || humaniseNodeType(type)}
        </p>

        {summary ? (
          <p className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-gray-400" title={summary}>
            {summary}
          </p>
        ) : (
          <p className="mt-0.5 text-[10px] italic text-gray-400 dark:text-gray-500">Not configured</p>
        )}
      </div>

      {outputs.map((port, index) => (
        <PortHandle
          key={`out-${port.key}`}
          port={port}
          direction="source"
          index={index}
          total={outputs.length}
          showLabel={outputs.length > 1}
        />
      ))}
    </div>
  );
}

/**
 * One descriptor port rendered as a real React Flow handle.
 * `id` is the backend port key so edges carry which port they attached to.
 */
function PortHandle({
  port,
  direction,
  index,
  total,
  showLabel,
}: {
  port: RuleNodePort;
  direction: 'source' | 'target';
  index: number;
  total: number;
  showLabel: boolean;
}) {
  const typeMeta = PORT_TYPE_META[port.dataType];
  const isSource = direction === 'source';
  const top = `${handleOffsetPercent(index, total)}%`;
  const title = `${port.key} · ${typeMeta.label}${port.required ? ' (required)' : ''}${
    port.description ? ` — ${port.description}` : ''
  }`;

  return (
    <>
      <Handle
        id={port.key}
        type={direction}
        position={isSource ? Position.Right : Position.Left}
        style={{ top }}
        title={title}
        className={cn(
          '!h-2.5 !w-2.5 !border-2 !border-white dark:!border-gray-900',
          typeMeta.dotClass,
          port.required && '!ring-2 !ring-rose-400/50',
        )}
      />
      {showLabel && (
        <span
          className={cn(
            'pointer-events-none absolute text-[9px] font-medium leading-none',
            typeMeta.colorClass,
            isSource ? 'right-4 text-right' : 'left-4',
          )}
          style={{ top, transform: 'translateY(-50%)' }}
        >
          {port.key}
        </span>
      )}
    </>
  );
}

export const RuleNodeCard = memo(RuleNodeCardComponent);
export default RuleNodeCard;
