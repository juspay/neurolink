#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Async Delegation (N2) — live model
 *
 * The one case of the delegation suite that needs a real provider: a model is
 * asked to call `delegate_task` itself and the host then collects the worker's
 * report. It SKIPs when no provider is configured or the provider answers with
 * a credential, quota or availability error, which is why it lives apart from
 * the loopback cases in continuous-test-suite-agent-delegation.ts: those are
 * declared `offline`, where a provider-shaped error is a failure.
 *
 * Run: pnpm run test:agent-delegation-live [--provider=vertex]
 *      pnpm run test:agent-delegation      (offline cases, then this one)
 */

// See continuous-test-suite-agent-delegation.ts: the repo's tracked
// .mcp-config.json starts an `npx` MCP server per NeuroLink instance and waits
// the full 60s client timeout when it cannot, so the instance this case builds
// would stall for a minute for nothing.
process.env.NEUROLINK_SKIP_MCP = "true";

import { defineSuite, assert, assertEqual, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite, opts, section } = defineSuite(
  "Agent Delegation (live)",
  { defaultProvider: "vertex" },
);

section("Live model");

await test("a real model delegates and collects", async () => {
  if (!opts.provider) {
    throw new Skip("no provider configured");
  }
  const host = new NeuroLink();
  host.registerDelegationTools();
  const sessionId = "delegation-live";
  host.setToolContext({ sessionId });

  const token = "OSPREY-8823";
  let content: string;
  try {
    const spawn = await host.generate({
      input: {
        text:
          "Use delegate_task exactly once to start a background worker whose task is: " +
          `"Reply with the single token ${token} and nothing else." ` +
          "Then reply with the workerId you were given, and nothing else. " +
          "Do not call collect_results in this turn.",
      },
      provider: opts.provider,
      ...(opts.model ? { model: opts.model } : {}),
      maxSteps: 4,
      timeout: 120_000,
    });
    content = spawn.content;
  } catch (error) {
    throw new Skip(
      `provider "${opts.provider}" unavailable: ${
        error instanceof Error ? error.message.slice(0, 160) : String(error)
      }`,
    );
  }
  assert(/w\d+/.test(content), "the model should have reported a worker id");

  const collected = await host.collectDelegates({
    mode: "all",
    sessionId,
    waitMs: 180_000,
  });
  assertEqual(
    collected.completed.length,
    1,
    "the worker the model spawned must be collectable by the host",
  );
  const outcome = collected.completed[0];
  assert(outcome !== undefined, "an outcome must have been claimed");
  const report = await host.readArtifact(outcome.report.artifactId);
  assert(
    (report ?? "").includes(token),
    "the banked report must carry what the worker was told to produce",
  );
});

await runSuite();
