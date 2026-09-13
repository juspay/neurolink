#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — process exit / SIGTERM lifecycle
 *
 * Regression suite for a user-facing defect: a Node script that constructs
 * `NeuroLink`, completes a `generate()` call and returns completed its work
 * correctly, but the process never exited on its own and could not be
 * stopped with SIGTERM — only SIGKILL worked. Two independent root causes:
 *
 *   1. Registering `process.on("SIGTERM", ...)` disables Node's default
 *      immediate-termination behavior; the SDK's own handler didn't call
 *      `process.exit()`, so the signal was silently swallowed.
 *   2. `@modelcontextprotocol/sdk`'s stdio transport does
 *      `import process from "node:process"` at module scope. Node's ESM/CJS
 *      interop builds a synthetic facade for that import by walking every
 *      getter on the CJS `process` singleton — including the lazily
 *      initialized `stdin` getter — so merely importing the transport
 *      permanently refs a stdin handle as a pure import-time side effect,
 *      independent of whether an MCP stdio client is ever constructed.
 *   3. Several long-lived cache/manager classes started `setInterval`-based
 *      background maintenance timers (MCP circuit-breaker cleanup,
 *      ExternalServerManager health-check polling) without `.unref()`ing
 *      them, and three call sites raced a real operation against
 *      `Promise.race([operation, timeoutPromise])` without ever clearing
 *      the timeout on the success path — both leave the event loop
 *      genuinely non-empty long after all real work is done.
 *
 * This suite spawns the SDK as a real, separate OS process (never imports
 * it in-process) because "does the process exit on its own" and "does it
 * respond to SIGTERM" are only observable from the outside — the suite's
 * own long-lived process cannot answer those questions about itself. The
 * spawned fixture (test/fixtures/process-exit-probe.mjs) deliberately
 * mirrors the bug report's own repro shape: a real NeuroLink instance, a
 * real generate() call with a tool, a real live provider, run from the repo
 * root so `.mcp-config.json` auto-discovery spawns the same MCP server the
 * original defect involved.
 *
 * Every assertion here is preceded by a PRECONDITION check on the probe's
 * own stdout markers, proving the generate() call (and, where relevant,
 * shutdown()) actually completed before anything about exit/signal
 * behavior is asserted — an exit observed before the precondition holds
 * would prove nothing.
 *
 * Run: pnpm run build && pnpm run test:process-exit
 */

import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, defineSuite, delay, logSection } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("Process exit / SIGTERM lifecycle", {
  perTestTimeoutMs: 180_000,
});

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..");
const FIXTURE = join(TEST_DIR, "fixtures", "process-exit-probe.mjs");

type ProbeHandle = {
  stdout: () => string;
  closed: () => boolean;
  waitForClose: (
    timeoutMs: number,
  ) => Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  waitForMarker: (marker: string, timeoutMs: number) => Promise<void>;
  kill: (signal: NodeJS.Signals) => boolean;
};

function spawnProbe(extraArgs: string[]): ProbeHandle {
  const proc = spawn(process.execPath, [FIXTURE, ...extraArgs], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (d: Buffer) => {
    stdout += d.toString();
  });
  proc.stderr.on("data", (d: Buffer) => {
    stderr += d.toString();
  });

  let closed = false;
  let closeResult: {
    code: number | null;
    signal: NodeJS.Signals | null;
  } | null = null;
  proc.on("close", (code, signal) => {
    closed = true;
    closeResult = { code, signal };
  });

  const waitForMarker = async (marker: string, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (!stdout.includes(marker)) {
      if (closed) {
        // Process ended before printing the marker — return so the caller's
        // own precondition assertion reports this with full stdout/stderr
        // context rather than a bare timeout.
        return;
      }
      if (Date.now() > deadline) {
        // Structural diagnostics only. defineSuite classifies a thrown
        // message matching isExpectedProviderError() as SKIP rather than
        // FAIL, and this probe's stderr carries live provider output — so
        // quoting it here would turn a real timeout green. Report sizes.
        throw new Error(
          `Timed out after ${timeoutMs}ms waiting for probe marker ${JSON.stringify(marker)} ` +
            `(stdout ${stdout.length} bytes, stderr ${stderr.length} bytes, closed=${closed})`,
        );
      }
      await delay(50);
    }
  };

  const waitForClose = async (timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (!closed) {
      if (Date.now() > deadline) {
        return null as unknown as {
          code: number | null;
          signal: NodeJS.Signals | null;
        };
      }
      await delay(50);
    }
    return closeResult as {
      code: number | null;
      signal: NodeJS.Signals | null;
    };
  };

  return {
    stdout: () => stdout,
    closed: () => closed,
    waitForClose,
    waitForMarker,
    kill: (signal) => proc.kill(signal),
  };
}

