/**
 * Client-side mirror of the backend rule compiler.
 *
 * Mirrors RuleCompilerService.compile / validateNodeConfig so an admin sees the
 * same failures before submitting. This is a CONVENIENCE layer only: the backend
 * compiler (`POST /admin/rules/validate-graph`) is authoritative and its errors
 * always win. Nothing here may accept a graph the backend would reject, and
 * nothing here may reject a graph the backend would accept.
 *
 * Ported from the visual Rule Builder prototype (viora-admin-dashboard-modernize-0642fe)
 * and adjusted to import from the canonical V2 contract module (`@/types/rules`).
 * Logic is otherwise unchanged — this file is entirely reward-model-agnostic.
 */
import type {
  RuleGraph,
  RuleNode,
  RuleNodeDescriptor,
  RuleNodeKind,
  NodeRegistryResponse,
} from '@/types/rules';
import {
  checkRuleNodeFieldValue,
  isConfigurationValueMissing,
} from '@/shared/lib/rule-node-configuration';

/** Mirrors backend RULE_GRAPH_LIMITS (rule-compiler.service.ts) — kept local
 * since V2's types/rules.ts does not re-export it yet. */
export const RULE_GRAPH_LIMITS = {
  minNodes: 2,
  maxNodes: 100,
  maxEdges: 300,
  maxDepth: 20,
  maxFanOut: 10,
  maxActions: 10,
  maxConditions: 40,
  maxCounters: 20,
  maxWindows: 1,
  maxAccumulators: 1,
  maxNodeConfigBytes: 8192,
  nodeIdPattern: /^[A-Za-z0-9_-]{1,64}$/,
  payloadPathPattern: /^payload(?:\.[A-Za-z0-9_-]+){1,8}$/,
} as const;
const L = RULE_GRAPH_LIMITS;

export type RuleIssueSeverity = 'error' | 'warning';

export interface RuleIssue {
  severity: RuleIssueSeverity;
  code: string;
  message: string;
  /** Set when the issue can be attributed to one node, so the canvas can flag it. */
  nodeId?: string;
}

/** Returns an operator-facing error for an editable node id, or null when safe. */
export function getRuleNodeIdError(
  nextId: string,
  existingNodeIds: Iterable<string>,
  currentId?: string,
): string | null {
  if (!L.nodeIdPattern.test(nextId)) {
    return 'Use 1–64 characters: A–Z, a–z, 0–9, _ or -.';
  }
  for (const id of existingNodeIds) {
    if (id === nextId && id !== currentId) return `Node ID “${nextId}” is already in use.`;
  }
  return null;
}

function err(code: string, message: string, nodeId?: string): RuleIssue {
  return { severity: 'error', code, message, nodeId };
}

/**
 * Validates a node's config against its OWN descriptor.configSchema — the same
 * metadata the Inspector renders fields from, so a config the Inspector can
 * produce can never fail a check this function invents.
 */
export function validateNodeConfig(node: RuleNode, descriptor: RuleNodeDescriptor | undefined): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const config = node.config ?? {};

  for (const field of descriptor?.configSchema ?? []) {
    const value = config[field.key];
    if (isConfigurationValueMissing(value)) {
      if (field.required) {
        issues.push(err('REQUIRED_FIELD', `"${node.id}" requires "${field.label}".`, node.id));
      }
      continue;
    }
    const issue = checkRuleNodeFieldValue(field, value);
    if (issue) issues.push(err('INVALID_FIELD', `"${node.id}": ${issue}`, node.id));
  }

  // Cross-field ordering: a node with exactly two DATETIME fields is a
  // start/end pair (e.g. TimeWindowActive) — generalised so no node type is
  // named here directly.
  const dateFields = (descriptor?.configSchema ?? []).filter((field) => field.type === 'DATETIME');
  if (dateFields.length === 2) {
    const startField = dateFields[0]!;
    const endField = dateFields[1]!;
    const startMs = Date.parse(String(config[startField.key] ?? ''));
    const endMs = Date.parse(String(config[endField.key] ?? ''));
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && startMs >= endMs) {
      issues.push(err('INVALID_TIME_WINDOW', `"${node.id}": "${startField.label}" must be before "${endField.label}".`, node.id));
    }
  }

  if (JSON.stringify(config).length > L.maxNodeConfigBytes) {
    issues.push(err('CONFIG_TOO_LARGE', `"${node.id}" configuration exceeds ${L.maxNodeConfigBytes} bytes.`, node.id));
  }

  return issues;
}

