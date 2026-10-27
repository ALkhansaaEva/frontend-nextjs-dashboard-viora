import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Inspector support invariant (spec §1):
 * a backend Node type must NEVER silently exist without usable frontend
 * Inspector support. NodeConfigForm is schema-driven, so the invariant
 * reduces to: every RuleNodeFieldType the backend contract can emit has a
 * render case, and unknown future types degrade to a usable text input
 * instead of crashing. Same source-guard style as the backend's
 * financial-boundary architecture spec.
 *
 * Backend contract source of truth:
 * src/modules/gameplay-events/contracts/gameplay-event.contract.ts
 * (RuleNodeFieldType — 17 variants).
 */
const BACKEND_FIELD_TYPES = [
  'STRING',
  'INTEGER',
  'BIGINT',
  'BOOLEAN',
  'ENUM',
  'MULTI_ENUM',
  'DATE',
  'DATETIME',
  'DURATION',
  'PAYLOAD_PATH',
  'EVENT_TYPE',
  'GAME_TYPE',
  'ITEM_REFERENCE',
  'TASK_REFERENCE',
  'ACHIEVEMENT_REFERENCE',
  'CAMPAIGN_REFERENCE',
  'BADGE_REFERENCE',
] as const;

const formSource = readFileSync(
  join(__dirname, 'NodeConfigForm.tsx'),
  'utf8',
);

describe('NodeConfigForm inspector-support invariant', () => {
  it.each(BACKEND_FIELD_TYPES)(
    'renders every backend contract field type: %s',
    (fieldType) => {
      expect(formSource).toContain(`case '${fieldType}'`);
    },
  );

  it('has a fallback branch so unknown future field types still render', () => {
    // STRING is the shared default input for unrecognized types.
    expect(formSource).toMatch(/case 'STRING'[\s\S]*?default|default[\s\S]*?case 'STRING'/);
  });

  it('references real backend catalog pickers for entity field types', () => {
    expect(formSource).toContain('ItemBadgePicker');
    expect(formSource).toContain('BadgePicker');
    expect(formSource).toContain('ITEM_REFERENCE');
    expect(formSource).toContain('BADGE_REFERENCE');
    expect(formSource).not.toContain('mode="BADGE"');
  });
});

describe('RuleBuilder toolbox category coverage', () => {
  const toolboxSource = readFileSync(
    join(__dirname, '../rule-builder/NodeToolbox.tsx'),
    'utf8',
  );
  const KINDS = ['trigger', 'condition', 'logic', 'counter', 'aggregation', 'window', 'action'];

  it('groups nodes by backend descriptor kind (registry-driven, no hardcoded catalog)', () => {
    expect(toolboxSource).toContain('descriptor.kind');
    expect(toolboxSource).toContain('registry');
  });

  it.each(KINDS)('backend node kind "%s" is part of the contract union', (kind) => {
    const typesSource = readFileSync(
      join(__dirname, '../../../types/rules.ts'),
      'utf8',
    );
    expect(typesSource).toContain(`'${kind}'`);
  });
});
