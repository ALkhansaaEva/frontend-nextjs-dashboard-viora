// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => ({
  MiniMap: ({
    pannable,
    zoomable,
    nodeStrokeWidth,
    nodeStrokeColor,
    maskColor,
    maskStrokeColor,
    className,
    position,
  }: {
    pannable?: boolean;
    zoomable?: boolean;
    nodeStrokeWidth?: number;
    nodeStrokeColor?: string;
    maskColor?: string;
    maskStrokeColor?: string;
    className?: string;
    position?: string;
  }) => (
    <div
      data-testid="rule-builder-minimap"
      data-pannable={String(Boolean(pannable))}
      data-zoomable={String(Boolean(zoomable))}
      data-node-stroke-width={String(nodeStrokeWidth)}
      data-node-stroke-color={nodeStrokeColor}
      data-mask-color={maskColor}
      data-mask-stroke-color={maskStrokeColor}
      data-position={position}
      className={className}
    />
  ),
}));

import {
  RULE_BUILDER_MINIMAP_CLASS_NAME,
  RuleBuilderMiniMap,
  ruleMiniMapNodeColor,
} from './RuleBuilderMiniMap';

afterEach(() => cleanup());

describe('RuleBuilderMiniMap', () => {
  it('renders as a compact pannable and zoomable canvas aid', () => {
    render(<RuleBuilderMiniMap isDark={false} />);

    const minimap = screen.getByTestId('rule-builder-minimap');
    expect(minimap.getAttribute('data-pannable')).toBe('true');
    expect(minimap.getAttribute('data-zoomable')).toBe('true');
    expect(minimap.getAttribute('data-node-stroke-width')).toBe('1');
    expect(minimap.getAttribute('data-mask-color')).toBe('rgba(248, 250, 252, 0.58)');
    expect(minimap.getAttribute('data-node-stroke-color')).toBe('#334155');
    expect(minimap.getAttribute('data-mask-stroke-color')).toBe('#4f46e5');
    expect(minimap.getAttribute('data-position')).toBe('bottom-right');
  });

  it('keeps bounded responsive dimensions and a dark-mode surface', () => {
    render(<RuleBuilderMiniMap isDark />);

    const minimap = screen.getByTestId('rule-builder-minimap');
    expect(minimap.className).toBe(RULE_BUILDER_MINIMAP_CLASS_NAME);
    expect(minimap.className).toContain('block');
    expect(minimap.className).toContain('!h-20 !w-28');
    expect(minimap.className).toContain('sm:!h-20 sm:!w-28');
    expect(minimap.className).toContain('md:!h-24 md:!w-36');
    expect(minimap.className).toContain('2xl:!h-28 2xl:!w-44');
    expect(minimap.className).toContain('dark:!bg-gray-900/90');
    expect(minimap.getAttribute('data-mask-color')).toBe('rgba(3, 7, 18, 0.56)');
    expect(minimap.getAttribute('data-node-stroke-color')).toBe('#e2e8f0');
  });

  it('uses the registry node kind instead of an inaccurate single black color', () => {
    expect(
      ruleMiniMapNodeColor({ data: { descriptor: { kind: 'trigger' } } } as never),
    ).toBe('#4f46e5');
    expect(
      ruleMiniMapNodeColor({ data: { descriptor: { kind: 'action' } } } as never),
    ).toBe('#059669');
    expect(ruleMiniMapNodeColor({ data: {} } as never)).toBe('#64748b');
  });
});