logSection("Process exit / SIGTERM lifecycle");

await test("shutdown() releases every resource and the process exits on its own with no signal", async () => {
  skipUnlessProviderAvailable("groq");

  const probe = spawnProbe(["--shutdown"]);
  const NO_SIGNAL_WINDOW_MS = 100_000;
  const result = await probe.waitForClose(NO_SIGNAL_WINDOW_MS);

  if (result === null) {
    // Didn't exit on its own within the window — force it down so this
    // test (and the suite) doesn't itself hang, then fail below.
    probe.kill("SIGKILL");
    await probe.waitForClose(5_000);
  }

  // PRECONDITION: the generate() call and the shutdown() call actually
  // completed before trusting anything about the exit observation below.
  const stdout = probe.stdout();
  assert(
    stdout.includes("WORK COMPLETED"),
    "precondition failed — probe process never reported completed work, so no conclusion about its exit behavior is valid",
  );
  assert(
    stdout.includes("shutdown() returned"),
    "precondition failed — probe process never reported that shutdown() returned",
  );

  assert(
    result !== null,
    `process did not exit on its own within ${NO_SIGNAL_WINDOW_MS}ms after shutdown() returned — some resource is still keeping the event loop alive`,
  );
  if (result !== null) {
    assert(
      result.signal === null,
      `process only terminated because of signal ${String(result.signal)} — shutdown() should let it exit with no signal needed at all`,
    );
    assert(
      result.code === 0,
      `probe process exited with unexpected code ${String(result.code)}`,
    );
  }
});

await test("a completed script (no shutdown() call) responds to SIGTERM and never requires SIGKILL", async () => {
  skipUnlessProviderAvailable("groq");

  const probe = spawnProbe([]);
  try {
    // Wait for the script to reach its natural end — no process.exit(), no
    // shutdown() call — before touching it with any signal.
    await probe.waitForMarker("script end reached", 100_000);

    // PRECONDITION: the generate() call actually completed before asserting
    // anything about signal handling.
    const stdout = probe.stdout();
    assert(
      stdout.includes("WORK COMPLETED"),
      "precondition failed — probe process never reported completed work",
    );
    assert(
      stdout.includes("script end reached"),
      "precondition failed — probe process never reported reaching its natural end, so sending a signal now would not reproduce the reported scenario",
    );

    // PRECONDITION: the probe must still be running. If it had already exited
    // on its own, the kill below would be a no-op, waitForClose would return
    // the recorded natural exit, and this test would pass while asserting
    // nothing whatsoever about signal handling.
    assert(
      !probe.closed(),
      "precondition failed — probe exited before any signal was sent, so nothing here tests SIGTERM handling",
    );

    const delivered = probe.kill("SIGTERM");
    assert(
      delivered,
      "precondition failed — SIGTERM was not delivered to the probe process",
    );

    const GRACE_MS = 8_000;
    const result = await probe.waitForClose(GRACE_MS);
    if (result === null) {
      probe.kill("SIGKILL");
      await probe.waitForClose(5_000);
      assert(
        false,
        `process ignored SIGTERM for ${GRACE_MS}ms and required SIGKILL to terminate — this is the original defect (a script whose work is done cannot be stopped except with SIGKILL)`,
      );
      return;
    }

    // It is not enough that the process ended: it has to have ended BECAUSE
    // of the signal. A natural exit here would satisfy "didn't need SIGKILL"
    // while proving nothing about the handler.
    assert(
      result.signal === "SIGTERM",
      "the probe ended without being terminated by SIGTERM, so the signal is not what stopped it",
    );
  } finally {
    // A thrown precondition must not leave a live probe (and its MCP child)
    // behind — in a suite about processes that will not die, an orphan is a
    // particularly bad way to fail.
    if (!probe.closed()) {
      probe.kill("SIGKILL");
      await probe.waitForClose(5_000);
    }
  }
});

