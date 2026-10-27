import type { RuleNodeDescriptor, RuleNodeFieldSchema } from '@/types/rules';

export type NodeConfigurationState =
  | 'NO_CONFIGURATION_REQUIRED'
  | 'OPTIONAL_CONFIGURATION'
  | 'REQUIRED_CONFIGURATION_COMPLETE'
  | 'REQUIRED_CONFIGURATION_INCOMPLETE'
  | 'INVALID_CONFIGURATION';

export function cloneNodeConfiguration(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return structuredClone(config);
}

export function createDefaultNodeConfiguration(
  descriptor: RuleNodeDescriptor,
): Record<string, unknown> {
  return Object.fromEntries(
    (descriptor.configSchema ?? [])
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.key, structuredClone(field.defaultValue)]),
  );
}

export function isConfigurationValueMissing(value: unknown): boolean {
  return (
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function checkRuleNodeFieldValue(
  field: RuleNodeFieldSchema,
  value: unknown,
): string | null {
  switch (field.type) {
    case 'INTEGER': {
      const num = Number(value);
      if (!Number.isSafeInteger(num))
        return `"${field.label}" must be a whole number.`;
      if (field.minimum != null && num < field.minimum)
        return `"${field.label}" must be at least ${field.minimum}.`;
      if (field.maximum != null && num > field.maximum)
        return `"${field.label}" must be at most ${field.maximum}.`;
      return null;
    }
    case 'BIGINT': {
      const pattern = field.pattern ? new RegExp(field.pattern) : /^-?[0-9]+$/;
      if (!pattern.test(String(value)))
        return `"${field.label}" must be an integer.`;
      const parsed = BigInt(String(value));
      if (field.minimum != null && parsed < BigInt(field.minimum))
        return `"${field.label}" must be at least ${field.minimum}.`;
      if (field.maximum != null && parsed > BigInt(field.maximum))
        return `"${field.label}" must be at most ${field.maximum}.`;
      return null;
    }
    case 'BOOLEAN':
      return typeof value === 'boolean'
        ? null
        : `"${field.label}" must be true or false.`;
    case 'PAYLOAD_PATH': {
      const pattern = field.pattern
        ? new RegExp(field.pattern)
        : /^payload(?:\.[A-Za-z0-9_-]+){1,8}$/;
      return pattern.test(String(value))
        ? null
        : `"${field.label}" must be a bounded payload path such as payload.score.`;
    }
    case 'DATE':
    case 'DATETIME':
      return Number.isNaN(Date.parse(String(value)))
        ? `"${field.label}" must be a valid date/time.`
        : null;
    case 'ENUM':
    case 'EVENT_TYPE':
    case 'GAME_TYPE':
      return field.enumValues?.length &&
        !field.enumValues.includes(String(value))
        ? `"${field.label}" is not a recognised value.`
        : null;
    case 'MULTI_ENUM':
      if (!Array.isArray(value))
        return `"${field.label}" must be a list of values.`;
      return field.enumValues?.length &&
        value.some((item) => !field.enumValues!.includes(String(item)))
        ? `"${field.label}" contains an unrecognised value.`
        : null;
    default: {
      const str = String(value);
      if (field.minLength != null && str.length < field.minLength)
        return `"${field.label}" is too short.`;
      if (field.maxLength != null && str.length > field.maxLength)
        return `"${field.label}" is too long.`;
      if (field.pattern && !new RegExp(field.pattern).test(str))
        return `"${field.label}" has an invalid format.`;
      return null;
    }
  }
}

export function getNodeConfigurationState(
  descriptor: RuleNodeDescriptor,
  config: Record<string, unknown> = {},
): NodeConfigurationState {
  const fields = descriptor.configSchema ?? [];
  if (fields.length === 0) return 'NO_CONFIGURATION_REQUIRED';

  const visibleFields = fields.filter(
    (field) =>
      !field.visibleWhen ||
      config[field.visibleWhen.field] === field.visibleWhen.equals,
  );
  if (
    visibleFields.some(
      (field) =>
        field.required && isConfigurationValueMissing(config[field.key]),
    )
  ) {
    return 'REQUIRED_CONFIGURATION_INCOMPLETE';
  }
  if (
    visibleFields.some(
      (field) =>
        !isConfigurationValueMissing(config[field.key]) &&
        checkRuleNodeFieldValue(field, config[field.key]) !== null,
    )
  ) {
    return 'INVALID_CONFIGURATION';
  }
  return visibleFields.some((field) => field.required)
    ? 'REQUIRED_CONFIGURATION_COMPLETE'
    : 'OPTIONAL_CONFIGURATION';
}

export function summariseNodeConfiguration(
  descriptor: RuleNodeDescriptor,
  config: Record<string, unknown> = {},
): string {
  const state = getNodeConfigurationState(descriptor, config);
  if (state === 'NO_CONFIGURATION_REQUIRED') return 'Ready';
  if (state === 'REQUIRED_CONFIGURATION_INCOMPLETE') return 'Not configured';
  if (state === 'INVALID_CONFIGURATION') return 'Invalid configuration';

  const summary = Object.entries(config)
    .filter(([, value]) => !isConfigurationValueMissing(value))
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');

  return summary || (state === 'OPTIONAL_CONFIGURATION' ? 'Optional' : 'Configured');
}
