// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyRewardBundle, type RuleNodeDescriptor } from '@/types/rules';
import { NodeInspector } from './NodeInspector';

const countEvents: RuleNodeDescriptor = {
  kind: 'counter',
  output: 'number',
  minimumInputs: 0,
  maximumInputs: 1,
  label: 'Count Events',
  description: 'Counts each matching event as one progress unit.',
  category: 'COUNTER',
  inputs: [{ key: 'flow', dataType: 'BOOLEAN' }],
  outputs: [{ key: 'value', dataType: 'NUMBER' }],
  configSchema: [],
  runtime:
    'Increments progress by 1 per matched event. No configuration required.',
};

const configuredCondition: RuleNodeDescriptor = {
  kind: 'condition',
  output: 'boolean',
  minimumInputs: 1,
  maximumInputs: 1,
  label: 'Configured condition',
  description: 'A condition with one editable field.',
  category: 'CONDITION',
  inputs: [{ key: 'context', dataType: 'EVENT_CONTEXT', required: true }],
  outputs: [{ key: 'matched', dataType: 'BOOLEAN' }],
  configSchema: [{ key: 'path', label: 'Payload path', type: 'STRING', required: true }],
};

const increment: RuleNodeDescriptor = {
  kind: 'counter',
  output: 'number',
  minimumInputs: 0,
  maximumInputs: 1,
  label: 'Increment',
  description: 'Adds a configured positive amount on each match.',
  category: 'COUNTER',
  inputs: [{ key: 'flow', dataType: 'BOOLEAN' }],
  outputs: [{ key: 'value', dataType: 'NUMBER' }],
  configSchema: [
    {
      key: 'amount',
      label: 'Amount',
      type: 'BIGINT',
      required: false,
      defaultValue: '1',
      minimum: 1,
    },
  ],
  runtime: 'Contributes the configured positive amount to progress.',
};

const inspectorProps = {
  issues: [],
  inputCount: 1,
  rewardBundle: emptyRewardBundle(),
  onChangeConfig: vi.fn(),
  onChangeId: vi.fn(),
  onDelete: vi.fn(),
};

afterEach(() => cleanup());

