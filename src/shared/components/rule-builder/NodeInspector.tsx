"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Braces,
  Cpu,
  Gift,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { NodeConfigForm } from "@/shared/components/rewards/NodeConfigForm";
import {
  NODE_KIND_META,
  NO_OP_ACTION_TYPES,
  humaniseNodeType,
} from "@/shared/config/rule-nodes";
import {
  getNodeConfigurationState,
  type NodeConfigurationState,
} from "@/shared/lib/rule-node-configuration";
import { PORT_TYPE_META } from "@/shared/lib/rule-ports";
import type { RuleIssue } from "@/shared/lib/rule-validation";
import { getRuleNodeIdError } from "@/shared/lib/rule-validation";
import {
  ACTION_REWARD_TYPES,
  type RewardBundleV2,
  type RuleNode,
  type RuleNodeDescriptor,
  type RuleNodeExecutionResult,
  type RuleNodePort,
} from "@/types/rules";

interface NodeInspectorProps {
  node: RuleNode | null;
  descriptor: RuleNodeDescriptor | null;
  issues: RuleIssue[];
  inputCount: number;
  rewardBundle: RewardBundleV2;
  executionResult?: RuleNodeExecutionResult;
  onChangeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  onChangeId: (nodeId: string, nextId: string) => void;
  onDelete: (nodeId: string) => void;
  nodeIds?: string[];
  readOnly?: boolean;
  /** Backend-derived gameplay event types for EVENT_TYPE fields. */
  eventTypeOptions?: string[];
  /** Backend game catalog gameType values for GAME_TYPE fields. */
  gameTypeOptions?: string[];
  className?: string;
}

const inputClass = cn(
  "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm",
  "text-gray-900 placeholder:text-gray-400",
  "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100",
);

const CONFIGURATION_STATE_META: Record<
  NodeConfigurationState,
  { label: string; className: string }
