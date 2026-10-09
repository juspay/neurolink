#!/usr/bin/env tsx
/**
 * Timeout policy through the shipped tool registry, real confirmation events
 * and actual tool callbacks. Excluded OAuth tools cannot execute on a timer;
 * explicit approvals and ordinary timeout auto-approval keep working.
 */
import { HITLManager, MCPToolRegistry } from "../dist/index.js";
import type { ConfirmationRequestEvent } from "../src/lib/types/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("HITL timeout exclusions", {
  offline: true,
});

const createFixture = async (
  name: string,
  excluded = true,
  exclusions?: string[],
) => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: [name],
    timeout: 50,
    autoApproveOnTimeout: true,
    autoApproveExclusions: exclusions ?? (excluded ? [name] : []),
  });
  const registry = new MCPToolRegistry();
  registry.setHITLManager(manager);
  let executions = 0;
  await registry.registerTool(
    name,
    {
      name,
      description: "Harmless local confirmation fixture",
      inputSchema: { type: "object", properties: {} },
      serverId: "confirmation-fixture",
    },
    {
      execute: async () => {
        executions++;
        return "fixture executed";
      },
    },
  );
  return { manager, registry, executions: () => executions };
};

for (const name of ["connect_data_source", "change_data_source_account"]) {
  await test(`${name} cannot execute on timeout`, async () => {
    const fixture = await createFixture(name);
    let failed: boolean;
    try {
      const result: unknown = await fixture.registry.executeTool(name, {});
      failed =
        !!result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false;
    } catch {
      failed = true;
    }
    assert(
      fixture.manager.getStatistics().timedOutRequests === 1,
      "Excluded tool did not reach the timeout path",
    );
    assert(failed, "Excluded tool was approved by the timeout policy");
    assert(
      fixture.executions() === 0,
      "Excluded tool callback ran without an answer",
    );
    assert(
      fixture.manager.getStatistics().pendingRequests === 0,
      "Timed-out confirmation stayed pending",
    );
  });
}

await test("ordinary tools retain timeout auto-approval", async () => {
  const fixture = await createFixture("write_fixture", false);
  await fixture.registry.executeTool("write_fixture", {});
  assert(
    fixture.executions() === 1,
    "Ordinary timeout auto-approval was removed",
  );
});

await test("an excluded tool still executes on explicit approval", async () => {
  const fixture = await createFixture("connect_data_source");
  fixture.manager.on(
    "hitl:confirmation-request",
    (event: ConfirmationRequestEvent) => {
      fixture.manager.emit("hitl:confirmation-response", {
        type: "hitl:confirmation-response",
        payload: {
          confirmationId: event.payload.confirmationId,
          approved: true,
        },
      });
    },
  );
  await fixture.registry.executeTool("connect_data_source", {});
  assert(fixture.executions() === 1, "Exclusion prevented explicit approval");
});

await test("an exclusion uses the exact tool identity", async () => {
  const fixture = await createFixture("prefix_connect_data_source", false);
  fixture.manager.updateConfig({
    autoApproveExclusions: ["connect_data_source"],
  });
  await fixture.registry.executeTool("prefix_connect_data_source", {});
  assert(
    fixture.executions() === 1,
    "An unrelated tool was excluded by substring",
  );
});

for (const mode of [
  "constructor-input",
  "update-input",
  "getConfig-output",
] as const) {
  await test(`${mode} array mutation cannot remove explicit-consent exclusions`, async () => {
    const exclusions = ["connect_data_source"];
    const fixture = await createFixture(
      "connect_data_source",
      true,
      exclusions,
    );
    if (mode === "constructor-input") {
      exclusions.length = 0;
    } else if (mode === "update-input") {
      const replacement = ["connect_data_source"];
      fixture.manager.updateConfig({ autoApproveExclusions: replacement });
      replacement.length = 0;
    } else {
      fixture.manager.getConfig().autoApproveExclusions?.splice(0);
    }
    let refused: boolean;
    try {
      const result: unknown = await fixture.registry.executeTool(
        "connect_data_source",
        {},
      );
      refused =
        !!result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false;
    } catch {
      refused = true;
    }
    assert(
      fixture.manager.getStatistics().timedOutRequests === 1,
      "Mutation probe did not reach timeout",
    );
    assert(
      refused && fixture.executions() === 0,
      "Array mutation bypassed explicit consent",
    );
  });
}

await test("runtime non-array exclusions are rejected before normalization", async () => {
  let refused = false;
  try {
    Reflect.construct(HITLManager, [
      {
        enabled: true,
        dangerousActions: ["connect_data_source"],
        autoApproveExclusions: "connect_data_source",
      },
    ]);
  } catch (error) {
    refused =
      error instanceof Error &&
      error.message.includes("autoApproveExclusions must be an array");
  }
  assert(refused, "Malformed exclusions were converted into a valid array");
});

await runSuite();