/**
 * Full graph validation. Returns every issue found rather than throwing on the
 * first, so the validation panel can list them all at once.
 */
export function validateRuleGraph(graph: RuleGraph, registry: NodeRegistryResponse): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  if (nodes.length < L.minNodes) {
    issues.push(err('TOO_FEW_NODES', `A rule needs at least ${L.minNodes} nodes.`));
  }
  if (nodes.length > L.maxNodes) {
    issues.push(err('TOO_MANY_NODES', `A rule may not exceed ${L.maxNodes} nodes.`));
  }
  if (edges.length > L.maxEdges) {
    issues.push(err('TOO_MANY_EDGES', `A rule may not exceed ${L.maxEdges} edges.`));
  }

  const byId = new Map<string, RuleNode>();
  // Only these three kinds carry a per-kind cap in the backend compiler.
  const counts = { action: 0, condition: 0, counter: 0 };
  const isCappedKind = (kind: RuleNodeKind): kind is keyof typeof counts =>
    kind === 'action' || kind === 'condition' || kind === 'counter';

  for (const node of nodes) {
    if (!L.nodeIdPattern.test(node.id)) {
      issues.push(err('INVALID_NODE_ID', `Node id "${node.id}" must be 1–64 chars of A–Z, a–z, 0–9, _ or -.`, node.id));
      continue;
    }
    if (byId.has(node.id)) {
      issues.push(err('DUPLICATE_NODE_ID', `Node id "${node.id}" is used more than once.`, node.id));
      continue;
    }
    const descriptor = registry[node.type];
    if (!descriptor) {
      issues.push(err('UNKNOWN_NODE', `Unknown rule node type "${node.type}".`, node.id));
      continue;
    }
    if (isCappedKind(descriptor.kind)) counts[descriptor.kind] += 1;
    byId.set(node.id, node);
    issues.push(...validateNodeConfig(node, descriptor));
  }

  if (counts.action > L.maxActions) {
    issues.push(err('TOO_MANY_ACTIONS', `A rule may not exceed ${L.maxActions} action nodes.`));
  }
  if (counts.condition > L.maxConditions) {
    issues.push(err('TOO_MANY_CONDITIONS', `A rule may not exceed ${L.maxConditions} condition nodes.`));
  }
  if (counts.counter > L.maxCounters) {
    issues.push(err('TOO_MANY_COUNTERS', `A rule may not exceed ${L.maxCounters} counter nodes.`));
  }

  // ── Edges ────────────────────────────────────────────────────────────────
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) {
      issues.push(err('INVALID_EDGE', `Edge ${edge.from} → ${edge.to} references a node that does not exist.`));
      continue;
    }
    if (edge.from === edge.to) {
      issues.push(err('SELF_EDGE', `Node "${edge.from}" cannot connect to itself.`, edge.from));
      continue;
    }
    const list = outgoing.get(edge.from) ?? [];
    if (list.includes(edge.to)) continue; // backend de-duplicates silently
    if (list.length >= L.maxFanOut) {
      issues.push(err('FAN_OUT_EXCEEDED', `Node "${edge.from}" exceeds the maximum fan-out of ${L.maxFanOut}.`, edge.from));
      continue;
    }
    list.push(edge.to);
    outgoing.set(edge.from, list);
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge.from]);
  }

  const kindOf = (id: string): RuleNodeKind | undefined => {
    const node = byId.get(id);
    return node ? registry[node.type]?.kind : undefined;
  };

  // ── Topological order, cycles and depth ─────────────────────────────────
  const indegree = new Map<string, number>([...byId.keys()].map((id) => [id, 0]));
  for (const [, targets] of outgoing) {
    for (const target of targets) indegree.set(target, (indegree.get(target) ?? 0) + 1);
  }

  const roots = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
  const ordered: string[] = [];
  if (byId.size > 0 && roots.length === 0) {
    issues.push(err('CYCLE_DETECTED', 'The rule graph contains a cycle.'));
  } else {
    const queue = roots.map((id) => ({ id, depth: 1 }));
    const working = new Map(indegree);
    let depthExceeded = false;
    while (queue.length) {
      const current = queue.shift()!;
      if (current.depth > L.maxDepth && !depthExceeded) {
        depthExceeded = true;
        issues.push(err('MAX_DEPTH_EXCEEDED', `The rule graph exceeds the maximum depth of ${L.maxDepth}.`, current.id));
      }
      ordered.push(current.id);
      for (const next of outgoing.get(current.id) ?? []) {
        const degree = (working.get(next) ?? 1) - 1;
        working.set(next, degree);
        if (degree === 0) queue.push({ id: next, depth: current.depth + 1 });
      }
    }
    if (ordered.length !== byId.size) {
      issues.push(err('CYCLE_DETECTED', 'The rule graph contains a cycle.'));
    }
  }

  // ── Structural requirements ─────────────────────────────────────────────
  const triggers = [...byId.keys()].filter((id) => kindOf(id) === 'trigger');
  const actions = [...byId.keys()].filter((id) => kindOf(id) === 'action');
  const windows = [...byId.keys()].filter((id) => kindOf(id) === 'window');
  const accumulators = [...byId.keys()].filter((id) => {
    const kind = kindOf(id);
    return kind === 'counter' || kind === 'aggregation';
  });

  if (byId.size > 0 && triggers.length === 0) {
    issues.push(err('MISSING_TRIGGER', 'A rule requires at least one trigger node.'));
  }
  if (byId.size > 0 && actions.length === 0) {
    issues.push(err('MISSING_ACTION', 'A rule requires at least one action node.'));
  }
  if (windows.length > L.maxWindows) {
    issues.push(err('TOO_MANY_WINDOWS', 'A rule supports at most one window node.'));
  }
  if (accumulators.length > L.maxAccumulators) {
    issues.push(err('TOO_MANY_ACCUMULATORS', 'A rule supports at most one counter or aggregation node.'));
  }

  // ── Per-node connection rules ───────────────────────────────────────────
  for (const [id, node] of byId) {
    const descriptor = registry[node.type];
    if (!descriptor) continue;
    const inputs = incoming.get(id) ?? [];

    if (descriptor.kind === 'logic') {
      if (inputs.length < descriptor.minimumInputs || inputs.length > descriptor.maximumInputs) {
        issues.push(err(
          'INVALID_INPUT_COUNT',
          `"${id}" accepts ${descriptor.minimumInputs}–${descriptor.maximumInputs} inputs but has ${inputs.length}.`,
          id,
        ));
      }
      const nonBoolean = inputs.filter((input) => {
        const kind = kindOf(input);
        return !kind || !['condition', 'logic', 'trigger'].includes(kind);
      });
      if (nonBoolean.length) {
        issues.push(err('INVALID_CONNECTION', `Logic node "${id}" requires boolean inputs (trigger, condition or logic).`, id));
      }
    }

    if (descriptor.kind === 'action' && inputs.length === 0) {
      issues.push(err('ACTION_NOT_CONNECTED', `Action node "${id}" must be connected.`, id));
    }
  }

  // ── Reachability ────────────────────────────────────────────────────────
  if (actions.length > 0) {
    const actionSet = new Set(actions);
    for (const id of byId.keys()) {
      if (!reaches(id, actionSet, outgoing)) {
        issues.push(err('NODE_WITHOUT_ACTION', `Node "${id}" does not contribute to an action.`, id));
      }
    }
  }
  if (triggers.length > 0) {
    const triggerSet = new Set(triggers);
    for (const action of actions) {
      if (!hasAncestor(action, triggerSet, incoming)) {
        issues.push(err('ACTION_UNREACHABLE', `Action node "${action}" is not reachable from a trigger.`, action));
      }
    }
  }

  return issues;
}

