"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  Copy,
  History,
  Info,
  Loader2,
  Rocket,
  Save,
  ShieldCheck,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { gsap } from "gsap";

import { cn } from "@/shared/lib/utils";
import { useVioraTheme } from "@/components/providers/theme-provider";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import rulesService from "@/services/rules.service";
import apiClient from "@/lib/api/api-client";
import {
  autoLayoutGraph,
  findAvailableNodePosition,
  resolveLayout,
  type CanvasLayout,
} from "@/lib/admin/rule-canvas-layout";
import {
  attributeServerError,
  canConnect,
  getRuleNodeIdError,
  validateRuleGraph,
  type RuleIssue,
} from "@/shared/lib/rule-validation";
import { humaniseNodeType } from "@/shared/config/rule-nodes";
import {
  canConnectPorts,
  compatibleHandlesFor,
  defaultHandlesFor,
} from "@/shared/lib/rule-ports";
import { getRuleAdminActions } from "@/shared/lib/rule-lifecycle";
import { buildMatchingRulePreviewFields } from "@/shared/lib/rule-preview-fixture";
import {
  copyRuleSubgraph,
  pasteRuleSubgraph,
  type RuleSubgraphClipboard,
} from "@/shared/lib/rule-subgraph-clipboard";
import {
  cloneNodeConfiguration,
  createDefaultNodeConfiguration,
  summariseNodeConfiguration,
} from "@/shared/lib/rule-node-configuration";
import {
  RULE_IDENTITY,
  normalizeDefinitionKeyInput,
  emptyRewardBundle,
  validateRewardBundleClientSide,
  extractRulePreviewEvaluation,
  type CompiledRuleEvaluation,
  type GameplayEventEnvelope,
  type NodeRegistryResponse,
  type RewardBundleV2,
  type RuleDefinition,
  type RuleDefinitionKind,
  type RuleGraph,
  type RuleNodeDescriptor,
  type RuleNode as RuleGraphNode,
} from "@/types/rules";

import { NodeToolbox } from "./NodeToolbox";
import { NodeInspector } from "./NodeInspector";
import { RuleBuilderMiniMap } from "./RuleBuilderMiniMap";
import { RuleBottomPanel, type RoundTripResult } from "./RuleBottomPanel";
import { RuleNodeCard, type RuleNodeCardData } from "./RuleNodeCard";

const nodeTypes = { ruleNode: RuleNodeCard };
// React Flow synchronises several object props into its internal store. Keep
// them referentially stable so a parent render cannot start a store-update /
// render feedback loop.
const DEFAULT_EDGE_OPTIONS = {
  type: "smoothstep",
  style: { strokeWidth: 1.5 },
} as const;
const FIT_VIEW_OPTIONS = { padding: 0.22, maxZoom: 1.05 } as const;
const SNAP_GRID: [number, number] = [12, 12];
const PRO_OPTIONS = { hideAttribution: true } as const;
const EDITABLE_STATES: ReadonlyArray<RuleDefinition["state"]> = ["DRAFT"];

/**
 * Generic fallback for a node type the frontend registry snapshot does not
 * know — a node the backend added after this bundle was built, or a legacy
 * type. It MUST still render with usable handles, otherwise a newer backend
 * node silently becomes an unconnectable dead box on the canvas. Generic
 * boolean flow in/out matches what every non-trigger node actually exposes.
 */
function unknownNodeDescriptor(type: string): RuleNodeDescriptor {
  return {
    kind: "condition",
    output: "boolean",
    minimumInputs: 0,
    maximumInputs: 20,
    label: humaniseNodeType(type),
    description:
      "This node type is not in the loaded registry snapshot. Its configuration is passed through unchanged.",
    category: "CONDITION",
    inputs: [
      {
        key: "flow",
        dataType: "BOOLEAN",
        required: false,
        description: "Upstream gate",
      },
    ],
    outputs: [{ key: "result", dataType: "BOOLEAN", description: "Result" }],
    configSchema: [],
  };
}

interface RuleIdentity {
  definitionKey: string;
  definitionVersion: number;
  kind: RuleDefinitionKind;
  targetCount: string;
}

export interface RuleBuilderProps {
  /** Opens an existing rule (by id) instead of starting a fresh draft. */
  ruleId?: string;
  /** Fixes `kind` and hides the Kind selector — used when embedded under a
   * domain page (Achievements = ACHIEVEMENT, Tasks = TASK) that owns the kind. */
  lockKind?: RuleDefinitionKind;
  /** Prefills the definition key (e.g. derived from an Achievement/Task code). */
  initialDefinitionKey?: string;
  /** Hides the identity row entirely — the embedding editor renders its own
   * Basic Info fields and passes the resulting key/version/target down instead. */
  hideIdentity?: boolean;
  identity?: {
    definitionKey: string;
    definitionVersion: number;
    targetCount: string;
  };
  /** Canonical MediaFile id selected/uploaded by the embedding editor. */
  mediaId?: string | null;
  /** Forces read-only regardless of rule state (e.g. `achievements.read` without
   * `achievements.write`). PUBLISHED/DISABLED/ARCHIVED/ROLLED_BACK rules are
   * always read-only in addition to this. */
  readOnly?: boolean;
  /** Merged into `metadata` on create (alongside the internal `canvasLayout`) —
   * lets an embedding editor (Achievement/Task title, description, isHidden, …)
   * ride along in the same freeform JSONB column without RuleBuilder knowing
   * anything about those domain fields. */
  extraMetadata?: Record<string, unknown>;
  /** Fired after every successful save/validate/publish/disable/rollback/version-switch. */
  onRuleChange?: (rule: RuleDefinition | null) => void;
  /** Synchronises an embedding editor after the backend creates the next DRAFT. */
  onNewVersionDraft?: (definitionVersion: number) => void;
  className?: string;
}

