import type {
  NodeRegistryResponse,
  RuleNodeDescriptor,
  RuleNodePort,
  RulePortDataType,
} from '@/types/rules';

/**
 * Typed port semantics for the Visual Rule Builder.
 *
 * ARCHITECTURE NOTE — read before changing anything here.
 *
 * The backend Node Registry (modules/gameplay-events/node-registry.service.ts)
 * publishes a real, typed port contract on every descriptor:
 *
 *   trigger    inputs: []                       outputs: flow(BOOLEAN), context(EVENT_CONTEXT)
 *   condition  inputs: flow(BOOLEAN)            outputs: result(BOOLEAN)
 *   logic      inputs: flow(BOOLEAN)            outputs: result(BOOLEAN)
 *   counter    inputs: flow(BOOLEAN)            outputs: value(NUMBER)
 *   aggregation inputs: flow(BOOLEAN)           outputs: value(NUMBER)
 *   window     inputs: flow(BOOLEAN)            outputs: window(WINDOW_CONTEXT)
 *   action     inputs: flow(BOOLEAN, required)  outputs: action(ACTION_FLOW)
 *
 * The backend PERSISTED graph, however, is node-level only:
 *   RuleGraph.edges = Array<{ from: string; to: string }>
 * (contracts/gameplay-event.contract.ts). The compiler derives execution
 * semantics from node KINDS and topology, not from which port an edge landed
 * on. Ports are therefore a *descriptive contract* — they tell the operator
 * what data a node consumes and emits — not a second wiring model.
 *
 * Consequences, deliberately encoded below:
 *  - We render real, labelled, typed handles so the operator can see the
 *    actual data contract (this is what was previously lost: the card drew a
 *    single unnamed source/target pair and silently discarded every descriptor
 *    port, including the trigger's second `context` EVENT_CONTEXT output).
 *  - We DO NOT invent port-level edge persistence. Editor handle choices are
 *    round-tripped through rule metadata (alongside canvasLayout), never
 *    smuggled into the execution graph.
 *  - On load, handles are re-derived deterministically from the descriptors,
 *    so a graph authored outside this editor still renders correctly wired.
 */

/** Display metadata per port data type. Presentation only — types come from the backend. */
export const PORT_TYPE_META: Record<
  RulePortDataType,
  { label: string; short: string; colorClass: string; dotClass: string }
> = {
  BOOLEAN: {
    label: 'Boolean',
    short: 'bool',
    colorClass: 'text-sky-600 dark:text-sky-400',
    dotClass: '!bg-sky-500',
  },
  NUMBER: {
    label: 'Number',
    short: 'num',
    colorClass: 'text-amber-600 dark:text-amber-400',
    dotClass: '!bg-amber-500',
  },
  EVENT_CONTEXT: {
    label: 'Event context',
    short: 'event',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: '!bg-emerald-500',
  },
  WINDOW_CONTEXT: {
    label: 'Window context',
    short: 'window',
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    dotClass: '!bg-fuchsia-500',
  },
  ACTION_FLOW: {
    label: 'Action flow',
    short: 'action',
    colorClass: 'text-rose-600 dark:text-rose-400',
    dotClass: '!bg-rose-500',
  },
};

/**
 * Which source port data types may feed which target port data types.
 *
 * Mirrors what the backend compiler actually accepts: gates are boolean, so a
 * BOOLEAN output satisfies a BOOLEAN input. NUMBER (counter/aggregation
 * output) also lands on a boolean gate because the compiler treats a
 * contributing accumulator edge as a gate edge downstream. EVENT_CONTEXT and
 * WINDOW_CONTEXT are ambient contracts consumed implicitly by downstream
 * nodes rather than gate inputs. ACTION_FLOW is terminal.
 */
const COMPATIBILITY: Record<RulePortDataType, RulePortDataType[]> = {
  BOOLEAN: ['BOOLEAN'],
  NUMBER: ['BOOLEAN'],
  EVENT_CONTEXT: ['BOOLEAN', 'EVENT_CONTEXT'],
  WINDOW_CONTEXT: ['BOOLEAN', 'WINDOW_CONTEXT'],
  ACTION_FLOW: [],
};

