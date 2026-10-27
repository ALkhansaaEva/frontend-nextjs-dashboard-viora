import type { RuleGraph } from '@/types/rules';

/**
 * Canvas-only node positions, kept OUT of `graphDefinition` (the backend
 * compiler input) and stashed in `RuleDefinition.metadata.canvasLayout`
 * instead — a free-form JSONB field the backend never reads for compilation
 * (see RuleCompilerService.compile, which only touches graphDefinition).
 *
 * This keeps the execution graph and the visual layout genuinely separate:
 * losing/discarding layout can never change what a rule does.
 */
export type CanvasLayout = Record<string, { x: number; y: number }>;

export interface CanvasPosition {
  x: number;
  y: number;
}

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 105;
const NODE_COLLISION_WIDTH = 210;
const NODE_COLLISION_HEIGHT = 96;

/**
 * Finds the nearest deterministic free slot for a newly inserted node.
 * React Flow allows overlapping drops, but an Admin author should never lose a
 * freshly added node underneath another card. Existing positions remain
 * untouched; only the new card is nudged down and then into the next column.
 */
export function findAvailableNodePosition(
  preferred: CanvasPosition,
  occupied: CanvasPosition[],
): CanvasPosition {
  let candidate = { ...preferred };
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const collides = occupied.some(
      (position) =>
        Math.abs(position.x - candidate.x) < NODE_COLLISION_WIDTH &&
        Math.abs(position.y - candidate.y) < NODE_COLLISION_HEIGHT,
    );
    if (!collides) return candidate;
    candidate =
      (attempt + 1) % 8 === 0
        ? { x: candidate.x + COLUMN_WIDTH, y: preferred.y }
        : { x: candidate.x, y: candidate.y + ROW_HEIGHT };
  }
  return candidate;
}

/**
 * Deterministic layered layout for a graph with no stored positions: each
 * node's column is its longest-path distance from a root (in-degree 0) node,
 * so triggers sit on the left and actions drift right as the visual builder
 * expects. Nodes within a column stack top-to-bottom in graph order.
 */
export function autoLayoutGraph(graph: RuleGraph): CanvasLayout {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const layout: CanvasLayout = {};
  if (nodes.length === 0) return layout;

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const edge of edges) {
    if (!indegree.has(edge.from) || !indegree.has(edge.to)) continue;
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];
  for (const node of nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      depth.set(node.id, 0);
      queue.push(node.id);
    }
  }
  // Nodes unreachable as roots (shouldn't happen in a valid graph, but a
  // mid-edit graph can be transiently disconnected) still get a column.
  let cursor = 0;
  while (cursor < queue.length) {
    const id = queue[cursor++]!;
    const d = depth.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      const nextDepth = Math.max(depth.get(next) ?? 0, d + 1);
      if (!depth.has(next) || nextDepth > (depth.get(next) ?? 0)) {
        depth.set(next, nextDepth);
      }
      if (!queue.includes(next)) queue.push(next);
    }
  }
  for (const node of nodes) if (!depth.has(node.id)) depth.set(node.id, 0);

  const rowByColumn = new Map<number, number>();
  for (const node of nodes) {
    const column = depth.get(node.id) ?? 0;
    const row = rowByColumn.get(column) ?? 0;
    rowByColumn.set(column, row + 1);
    layout[node.id] = { x: 80 + column * COLUMN_WIDTH, y: 80 + row * ROW_HEIGHT };
  }
  return layout;
}

/** Merges a stored layout with auto-placement for any node it doesn't cover
 * (new nodes added since the layout was last saved, or a graph saved before
 * layout persistence existed). */
export function resolveLayout(graph: RuleGraph, stored: CanvasLayout | undefined | null): CanvasLayout {
  const auto = autoLayoutGraph(graph);
  if (!stored) return auto;
  const merged: CanvasLayout = { ...auto };
  for (const node of graph.nodes ?? []) {
    const position = stored[node.id];
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      merged[node.id] = position;
    }
  }
  return merged;
}
