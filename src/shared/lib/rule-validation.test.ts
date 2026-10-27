import { describe, expect, it } from 'vitest';
import { validateRuleGraph, canConnect, RULE_GRAPH_LIMITS } from '@/shared/lib/rule-validation';
import type { NodeRegistryResponse, RuleNodeDescriptor } from '@/types/rules';

function descriptor(kind: RuleNodeDescriptor['kind'], over: Partial<RuleNodeDescriptor> = {}): RuleNodeDescriptor {
  return {
    kind,
    output: kind === 'counter' ? 'number' : kind === 'window' ? 'window' : kind === 'action' ? 'action' : 'boolean',
    minimumInputs: kind === 'action' ? 1 : 0,
    maximumInputs: kind === 'action' ? 20 : kind === 'trigger' ? 0 : 1,
    label: kind,
    description: '',
    category: kind.toUpperCase() as RuleNodeDescriptor['category'],
    inputs: kind === 'trigger' ? [] : [{ key: 'flow', dataType: 'BOOLEAN', required: kind === 'action' }],
    outputs: [{ key: 'out', dataType: 'BOOLEAN' }],
    configSchema: [],
    ...over,
  };
}

const registry: NodeRegistryResponse = {
  OnMatchWon: descriptor('trigger'),
  GameTypeEquals: descriptor('condition'),
  CountWins: descriptor('counter'),
  Daily: descriptor('window'),
  CompleteTask: descriptor('action'),
};

const validGraph = {
  nodes: [
    { id: 't1', type: 'OnMatchWon', config: {} },
    { id: 'c1', type: 'GameTypeEquals', config: { value: 'ludo' } },
    { id: 'k1', type: 'CountWins', config: {} },
    { id: 'w1', type: 'Daily', config: {} },
    { id: 'a1', type: 'CompleteTask', config: {} },
  ],
  edges: [
    { from: 't1', to: 'c1' },
    { from: 'c1', to: 'k1' },
    { from: 'k1', to: 'w1' },
    { from: 'w1', to: 'a1' },
  ],
};

describe('rule-validation', () => {
  it('accepts the canonical win-3-ludo chain', () => {
    const issues = validateRuleGraph(validGraph, registry);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('flags a missing trigger', () => {
    const graph = {
      nodes: [
        { id: 'a1', type: 'CompleteTask', config: {} },
        { id: 'c1', type: 'GameTypeEquals', config: {} },
      ],
      edges: [{ from: 'c1', to: 'a1' }],
    };
    const issues = validateRuleGraph(graph, registry);
    expect(issues.some((i) => /trigger/i.test(i.message))).toBe(true);
  });

  it('flags a missing action', () => {
    const graph = {
      nodes: [{ id: 't1', type: 'OnMatchWon', config: {} }],
      edges: [],
    };
    const issues = validateRuleGraph(graph, registry);
    expect(issues.some((i) => /action/i.test(i.message))).toBe(true);
  });

  it('flags self loops', () => {
    const graph = {
      nodes: [
        { id: 't1', type: 'OnMatchWon', config: {} },
        { id: 'c1', type: 'GameTypeEquals', config: {} },
        { id: 'a1', type: 'CompleteTask', config: {} },
      ],
      edges: [
        { from: 't1', to: 'c1' },
        { from: 'c1', to: 'c1' },
        { from: 'c1', to: 'a1' },
      ],
    };
    const issues = validateRuleGraph(graph, registry);
    expect(issues.some((i) => /self/i.test(i.message))).toBe(true);
  });

  it('dedupes parallel edges like the backend compiler (silent de-dup)', () => {
    const graph = {
      nodes: [
        { id: 't1', type: 'OnMatchWon', config: {} },
        { id: 'a1', type: 'CompleteTask', config: {} },
      ],
      edges: [
        { from: 't1', to: 'a1' },
        { from: 't1', to: 'a1' },
      ],
    };
    const issues = validateRuleGraph(graph, registry);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('canConnect blocks an already-existing connection', () => {
    const result = canConnect(
      { id: 't1', type: 'OnMatchWon', config: {} },
      { id: 'a1', type: 'CompleteTask', config: {} },
      registry,
      [{ from: 't1', to: 'a1' }],
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already connected/i);
  });

  it('flags cycles', () => {
    const graph = {
      nodes: [
        { id: 't1', type: 'OnMatchWon', config: {} },
        { id: 'c1', type: 'GameTypeEquals', config: {} },
        { id: 'c2', type: 'GameTypeEquals', config: {} },
        { id: 'a1', type: 'CompleteTask', config: {} },
      ],
      edges: [
        { from: 't1', to: 'c1' },
        { from: 'c1', to: 'c2' },
        { from: 'c2', to: 'c1' },
        { from: 'c2', to: 'a1' },
      ],
    };
    const issues = validateRuleGraph(graph, registry);
    expect(issues.some((i) => /cycle/i.test(i.message))).toBe(true);
  });

  it('flags unknown node types', () => {
    const graph = {
      nodes: [
        { id: 't1', type: 'OnMatchWon', config: {} },
        { id: 'x1', type: 'NotARealNode', config: {} },
        { id: 'a1', type: 'CompleteTask', config: {} },
      ],
      edges: [
        { from: 't1', to: 'x1' },
        { from: 'x1', to: 'a1' },
      ],
    };
    const issues = validateRuleGraph(graph, registry);
    expect(issues.some((i) => /unknown/i.test(i.message))).toBe(true);
  });

  it('canConnect rejects connections into triggers', () => {
    const result = canConnect(
      { id: 'c1', type: 'GameTypeEquals', config: {} },
      { id: 't1', type: 'OnMatchWon', config: {} },
      registry,
      [],
    );
    expect(result.ok).toBe(false);
  });

  it('exposes sane graph limits', () => {
    expect(RULE_GRAPH_LIMITS.maxNodes).toBeGreaterThan(1);
  });
});
