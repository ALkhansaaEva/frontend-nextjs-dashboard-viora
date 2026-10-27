import type { NodeRegistryResponse, RuleNode } from '@/types/rules';

import { cloneNodeConfiguration } from './rule-node-configuration';
import { canConnectPorts } from './rule-ports';
import { canConnect } from './rule-validation';

export interface RuleClipboardNode {
  originalId: string;
  type: string;
  config: Record<string, unknown>;
  relativePosition: { x: number; y: number };
}

export interface RuleClipboardEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface RuleSubgraphClipboard {
  nodes: RuleClipboardNode[];
  edges: RuleClipboardEdge[];
}

interface CanvasNode extends RuleNode {
  position: { x: number; y: number };
}

export interface PastedRuleSubgraph {
  nodes: Array<CanvasNode & { originalId: string }>;
  edges: Array<RuleClipboardEdge & { id: string }>;
}

export function copyRuleSubgraph(
  nodes: CanvasNode[],
  edges: RuleClipboardEdge[],
  selectedNodeIds: readonly string[],
): RuleSubgraphClipboard | null {
  const selected = new Set(selectedNodeIds);
  const picked = nodes.filter((node) => selected.has(node.id));
  if (!picked.length) return null;
  const anchorX = Math.min(...picked.map((node) => node.position.x));
  const anchorY = Math.min(...picked.map((node) => node.position.y));
  return {
    nodes: picked.map((node) => ({
      originalId: node.id,
      type: node.type,
      config: cloneNodeConfiguration(node.config),
      relativePosition: {
        x: node.position.x - anchorX,
        y: node.position.y - anchorY,
      },
    })),
    edges: edges
      .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
      .map((edge) => ({ ...edge })),
  };
}

export function pasteRuleSubgraph(
  clipboard: RuleSubgraphClipboard,
  options: {
    origin: { x: number; y: number };
    registry: NodeRegistryResponse;
    makeNodeId: (type: string) => string;
    existingEdges: Array<{ from: string; to: string }>;
  },
): { ok: true; value: PastedRuleSubgraph } | { ok: false; reason: string } {
  if (!clipboard.nodes.length) return { ok: false, reason: 'The clipboard is empty.' };
  const unknown = clipboard.nodes.find((node) => !options.registry[node.type]);
  if (unknown) {
    return { ok: false, reason: `Node type ${unknown.type} is not available in the loaded registry.` };
  }

  const idMap = new Map<string, string>();
  const nodes = clipboard.nodes.map((node) => {
    const id = options.makeNodeId(node.type);
    idMap.set(node.originalId, id);
    return {
      id,
      originalId: node.originalId,
      type: node.type,
      config: cloneNodeConfiguration(node.config),
      position: {
        x: options.origin.x + node.relativePosition.x,
        y: options.origin.y + node.relativePosition.y,
      },
    };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const checkedEdges = [...options.existingEdges];
  const edges: PastedRuleSubgraph['edges'] = [];
  for (const edge of clipboard.edges) {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return { ok: false, reason: 'Clipboard edge references a missing node.' };
    const sourceNode = byId.get(source)!;
    const targetNode = byId.get(target)!;
    const topology = canConnect(sourceNode, targetNode, options.registry, checkedEdges);
    if (!topology.ok) return { ok: false, reason: topology.reason ?? 'Pasted topology is invalid.' };
    const ports = canConnectPorts(
      sourceNode.type,
      targetNode.type,
      edge.sourceHandle,
      edge.targetHandle,
      options.registry,
    );
    if (!ports.ok) return { ok: false, reason: ports.reason ?? 'Pasted ports are incompatible.' };
    checkedEdges.push({ from: source, to: target });
    edges.push({
      id: `${source}->${target}:${edge.sourceHandle ?? 'default'}:${edge.targetHandle ?? 'default'}`,
      source,
      target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    });
  }
  return { ok: true, value: { nodes, edges } };
}