> = {
  NO_CONFIGURATION_REQUIRED: {
    label: "No configuration required",
    className:
      "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  OPTIONAL_CONFIGURATION: {
    label: "Optional configuration",
    className:
      "border-sky-500/30 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  },
  REQUIRED_CONFIGURATION_COMPLETE: {
    label: "Configuration complete",
    className:
      "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  REQUIRED_CONFIGURATION_INCOMPLETE: {
    label: "Not configured",
    className:
      "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  },
  INVALID_CONFIGURATION: {
    label: "Invalid configuration",
    className:
      "border-red-500/30 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  },
};

/** Reverse of REWARD_ACTION_TYPES: which RewardComponentType (if any) this action type grants. */
function rewardTypeForAction(
  actionType: string,
): RewardBundleV2["components"][number]["type"] | undefined {
  return ACTION_REWARD_TYPES[actionType as keyof typeof ACTION_REWARD_TYPES];
}

/**
 * Right rail: edit the selected node's identity, configuration, and (for
 * reward-capable Action nodes) its binding into the shared RewardBundleV2.
 *
 * Configuration fields come from `descriptor.configSchema`, returned by the
 * backend's GET /admin/rules/nodes — rendered via the same `NodeConfigForm`
 * the Simple-Mode NodeSlotPicker uses, so there is exactly one config-field
 * renderer in the app, not two independently-drifting ones.
 *
 * IMPORTANT: earlier versions of this Inspector unconditionally treated every
 * `kind === 'action'` node as configless ("Action nodes take no node-level
 * settings"). That is false for e.g. `EmitInternalEvent`, whose descriptor
 * declares a real `configSchema` (`eventType`, `payload`) alongside its
 * reward-bundle binding. Configuration visibility is now driven purely by
 * `descriptor.configSchema.length > 0`, independent of kind.
 */
export function NodeInspector({
  node,
  descriptor,
  issues,
  inputCount,
  rewardBundle,
  executionResult,
  onChangeConfig,
  onChangeId,
  onDelete,
  nodeIds = [],
  readOnly,
  eventTypeOptions,
  gameTypeOptions,
  className,
}: NodeInspectorProps) {
  const [nodeIdEditor, setNodeIdEditor] = useState({
    sourceId: node?.id ?? "",
    value: node?.id ?? "",
  });
  const nodeIdDraft =
    node && nodeIdEditor.sourceId === node.id
      ? nodeIdEditor.value
      : (node?.id ?? "");

  if (!node || !descriptor) {
    return (
      <aside
        className={cn(
          "flex h-full w-72 shrink-0 flex-col border-s border-gray-200 bg-white max-xl:w-64 max-lg:h-[58svh] max-lg:min-h-[340px] max-lg:w-full max-lg:border-s-0 max-lg:border-t-0 dark:border-gray-800 dark:bg-gray-900",
          className,
        )}
      >
        <div className="border-b border-gray-200 p-3 dark:border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Inspector
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-sm text-gray-400">
            Select a node on the canvas to edit its configuration.
          </p>
        </div>
      </aside>
    );
  }

  const meta = NODE_KIND_META[descriptor.kind];
  const isNoOpAction = NO_OP_ACTION_TYPES.has(node.type);
  const hasConfigFields = descriptor.configSchema.length > 0;
  const rewardType =
    descriptor.kind === "action" ? rewardTypeForAction(node.type) : undefined;
  const nodeIdError = getRuleNodeIdError(nodeIdDraft, nodeIds, node.id);
  const configurationState = getNodeConfigurationState(descriptor, node.config);

  const commitNodeId = () => {
    if (!nodeIdError && nodeIdDraft !== node.id)
      onChangeId(node.id, nodeIdDraft);
  };

  const setConfig = (config: Record<string, unknown>) =>
    onChangeConfig(node.id, config);

  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-s border-gray-200 bg-white max-xl:w-64 max-lg:h-[58svh] max-lg:min-h-[340px] max-lg:w-full max-lg:border-s-0 max-lg:border-t-0 dark:border-gray-800 dark:bg-gray-900",
        className,
      )}
    >
      <div className="border-b border-gray-200 p-3 dark:border-gray-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Inspector
        </h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1",
              meta.chipClass,
            )}
          >
            {descriptor.kind}
          </span>
          <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            {descriptor.label || humaniseNodeType(node.type)}
          </p>
          <p className="font-mono text-[11px] text-gray-400">{node.type}</p>
          {descriptor.description && (
            <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">
              {descriptor.description}
            </p>
          )}
          <dl className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2 text-[11px] dark:bg-gray-800/60">
            <Row label="Category">{descriptor.category}</Row>
            <Row label="Canonical type">
              <span className="font-mono">{node.type}</span>
            </Row>
          </dl>
        </div>

        <ConfigurationStatus state={configurationState} />

        <div>
          <label
            htmlFor="rule-node-id"
            className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            Node ID
          </label>
          <input
            id="rule-node-id"
            value={nodeIdDraft}
            disabled={readOnly}
            maxLength={64}
            aria-invalid={Boolean(nodeIdError)}
            aria-describedby="rule-node-id-help"
            onChange={(event) =>
              setNodeIdEditor({ sourceId: node.id, value: event.target.value })
            }
            onBlur={commitNodeId}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitNodeId();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setNodeIdEditor({ sourceId: node.id, value: node.id });
              }
            }}
            className={cn(
              inputClass,
              "font-mono",
              nodeIdError &&
                "border-red-500 focus:border-red-500 focus:ring-red-500",
            )}
          />
          <p
            id="rule-node-id-help"
            className={cn(
              "mt-1 text-[11px]",
              nodeIdError ? "text-red-600 dark:text-red-400" : "text-gray-400",
            )}
          >
            {nodeIdError ?? "1–64 characters: A–Z, a–z, 0–9, _ or -."}
          </p>
        </div>

        {issues.length > 0 && (
          <ul className="space-y-1.5 rounded-lg border border-red-500/30 bg-red-50 p-2.5 dark:bg-red-500/10">
            {issues.map((issue, index) => (
              <li
                key={`${issue.code}-${index}`}
                className="flex gap-1.5 text-xs text-red-700 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}

        {executionResult && <ExecutionResultSection result={executionResult} />}

        {isNoOpAction && (
          <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-2.5 dark:bg-amber-500/10">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              The backend dispatcher has no handler for{" "}
              <span className="font-mono">{node.type}</span> yet, so it compiles
              and publishes but performs no action at runtime. Use a supported
              action instead.
            </p>
          </div>
        )}

        {hasConfigFields ? (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Configuration
            </h4>
            <NodeConfigForm
              schema={descriptor.configSchema}
              value={node.config}
              disabled={readOnly}
              onChange={setConfig}
              eventContext={descriptor.eventContext}
              eventTypeOptions={eventTypeOptions}
              gameTypeOptions={gameTypeOptions}
            />
          </div>
        ) : (
          <ConfiglessOverview descriptor={descriptor} />
        )}

        {rewardType && (
          <RewardBinding
            node={node}
            rewardType={rewardType}
            rewardBundle={rewardBundle}
            readOnly={readOnly}
            onChangeConfig={setConfig}
          />
        )}

        <PortsSection descriptor={descriptor} />

        <EventContextSection descriptor={descriptor} />

        <RuntimeSection descriptor={descriptor} />

        <ConnectionRules descriptor={descriptor} inputCount={inputCount} />
      </div>

      {!readOnly && (
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-4 w-4" />
            Remove node
          </Button>
        </div>
      )}
    </aside>
  );
}

function ExecutionResultSection({
  result,
}: {
  result: RuleNodeExecutionResult;
}) {
  const statusClass =
    result.status === "SUCCESS" || result.status === "NO_OP"
      ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
      : result.status === "FALSE_GATE"
        ? "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
        : result.status === "FAILED"
          ? "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300"
          : "border-slate-400/30 bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300";

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-2.5 text-[11px]",
        statusClass,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold uppercase tracking-wider">Test result</h4>
        <span className="font-mono font-semibold">{result.status}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1">
        <Row label="Execution order">#{result.order}</Row>
        <Row label="Duration">{(result.durationMs ?? 0).toFixed(3)} ms</Row>
        <Row label="Output type">{result.valueType}</Row>
        <Row label="Output">
          {result.value ?? (result.matched ? "matched" : "none")}
        </Row>
      </dl>
      {(result.inputs ?? []).length > 0 && (
        <div>
          <span className="font-semibold">Inputs</span>
          <ul className="mt-1 space-y-0.5 font-mono">
            {(result.inputs ?? []).map((input) => (
              <li key={input.nodeId}>
                {input.nodeId}: {input.status}
                {input.value !== undefined ? ` → ${input.value}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Object.keys(result.normalizedConfig ?? {}).length > 0 && (
        <div>
          <span className="font-semibold">Normalized config</span>
          <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded bg-black/5 p-1.5 font-mono dark:bg-white/5">
            {JSON.stringify(result.normalizedConfig ?? {}, null, 2)}
          </pre>
        </div>
      )}
      {result.error && (
        <p>
          <span className="font-mono font-semibold">
            {result.errorCode ?? "FAILED"}
          </span>
          : {result.error}
        </p>
      )}
      {result.skipReason && <p>{result.skipReason}</p>}
    </div>
  );
}

/**
 * What this Action node grants comes from the RewardBundleV2, edited in the
 * bottom panel's Reward tab — not from node-level config. A `rewardComponentId`
 * binding is only REQUIRED (per RuleDefinitionService.assertBundleActionAuthorization)
 * when 2+ action nodes of the same dispatch type exist in the graph; it is
 * always shown so the operator can bind explicitly regardless.
 */
function RewardBinding({
  node,
  rewardType,
  rewardBundle,
  readOnly,
  onChangeConfig,
}: {
  node: RuleNode;
  rewardType: RewardBundleV2["components"][number]["type"];
  rewardBundle: RewardBundleV2;
  readOnly?: boolean;
  onChangeConfig: (config: Record<string, unknown>) => void;
}) {
  const candidates = rewardBundle.components.filter(
    (c) => c.type === rewardType,
  );
  const currentId =
    typeof node.config.rewardComponentId === "string"
      ? node.config.rewardComponentId
      : "";

  return (
    <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-50 p-2.5 dark:bg-violet-500/10">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        <Gift className="h-3.5 w-3.5" /> Reward binding
      </h4>
      {candidates.length === 0 ? (
        <p className="text-[11px] text-violet-800/80 dark:text-violet-300/80">
          No <span className="font-mono">{rewardType}</span> component exists in
          the Reward Bundle yet. Add one in the Reward tab below, then bind it
          here.
        </p>
      ) : (
        <>
          <Select
            value={currentId}
            disabled={readOnly}
            onChange={(e) => {
              const next = { ...node.config };
              if (e.target.value) next.rewardComponentId = e.target.value;
              else delete next.rewardComponentId;
              onChangeConfig(next);
            }}
            options={[
              {
                value: "",
                label:
                  candidates.length === 1
                    ? `(implicit) ${candidates[0]!.id}`
                    : "— select component —",
              },
              ...candidates.map((c) => ({ value: c.id, label: c.id })),
            ]}
          />
          <p className="text-[11px] text-violet-800/80 dark:text-violet-300/80">
            {candidates.length === 1
              ? "Only one matching component exists — binding is optional unless another action node of this type is added."
              : "Multiple matching components exist — an explicit binding is required on every node of this type."}
          </p>
        </>
      )}
    </div>
  );
}

/** Overview for nodes with no editable configuration — never a dead-end message. */
function ConfiglessOverview({
  descriptor,
}: {
  descriptor: RuleNodeDescriptor;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800/60">
      <p className="font-medium text-emerald-700 dark:text-emerald-300">
        Fixed runtime contract — ready to connect.
      </p>
      <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
        This node intentionally has no author-entered values. Its behavior is
        fixed by the backend registry; connect its typed ports to use it. Nodes
        that require a task, amount, condition, or reference show those fields
        here and fail validation while incomplete.
      </p>
      {descriptor.kind === "trigger" && descriptor.consumesEvent && (
        <Row label="Consumes">
          <span className="font-mono">
            {descriptor.consumesEvent === "ANY"
              ? "Any gameplay event"
              : descriptor.consumesEvent}
          </span>
        </Row>
      )}
    </div>
  );
}

function ConfigurationStatus({ state }: { state: NodeConfigurationState }) {
  const meta = CONFIGURATION_STATE_META[state];
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs font-medium",
        meta.className,
      )}
    >
      <span className="block text-[10px] uppercase tracking-wide opacity-70">
        Configuration state
      </span>
      {meta.label}
    </div>
  );
}

/**
 * Inputs / Outputs — the node's real published port contract.
 *
 * These come straight from the backend descriptor (`inputs`/`outputs`, each
 * with a `dataType`). They were previously invisible in both the Inspector and
 * on the canvas, which is what made the builder feel like an untyped box-and-
 * arrow diagram rather than a typed data-flow editor.
 */
function PortsSection({ descriptor }: { descriptor: RuleNodeDescriptor }) {
  const inputs = descriptor.inputs ?? [];
  const outputs = descriptor.outputs ?? [];
  if (inputs.length === 0 && outputs.length === 0) return null;

  return (
    <div className="space-y-2.5 border-t border-gray-100 pt-3 dark:border-gray-800">
      {inputs.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Inputs
          </h4>
          <ul className="space-y-1">
            {inputs.map((port) => (
              <PortRow key={port.key} port={port} />
            ))}
          </ul>
        </div>
      )}
      {outputs.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <ArrowUpFromLine className="h-3.5 w-3.5" /> Outputs
          </h4>
          <ul className="space-y-1">
            {outputs.map((port) => (
              <PortRow key={port.key} port={port} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PortRow({ port }: { port: RuleNodePort }) {
  const typeMeta = PORT_TYPE_META[port.dataType];
  return (
    <li className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800/60">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-100">
          {port.key}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-[10px] font-medium",
            typeMeta.colorClass,
          )}
        >
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              typeMeta.dotClass.replace("!", ""),
            )}
          />
          {typeMeta.label}
          {port.required && <span className="text-rose-500">*</span>}
        </span>
      </div>
      {port.description && (
        <p className="mt-0.5 text-[11px] text-gray-500">{port.description}</p>
      )}
    </li>
  );
}

/**
 * Event Context — the fields a downstream node can actually read off the event
 * this trigger consumes. `descriptor.eventContext` is the backend's own list
 * (ENVELOPE_CONTEXT_FIELDS plus the per-event payload fields registered in
 * node-registry.service.ts), so it never drifts from the runtime envelope.
 * Clicking a field copies its exact path, which is what PAYLOAD_PATH-typed
 * config fields expect — no hand-typed `payload.userContext.whatever`.
 */
function EventContextSection({
  descriptor,
}: {
  descriptor: RuleNodeDescriptor;
}) {
  const fields = descriptor.eventContext ?? [];
  const [copied, setCopied] = useState<string | null>(null);
  if (fields.length === 0) return null;

  const copy = (field: string) => {
    void navigator.clipboard?.writeText(field);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <Braces className="h-3.5 w-3.5" /> Event context
      </h4>
      <p className="text-[11px] text-gray-500">
        Fields available to downstream nodes. Click to copy the exact path.
      </p>
      <ul className="flex flex-wrap gap-1">
        {fields.map((field) => (
          <li key={field}>
            <button
              type="button"
              onClick={() => copy(field)}
              title={`Copy "${field}"`}
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] ring-1 transition-colors",
                copied === field
                  ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 ring-gray-300/60 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700",
              )}
            >
              {copied === field ? "copied" : field}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Runtime behaviour as described by the backend descriptor. */
function RuntimeSection({ descriptor }: { descriptor: RuleNodeDescriptor }) {
  if (!descriptor.runtime) return null;
  return (
    <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <Cpu className="h-3.5 w-3.5" /> Runtime behavior
      </h4>
      {descriptor.runtime && (
        <p className="text-[11px] text-gray-600 dark:text-gray-300">
          {descriptor.runtime}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-gray-700 dark:text-gray-200">
        {children}
      </dd>
    </div>
  );
}

/** Connection rules derived from the descriptor's own port bounds. */
function ConnectionRules({
  descriptor,
  inputCount,
}: {
  descriptor: RuleNodeDescriptor;
  inputCount: number;
}) {
  const rules: string[] = [];
  if (descriptor.kind === "trigger")
    rules.push("Entry point — accepts no inbound connections.");
  if (descriptor.maximumInputs === 0 && descriptor.kind !== "trigger")
    rules.push("Accepts no inbound connections.");
  if (descriptor.minimumInputs > 0)
    rules.push(
      `Requires at least ${descriptor.minimumInputs} connected input(s).`,
    );
  if (descriptor.kind === "action")
    rules.push("Terminal — produces no outbound connection.");
  if (descriptor.kind === "logic")
    rules.push("Inputs must be triggers, conditions, or other logic nodes.");
  if (
    descriptor.kind === "window" ||
    descriptor.kind === "counter" ||
    descriptor.kind === "aggregation"
  ) {
    rules.push("At most one window and one counter/aggregation node per rule.");
  }

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      <dl className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-800/60">
        <div>
          <dt className="text-gray-400">Output</dt>
          <dd className="font-medium text-gray-700 dark:text-gray-200">
            {descriptor.output}
          </dd>
        </div>
        <div>
          <dt className="text-gray-400">Inputs</dt>
          <dd className="font-medium text-gray-700 dark:text-gray-200">
            {inputCount} / {descriptor.maximumInputs}
            {descriptor.minimumInputs > 0 && (
              <span className="text-gray-400">
                {" "}
                (min {descriptor.minimumInputs})
              </span>
            )}
          </dd>
        </div>
      </dl>
      {rules.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Connection rules
          </h4>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] text-gray-500">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NodeInspector;
