"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  FlaskConical,
  Info,
  Play,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";
import { RewardBundleV2Editor } from "@/shared/components/rewards/RewardBundleV2Editor";
import { defaultPreviewFields } from "@/shared/lib/rule-preview-fixture";
import type { RuleIssue } from "@/shared/lib/rule-validation";
import type {
  CompiledRuleEvaluation,
  RuleDefinition,
  RewardBundleV2,
} from "@/types/rules";
import {
  GAMEPLAY_EVENT_TYPES,
  type GameplayEventEnvelope,
} from "@/types/rules";

type PanelTab = "validation" | "reward" | "test" | "plan";
type GameplayEventType = GameplayEventEnvelope["eventType"];

interface RuleBottomPanelProps {
  issues: RuleIssue[];
  /** Errors returned by the backend compiler — authoritative, shown verbatim. */
  serverError: string | null;
  /** Node ids the backend error was attributed to. */
  serverErrorNodeIds: string[];
  rule: RuleDefinition | null;
  evaluation: CompiledRuleEvaluation | null;
  isPreviewing: boolean;
  onPreview: (
    eventType: GameplayEventType,
    payload: Record<string, unknown>,
  ) => void;
  onReplayPreview?: () => void;
  suggestedEventTypes?: GameplayEventType[];
  suggestedPreviewFields?: Record<string, unknown>;
  onFocusNode: (nodeId: string) => void;
  rewardBundle: RewardBundleV2;
  rewardIssueCount: number;
  onRewardBundleChange: (bundle: RewardBundleV2) => void;
  actionTypesOnCanvas: string[];
  readOnly?: boolean;
  roundTrip: RoundTripResult | null;
}

/** Outcome of comparing the server's stored graph against the local canvas. */
export interface RoundTripResult {
  matches: boolean;
  detail: string;
}

export function RuleBottomPanel({
  issues,
  serverError,
  serverErrorNodeIds,
  rule,
  evaluation,
  isPreviewing,
  onPreview,
  onReplayPreview,
  suggestedEventTypes = [],
  suggestedPreviewFields,
  onFocusNode,
  rewardBundle,
  rewardIssueCount,
  onRewardBundleChange,
  actionTypesOnCanvas,
  readOnly,
  roundTrip,
}: RuleBottomPanelProps) {
  const [tab, setTab] = useState<PanelTab>("validation");
  const [expanded, setExpanded] = useState(true);

  const errorCount = issues.filter(
    (issue) => issue.severity === "error",
  ).length;

  const tabs: { id: PanelTab; label: string; badge?: number }[] = [
    { id: "validation", label: "Validation", badge: errorCount },
    { id: "reward", label: "Reward Bundle", badge: rewardIssueCount },
    { id: "test", label: "Test" },
    { id: "plan", label: "Compiled plan" },
  ];

  return (
    <section
      className={cn(
        "flex shrink-0 flex-col border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
        expanded ? "h-[min(68svh,32rem)] lg:h-80" : "h-11",
      )}
    >
      <div className="flex min-w-0 items-center justify-between border-b border-gray-200 px-1 sm:px-2 dark:border-gray-800">
        <div className="flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setExpanded(true);
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2.5 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
                tab === item.id && expanded
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200",
              )}
            >
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronUp
            className={cn(
              "h-4 w-4 transition-transform",
              !expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {expanded && (
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "validation" && (
            <ValidationTab
              issues={issues}
              serverError={serverError}
              serverErrorNodeIds={serverErrorNodeIds}
              roundTrip={roundTrip}
              onFocusNode={onFocusNode}
            />
          )}
          {tab === "reward" && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400">
                The single shared Reward Bundle V2 for this rule. Components
                bind to Action nodes on the canvas via{" "}
                <span className="font-mono">rewardComponentId</span> (set
                per-node in the Inspector when more than one action of the same
                type exists).
                {actionTypesOnCanvas.length > 0 && (
                  <>
                    {" "}
                    Action nodes on canvas:{" "}
                    <span className="font-mono">
                      {actionTypesOnCanvas.join(", ")}
                    </span>
                    .
                  </>
                )}
              </p>
              <RewardBundleV2Editor
                value={rewardBundle}
                onChange={onRewardBundleChange}
                disabled={readOnly}
              />
            </div>
          )}
          {tab === "test" && (
            <TestTab
              key={`${suggestedEventTypes[0] ?? "default-preview-event"}:${JSON.stringify(suggestedPreviewFields ?? {})}`}
              rule={rule}
              evaluation={evaluation}
              isPreviewing={isPreviewing}
              onPreview={onPreview}
              onReplayPreview={onReplayPreview}
              suggestedEventTypes={suggestedEventTypes}
              suggestedPreviewFields={suggestedPreviewFields}
              canPersistDraft={!readOnly}
              onFocusNode={onFocusNode}
            />
          )}
          {tab === "plan" && (
            <PlanTab
              plan={rule?.compiledPlan as CompiledPlanShape | null | undefined}
            />
          )}
        </div>
      )}
    </section>
  );
}

