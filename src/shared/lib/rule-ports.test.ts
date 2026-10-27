import { describe, expect, it } from 'vitest';
import {
  portsCompatible,
  defaultHandlesFor,
  canConnectPorts,
  compatibleHandlesFor,
  findPort,
} from '@/shared/lib/rule-ports';
import type { NodeRegistryResponse, RuleNodeDescriptor } from '@/types/rules';

const triggerDescriptor: RuleNodeDescriptor = {
  kind: 'trigger',
  output: 'boolean',
  minimumInputs: 0,
  maximumInputs: 0,
  label: 'On Match Won',
  description: '',
  category: 'TRIGGER',
  inputs: [],
  outputs: [
    { key: 'flow', dataType: 'BOOLEAN' },
    { key: 'context', dataType: 'EVENT_CONTEXT' },
  ],
  configSchema: [],
};

const conditionDescriptor: RuleNodeDescriptor = {
  kind: 'condition',
  output: 'boolean',
  minimumInputs: 0,
  maximumInputs: 1,
  label: 'Game Type Equals',
  description: '',
  category: 'CONDITION',
  inputs: [{ key: 'flow', dataType: 'BOOLEAN', required: false }],
  outputs: [{ key: 'result', dataType: 'BOOLEAN' }],
  configSchema: [],
};

const counterDescriptor: RuleNodeDescriptor = {
  kind: 'counter',
  output: 'number',
  minimumInputs: 0,
  maximumInputs: 1,
  label: 'Count Wins',
  description: '',
  category: 'COUNTER',
  inputs: [{ key: 'flow', dataType: 'BOOLEAN', required: false }],
  outputs: [{ key: 'value', dataType: 'NUMBER' }],
  configSchema: [],
};

const actionDescriptor: RuleNodeDescriptor = {
  kind: 'action',
  output: 'action',
  minimumInputs: 1,
  maximumInputs: 20,
  label: 'Complete Task',
  description: '',
  category: 'ACTION',
  inputs: [{ key: 'flow', dataType: 'BOOLEAN', required: true }],
  outputs: [{ key: 'action', dataType: 'ACTION_FLOW' }],
  configSchema: [],
};

const registry: NodeRegistryResponse = {
  OnMatchWon: triggerDescriptor,
  GameTypeEquals: conditionDescriptor,
  CountWins: counterDescriptor,
  CompleteTask: actionDescriptor,
};

describe('rule-ports', () => {
  it('BOOLEAN drives BOOLEAN gates', () => {
    expect(portsCompatible('BOOLEAN', 'BOOLEAN')).toBe(true);
  });

  it('NUMBER (accumulator) lands on boolean gates per compiler semantics', () => {
    expect(portsCompatible('NUMBER', 'BOOLEAN')).toBe(true);
  });

  it('EVENT_CONTEXT is ambient: feeds gates but never window ports', () => {
    expect(portsCompatible('EVENT_CONTEXT', 'BOOLEAN')).toBe(true);
    expect(portsCompatible('EVENT_CONTEXT', 'WINDOW_CONTEXT')).toBe(false);
  });

  it('ACTION_FLOW is terminal and drives nothing', () => {
    expect(portsCompatible('ACTION_FLOW', 'BOOLEAN')).toBe(false);
  });

  it('derives deterministic default handles for unlabelled edges', () => {
    const handles = defaultHandlesFor(triggerDescriptor, conditionDescriptor);
    expect(handles.sourceHandle).toBe('flow');
    expect(handles.targetHandle).toBe('flow');
  });

  it('finds a safe compatible pair for smart node insertion', () => {
    expect(compatibleHandlesFor(triggerDescriptor, conditionDescriptor)).toEqual({
      sourceHandle: 'flow',
      targetHandle: 'flow',
    });
    expect(compatibleHandlesFor(actionDescriptor, conditionDescriptor)).toBeNull();
  });

  it('rejects connections from unknown source ports', () => {
    const result = canConnectPorts('OnMatchWon', 'GameTypeEquals', 'nope', 'flow', registry);
    expect(result.ok).toBe(false);
  });

  it('rejects incompatible port types', () => {
    // ACTION_FLOW is terminal — it cannot drive a boolean gate input.
    const result = canConnectPorts('CompleteTask', 'GameTypeEquals', 'action', 'flow', registry);
    expect(result.ok).toBe(false);
  });

  it('accepts compatible typed connections', () => {
    const result = canConnectPorts('OnMatchWon', 'GameTypeEquals', 'flow', 'flow', registry);
    expect(result.ok).toBe(true);
  });

  it('passes through unregistered node types (fallback never blocks)', () => {
    const result = canConnectPorts('MysteryNode', 'GameTypeEquals', 'x', 'flow', registry);
    expect(result.ok).toBe(true);
  });

  it('findPort returns undefined for missing keys', () => {
    expect(findPort(triggerDescriptor.outputs, 'missing')).toBeUndefined();
    expect(findPort(undefined, 'flow')).toBeUndefined();
  });
});
