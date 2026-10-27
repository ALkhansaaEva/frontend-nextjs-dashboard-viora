import { describe, expect, it } from 'vitest';
import {
  cloneNodeConfiguration,
  createDefaultNodeConfiguration,
  getNodeConfigurationState,
  summariseNodeConfiguration,
} from './rule-node-configuration';
import type { RuleNodeDescriptor } from '@/types/rules';

function descriptor(
  configSchema: RuleNodeDescriptor['configSchema'],
): RuleNodeDescriptor {
  return {
    kind: 'counter',
    output: 'number',
    minimumInputs: 0,
    maximumInputs: 1,
    label: 'Test node',
    description: 'Test descriptor',
    category: 'COUNTER',
    inputs: [],
    outputs: [{ key: 'value', dataType: 'NUMBER' }],
    configSchema,
  };
}

describe('canonical node configuration state', () => {
  it('treats an empty schema and empty config as ready', () => {
    const node = descriptor([]);

    expect(getNodeConfigurationState(node, {})).toBe(
      'NO_CONFIGURATION_REQUIRED',
    );
    expect(summariseNodeConfiguration(node, {})).toBe('Ready');
  });

  it('treats an empty optional config as valid rather than missing', () => {
    const node = descriptor([
      { key: 'eventType', label: 'Event type', type: 'EVENT_TYPE' },
    ]);

    expect(getNodeConfigurationState(node, {})).toBe(
      'OPTIONAL_CONFIGURATION',
    );
    expect(summariseNodeConfiguration(node, {})).toBe('Optional');
  });

  it('distinguishes incomplete and complete required configuration', () => {
    const node = descriptor([
      { key: 'value', label: 'Value', type: 'STRING', required: true },
    ]);

    expect(getNodeConfigurationState(node, {})).toBe(
      'REQUIRED_CONFIGURATION_INCOMPLETE',
    );
    expect(summariseNodeConfiguration(node, {})).toBe('Not configured');
    expect(getNodeConfigurationState(node, { value: 'ranked' })).toBe(
      'REQUIRED_CONFIGURATION_COMPLETE',
    );
  });

  it('reports values that violate the canonical field schema as invalid', () => {
    const node = descriptor([
      {
        key: 'amount',
        label: 'Amount',
        type: 'INTEGER',
        required: true,
        minimum: 1,
      },
    ]);

    expect(getNodeConfigurationState(node, { amount: 0 })).toBe(
      'INVALID_CONFIGURATION',
    );
    expect(summariseNodeConfiguration(node, { amount: 0 })).toBe(
      'Invalid configuration',
    );
  });

  it('deep-clones nested configuration for duplicate and paste operations', () => {
    const source = { payload: { nested: ['one'] } };
    const copy = cloneNodeConfiguration(source);

    (copy.payload as { nested: string[] }).nested.push('two');

    expect(source).toEqual({ payload: { nested: ['one'] } });
    expect(copy).toEqual({ payload: { nested: ['one', 'two'] } });
  });

  it('initializes only backend-declared defaults for new nodes', () => {
    const node = descriptor([
      {
        key: 'amount',
        label: 'Amount',
        type: 'BIGINT',
        defaultValue: '1',
      },
      { key: 'filter', label: 'Filter', type: 'STRING' },
    ]);

    expect(createDefaultNodeConfiguration(node)).toEqual({ amount: '1' });
  });
});
