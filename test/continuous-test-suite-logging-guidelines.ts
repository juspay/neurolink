#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Logging Guidelines doc accuracy
 *
 * `docs/development/logging-guidelines.md` documents the logger's
 * "Per-instance routing": a log call inside one instance's scope reaches only
 * that instance's sinks, a worker's `onLog` bridge
 * (`NeuroLink.createWorkerInstance({ onLog })`) receives only that worker's
 * own events, logs emitted outside any call stay unattributed, and a
 * process-wide sink (`logger.setEventEmitter`) still receives everything.
 *
 * The suite checks that behaviour against the built SDK's public `logger` and
 * `NeuroLink`, then checks that the guide states it. Every "did not receive"
 * assertion is paired with a sink that must have received the same event, so
 * a probe that never fired cannot pass as isolation.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-logging-guidelines.ts
 *      pnpm run test:logging-guidelines
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NeuroLink, logger } from "../dist/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("Logging Guidelines doc accuracy", {
  offline: true,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GUIDE_PATH = resolve(REPO_ROOT, "docs/development/logging-guidelines.md");

/** A sink that records the message of every `log-event` it receives. */
function recorder(): {
  sink: { emit: (event: string, ...args: unknown[]) => boolean };
  saw: (marker: string) => boolean;
} {
  const messages: string[] = [];
  return {
    sink: {
      emit: (event, payload) => {
        if (
          event === "log-event" &&
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
        ) {
          messages.push(payload.message);
        }
        return true;
      },
    },
    saw: (marker) => messages.some((m) => m.includes(marker)),
  };
}

/** The "## Per-instance routing" section's body, up to the next `## ` heading. */
function readPerInstanceRoutingSection(): string {
  const md = readFileSync(GUIDE_PATH, "utf8");
  const start = md.indexOf("## Per-instance routing");
  assert(start !== -1, "guide is missing a '## Per-instance routing' section");
  const rest = md.slice(start + "## Per-instance routing".length);
  const nextHeading = rest.indexOf("\n## ");
  return rest.slice(0, nextHeading === -1 ? undefined : nextHeading);
}

await runSuite(async () => {
  await test("a log call inside one instance's scope reaches only that instance's sinks", () => {
    const global = recorder();
    const a = recorder();
    const b = recorder();
    const idA = `guide-probe-a-${process.pid}`;
    const idB = `guide-probe-b-${process.pid}`;
    logger.setEventEmitter(global.sink);
    logger.addScopedEventEmitter(idA, a.sink);
    logger.addScopedEventEmitter(idB, b.sink);
    try {
      const marker = `scoped-probe-${Date.now()}`;
      // error is always emitted regardless of NEUROLINK_DEBUG, so the probe
      // does not depend on log-level configuration.
      logger.runInInstanceScope(idA, () => logger.error(`[Test] ${marker}`));
      assert(
        global.saw(marker),
        "precondition: the process-wide sink must receive the probe",
      );
      assert(
        a.saw(marker),
        "the scoped instance's own sink did not receive it",
      );
      assert(
        !b.saw(marker),
        "a sibling instance's sink received another instance's log",
      );
    } finally {
      logger.removeScopedEventEmitter(idA, a.sink);
      logger.removeScopedEventEmitter(idB, b.sink);
      logger.clearEventEmitter(global.sink);
    }
  });

  await test("an unscoped log reaches the process-wide sink but no worker's onLog bridge", async () => {
    const host = new NeuroLink();
    const global = recorder();
    const heardByA: string[] = [];
    const heardByB: string[] = [];
    const workerA = host.createWorkerInstance({
      logTag: "probe-A",
      onLog: (event) => heardByA.push(event.message),
    });
    const workerB = host.createWorkerInstance({
      logTag: "probe-B",
      onLog: (event) => heardByB.push(event.message),
    });
    logger.setEventEmitter(global.sink);
    try {
      const marker = `unscoped-probe-${Date.now()}`;
      logger.error(`[Test] ${marker}`);
      assert(
        global.saw(marker),
        "precondition: the process-wide sink must receive the probe",
      );
      assert(
        !heardByA.some((m) => m.includes(marker)) &&
          !heardByB.some((m) => m.includes(marker)),
        "an unattributed log was forwarded to a worker's onLog bridge",
      );
    } finally {
      logger.clearEventEmitter(global.sink);
      await workerA.dispose?.();
      await workerB.dispose?.();
      await host.dispose?.();
    }
  });

  await test("the guide states per-instance routing and points at its source of truth", () => {
    const section = readPerInstanceRoutingSection();
    assert(
      /receives only that worker's own\s+events/.test(section),
      "the Per-instance routing section no longer states what a worker's onLog bridge receives",
    );
    assert(
      /WorkerInstanceOptions\.onLog/.test(section) &&
        /isolatedAgent\.ts/.test(section),
      "the section does not point at WorkerInstanceOptions.onLog's JSDoc (src/lib/types/isolatedAgent.ts)",
    );
    assert(
      !/not what ships today|until that lands/.test(section),
      "the section still describes per-instance routing as unshipped",
    );
  });
});