export function portsCompatible(source: RulePortDataType, target: RulePortDataType): boolean {
  return (COMPATIBILITY[source] ?? []).includes(target);
}

export function findPort(ports: RuleNodePort[] | undefined, key: string | null | undefined): RuleNodePort | undefined {
  if (!key) return undefined;
  return (ports ?? []).find((port) => port.key === key);
}

/**
 * The port a plain node-level edge should attach to when no explicit handle is
 * recorded. Deterministic so an unlabelled backend graph always renders the
 * same way: first output whose type can drive the target's first input,
 * falling back to the first port of each side.
 */
export function defaultHandlesFor(
  sourceDescriptor: RuleNodeDescriptor | undefined,
  targetDescriptor: RuleNodeDescriptor | undefined,
): { sourceHandle: string | null; targetHandle: string | null } {
  const outputs = sourceDescriptor?.outputs ?? [];
  const inputs = targetDescriptor?.inputs ?? [];
  const firstOutput = outputs[0];
  const firstInput = inputs[0];
  if (!firstOutput || !firstInput) {
    return { sourceHandle: firstOutput?.key ?? null, targetHandle: firstInput?.key ?? null };
  }
  for (const output of outputs) {
    for (const input of inputs) {
      if (portsCompatible(output.dataType, input.dataType)) {
        return { sourceHandle: output.key, targetHandle: input.key };
      }
    }
  }
  return { sourceHandle: firstOutput.key, targetHandle: firstInput.key };
}

/** Returns a real compatible port pair, or null when no safe smart edge exists. */
export function compatibleHandlesFor(
  sourceDescriptor: RuleNodeDescriptor | undefined,
  targetDescriptor: RuleNodeDescriptor | undefined,
): { sourceHandle: string; targetHandle: string } | null {
  for (const output of sourceDescriptor?.outputs ?? []) {
    for (const input of targetDescriptor?.inputs ?? []) {
      if (portsCompatible(output.dataType, input.dataType)) {
        return { sourceHandle: output.key, targetHandle: input.key };
      }
    }
  }
  return null;
}

/**
 * Port-level connection check. Layered ON TOP of the node-level `canConnect`
 * in rule-validation.ts — that one owns cycles/fan-out/duplicate/max-inputs,
 * this one owns "does this port exist and can these two types actually meet".
 * Both are UX assistance; the backend compiler remains the final authority.
 */
export function canConnectPorts(
  sourceType: string,
  targetType: string,
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  registry: NodeRegistryResponse,
): { ok: boolean; reason?: string } {
  const sourceDescriptor = registry[sourceType];
  const targetDescriptor = registry[targetType];
  if (!sourceDescriptor || !targetDescriptor) return { ok: true };

  // No handle recorded (programmatic edge) — nothing port-specific to check.
  if (!sourceHandle && !targetHandle) return { ok: true };

  const outPort = findPort(sourceDescriptor.outputs, sourceHandle);
  if (sourceHandle && !outPort) {
    return { ok: false, reason: `${sourceType} has no output port "${sourceHandle}".` };
  }
  const inPort = findPort(targetDescriptor.inputs, targetHandle);
  if (targetHandle && !inPort) {
    return { ok: false, reason: `${targetType} has no input port "${targetHandle}".` };
  }
  if (!outPort || !inPort) return { ok: true };

  if (!portsCompatible(outPort.dataType, inPort.dataType)) {
    return {
      ok: false,
      reason: `Incompatible ports: ${sourceType}.${outPort.key} emits ${PORT_TYPE_META[outPort.dataType].label}, but ${targetType}.${inPort.key} expects ${PORT_TYPE_META[inPort.dataType].label}.`,
    };
  }
  return { ok: true };
}

/** Vertical offset (percentage) for the nth handle of `total` on a node edge. */
export function handleOffsetPercent(index: number, total: number): number {
  if (total <= 1) return 50;
  const usable = 68; // keep handles inside the rounded card body
  const start = (100 - usable) / 2;
  return start + (usable / (total - 1)) * index;
}