await test("the SDK does not re-deliver a signal to a host that handles it itself", async () => {
  skipUnlessProviderAvailable("groq");

  // The re-raise that makes SIGTERM work has to not run a host's own handler
  // a second time. Node delivers a signal to every listener, so a host that
  // registered one has already handled this delivery and already decided
  // whether to stay alive; re-sending would be a second, unrequested delivery,
  // and for the common "first signal drains, second forces" shape it would
  // tear the host down early.
  const probe = spawnProbe(["--host-signal-handler"]);
  try {
    await probe.waitForMarker("script end reached", 100_000);

    assert(
      probe.stdout().includes("WORK COMPLETED"),
      "precondition failed — probe process never reported completed work",
    );
    assert(
      !probe.closed(),
      "precondition failed — probe exited before any signal was sent",
    );

    const delivered = probe.kill("SIGTERM");
    assert(
      delivered,
      "precondition failed — SIGTERM was not delivered to the probe process",
    );

    // The host handler prints its final tally just before exiting, which is
    // the point at which any second delivery would already have been counted.
    await probe.waitForMarker("HOST HANDLER TOTAL", 40_000);
    const stdout = probe.stdout();

    // PRECONDITION: the host handler must have run at all. Without this, an
    // absent "FIRED 2" would mean "the signal never arrived", not "the SDK
    // did not re-deliver it".
    assert(
      stdout.includes("HOST HANDLER FIRED 1"),
      "precondition failed — the host's own SIGTERM handler never ran, so there is no re-delivery to detect",
    );

    assert(
      !stdout.includes("HOST HANDLER FIRED 2"),
      "the host's own signal handler ran twice — the SDK re-raised into a host that was still listening",
    );
    assert(
      stdout.includes("HOST HANDLER TOTAL 1"),
      "the host handler's final tally was not exactly one delivery",
    );

    // Declining to re-raise must not mean walking away. The install guard is a
    // one-shot latch, so if the SDK drops its own listener here it is never
    // reinstalled, and a manager constructed after this signal would lose
    // cleanup for the rest of the process's life. Two listeners is the SDK's
    // plus the host's.
    assert(
      stdout.includes("HOST SIGTERM LISTENERS 2"),
      "the SDK dropped its signal listener on a host-owned signal, so any manager created afterwards would never be cleaned up",
    );
  } finally {
    if (!probe.closed()) {
      probe.kill("SIGKILL");
      await probe.waitForClose(5_000);
    }
  }
});

await test("the SDK does not cut short a host that drains on a one-shot listener", async () => {
  skipUnlessProviderAvailable("groq");

  // The companion to the case above, and the one that catches the subtler
  // mistake. `process.once("SIGTERM", ...)` is the ordinary way to write a
  // graceful shutdown, and Node removes a one-shot listener AS it dispatches
  // to it. So any listener count read after that point is zero even though the
  // host exists and is still draining. A gate that reads the count late
  // therefore concludes nobody is listening, re-raises, and kills the host
  // half way through its own shutdown — which is the very thing the gate was
  // added to prevent, arrived at from the other direction.
  const probe = spawnProbe(["--host-once-handler"]);
  try {
    await probe.waitForMarker("script end reached", 100_000);

    assert(
      probe.stdout().includes("WORK COMPLETED"),
      "precondition failed — probe process never reported completed work",
    );
    assert(
      !probe.closed(),
      "precondition failed — probe exited before any signal was sent",
    );

    const delivered = probe.kill("SIGTERM");
    assert(
      delivered,
      "precondition failed — SIGTERM was not delivered to the probe process",
    );

    // PRECONDITION: the host's one-shot handler must have actually received
    // the signal and begun draining. Without this, a missing "drained" marker
    // would mean "the handler never ran", not "the drain was cut short" — and
    // the assertion below would be reporting on something that never started.
    await probe.waitForMarker("HOST ONCE START", 30_000);
    assert(
      probe.stdout().includes("HOST ONCE START"),
      "precondition failed — the host's one-shot handler never began draining, so there is nothing to cut short",
    );

    const closeResult = await probe.waitForClose(30_000);

    assert(
      probe.stdout().includes("HOST ONCE DRAINED"),
      "the host's one-shot shutdown began but never finished — the SDK re-raised and terminated it mid-drain",
    );

    // Printing the marker is not the same as finishing. Without this the probe
    // could drain, print, and then hang, and the case would still pass because
    // the finally block kills it afterwards.
    assert(
      closeResult !== null,
      "the host printed its drain marker but never exited, so the shutdown did not actually complete",
    );
    assert(
      closeResult.signal === null && closeResult.code === 0,
      "the host did not exit cleanly on its own terms after draining",
    );
  } finally {
    if (!probe.closed()) {
      probe.kill("SIGKILL");
      await probe.waitForClose(5_000);
    }
  }
});

await runSuite();