describe('NodeInspector configuration semantics', () => {
  it('keeps a config-free CountEvents node editable and explains its ready state', () => {
    render(
      <NodeInspector
        node={{ id: 'count_events', type: 'CountEvents', config: {} }}
        descriptor={countEvents}
        {...inspectorProps}
      />,
    );

    expect(
      screen.getByText('Fixed runtime contract — ready to connect.'),
    ).toBeTruthy();
    expect(screen.queryByText('Not configured')).toBeNull();
    expect(screen.getByText('No configuration required')).toBeTruthy();
    expect(screen.getByDisplayValue('count_events')).toBeTruthy();
    expect(screen.getByText('flow')).toBeTruthy();
    expect(screen.getByText('value')).toBeTruthy();
    expect(screen.getByText('Boolean')).toBeTruthy();
    expect(screen.getByText('Number')).toBeTruthy();
  });

  it('renders only the currently selected descriptor after selection changes', () => {
    const { rerender } = render(
      <NodeInspector
        node={{ id: 'node_a', type: 'CountEvents', config: {} }}
        descriptor={countEvents}
        nodeIds={['node_a', 'node_b']}
        {...inspectorProps}
      />,
    );

    expect(screen.getAllByText('Count Events').length).toBeGreaterThan(0);
    rerender(
      <NodeInspector
        node={{ id: 'node_b', type: 'PayloadCondition', config: {} }}
        descriptor={configuredCondition}
        nodeIds={['node_a', 'node_b']}
        {...inspectorProps}
      />,
    );

    expect(screen.queryByText('Count Events')).toBeNull();
    expect(screen.getByText('Configured condition')).toBeTruthy();
    expect(screen.getByText('Payload path *')).toBeTruthy();
    expect(screen.getByText('Not configured')).toBeTruthy();
    expect(screen.getByText('CONDITION')).toBeTruthy();
    expect(screen.getAllByText('PayloadCondition').length).toBeGreaterThan(0);
  });

  it('reports required configuration as complete when the selected node satisfies its schema', () => {
    render(
      <NodeInspector
        node={{ id: 'configured', type: 'PayloadCondition', config: { path: 'payload.score' } }}
        descriptor={configuredCondition}
        nodeIds={['configured']}
        {...inspectorProps}
      />,
    );

    expect(screen.getByText('Configuration complete')).toBeTruthy();
  });

  it('renders the real optional amount input for Increment from its registry schema', () => {
    render(
      <NodeInspector
        node={{ id: 'increment', type: 'Increment', config: { amount: '1' } }}
        descriptor={increment}
        nodeIds={['increment']}
        {...inspectorProps}
      />,
    );

    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('1');
    expect(screen.getByText('Optional configuration')).toBeTruthy();
    expect(screen.queryByText('Fixed runtime contract — ready to connect.')).toBeNull();
  });

  it('keeps configuration callbacks isolated to the selected node id', () => {
    const onChangeConfig = vi.fn();
    render(
      <NodeInspector
        node={{ id: 'selected_only', type: 'PayloadCondition', config: {} }}
        descriptor={configuredCondition}
        nodeIds={['selected_only', 'another_node']}
        {...inspectorProps}
        onChangeConfig={onChangeConfig}
      />,
    );

    fireEvent.change(screen.getByLabelText('Payload path *'), { target: { value: 'payload.score' } });
    expect(onChangeConfig).toHaveBeenCalledWith('selected_only', { path: 'payload.score' });
  });

  it('shows the selected node backend trace including failure and skip context', () => {
    render(
      <NodeInspector
        node={{ id: 'selected_only', type: 'PayloadCondition', config: { path: 'payload.score' } }}
        descriptor={configuredCondition}
        nodeIds={['selected_only']}
        executionResult={{
          order: 2,
          nodeType: 'PayloadCondition',
          status: 'FAILED',
          matched: false,
          inputs: [{ nodeId: 'trigger', status: 'SUCCESS', valueType: 'BOOLEAN', value: 'MATCH_WON' }],
          normalizedConfig: { path: 'payload.score' },
          durationMs: 0.125,
          valueType: 'BOOLEAN',
          errorCode: 'RULE_NODE_EXECUTION_FAILED',
          error: 'Expected an integer value',
        }}
        {...inspectorProps}
      />,
    );

    expect(screen.getByText('Test result')).toBeTruthy();
    expect(screen.getByText('FAILED')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
    expect(screen.getByText('0.125 ms')).toBeTruthy();
    expect(screen.getByText(/trigger: SUCCESS/)).toBeTruthy();
    expect(screen.getByText('RULE_NODE_EXECUTION_FAILED')).toBeTruthy();
    expect(screen.getByText(/Expected an integer value/)).toBeTruthy();
  });

  it('validates an id draft before committing and rejects duplicates', () => {
    const onChangeId = vi.fn();
    render(
      <NodeInspector
        node={{ id: 'current_node', type: 'CountEvents', config: {} }}
        descriptor={countEvents}
        nodeIds={['current_node', 'used_node']}
        {...inspectorProps}
        onChangeId={onChangeId}
      />,
    );

    const input = screen.getByLabelText('Node ID');
    fireEvent.change(input, { target: { value: 'bad id' } });
    fireEvent.blur(input);
    expect(onChangeId).not.toHaveBeenCalled();
    expect(screen.getByText(/Use 1–64 characters/)).toBeTruthy();

    fireEvent.change(input, { target: { value: 'used_node' } });
    fireEvent.blur(input);
    expect(onChangeId).not.toHaveBeenCalled();
    expect(screen.getByText(/already in use/)).toBeTruthy();

    fireEvent.change(input, { target: { value: 'safe_node_2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChangeId).toHaveBeenCalledWith('current_node', 'safe_node_2');
  });
});