function ValidationTab({
  issues,
  serverError,
  serverErrorNodeIds,
  roundTrip,
  onFocusNode,
}: {
  issues: RuleIssue[];
  serverError: string | null;
  serverErrorNodeIds: string[];
  roundTrip: RoundTripResult | null;
  onFocusNode: (nodeId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {serverError && (
        <div className="flex gap-2 rounded-lg border border-red-500/40 bg-red-50 p-2.5 dark:bg-red-500/10">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0">
            {/* Covers compiler rejections and any other backend failure
                (conflict, permission, server error) — so it must stay neutral. */}
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">
              Backend rejected this request
            </p>
            <p className="mt-0.5 break-words text-xs text-red-700/90 dark:text-red-300/90">
              {serverError}
            </p>
            {serverErrorNodeIds.length > 0 && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-red-700/90 dark:text-red-300/90">
                <span>Affected nodes:</span>
                {serverErrorNodeIds.map((nodeId) => (
                  <button
                    key={nodeId}
                    type="button"
                    onClick={() => onFocusNode(nodeId)}
                    className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono underline-offset-2 hover:underline"
                  >
                    {nodeId}
                  </button>
                ))}
              </p>
            )}
          </div>
        </div>
      )}

      {roundTrip && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border p-2.5",
            roundTrip.matches
              ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-50 dark:bg-amber-500/10",
          )}
        >
          {roundTrip.matches ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs font-semibold",
                roundTrip.matches
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300",
              )}
            >
              {roundTrip.matches
                ? "Stored definition matches the canvas"
                : "Stored definition differs from the canvas"}
            </p>
            <p
              className={cn(
                "mt-0.5 break-words text-[11px]",
                roundTrip.matches
                  ? "text-emerald-700/90 dark:text-emerald-300/90"
                  : "text-amber-700/90 dark:text-amber-300/90",
              )}
            >
              {roundTrip.detail}
            </p>
          </div>
        </div>
      )}

      {issues.length === 0 && !serverError ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            No local issues found. The backend compiler still has the final say
            on validate.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              <button
                type="button"
                disabled={!issue.nodeId}
                onClick={() => issue.nodeId && onFocusNode(issue.nodeId)}
                className={cn(
                  "flex w-full gap-2 rounded-lg border p-2 text-start transition-colors",
                  "border-gray-200 dark:border-gray-800",
                  issue.nodeId &&
                    "hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10",
                )}
              >
                <AlertCircle
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    issue.severity === "error"
                      ? "text-red-500"
                      : "text-amber-500",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-gray-800 dark:text-gray-200">
                    {issue.message}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-gray-400">
                    <span>{issue.code}</span>
                    {issue.nodeId && <span>· {issue.nodeId}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TestTab({
  rule,
  evaluation,
  isPreviewing,
  onPreview,
  onReplayPreview,
  suggestedEventTypes,
  suggestedPreviewFields,
  canPersistDraft,
  onFocusNode,
}: {
  rule: RuleDefinition | null;
  evaluation: CompiledRuleEvaluation | null;
  isPreviewing: boolean;
  onPreview: (
    eventType: GameplayEventType,
    payload: Record<string, unknown>,
  ) => void;
  onReplayPreview?: () => void;
  suggestedEventTypes: GameplayEventType[];
  suggestedPreviewFields?: Record<string, unknown>;
  canPersistDraft: boolean;
  onFocusNode: (nodeId: string) => void;
}) {
  const suggestedEventType = suggestedEventTypes[0];
  const [eventType, setEventType] = useState<GameplayEventType>(
    suggestedEventType ?? "MATCH_WON",
  );
  const [payloadText, setPayloadText] = useState(() =>
    JSON.stringify(
      suggestedPreviewFields ??
        defaultPreviewFields(suggestedEventType ?? "MATCH_WON"),
      null,
      2,
    ),
  );
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const canPreview = Boolean(rule?.id || canPersistDraft) && !isPreviewing;

  const submit = () => {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText || "{}");
    } catch {
      setPayloadError("Payload must be valid JSON.");
      return;
    }
    setPayloadError(null);
    onPreview(eventType, payload);
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-50 p-2 dark:bg-sky-500/10">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="text-[11px] text-sky-800 dark:text-sky-300">
            Dry run only. The backend evaluates the compiled plan and reports
            what
            <em> would </em>
            happen — no actions are dispatched and no rewards are granted.
          </p>
        </div>

        {suggestedEventType && (
          <p className="text-[11px] text-gray-500">
            Event type preselected from the rule trigger:{" "}
            <span className="font-mono">{suggestedEventType}</span>.
          </p>
        )}

        {!rule?.id && canPersistDraft && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            This draft will be saved to the backend first, then previewed
            against its durable rule ID.
          </p>
        )}

        <div>
          <label
            htmlFor="preview-event-type"
            className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            Event type
          </label>
          <select
            id="preview-event-type"
            value={eventType}
            onChange={(event) => {
              const next = event.target.value as GameplayEventType;
              setEventType(next);
              setPayloadText(
                JSON.stringify(
                  next === suggestedEventType && suggestedPreviewFields
                    ? suggestedPreviewFields
                    : defaultPreviewFields(next),
                  null,
                  2,
                ),
              );
              setPayloadError(null);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {GAMEPLAY_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="preview-payload"
            className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
          >
            Sample event fields
          </label>
          <textarea
            id="preview-payload"
            rows={5}
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Envelope fields such as <code>gameType</code> are placed at the
            event root; the remaining values are sent as the canonical payload.
          </p>
          {payloadError && (
            <p className="mt-1 text-[11px] text-red-500">{payloadError}</p>
          )}
        </div>

        <Button
          size="sm"
          onClick={submit}
          disabled={!canPreview}
          isLoading={isPreviewing}
        >
          <FlaskConical className="h-4 w-4" />
          Run dry run
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Result
        </h4>
        {!evaluation ? (
          <p className="text-xs text-gray-400">
            Run a dry run to see the evaluation.
          </p>
        ) : (
          <div className="space-y-2">
            {evaluation.failure ? (
              <div className="rounded-lg border border-red-500/30 bg-red-50 p-2 text-[11px] text-red-800 dark:bg-red-500/10 dark:text-red-300">
                Node{" "}
                <span className="font-mono font-semibold">
                  {evaluation.failure.nodeId}
                </span>{" "}
                failed: {evaluation.failure.message}. Downstream nodes and
                actions were skipped.
              </div>
            ) : (
              !evaluation.matched && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  Dry run completed successfully, but this event/payload did not
                  satisfy the trigger or downstream conditions. No action should
                  run for a non-match.
                </div>
              )
            )}
            <dl className="space-y-1.5 text-xs">
              <Row label="Matched">
                <span
                  className={
                    evaluation.matched
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-500"
                  }
                >
                  {evaluation.matched ? "Yes" : "No"}
                </span>
              </Row>
              <Row label="Window identity">
                <span className="font-mono">
                  {evaluation.windowIdentity || "—"}
                </span>
              </Row>
              <Row label="Accumulator">
                <span className="font-mono">
                  {evaluation.accumulator
                    ? `${evaluation.accumulator.mode} = ${evaluation.accumulator.value}`
                    : "—"}
                </span>
              </Row>
              <Row label="Executed steps">{evaluation.executedSteps ?? 0}</Row>
              <Row label="Actions that would run">
                {evaluation.actionTypes?.length
                  ? evaluation.actionTypes.join(", ")
                  : "none"}
              </Row>
            </dl>
            {evaluation.nodeOutputs && (
              <div className="space-y-1 border-t border-gray-200 pt-2 dark:border-gray-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Node execution
                </p>
                {Object.entries(evaluation.nodeOutputs).map(
                  ([nodeId, result]) => {
                    const inputs = result.inputs ?? [];
                    const normalizedConfig = result.normalizedConfig ?? {};
                    return (
                      <details
                        key={nodeId}
                        className="rounded border border-gray-200 px-2 py-1 dark:border-gray-800"
                      >
                        <summary
                          onClick={() => onFocusNode?.(nodeId)}
                          className="flex cursor-pointer list-none items-center justify-between gap-2 text-left text-[11px]"
                        >
                          <span className="min-w-0 truncate font-mono text-gray-600 dark:text-gray-300">
                            #{result.order ?? "—"} · {nodeId} ·{" "}
                            {result.nodeType ?? "node"}
                          </span>
                          <span
                            className={
                              result.status === "SUCCESS" ||
                              result.status === "NO_OP"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : result.status === "FAILED"
                                  ? "text-red-600 dark:text-red-400"
                                  : result.status === "FALSE_GATE"
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-slate-500"
                            }
                          >
                            {result.status}
                          </span>
                        </summary>
                        <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-gray-100 pt-2 text-[10px] dark:border-gray-800">
                          <Row label="Duration">
                            {(result.durationMs ?? 0).toFixed(3)} ms
                          </Row>
                          <Row label="Output type">{result.valueType}</Row>
                          <Row label="Matched">
                            {result.matched ? "yes" : "no"}
                          </Row>
                          <Row label="Output">{result.value ?? "—"}</Row>
                        </dl>
                        {inputs.length > 0 && (
                          <p className="mt-1 text-[10px] text-gray-500">
                            Inputs:{" "}
                            {inputs
                              .map(
                                (input) =>
                                  `${input.nodeId}=${input.status}${input.value !== undefined ? `(${input.value})` : ""}`,
                              )
                              .join(", ")}
                          </p>
                        )}
                        {Object.keys(normalizedConfig).length > 0 && (
                          <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-1.5 text-[10px] dark:bg-gray-900">
                            {JSON.stringify(normalizedConfig, null, 2)}
                          </pre>
                        )}
                        {result.error && (
                          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
                            {result.errorCode ?? "FAILED"}: {result.error}
                          </p>
                        )}
                        {result.skipReason && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            {result.skipReason}
                          </p>
                        )}
                      </details>
                    );
                  },
                )}
              </div>
            )}
            {onReplayPreview && (
              <Button size="sm" variant="outline" onClick={onReplayPreview}>
                <Play className="h-3.5 w-3.5" /> Replay flow
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** RuleDefinition.compiledPlan is typed `unknown` on the V2 contract (the
 * backend doesn't narrow it either) — narrow just enough to render it. */
interface CompiledPlanShape {
  compilerVersion: string;
  executionCost: number;
  triggerNodeIds: string[];
  actionNodeIds: string[];
  graphHash: string;
  orderedNodes: Array<{ id: string }>;
}

function PlanTab({ plan }: { plan: CompiledPlanShape | null | undefined }) {
  if (!plan) {
    return (
      <p className="text-xs text-gray-400">
        Validate the rule to produce a compiled plan.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Stat label="Compiler" value={plan.compilerVersion} />
        <Stat label="Execution cost" value={String(plan.executionCost)} />
        <Stat
          label="Triggers"
          value={String(plan.triggerNodeIds?.length ?? 0)}
        />
        <Stat label="Actions" value={String(plan.actionNodeIds?.length ?? 0)} />
      </dl>
      <div>
        <p className="mb-1 text-[11px] text-gray-400">Graph hash</p>
        <p className="break-all rounded bg-gray-50 p-1.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {plan.graphHash}
        </p>
      </div>
      <div>
        <p className="mb-1 text-[11px] text-gray-400">Execution order</p>
        <ol className="flex flex-wrap gap-1">
          {plan.orderedNodes?.map((node, index) => (
            <li
              key={node.id}
              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {index + 1}. {node.id}
            </li>
          ))}
        </ol>
      </div>
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
    <div className="flex justify-between gap-2">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-end font-medium text-gray-800 dark:text-gray-200">
        {children}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800/60">
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-semibold text-gray-800 dark:text-gray-200">
        {value}
      </dd>
    </div>
  );
}

export default RuleBottomPanel;
