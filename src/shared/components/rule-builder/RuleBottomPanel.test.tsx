// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyRewardBundle, type RuleDefinition } from "@/types/rules";
import { RuleBottomPanel } from "./RuleBottomPanel";

const rule = {
  id: "rule-id",
  definitionKey: "task_store_purchase",
  definitionVersion: 1,
  kind: "TASK",
  state: "PUBLISHED",
  graphDefinition: { nodes: [], edges: [] },
  targetCount: "1",
  rewardDefinition: { version: 2, components: [] },
  triggerEventTypes: ["ITEM_PURCHASED"],
  triggerWildcard: false,
  metadata: {},
  createdAt: "2026-08-24T00:00:00.000Z",
  updatedAt: "2026-08-24T00:00:00.000Z",
} satisfies RuleDefinition;

afterEach(cleanup);

function renderPanel(
  overrides: Partial<ComponentProps<typeof RuleBottomPanel>> = {},
) {
  const onPreview = vi.fn();
  render(
    <RuleBottomPanel
      issues={[]}
      serverError={null}
      serverErrorNodeIds={[]}
      rule={rule}
      evaluation={null}
      isPreviewing={false}
      onPreview={onPreview}
      suggestedEventTypes={["ITEM_PURCHASED"]}
      onFocusNode={vi.fn()}
      rewardBundle={emptyRewardBundle()}
      rewardIssueCount={0}
      onRewardBundleChange={vi.fn()}
      actionTypesOnCanvas={[]}
      roundTrip={null}
      {...overrides}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Test" }));
  return onPreview;
}

describe("RuleBottomPanel dry run", () => {
  it("preselects the event type declared by the trigger node", () => {
    const onPreview = renderPanel();
    expect(
      (screen.getByLabelText("Event type") as HTMLSelectElement).value,
    ).toBe("ITEM_PURCHASED");
    fireEvent.click(screen.getByRole("button", { name: "Run dry run" }));
    expect(onPreview).toHaveBeenCalledWith("ITEM_PURCHASED", {
      gameType: "ludo",
    });
  });

  it("provides an integer-safe amount fixture for AGENT_TOPUP aggregations", () => {
    const onPreview = renderPanel({ suggestedEventTypes: ["AGENT_TOPUP"] });
    expect(
      (screen.getByLabelText("Event type") as HTMLSelectElement).value,
    ).toBe("AGENT_TOPUP");
    expect(
      (screen.getByLabelText("Sample event fields") as HTMLTextAreaElement)
        .value,
    ).toContain('"amount": "10000"');
    fireEvent.click(screen.getByRole("button", { name: "Run dry run" }));
    expect(onPreview).toHaveBeenCalledWith("AGENT_TOPUP", { amount: "10000" });
  });

  it("uses graph-derived fields that satisfy configured conditions", () => {
    const onPreview = renderPanel({
      suggestedEventTypes: ["MATCH_FINISHED"],
      suggestedPreviewFields: { gameType: "domino" },
    });
    expect(
      (screen.getByLabelText("Sample event fields") as HTMLTextAreaElement)
        .value,
    ).toContain('"gameType": "domino"');
    fireEvent.click(screen.getByRole("button", { name: "Run dry run" }));
    expect(onPreview).toHaveBeenCalledWith("MATCH_FINISHED", {
      gameType: "domino",
    });
  });

  it("renders the unwrapped backend evaluation fields", () => {
    renderPanel({
      evaluation: {
        matched: true,
        windowIdentity: "daily:2026-08-24",
        accumulator: { mode: "increment", value: "1" },
        actionTypes: ["CompleteTask"],
        executedSteps: 3,
      },
    });
    expect(screen.getByText("Yes")).toBeTruthy();
    expect(screen.getByText("daily:2026-08-24")).toBeTruthy();
    expect(screen.getByText("CompleteTask")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders fail-stop trace details and skipped downstream nodes", () => {
    renderPanel({
      evaluation: {
        matched: false,
        windowIdentity: "lifetime",
        accumulator: { mode: "increment", value: "0" },
        actionTypes: [],
        executedSteps: 3,
        failure: {
          nodeId: "sum",
          nodeType: "SUM",
          message: "Expected an integer value",
        },
        nodeOutputs: {
          sum: {
            order: 2,
            nodeType: "SUM",
            status: "FAILED",
            matched: false,
            inputs: [
              { nodeId: "trigger", status: "SUCCESS", valueType: "BOOLEAN" },
            ],
            normalizedConfig: { path: "payload.amount" },
            durationMs: 0.25,
            valueType: "NUMBER",
            errorCode: "RULE_NODE_EXECUTION_FAILED",
            error: "Expected an integer value",
          },
          action: {
            order: 3,
            nodeType: "GrantXP",
            status: "SKIPPED_UPSTREAM",
            matched: false,
            inputs: [{ nodeId: "sum", status: "FAILED", valueType: "NUMBER" }],
            normalizedConfig: {},
            durationMs: 0,
            valueType: "ACTION_FLOW",
            skippedBy: ["sum"],
            skipReason:
              "Skipped because upstream node sum did not produce a successful gate.",
          },
        },
      },
    });

    expect(
      screen.getByText(/Downstream nodes and actions were skipped/),
    ).toBeTruthy();
    expect(screen.getAllByText("sum").length).toBeGreaterThan(0);
    expect(screen.getByText("FAILED")).toBeTruthy();
    expect(screen.getByText("SKIPPED_UPSTREAM")).toBeTruthy();
    fireEvent.click(screen.getByText(/#2 · sum · SUM/));
    expect(screen.getByText(/RULE_NODE_EXECUTION_FAILED/)).toBeTruthy();
    fireEvent.click(screen.getByText(/#3 · action · GrantXP/));
    expect(screen.getByText(/Skipped because upstream node sum/)).toBeTruthy();
  });
});