function reaches(start: string, targets: Set<string>, outgoing: Map<string, string[]>): boolean {
  const pending = [start];
  const seen = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (targets.has(current)) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...(outgoing.get(current) ?? []));
  }
  return false;
}

function hasAncestor(start: string, targets: Set<string>, incoming: Map<string, string[]>): boolean {
  const pending = [...(incoming.get(start) ?? [])];
  const seen = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (targets.has(current)) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...(incoming.get(current) ?? []));
  }
  return false;
}

/**
 * Whether an edge may be drawn, used to reject connections during the drag
 * instead of after the fact. Mirrors the compiler's structural constraints.
 */
export function canConnect(
  source: RuleNode,
  target: RuleNode,
  registry: NodeRegistryResponse,
  existingEdges: { from: string; to: string }[],
): { ok: boolean; reason?: string } {
  if (source.id === target.id) return { ok: false, reason: 'A node cannot connect to itself.' };

  const sourceKind = registry[source.type]?.kind;
  const targetDescriptor = registry[target.type];
  if (!sourceKind || !targetDescriptor) return { ok: false, reason: 'Unknown node type.' };

  if (existingEdges.some((e) => e.from === source.id && e.to === target.id)) {
    return { ok: false, reason: 'These nodes are already connected.' };
  }
  if (targetDescriptor.kind === 'trigger') {
    return { ok: false, reason: 'Triggers are entry points and cannot take inputs.' };
  }
  if (targetDescriptor.maximumInputs === 0) {
    return { ok: false, reason: `${target.type} does not accept inputs.` };
  }

  const fanOut = existingEdges.filter((e) => e.from === source.id).length;
  if (fanOut >= L.maxFanOut) {
    return { ok: false, reason: `Maximum fan-out of ${L.maxFanOut} reached for this node.` };
  }

  const inputs = existingEdges.filter((e) => e.to === target.id).length;
  if (inputs >= targetDescriptor.maximumInputs) {
    return { ok: false, reason: `${target.type} accepts at most ${targetDescriptor.maximumInputs} input(s).` };
  }

  if (targetDescriptor.kind === 'logic' && !['condition', 'logic', 'trigger'].includes(sourceKind)) {
    return { ok: false, reason: 'Logic nodes require boolean inputs.' };
  }

  // Would this edge close a cycle?
  if (createsCycle(source.id, target.id, existingEdges)) {
    return { ok: false, reason: 'This connection would create a cycle.' };
  }

  return { ok: true };
}

