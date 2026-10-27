import type { NodeRegistryResponse, RuleNodeDescriptor } from '@/types/rules';
import { describe, expect, it } from 'vitest';

import { copyRuleSubgraph, pasteRuleSubgraph } from './rule-subgraph-clipboard';

function descriptor(kind: RuleNodeDescriptor['kind']): RuleNodeDescriptor {
  return {
    kind,
    output: kind === 'counter' ? 'number' : kind === 'action' ? 'action' : 'boolean',
    category: kind.toUpperCase() as RuleNodeDescriptor['category'],
    label: kind,
    description: kind,
    minimumInputs: kind === 'trigger' ? 0 : 1,
    maximumInputs: kind === 'trigger' ? 0 : 20,
    configSchema: [],
    inputs: kind === 'trigger' ? [] : [{ key: 'flow', dataType: 'BOOLEAN', required: true }],
    outputs: kind === 'action' ? [] : [{ key: 'flow', dataType: 'BOOLEAN' }],
  };
}

const registry: NodeRegistryResponse = {
  OnMatchWon: descriptor('trigger'),
  Increment: descriptor('counter'),
  CompleteTask: descriptor('action'),
};

describe('rule subgraph clipboard', () => {
  it('copies deep configuration, relative positions, and internal edges only', () => {
    const sourceConfig = { nested: { amount: 2 } };
    const copied = copyRuleSubgraph(
      [
        { id: 'a', type: 'OnMatchWon', config: {}, position: { x: 100, y: 80 } },
        { id: 'b', type: 'Increment', config: sourceConfig, position: { x: 340, y: 120 } },
        { id: 'c', type: 'CompleteTask', config: {}, position: { x: 600, y: 120 } },
      ],
      [
        { source: 'a', target: 'b', sourceHandle: 'flow', targetHandle: 'flow' },
        { source: 'b', target: 'c', sourceHandle: 'flow', targetHandle: 'flow' },
      ],
      ['a', 'b'],
    )!;

    expect(copied.nodes.map((node) => node.relativePosition)).toEqual([
      { x: 0, y: 0 },
      { x: 240, y: 40 },
    ]);
    expect(copied.edges).toHaveLength(1);
    (sourceConfig.nested as { amount: number }).amount = 99;
    expect(copied.nodes[1]!.config).toEqual({ nested: { amount: 2 } });
  });

  it('pastes all nodes and internal edges atomically with new IDs', () => {
    const clipboard = copyRuleSubgraph(
      [
        { id: 'a', type: 'OnMatchWon', config: {}, position: { x: 0, y: 0 } },
        { id: 'b', type: 'Increment', config: { amount: 1 }, position: { x: 200, y: 0 } },
      ],
      [{ source: 'a', target: 'b', sourceHandle: 'flow', targetHandle: 'flow' }],
      ['a', 'b'],
    )!;
    let id = 0;
    const result = pasteRuleSubgraph(clipboard, {
      origin: { x: 50, y: 75 },
      registry,
      makeNodeId: (type) => `${type}_${++id}`,
      existingEdges: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nodes.map((node) => node.id)).toEqual(['OnMatchWon_1', 'Increment_2']);
    expect(result.value.nodes.map((node) => node.position)).toEqual([
      { x: 50, y: 75 },
      { x: 250, y: 75 },
    ]);
    expect(result.value.edges[0]).toMatchObject({ source: 'OnMatchWon_1', target: 'Increment_2' });
  });

  it('rejects an unavailable node type without returning a partial graph', () => {
    const result = pasteRuleSubgraph(
      { nodes: [{ originalId: 'x', type: 'RemovedNode', config: {}, relativePosition: { x: 0, y: 0 } }], edges: [] },
      { origin: { x: 0, y: 0 }, registry, makeNodeId: () => 'x2', existingEdges: [] },
    );
    expect(result).toEqual({ ok: false, reason: 'Node type RemovedNode is not available in the loaded registry.' });
  });
});