/** Order-independent canonical form, so comparison ignores incidental ordering. */
function canonicalise(graph: RuleGraph): string {
  const nodes = [...(graph.nodes ?? [])]
    .map((node) => ({
      id: node.id,
      type: node.type,
      config: sortKeys(node.config ?? {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...(graph.edges ?? [])]
    .map((edge) => `${edge.from}->${edge.to}`)
    .sort();
  return JSON.stringify({ nodes, edges });
}

function sortKeys(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function isRewardBundleV2Shape(value: unknown): value is RewardBundleV2 {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).version === 2 &&
    Array.isArray((value as Record<string, unknown>).components)
  );
}

/** Compares the server's stored graph against the local canvas (post save/validate). */
function compareGraphs(
  local: RuleGraph,
  stored: RuleGraph | undefined | null,
): RoundTripResult {
  if (!stored) {
    return {
      matches: false,
      detail: "The server response contained no graph definition to compare.",
    };
  }
  const localNodes = local.nodes?.length ?? 0;
  const storedNodes = stored.nodes?.length ?? 0;
  const localEdges = local.edges?.length ?? 0;
  const storedEdges = stored.edges?.length ?? 0;

  if (canonicalise(local) === canonicalise(stored)) {
    return {
      matches: true,
      detail: `Server stored ${storedNodes} node(s) and ${storedEdges} edge(s), identical to the canvas.`,
    };
  }
  return {
    matches: false,
    detail: `Canvas has ${localNodes} node(s)/${localEdges} edge(s); server stored ${storedNodes}/${storedEdges}. Re-save before publishing.`,
  };
}

function RuleBuilderInner({
  ruleId,
  lockKind,
  initialDefinitionKey,
  hideIdentity,
  identity: identityOverride,
  mediaId,
  readOnly: readOnlyProp,
  extraMetadata,
  onRuleChange,
  onNewVersionDraft,
  className,
}: RuleBuilderProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { isDark } = useVioraTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const previewTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const [registry, setRegistry] = useState<NodeRegistryResponse>({});
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState<
    Node<RuleNodeCardData>
  >([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [mobilePane, setMobilePane] = useState<
    "library" | "canvas" | "inspector"
  >("canvas");

  const [identity, setIdentity] = useState<RuleIdentity>({
    definitionKey: normalizeDefinitionKeyInput(initialDefinitionKey ?? ""),
    definitionVersion: 1,
    kind: lockKind ?? "TASK",
    targetCount: "1",
  });

  const [rule, setRule] = useState<RuleDefinition | null>(null);
  const [versions, setVersions] = useState<
    Array<{ id: string; definitionVersion: number; state: string }>
  >([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorNodeIds, setServerErrorNodeIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<CompiledRuleEvaluation | null>(
    null,
  );
  const [busy, setBusy] = useState<
    | null
    | "load"
    | "save"
    | "validate"
    | "publish"
    | "activate"
    | "disable"
    | "archive"
    | "preview"
    | "newVersion"
  >(ruleId ? "load" : null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [rewardBundle, setRewardBundle] =
    useState<RewardBundleV2>(emptyRewardBundle());
  const [roundTrip, setRoundTrip] = useState<RoundTripResult | null>(null);
  const [savedDraftFingerprint, setSavedDraftFingerprint] = useState<
    string | null
  >(null);
  const pendingBaselineRuleIdRef = useRef<string | null>(null);
  // ── Editor history (bounded), clipboard, context menu — editor-only state ─
  // Never touches persisted graph semantics: snapshots are canvas + config.
  type GraphSnapshot = {
    nodes: Node<RuleNodeCardData>[];
    edges: Edge[];
    layout: CanvasLayout;
  };
  const HISTORY_LIMIT = 50;
  const pastRef = useRef<GraphSnapshot[]>([]);
  const futureRef = useRef<GraphSnapshot[]>([]);
  const clipboardRef = useRef<RuleSubgraphClipboard | null>(null);
  const [historyDepth, setHistoryDepth] = useState(0);
  const [menu, setMenu] = useState<
    | { kind: "canvas"; x: number; y: number }
    | { kind: "node"; x: number; y: number; nodeId: string }
    | { kind: "edge"; x: number; y: number; edgeId: string }
    | null
  >(null);

  const idCounter = useRef(0);
  const layoutRef = useRef<CanvasLayout>({});

  // ── Load the authoritative node registry ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await rulesService.getNodeRegistry();
        if (!cancelled) setRegistry(result ?? {});
      } catch (error) {
        if (!cancelled) {
          setRegistryError(
            error instanceof Error
              ? error.message
              : "Could not load the node registry from the backend.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingRegistry(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Selector option sources (backend-derived, loaded once) ───────────────
  // EVENT_TYPE options come from the registry's own trigger descriptors —
  // never a hardcoded frontend event catalog. GAME_TYPE options come from
  // the game catalog endpoint.
  const eventTypeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const descriptor of Object.values(registry)) {
      if (
        descriptor.kind === "trigger" &&
        descriptor.consumesEvent &&
        descriptor.consumesEvent !== "ANY"
      )
        types.add(descriptor.consumesEvent);
    }
    return [...types].sort();
  }, [registry]);

  const [gameTypeOptions, setGameTypeOptions] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ games: Array<{ gameType: string }> }>("/games")
      .then((response) => {
        if (!cancelled)
          setGameTypeOptions(
            (response.games ?? []).map((game) => game.gameType),
          );
      })
      .catch(() => {
        /* GAME_TYPE fields fall back to free text when the catalog is unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Hydrate an existing rule from the canvas/registry ───────────────────
  const hydrate = useCallback(
    (loaded: RuleDefinition, registrySnapshot: NodeRegistryResponse) => {
      const layout = resolveLayout(
        loaded.graphDefinition,
        (loaded.metadata?.canvasLayout as CanvasLayout | undefined) ?? null,
      );
      layoutRef.current = layout;
      const nextNodes: Node<RuleNodeCardData>[] = (
        loaded.graphDefinition.nodes ?? []
      ).map((node) => ({
        id: node.id,
        type: "ruleNode",
        position: layout[node.id] ?? { x: 0, y: 0 },
        data: {
          type: node.type,
          descriptor:
            registrySnapshot[node.type] ?? unknownNodeDescriptor(node.type),
          config: node.config ?? {},
          issueCount: 0,
        },
      }));
      // Backend edges are node-level (`{from,to}`); the port each end attached
      // to is editor-side metadata. Prefer the recorded handles, else derive
      // them deterministically from the descriptors so an externally-authored
      // graph still renders correctly wired. See shared/lib/rule-ports.ts.
      const storedHandles = (loaded.metadata?.canvasEdgePorts ?? {}) as Record<
        string,
        { sourceHandle?: string | null; targetHandle?: string | null }
      >;
      const nextEdges: Edge[] = (loaded.graphDefinition.edges ?? []).map(
        (edge) => {
          const id = `${edge.from}->${edge.to}`;
          const sourceType = loaded.graphDefinition.nodes?.find(
            (n) => n.id === edge.from,
          )?.type;
          const targetType = loaded.graphDefinition.nodes?.find(
            (n) => n.id === edge.to,
          )?.type;
          const derived = defaultHandlesFor(
            sourceType ? registrySnapshot[sourceType] : undefined,
            targetType ? registrySnapshot[targetType] : undefined,
          );
          const stored = storedHandles[id];
          return {
            id,
            source: edge.from,
            target: edge.to,
            sourceHandle: stored?.sourceHandle ?? derived.sourceHandle,
            targetHandle: stored?.targetHandle ?? derived.targetHandle,
            animated: false,
          };
        },
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setIdentity({
        definitionKey: loaded.definitionKey,
        definitionVersion: loaded.definitionVersion,
        kind: loaded.kind,
        targetCount: loaded.targetCount,
      });
      setRewardBundle(
        isRewardBundleV2Shape(loaded.rewardDefinition)
          ? loaded.rewardDefinition
          : emptyRewardBundle(),
      );
      pendingBaselineRuleIdRef.current = loaded.id;
      setRule(loaded);
      setEvaluation(null);
      setRoundTrip(null);
      onRuleChange?.(loaded);
    },
    [setNodes, setEdges, onRuleChange],
  );

  useEffect(() => {
    if (!ruleId || isLoadingRegistry) return;
    let cancelled = false;
    setBusy("load");
    rulesService
      .getRuleById(ruleId)
      .then((loaded) => {
        if (cancelled) return;
        hydrate(loaded, registry);
        return rulesService.listVersions(loaded.definitionKey).catch(() => []);
      })
      .then((history) => {
        if (!cancelled && history) {
          setVersions(
            history.map((v) => ({
              id: v.id,
              definitionVersion: v.definitionVersion,
              state: v.state,
            })),
          );
        }
      })
      .catch((error) => {
        if (!cancelled)
          setServerError(
            error instanceof Error ? error.message : "Failed to load rule.",
          );
      })
      .finally(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId, isLoadingRegistry]);

  useEffect(
    () => () => {
      previewTimelineRef.current?.kill();
    },
    [],
  );

  // ── Canvas <-> RuleGraph ────────────────────────────────────────────────
  const graph: RuleGraph = useMemo(
    () => ({
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.type,
        config: node.data.config ?? {},
      })),
      edges: edges.map((edge) => ({ from: edge.source, to: edge.target })),
    }),
    [nodes, edges],
  );

  /**
   * Editor-side record of which descriptor port each edge end attached to,
   * keyed by the same `from->to` id the hydrator rebuilds. Persisted in rule
   * metadata, NOT in graphDefinition — the backend execution graph is
   * node-level (`{from,to}`) and must stay that way.
   */
  const edgePortMap = useMemo(
    () =>
      edges.reduce<
        Record<
          string,
          { sourceHandle: string | null; targetHandle: string | null }
        >
      >((acc, edge) => {
        acc[`${edge.source}->${edge.target}`] = {
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
        };
        return acc;
      }, {}),
    [edges],
  );

  const issues: RuleIssue[] = useMemo(() => {
    if (isLoadingRegistry || !Object.keys(registry).length) return [];
    if (!graph.nodes.length) return [];
    return validateRuleGraph(graph, registry);
  }, [graph, registry, isLoadingRegistry]);

  /** Action node types currently on the canvas — drives the reward-binding UI. */
  const actionTypes = useMemo(
    () =>
      nodes
        .filter((node) => registry[node.data.type]?.kind === "action")
        .map((node) => node.data.type),
    [nodes, registry],
  );

  const rewardIssues = useMemo(
    () => validateRewardBundleClientSide(rewardBundle),
    [rewardBundle],
  );

  const effectiveIdentity: RuleIdentity = useMemo(
    () =>
      identityOverride
        ? { ...identity, ...identityOverride, kind: lockKind ?? identity.kind }
        : identity,
    [identity, identityOverride, lockKind],
  );

  const currentDraftFingerprint = useMemo(
    () =>
      JSON.stringify({
        identity: effectiveIdentity,
        graph: canonicalise(graph),
        rewardBundle,
        extraMetadata: extraMetadata ?? {},
        mediaId: mediaId ?? null,
        layout: nodes
          .map((node) => ({
            id: node.id,
            x: node.position.x,
            y: node.position.y,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        edgePortMap,
      }),
    [
      effectiveIdentity,
      graph,
      rewardBundle,
      extraMetadata,
      mediaId,
      nodes,
      edgePortMap,
    ],
  );
  const isDirty =
    !rule ||
    (rule.state === "DRAFT" &&
      savedDraftFingerprint !== currentDraftFingerprint);

  useEffect(() => {
    if (pendingBaselineRuleIdRef.current !== rule?.id) return;
    pendingBaselineRuleIdRef.current = null;
    setSavedDraftFingerprint(currentDraftFingerprint);
  }, [currentDraftFingerprint, rule?.id]);

  useEffect(() => {
    if (!isDirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isDirty]);

  /** Identity rules enforced by RuleDefinitionService.create. */
  const identityIssues = useMemo(() => {
    const list: string[] = [];
    if (
      effectiveIdentity.definitionKey &&
      !RULE_IDENTITY.keyPattern.test(effectiveIdentity.definitionKey)
    ) {
      list.push(
        "Definition key must be 3–120 lowercase characters: a–z, 0–9, underscore, dot or hyphen; it must start with a letter or number.",
      );
    }
    if (!RULE_IDENTITY.targetCountPattern.test(effectiveIdentity.targetCount)) {
      list.push("Target count must be a positive integer.");
    }
    return list;
  }, [effectiveIdentity]);

  const issuesByNode = useMemo(() => {
    const map = new Map<string, RuleIssue[]>();
    for (const issue of issues) {
      if (!issue.nodeId) continue;
      map.set(issue.nodeId, [...(map.get(issue.nodeId) ?? []), issue]);
    }
    for (const nodeId of serverErrorNodeIds) {
      map.set(nodeId, [
        ...(map.get(nodeId) ?? []),
        {
          severity: "error",
          code: "BACKEND_COMPILER",
          message: serverError ?? "Rejected by the backend compiler.",
          nodeId,
        },
      ]);
    }
    return map;
  }, [issues, serverErrorNodeIds, serverError]);

  // Reflect issue counts onto the canvas cards.
  //
  // Must return the SAME array reference when nothing changed. `nodes` feeds
  // `graph` -> `issues` -> `issuesByNode` -> this effect, so handing back a
  // fresh array unconditionally re-triggers the effect forever.
  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        const count = issuesByNode.get(node.id)?.length ?? 0;
        const summary = summariseNodeConfiguration(
          node.data.descriptor,
          node.data.config,
        );
        if (node.data.issueCount === count && node.data.summary === summary)
          return node;
        changed = true;
        return { ...node, data: { ...node.data, issueCount: count, summary } };
      });
      return changed ? next : current;
    });
  }, [issuesByNode, setNodes]);

  const errorCount =
    issues.filter((issue) => issue.severity === "error").length +
    rewardIssues.length +
    identityIssues.length;
  const hasBlockingIssues = errorCount > 0 || nodes.length === 0;

  const panelIssues: RuleIssue[] = useMemo(
    () => [
      ...issues,
      ...identityIssues.map((message) => ({
        severity: "error" as const,
        code: "INVALID_IDENTITY",
        message,
      })),
    ],
    [issues, identityIssues],
  );

  // A compiled VALIDATED version is immutable just like published history.
  // Revisions happen only on a DRAFT row or through New version.
  const immutableByState = Boolean(
    rule && !EDITABLE_STATES.includes(rule.state),
  );
  const readOnly = Boolean(readOnlyProp) || immutableByState;
  const lifecycleActions = useMemo(
    () => getRuleAdminActions(rule?.state ?? null),
    [rule?.state],
  );

  const snapshot = useCallback(() => {
    pastRef.current.push({ nodes, edges, layout: layoutRef.current });
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    setHistoryDepth(pastRef.current.length);
  }, [nodes, edges]);

  const restore = useCallback(
    (target: GraphSnapshot) => {
      setNodes(target.nodes);
      setEdges(target.edges);
      layoutRef.current = target.layout;
      setSelectedNodeId(null);
    },
    [setNodes, setEdges],
  );

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push({ nodes, edges, layout: layoutRef.current });
    restore(previous);
    setHistoryDepth(pastRef.current.length);
  }, [nodes, edges, restore]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({ nodes, edges, layout: layoutRef.current });
    restore(next);
    setHistoryDepth(pastRef.current.length);
  }, [nodes, edges, restore]);

  // Keyboard undo/redo — ignored while typing in form fields.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (readOnly) return;
        if (event.shiftKey) redo();
        else undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "y"
      ) {
        event.preventDefault();
        if (!readOnly) redo();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, readOnly]);
  // ── Node operations ─────────────────────────────────────────────────────
  const makeNodeId = useCallback(
    (type: string) => {
      const base = type.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48) || "node";
      let candidate = `${base}_${++idCounter.current}`;
      const taken = new Set(nodes.map((node) => node.id));
      while (taken.has(candidate)) candidate = `${base}_${++idCounter.current}`;
      return candidate;
    },
    [nodes],
  );

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      if (readOnly) return;
      const descriptor = registry[type];
      if (!descriptor) return;
      snapshot();
      const id = makeNodeId(type);
      const selected = selectedNodeId
        ? nodes.find((node) => node.id === selectedNodeId)
        : undefined;
      const preferred =
        position ??
        (selected
          ? { x: selected.position.x + 250, y: selected.position.y }
          : {
              x: 80 + (nodes.length % 4) * 240,
              y: 80 + Math.floor(nodes.length / 4) * 140,
            });
      const nextPosition = findAvailableNodePosition(
        preferred,
        nodes.map((node) => node.position),
      );
      const nextNode: Node<RuleNodeCardData> = {
        id,
        type: "ruleNode",
        position: nextPosition,
        data: {
          type,
          descriptor,
          config: createDefaultNodeConfiguration(descriptor),
          issueCount: 0,
        },
      };

      setNodes((current) => [...current, nextNode]);
      layoutRef.current = { ...layoutRef.current, [id]: nextPosition };

      // Clicking a library item after selecting a node means "continue this
      // flow". Auto-connect only when both node-level topology rules and the
      // backend-published typed ports agree; drag/drop remains manual.
      if (!position && selected) {
        const handles = compatibleHandlesFor(
          selected.data.descriptor,
          descriptor,
        );
        const topology = canConnect(
          {
            id: selected.id,
            type: selected.data.type,
            config: selected.data.config,
          },
          { id, type, config: nextNode.data.config },
          registry,
          edges.map((edge) => ({ from: edge.source, to: edge.target })),
        );
        if (handles && topology.ok) {
          const ports = canConnectPorts(
            selected.data.type,
            type,
            handles.sourceHandle,
            handles.targetHandle,
            registry,
          );
          if (ports.ok) {
            setEdges((current) =>
              addEdge(
                {
                  id: `${selected.id}->${id}`,
                  source: selected.id,
                  target: id,
                  ...handles,
                  animated: false,
                },
                current,
              ),
            );
          }
        }
      }
      setSelectedNodeId(id);
      setSelectedNodeIds([id]);
      setMobilePane("canvas");
    },
    [
      registry,
      makeNodeId,
      setNodes,
      setEdges,
      readOnly,
      snapshot,
      selectedNodeId,
      nodes,
      edges,
    ],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const result = canConnect(
        {
          id: sourceNode.id,
          type: sourceNode.data.type,
          config: sourceNode.data.config,
        },
        {
          id: targetNode.id,
          type: targetNode.data.type,
          config: targetNode.data.config,
        },
        registry,
        edges.map((edge) => ({ from: edge.source, to: edge.target })),
      );

      if (!result.ok) {
        setConnectionError(result.reason ?? "This connection is not allowed.");
        window.setTimeout(() => setConnectionError(null), 4000);
        return;
      }

      // Port-level check on top of the node-level rules above: does each named
      // port exist on its descriptor, and can the two data types actually meet.
      const portResult = canConnectPorts(
        sourceNode.data.type,
        targetNode.data.type,
        connection.sourceHandle,
        connection.targetHandle,
        registry,
      );
      if (!portResult.ok) {
        setConnectionError(
          portResult.reason ?? "These ports are not compatible.",
        );
        window.setTimeout(() => setConnectionError(null), 4000);
        return;
      }

      snapshot();
      setEdges((current) =>
        addEdge({ ...connection, animated: false }, current),
      );
    },
    [nodes, edges, registry, setEdges, readOnly, snapshot],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<RuleNodeCardData>>[]) => {
      if (changes.some((change) => change.type === "remove")) snapshot();
      onNodesChange(changes);
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          layoutRef.current = {
            ...layoutRef.current,
            [change.id]: change.position,
          };
        }
        if (change.type === "remove" && change.id === selectedNodeId)
          setSelectedNodeId(null);
      }
    },
    [onNodesChange, selectedNodeId, snapshot],
  );

  // React Flow invokes this subscription when its selection store changes.
  // An inline callback is a new subscription every render; writing a fresh []
  // for the already-empty selection then caused Maximum update depth exceeded.
  const handleSelectionChange = useCallback(
    ({
      nodes: selected,
    }: OnSelectionChangeParams<Node<RuleNodeCardData>, Edge>) => {
      const ids = selected.map((node) => node.id);
      setSelectedNodeIds((current) =>
        current.length === ids.length &&
        current.every((id, index) => id === ids[index])
          ? current
          : ids,
      );
      const primaryId = ids[0] ?? null;
      setSelectedNodeId((current) =>
        current === primaryId ? current : primaryId,
      );
    },
    [],
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      if (readOnly) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, config } }
            : node,
        ),
      );
    },
    [setNodes, readOnly],
  );

  const renameNode = useCallback(
    (nodeId: string, nextId: string) => {
      if (readOnly) return;
      const nodeIdError = getRuleNodeIdError(
        nextId,
        nodes.map((node) => node.id),
        nodeId,
      );
      if (nodeIdError || nextId === nodeId) return;
      snapshot();
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId ? { ...node, id: nextId } : node,
        ),
      );
      setEdges((current) =>
        current.map((edge) => {
          const source = edge.source === nodeId ? nextId : edge.source;
          const target = edge.target === nodeId ? nextId : edge.target;
          return { ...edge, id: `${source}->${target}`, source, target };
        }),
      );
      const { [nodeId]: previousPosition, ...remainingLayout } =
        layoutRef.current;
      layoutRef.current = {
        ...remainingLayout,
        [nextId]: previousPosition ?? { x: 0, y: 0 },
      };
      setSelectedNodeId(nextId);
    },
    [nodes, setNodes, setEdges, readOnly, snapshot],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      snapshot();
      setNodes((current) => current.filter((node) => node.id !== nodeId));
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
      );
      setSelectedNodeId(null);
      setSelectedNodeIds((current) => current.filter((id) => id !== nodeId));
    },
    [setNodes, setEdges, readOnly, snapshot],
  );
  const copyNode = useCallback(
    (nodeId: string) => {
      const selection = selectedNodeIds.includes(nodeId)
        ? selectedNodeIds
        : [nodeId];
      clipboardRef.current = copyRuleSubgraph(
        nodes.map((node) => ({
          id: node.id,
          type: node.data.type,
          config: node.data.config,
          position: node.position,
        })),
        edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        })),
        selection,
      );
    },
    [nodes, edges, selectedNodeIds],
  );

  const pasteNode = useCallback(
    (position?: { x: number; y: number }) => {
      if (readOnly) return;
      const clip = clipboardRef.current;
      if (!clip) return;
      const origin = position ?? {
        x: 120 + (nodes.length % 4) * 40,
        y: 120 + Math.floor(nodes.length / 4) * 40,
      };
      const pasted = pasteRuleSubgraph(clip, {
        origin,
        registry,
        makeNodeId,
        existingEdges: edges.map((edge) => ({
          from: edge.source,
          to: edge.target,
        })),
      });
      if (!pasted.ok) {
        setConnectionError(pasted.reason);
        window.setTimeout(() => setConnectionError(null), 4000);
        return;
      }
      snapshot();
      const nextNodes: Node<RuleNodeCardData>[] = pasted.value.nodes.map(
        (node) => ({
          id: node.id,
          type: "ruleNode",
          position: node.position,
          data: {
            type: node.type,
            descriptor: registry[node.type]!,
            config: cloneNodeConfiguration(node.config),
            issueCount: 0,
          },
        }),
      );
      const nextEdges: Edge[] = pasted.value.edges.map((edge) => ({
        ...edge,
        animated: false,
        type: "smoothstep",
      }));
      setNodes((current) => [...current, ...nextNodes]);
      setEdges((current) => [...current, ...nextEdges]);
      layoutRef.current = {
        ...layoutRef.current,
        ...Object.fromEntries(
          nextNodes.map((node) => [node.id, node.position]),
        ),
      };
      const pastedIds = nextNodes.map((node) => node.id);
      setSelectedNodeIds(pastedIds);
      setSelectedNodeId(pastedIds[0] ?? null);
    },
    [
      registry,
      makeNodeId,
      setNodes,
      setEdges,
      readOnly,
      snapshot,
      nodes.length,
      edges,
    ],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      const node = nodes.find((entry) => entry.id === nodeId);
      if (!node) return;
      copyNode(nodeId);
      pasteNode({ x: node.position.x + 40, y: node.position.y + 40 });
    },
    [nodes, copyNode, pasteNode, readOnly],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "c" && selectedNodeId) {
        event.preventDefault();
        copyNode(selectedNodeId);
      } else if (key === "v" && !readOnly && clipboardRef.current) {
        event.preventDefault();
        pasteNode();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [copyNode, pasteNode, readOnly, selectedNodeId]);

  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (readOnly) return;
      snapshot();
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
    },
    [setEdges, readOnly, snapshot],
  );

  const focusNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      const target = nodes.find((node) => node.id === nodeId);
      if (target)
        fitView({
          nodes: [{ id: nodeId }],
          duration: 260,
          maxZoom: 0.95,
          padding: 0.55,
        });
    },
    [nodes, fitView],
  );

  // ── Lifecycle actions ───────────────────────────────────────────────────
  const runAction = useCallback(
    async <T,>(
      kind: NonNullable<typeof busy>,
      action: () => Promise<T>,
      successMessage: string,
    ) => {
      setBusy(kind);
      setServerError(null);
      setServerErrorNodeIds([]);
      setNotice(null);
      try {
        const result = await action();
        setNotice(successMessage);
        return result;
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : "Request failed.";
        setServerError(message);
        setServerErrorNodeIds(
          attributeServerError(
            message,
            nodes.map((node) => node.id),
          ),
        );
        return null;
      } finally {
        setBusy(null);
      }
    },
    [nodes],
  );

  const buildDraftPayload = useCallback(
    () => ({
      definitionKey: effectiveIdentity.definitionKey.trim(),
      definitionVersion: effectiveIdentity.definitionVersion,
      kind: lockKind ?? identity.kind,
      graphDefinition: graph,
      targetCount: effectiveIdentity.targetCount,
      rewardDefinition:
        rewardBundle.components.length > 0
          ? (rewardBundle as unknown as Record<string, unknown>)
          : undefined,
      metadata: {
        ...extraMetadata,
        canvasLayout: layoutRef.current,
        canvasEdgePorts: edgePortMap,
      },
      mediaId: mediaId ?? null,
    }),
    [
      effectiveIdentity,
      lockKind,
      identity.kind,
      graph,
      rewardBundle,
      extraMetadata,
      edgePortMap,
      mediaId,
    ],
  );

  const persistDraft = useCallback(async () => {
    const payload = buildDraftPayload();
    if (!payload.definitionKey)
      throw new Error("A definition key is required before saving.");
    if (rule?.id) {
      if (rule.state !== "DRAFT")
        throw new Error("Create a new DRAFT version before editing this rule.");
      return rulesService.updateDraft(rule.id, {
        graphDefinition: payload.graphDefinition,
        targetCount: payload.targetCount,
        rewardDefinition: payload.rewardDefinition,
        metadata: payload.metadata,
        mediaId: payload.mediaId,
      });
    }
    return rulesService.createRule(payload);
  }, [buildDraftPayload, rule]);

  const handleSave = useCallback(async () => {
    if (readOnly || !lifecycleActions.includes("save")) return;
    const key = effectiveIdentity.definitionKey.trim();
    if (!key) {
      setServerError("A definition key is required before saving.");
      return;
    }
    setRoundTrip(null);
    const saved = await runAction(
      "save",
      persistDraft,
      rule?.id ? "Draft changes saved." : "Draft saved.",
    );
    if (saved) {
      setRule(saved);
      setSavedDraftFingerprint(currentDraftFingerprint);
      setRoundTrip(compareGraphs(graph, saved.graphDefinition));
      onRuleChange?.(saved);
    }
  }, [
    effectiveIdentity,
    graph,
    persistDraft,
    rule?.id,
    runAction,
    readOnly,
    lifecycleActions,
    onRuleChange,
    currentDraftFingerprint,
  ]);

  const handleValidate = useCallback(async () => {
    if (readOnlyProp || !lifecycleActions.includes("validate")) return;
    const reason = window.prompt(
      "Reason for validating this rule (recorded in the audit trail):",
    );
    if (!reason) return;
    const validated = await runAction(
      "validate",
      async () => {
        const graphResult = await rulesService.validateGraph(graph);
        if (!graphResult.valid) {
          const detail = graphResult.errors
            .map((issue) => issue.message)
            .join(" · ");
          throw new Error(
            detail || "The backend compiler rejected this graph.",
          );
        }
        const target =
          rule?.state === "VALIDATED" ? rule : await persistDraft();
        setRule(target);
        return rulesService.validateRule(target.id, reason);
      },
      rule?.state === "VALIDATED"
        ? "Rule revalidated by the backend."
        : "Draft saved and validated by the backend.",
    );
    if (validated) {
      setRule(validated);
      setRoundTrip(compareGraphs(graph, validated.graphDefinition));
      onRuleChange?.(validated);
    }
  }, [
    graph,
    persistDraft,
    runAction,
    readOnlyProp,
    lifecycleActions,
    rule,
    onRuleChange,
  ]);

  const handlePublish = useCallback(async () => {
    if (!rule?.id || readOnlyProp || !lifecycleActions.includes("publish"))
      return;
    const reason = window.prompt(
      "Reason for publishing this rule (recorded in the audit trail):",
    );
    if (!reason) return;
    if (
      !window.confirm(
        `Publish ${rule.definitionKey} v${rule.definitionVersion}? It becomes live for players.`,
      )
    )
      return;
    const published = await runAction(
      "publish",
      () => rulesService.publishRule(rule.id, reason),
      "Rule published.",
    );
    if (published) {
      setRule(published);
      onRuleChange?.(published);
    }
  }, [rule, runAction, readOnlyProp, lifecycleActions, onRuleChange]);

  const handleDisable = useCallback(async () => {
    if (!rule?.id || readOnlyProp || !lifecycleActions.includes("disable"))
      return;
    const reason = window.prompt(
      "Reason for disabling this rule (recorded in the audit trail):",
    );
    if (!reason) return;
    const disabled = await runAction(
      "disable",
      () => rulesService.disableRule(rule.id, reason),
      "Rule disabled.",
    );
    if (disabled) {
      setRule(disabled);
      onRuleChange?.(disabled);
    }
  }, [rule, runAction, readOnlyProp, lifecycleActions, onRuleChange]);

  const handleArchive = useCallback(async () => {
    if (!rule?.id || readOnlyProp || !lifecycleActions.includes("archive"))
      return;
    const reason = window.prompt(
      "Reason for deleting this definition from active catalogs (recorded in the audit trail):",
    );
    if (!reason) return;
    if (
      !window.confirm(
        `Delete ${rule.definitionKey} v${rule.definitionVersion} from active catalogs? Its immutable audit record will be preserved.`,
      )
    )
      return;
    const archived = await runAction(
      "archive",
      () => rulesService.archiveRule(rule.id, reason),
      "Definition archived without deleting its history.",
    );
    if (archived) {
      setRule(archived);
      onRuleChange?.(archived);
    }
  }, [rule, runAction, readOnlyProp, lifecycleActions, onRuleChange]);

  const handleActivate = useCallback(async () => {
    if (!rule?.id || readOnlyProp || !lifecycleActions.includes("activate"))
      return;
    const reason = window.prompt(
      "Reason for reactivating this rule (recorded in the audit trail):",
    );
    if (!reason) return;
    const activated = await runAction(
      "activate",
      () => rulesService.activateRule(rule.id, reason),
      "Rule reactivated.",
    );
    if (activated) {
      setRule(activated);
      onRuleChange?.(activated);
    }
  }, [rule, runAction, readOnlyProp, lifecycleActions, onRuleChange]);

  /** §21/§27: a PUBLISHED rule can't be mutated — start a new DRAFT version
   * seeded from its current graph/reward instead. */
  const handleNewVersion = useCallback(async () => {
    if (!rule || readOnlyProp || !lifecycleActions.includes("newVersion"))
      return;
    const reason = window.prompt(
      "Reason for creating a new rule version (recorded in the audit trail):",
    );
    if (!reason) return;
    const created = await runAction(
      "newVersion",
      () => rulesService.createVersion(rule.id, reason),
      "New editable version created by the backend.",
    );
    if (!created) return;
    hydrate(created, registry);
    const history = await rulesService
      .listVersions(created.definitionKey)
      .catch(() => []);
    setVersions(
      history.map((version) => ({
        id: version.id,
        definitionVersion: version.definitionVersion,
        state: version.state,
      })),
    );
    onNewVersionDraft?.(created.definitionVersion);
  }, [
    rule,
    registry,
    hydrate,
    runAction,
    readOnlyProp,
    lifecycleActions,
    onNewVersionDraft,
  ]);

  const handleOpenVersion = useCallback(
    async (versionId: string) => {
      if (!versionId || versionId === rule?.id) return;
      setBusy("load");
      try {
        const loaded = await rulesService.getRuleById(versionId);
        hydrate(loaded, registry);
      } catch (error) {
        setServerError(
          error instanceof Error ? error.message : "Failed to load version.",
        );
      } finally {
        setBusy(null);
      }
    },
    [rule, registry, hydrate],
  );

  const animatePreviewFlow = useCallback(
    (result: CompiledRuleEvaluation) => {
      const root = wrapperRef.current;
      const sequence = Object.keys(result.nodeOutputs ?? {});
      if (!root || sequence.length === 0) return;

      previewTimelineRef.current?.kill();
      const reducedMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false;
      const nodeElements = [
        ...root.querySelectorAll<HTMLElement>("[data-rule-node-id]"),
      ];
      const edgeElements = [
        ...root.querySelectorAll<SVGGElement>(".react-flow__edge[data-id]"),
      ];
      const touched: Element[] = [];
      const stepDuration = reducedMotion ? 0.01 : 0.32;
      const clearPreviewStyles = () => {
        gsap.set(touched, {
          clearProps:
            "transform,boxShadow,opacity,strokeDasharray,strokeDashoffset,stroke",
        });
      };
      const timeline = gsap.timeline({
        paused: true,
        onComplete: clearPreviewStyles,
        onInterrupt: clearPreviewStyles,
      });

      sequence.forEach((nodeId, index) => {
        const node = nodeElements.find(
          (element) => element.dataset.ruleNodeId === nodeId,
        );
        if (!node) return;
        const position = index * stepDuration;
        const status = result.nodeOutputs?.[nodeId]?.status;
        const accent =
          status === "SUCCESS" || status === "NO_OP"
            ? "#10b981"
            : status === "FALSE_GATE"
              ? "#f59e0b"
              : status === "SKIPPED_UPSTREAM"
                ? "#94a3b8"
                : "#f43f5e";

        // A skipped node is reported and muted, but no travelling edge or
        // success pulse crosses the failed/false upstream gate.
        if (status === "SKIPPED_UPSTREAM") {
          touched.push(node);
          timeline.set(
            node,
            { opacity: 0.52, boxShadow: `0 0 0 2px ${accent}45` },
            position,
          );
          return;
        }

        for (const edge of edges.filter(
          (candidate) => candidate.target === nodeId,
        )) {
          const group = edgeElements.find(
            (element) => element.dataset.id === edge.id,
          );
          const path = group?.querySelector<SVGPathElement>(
            ".react-flow__edge-path",
          );
          if (!path || typeof path.getTotalLength !== "function") continue;
          const length = path.getTotalLength();
          touched.push(path);
          timeline.set(
            path,
            {
              stroke: accent,
              strokeDasharray: length,
              strokeDashoffset: length,
            },
            position,
          );
          timeline.to(
            path,
            {
              strokeDashoffset: 0,
              duration: stepDuration * 0.7,
              ease: "power2.out",
            },
            position,
          );
        }

        touched.push(node);
        timeline.to(
          node,
          { scale: 0.96, duration: stepDuration * 0.25, ease: "power1.in" },
          position,
        );
        timeline.to(
          node,
          {
            scale: 1,
            boxShadow: `0 0 0 3px ${accent}55, 0 10px 26px ${accent}28`,
            duration: stepDuration * 0.55,
            ease: "back.out(1.6)",
          },
          position + stepDuration * 0.25,
        );
      });

      previewTimelineRef.current = timeline;
      timeline.play(0);
    },
    [edges],
  );

  const handlePreview = useCallback(
    async (
      eventType: GameplayEventEnvelope["eventType"],
      payload: Record<string, unknown>,
    ) => {
      if (readOnly && !rule?.id) return;
      const now = new Date().toISOString();
      const {
        gameType,
        gameVersion,
        rulesVersion,
        backendMatchId,
        nakamaMatchId,
        userId,
        participants,
        occurredAt: sampleOccurredAt,
        ...eventPayload
      } = payload;
      const previewOccurredAt =
        typeof sampleOccurredAt === "string" &&
        !Number.isNaN(Date.parse(sampleOccurredAt))
          ? new Date(sampleOccurredAt).toISOString()
          : now;
      const event: GameplayEventEnvelope = {
        eventId: crypto.randomUUID(),
        eventType,
        eventVersion: 1,
        producer: "NESTJS",
        sourceService: "admin-dashboard-preview",
        ...(typeof gameType === "string" && gameType ? { gameType } : {}),
        ...(typeof gameVersion === "string" && gameVersion
          ? { gameVersion }
          : {}),
        ...(typeof rulesVersion === "string" && rulesVersion
          ? { rulesVersion }
          : {}),
        ...(typeof backendMatchId === "string" && backendMatchId
          ? { backendMatchId }
          : {}),
        ...(typeof nakamaMatchId === "string" && nakamaMatchId
          ? { nakamaMatchId }
          : {}),
        ...(typeof userId === "string" && userId ? { userId } : {}),
        ...(Array.isArray(participants) &&
        participants.every((item) => typeof item === "string")
          ? { participants }
          : {}),
        occurredAt: previewOccurredAt,
        sequence: 1,
        definitionPins: {},
        payload: eventPayload,
        correlationId: crypto.randomUUID(),
        traceId: crypto.randomUUID(),
        integrity: {
          keyVersion: "preview",
          signature: "preview",
          signedAt: now,
        },
      };
      setEvaluation(null);
      const result = await runAction(
        "preview",
        async () => {
          const saved =
            rule?.state === "DRAFT" || !rule ? await persistDraft() : rule;
          setRule(saved);
          onRuleChange?.(saved);
          return rulesService.previewRule(
            saved.id,
            event as unknown as Record<string, unknown>,
          );
        },
        "Backend dry run complete — no progress or rewards were persisted.",
      );
      const evaluationResult = result
        ? extractRulePreviewEvaluation(result)
        : null;
      setEvaluation(evaluationResult);
      if (evaluationResult) animatePreviewFlow(evaluationResult);
    },
    [rule, persistDraft, runAction, animatePreviewFlow, readOnly, onRuleChange],
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const previewNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          execution: evaluation?.nodeOutputs?.[node.id],
        },
      })),
    [nodes, evaluation],
  );
  const selectedGraphNode: RuleGraphNode | null = selectedNode
    ? {
        id: selectedNode.id,
        type: selectedNode.data.type,
        config: selectedNode.data.config,
      }
    : null;
  const selectedInputCount = selectedNodeId
    ? edges.filter((edge) => edge.target === selectedNodeId).length
    : 0;
  const suggestedEventTypes = useMemo(
    () =>
      [
        ...new Set(
          nodes
            .map((node) => registry[node.data.type]?.consumesEvent)
            .filter((eventType) => eventType && eventType !== "ANY"),
        ),
      ] as GameplayEventEnvelope["eventType"][],
    [nodes, registry],
  );
  const suggestedPreviewFields = useMemo(
    () =>
      buildMatchingRulePreviewFields(
        suggestedEventTypes[0] ?? "MATCH_WON",
        nodes.map((node) => ({
          type: node.data.type,
          config: node.data.config,
        })),
      ),
    [nodes, suggestedEventTypes],
  );

  if (isLoadingRegistry || busy === "load") {
    return (
      <div className="flex h-[calc(100vh-9rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (registryError) {
    return (
      <div className="flex h-[calc(100vh-9rem)] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-500/30 bg-red-50 p-4 text-center dark:bg-red-500/10">
          <XCircle className="mx-auto h-6 w-6 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
            Could not load the node registry
          </p>
          <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
            {registryError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="ltr"
      className={cn(
        "flex h-[calc(100vh-16rem)] min-h-[540px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-left max-lg:h-auto max-lg:min-h-0 dark:border-gray-800 dark:bg-gray-950",
        className,
      )}
    >
      <RuleToolbar
        hideIdentityFields={Boolean(hideIdentity)}
        operatorReadOnly={Boolean(readOnlyProp)}
        identity={identity}
        lockKind={lockKind}
        onIdentityChange={setIdentity}
        rule={rule}
        versions={versions}
        busy={busy}
        readOnly={readOnly}
        lifecycleActions={lifecycleActions}
        hasBlockingIssues={hasBlockingIssues}
        errorCount={errorCount}
        notice={notice}
        isDirty={isDirty}
        onSave={handleSave}
        onValidate={handleValidate}
        onPublish={handlePublish}
        onDisable={handleDisable}
        onArchive={handleArchive}
        onActivate={handleActivate}
        onNewVersion={handleNewVersion}
        onOpenVersion={handleOpenVersion}
      />

      <div
        className="grid grid-cols-3 border-b border-gray-200 bg-white p-1.5 lg:hidden dark:border-gray-800 dark:bg-gray-900"
        role="tablist"
        aria-label="Rule builder panels"
      >
        {(
          [
            ["library", "Library"],
            ["canvas", "Canvas"],
            ["inspector", "Inspector"],
          ] as const
        ).map(([pane, label]) => (
          <button
            key={pane}
            type="button"
            role="tab"
            aria-selected={mobilePane === pane}
            disabled={pane === "inspector" && !selectedNodeId}
            onClick={() => setMobilePane(pane)}
            className={cn(
              "rounded-lg px-2 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              mobilePane === pane
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <NodeToolbox
          registry={registry}
          onAddNode={(type) => addNode(type)}
          disabled={readOnly}
          className={mobilePane === "library" ? "max-lg:flex" : "max-lg:hidden"}
        />

        <div
          ref={wrapperRef}
          className={cn(
            "relative min-w-0 flex-1 max-lg:h-[58svh] max-lg:min-h-[340px] max-lg:flex-none",
            mobilePane === "canvas" ? "max-lg:block" : "max-lg:hidden",
          )}
          dir="ltr"
        >
          <ReactFlow
            nodes={previewNodes}
            edges={edges}
            // React Flow v12 stamps its own `light`/`dark` colour-mode class on
            // the root and styles Controls/MiniMap/attribution from it. Without
            // this it defaults to `light`, so those built-in panels rendered as
            // bright grey blocks floating on the dark canvas.
            colorMode={isDark ? "dark" : "light"}
            onNodesChange={handleNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedNodeIds([node.id]);
              setMobilePane("inspector");
            }}
            onSelectionChange={handleSelectionChange}
            onDragOver={(event) => {
              if (readOnly) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              if (readOnly) return;
              event.preventDefault();
              const type = event.dataTransfer.getData(
                "application/viora-rule-node",
              );
              if (!type) return;
              addNode(
                type,
                screenToFlowPosition({ x: event.clientX, y: event.clientY }),
              );
            }}
            deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
            selectionKeyCode="Shift"
            multiSelectionKeyCode={["Meta", "Control"]}
            onPaneClick={() => setMenu(null)}
            onMoveStart={() => setMenu(null)}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              if (readOnly) return;
              setMenu({ kind: "canvas", x: event.clientX, y: event.clientY });
            }}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              setMenu({
                kind: "node",
                x: event.clientX,
                y: event.clientY,
                nodeId: node.id,
              });
            }}
            onEdgeContextMenu={(event, edge) => {
              event.preventDefault();
              if (readOnly) return;
              setMenu({
                kind: "edge",
                x: event.clientX,
                y: event.clientY,
                edgeId: edge.id,
              });
            }}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            minZoom={0.3}
            maxZoom={1.5}
            snapToGrid
            snapGrid={SNAP_GRID}
            proOptions={PRO_OPTIONS}
            className="bg-gray-50 dark:bg-gray-950"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={0.8} />
            <Controls showInteractive={!readOnly} />
            <RuleBuilderMiniMap isDark={isDark} />
          </ReactFlow>

          {/* Editor overlay: undo/redo + context menus (editor-only state) */}
          {!readOnly && (
            <div className="absolute left-3 top-3 z-10 flex gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={readOnly || historyDepth === 0}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={readOnly}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                Redo
              </button>
            </div>
          )}

          {menu && (
            <div
              className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
              style={{ left: menu.x, top: menu.y }}
              role="menu"
            >
              {menu.kind === "canvas" && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={() => {
                      pasteNode();
                      setMenu(null);
                    }}
                  >
                    Paste selection
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={() => {
                      fitView({ duration: 300 });
                      setMenu(null);
                    }}
                  >
                    Fit view
                  </button>
                </>
              )}
              {menu.kind === "node" && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={() => {
                      setSelectedNodeId(menu.nodeId);
                      setMenu(null);
                    }}
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={readOnly}
                    className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={() => {
                      duplicateNode(menu.nodeId);
                      setMenu(null);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                    onClick={() => {
                      copyNode(menu.nodeId);
                      setMenu(null);
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={readOnly}
                    className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/40"
                    onClick={() => {
                      deleteNode(menu.nodeId);
                      setMenu(null);
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
              {menu.kind === "edge" && (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => {
                    deleteEdge(menu.edgeId);
                    setMenu(null);
                  }}
                >
                  Delete connection
                </button>
              )}
            </div>
          )}

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 px-6 py-4 text-center backdrop-blur dark:border-gray-700 dark:bg-gray-900/80">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Start with a trigger
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Click or drag a node from the library. A rule needs at least
                  one trigger and one action.
                </p>
              </div>
            </div>
          )}

          {readOnly && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-gray-900/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
              Read-only
            </div>
          )}

          {connectionError && (
            <div
              role="alert"
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-lg dark:bg-red-950 dark:text-red-300"
            >
              {connectionError}
            </div>
          )}
        </div>

        <NodeInspector
          node={selectedGraphNode}
          descriptor={
            selectedNode
              ? (registry[selectedNode.data.type] ??
                unknownNodeDescriptor(selectedNode.data.type))
              : null
          }
          issues={
            selectedNodeId ? (issuesByNode.get(selectedNodeId) ?? []) : []
          }
          inputCount={selectedInputCount}
          rewardBundle={rewardBundle}
          executionResult={
            selectedNodeId
              ? evaluation?.nodeOutputs?.[selectedNodeId]
              : undefined
          }
          onChangeConfig={updateNodeConfig}
          onChangeId={renameNode}
          onDelete={deleteNode}
          nodeIds={nodes.map((node) => node.id)}
          readOnly={readOnly}
          eventTypeOptions={eventTypeOptions}
          gameTypeOptions={gameTypeOptions}
          className={
            mobilePane === "inspector" ? "max-lg:flex" : "max-lg:hidden"
          }
        />
      </div>

      <RuleBottomPanel
        issues={panelIssues}
        serverError={serverError}
        serverErrorNodeIds={serverErrorNodeIds}
        rule={rule}
        evaluation={evaluation}
        isPreviewing={busy === "preview"}
        onPreview={handlePreview}
        onReplayPreview={
          evaluation ? () => animatePreviewFlow(evaluation) : undefined
        }
        suggestedEventTypes={suggestedEventTypes}
        suggestedPreviewFields={suggestedPreviewFields}
        onFocusNode={focusNode}
        rewardBundle={rewardBundle}
        rewardIssueCount={rewardIssues.length}
        onRewardBundleChange={setRewardBundle}
        actionTypesOnCanvas={[...new Set(actionTypes)]}
        readOnly={readOnly}
        roundTrip={roundTrip}
      />
    </div>
  );
}

function RuleToolbar({
  hideIdentityFields,
  operatorReadOnly,
  identity,
  lockKind,
  onIdentityChange,
  rule,
  versions,
  busy,
  readOnly,
  lifecycleActions,
  hasBlockingIssues,
  errorCount,
  notice,
  isDirty,
  onSave,
  onValidate,
  onPublish,
  onDisable,
  onArchive,
  onActivate,
  onNewVersion,
  onOpenVersion,
}: {
  hideIdentityFields: boolean;
  operatorReadOnly: boolean;
  identity: RuleIdentity;
  lockKind?: RuleDefinitionKind;
  onIdentityChange: (identity: RuleIdentity) => void;
  rule: RuleDefinition | null;
  versions: Array<{ id: string; definitionVersion: number; state: string }>;
  busy: string | null;
  readOnly: boolean;
  lifecycleActions: ReturnType<typeof getRuleAdminActions>;
  hasBlockingIssues: boolean;
  errorCount: number;
  notice: string | null;
  isDirty: boolean;
  onSave: () => void;
  onValidate: () => void;
  onPublish: () => void;
  onDisable: () => void;
  onArchive: () => void;
  onActivate: () => void;
  onNewVersion: () => void;
  onOpenVersion: (id: string) => void;
}) {
  const field = cn(
    "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm",
    "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
    "disabled:cursor-not-allowed disabled:opacity-60",
    "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
  );

  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-gray-200 bg-white p-2.5 sm:gap-3 sm:p-3 dark:border-gray-800 dark:bg-gray-900">
      {!hideIdentityFields && (
        <>
          <div className="min-w-[180px] flex-1">
            <label
              htmlFor="rule-key"
              className="mb-1 block text-[11px] font-medium text-gray-500"
            >
              Definition key
            </label>
            <input
              id="rule-key"
              value={identity.definitionKey}
              disabled={readOnly}
              onChange={(event) =>
                onIdentityChange({
                  ...identity,
                  definitionKey: normalizeDefinitionKeyInput(
                    event.target.value,
                  ),
                })
              }
              placeholder="ludo_winner_daily"
              className={cn(field, "w-full font-mono")}
            />
          </div>

          <div className="w-20">
            <label
              htmlFor="rule-version"
              className="mb-1 block text-[11px] font-medium text-gray-500"
            >
              Version
            </label>
            <input
              id="rule-version"
              type="number"
              min={1}
              disabled={readOnly}
              value={identity.definitionVersion}
              onChange={(event) =>
                onIdentityChange({
                  ...identity,
                  definitionVersion: Number(event.target.value) || 1,
                })
              }
              className={cn(field, "w-full")}
            />
          </div>

          {!lockKind && (
            <div className="w-36">
              <label
                htmlFor="rule-kind"
                className="mb-1 block text-[11px] font-medium text-gray-500"
              >
                Kind
              </label>
              <select
                id="rule-kind"
                value={identity.kind}
                disabled={readOnly}
                onChange={(event) =>
                  onIdentityChange({
                    ...identity,
                    kind: event.target.value as RuleDefinitionKind,
                  })
                }
                className={cn(field, "w-full")}
              >
                <option value="TASK">Task</option>
                <option value="ACHIEVEMENT">Achievement</option>
                <option value="CAMPAIGN">Campaign</option>
              </select>
            </div>
          )}

          <div className="w-28">
            <label
              htmlFor="rule-target"
              className="mb-1 block text-[11px] font-medium text-gray-500"
            >
              Target count
            </label>
            <input
              id="rule-target"
              disabled={readOnly}
              value={identity.targetCount}
              onChange={(event) =>
                onIdentityChange({
                  ...identity,
                  targetCount: event.target.value.replace(/[^0-9]/g, "") || "1",
                })
              }
              className={cn(field, "w-full font-mono")}
            />
          </div>
        </>
      )}

      {versions.length > 1 && (
        <div className="w-40">
          <label
            htmlFor="rule-version-history"
            className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-500"
          >
            <History className="h-3 w-3" /> History
          </label>
          <Select
            value={rule?.id ?? ""}
            onChange={(e) => onOpenVersion(e.target.value)}
            options={versions.map((v) => ({
              value: v.id,
              label: `v${v.definitionVersion} · ${v.state}`,
            }))}
          />
        </div>
      )}

      <div className="grid w-full min-w-0 grid-cols-2 items-center gap-2 pt-1 sm:flex sm:flex-wrap sm:justify-end lg:w-auto lg:flex-1 lg:pt-0">
        {rule && <RuleStateBadge state={rule.state} />}

        {lifecycleActions.includes("save") && rule?.state === "DRAFT" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            isLoading={busy === "save"}
            disabled={readOnly || !isDirty}
          >
            <Save className="h-4 w-4" />
            {isDirty ? "Save changes" : "Saved"}
          </Button>
        ) : rule && lifecycleActions.includes("newVersion") ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onNewVersion}
            disabled={operatorReadOnly}
            isLoading={busy === "newVersion"}
            title="Create a new editable DRAFT while preserving this immutable version."
          >
            <Copy className="h-4 w-4" />
            New version
          </Button>
        ) : lifecycleActions.includes("save") ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            isLoading={busy === "save"}
            disabled={readOnly || !isDirty}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
        ) : null}
        {lifecycleActions.includes("validate") && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onValidate}
            disabled={operatorReadOnly || hasBlockingIssues}
            isLoading={busy === "validate"}
            title={
              hasBlockingIssues
                ? `${errorCount} issue(s) must be resolved`
                : "Save the draft, compile it, and validate it on the backend"
            }
          >
            <ShieldCheck className="h-4 w-4" />
            Validate
          </Button>
        )}
        {lifecycleActions.includes("publish") && (
          <Button
            size="sm"
            variant="success"
            onClick={onPublish}
            disabled={operatorReadOnly}
            isLoading={busy === "publish"}
            title="Publish this validated rule"
          >
            <Rocket className="h-4 w-4" />
            Publish
          </Button>
        )}
        {lifecycleActions.includes("disable") && (
          <Button
            size="sm"
            variant="danger"
            onClick={onDisable}
            disabled={operatorReadOnly}
            isLoading={busy === "disable"}
            title="Disable this published rule"
          >
            <Undo2 className="h-4 w-4" />
            Disable
          </Button>
        )}
        {lifecycleActions.includes("activate") && (
          <Button
            size="sm"
            variant="success"
            onClick={onActivate}
            disabled={operatorReadOnly}
            isLoading={busy === "activate"}
            title="Reactivate this disabled definition without rewriting its immutable content"
          >
            <Undo2 className="h-4 w-4" />
            Reactivate
          </Button>
        )}
        {rule && lifecycleActions.includes("archive") && (
          <Button
            size="sm"
            variant="danger"
            onClick={onArchive}
            disabled={operatorReadOnly}
            isLoading={busy === "archive"}
            title="Delete this non-live definition from active catalogs while preserving its audit record"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      {notice && (
        <p className="flex w-full items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {notice}
        </p>
      )}
      {!notice && rule?.state === "PUBLISHED" && (
        <p className="flex w-full items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Published versions are immutable audit records. Disable this version
          to stop it, or start a new editable DRAFT with New version. The
          backend intentionally exposes no hard-delete endpoint for rule
          definitions.
        </p>
      )}
    </div>
  );
}

function RuleStateBadge({ state }: { state: RuleDefinition["state"] }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-500/10 text-gray-600 ring-gray-500/30 dark:text-gray-300",
    VALIDATED: "bg-sky-500/10 text-sky-600 ring-sky-500/30 dark:text-sky-400",
    PUBLISHED:
      "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400",
    DISABLED:
      "bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400",
    ROLLED_BACK:
      "bg-violet-500/10 text-violet-600 ring-violet-500/30 dark:text-violet-400",
    ARCHIVED: "bg-gray-500/10 text-gray-500 ring-gray-500/30",
  };
  return (
    <span
      className={cn(
        "rounded-md px-2 py-1 text-[11px] font-semibold uppercase ring-1",
        styles[state],
      )}
    >
      {state.replace("_", " ")}
    </span>
  );
}

export function RuleBuilder(props: RuleBuilderProps) {
  return (
    <ReactFlowProvider>
      <RuleBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

export default RuleBuilder;

// Re-exported so pages can label nodes consistently with the canvas.
export { humaniseNodeType, autoLayoutGraph };