/**
 * Attributes a backend compiler error to specific nodes.
 *
 * RuleCompilerService embeds the offending node id in most of its messages,
 * e.g. `Node abc_1 requires a bounded payload path`, `Action node x must be
 * connected`, `Logic node y requires boolean inputs`. Extracting those ids lets
 * the canvas highlight exactly what the backend rejected rather than showing a
 * bare toast.
 *
 * `knownNodeIds` guards against false positives — only ids that actually exist
 * on the canvas are returned.
 */
export function attributeServerError(message: string, knownNodeIds: Iterable<string>): string[] {
  const known = new Set(knownNodeIds);
  const matched = new Set<string>();

  // "Node X ...", "Action node X ...", "Logic node X ..."
  const nodePattern = /\b(?:action |logic )?node\s+"?([A-Za-z0-9_-]{1,64})"?/gi;
  for (const match of message.matchAll(nodePattern)) {
    const candidate = match[1];
    if (candidate && known.has(candidate)) matched.add(candidate);
  }

  // Fall back to any bare token that happens to be a known node id.
  if (matched.size === 0) {
    for (const token of message.split(/[^A-Za-z0-9_-]+/)) {
      if (token && known.has(token)) matched.add(token);
    }
  }

  return [...matched];
}

function createsCycle(from: string, to: string, edges: { from: string; to: string }[]): boolean {
  // A cycle appears when `from` is already reachable from `to`.
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }
  return reaches(to, new Set([from]), outgoing);
}
