import { describe, expect, it } from 'vitest';
import {
  autoLayoutGraph,
  findAvailableNodePosition,
  resolveLayout,
  type CanvasLayout,
} from '@/lib/admin/rule-canvas-layout';
import type { RuleGraph } from '@/types/rules';

const graph: RuleGraph = {
  nodes: [
    { id: 't1', type: 'OnMatchWon', config: {} },
    { id: 'c1', type: 'GameTypeEquals', config: {} },
    { id: 'a1', type: 'CompleteTask', config: {} },
  ],
  edges: [
    { from: 't1', to: 'c1' },
    { from: 'c1', to: 'a1' },
  ],
};

describe('rule-canvas-layout (canvas metadata separation)', () => {
  it('auto layout produces a position for every node', () => {
    const layout = autoLayoutGraph(graph);
    for (const node of graph.nodes) {
      expect(layout[node.id]).toBeDefined();
      expect(Number.isFinite(layout[node.id]!.x)).toBe(true);
      expect(Number.isFinite(layout[node.id]!.y)).toBe(true);
    }
  });

  it('auto layout is deterministic', () => {
    expect(autoLayoutGraph(graph)).toEqual(autoLayoutGraph(graph));
  });

  it('stored canvas metadata wins over auto layout (round-trip)', () => {
    const stored: CanvasLayout = { t1: { x: 42, y: 7 }, c1: { x: 100, y: 200 } };
    const resolved = resolveLayout(graph, stored);
    expect(resolved.t1).toEqual({ x: 42, y: 7 });
    expect(resolved.c1).toEqual({ x: 100, y: 200 });
    expect(resolved.a1).toBeDefined();
  });

  it('missing/empty stored metadata falls back cleanly', () => {
    const resolved = resolveLayout(graph, null);
    expect(Object.keys(resolved)).toHaveLength(graph.nodes.length);
  });

  it('nudges a newly inserted node away from occupied cards', () => {
    expect(findAvailableNodePosition({ x: 80, y: 80 }, [{ x: 80, y: 80 }])).toEqual({ x: 80, y: 185 });
  });

  it('keeps an already free insertion point unchanged', () => {
    expect(findAvailableNodePosition({ x: 320, y: 80 }, [{ x: 80, y: 80 }])).toEqual({ x: 320, y: 80 });
  });
});
