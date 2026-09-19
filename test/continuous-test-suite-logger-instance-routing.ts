#!/usr/bin/env tsx
/**
 * Continuous Test Suite: per-instance logger routing (#1236), driven through
 * the public surface (Rule 15).
 *
 * The NeuroLink logger is a process-global singleton. Before #1236 it had a
 * single active sink, so a worker's `onLog` bridge — which subscribed to the
 * host's emitter — received every log event in the process (host, sibling
 * workers, MCP), each stamped with that worker's `logTag`. The tag said which
 * bridge forwarded an event, not which instance emitted it. Measured against
 * the pre-fix build, one worker's bridge saw 708 events where 299 were its
 * own; these cases fail on that build and pass on this one.
 *
 * Everything here comes from `../dist/index.js`: `NeuroLink` for the
 * instances under test, and the exported `logger` for its log history and
 * for the process-wide sink. Taking the logger from `src/lib/` while the code
 * under test logs through `dist`'s copy would watch a different singleton and
 * pass silently.
 *
 * No credentials and no network: each instance is exercised with a provider
 * name that is not registered, which throws inside `generate()` — after the
 * SDK has already emitted a few hundred debug events on the way there, which
 * is exactly the traffic whose attribution is under test. `NEUROLINK_DEBUG`
 * has to be on for anything below `error` to be emitted at all, and console
 * output is muted while the calls run so the suite's own output stays
 * readable.
 *
 * Every negative assertion ("this bridge received nothing") is paired with a
 * precondition proving logging actually happened on that call — otherwise
 * "nothing arrived" would pass on a run where nothing ran. The precondition
 * is `logger.getLogs()`, which records entries regardless of which sinks are
 * attached. It is deliberately NOT a process-wide sink: installing one
 * displaces whatever emitter is currently active, which would mask the very
 * behaviour under test. The one case that does install a sink scopes it to
 * itself and detaches it again.
 *
 * Run: npx tsx test/continuous-test-suite-logger-instance-routing.ts
 */
import { defineSuite, assert } from "./helpers/harness.js";
import { NeuroLink, logger } from "../dist/index.js";

const { test, runSuite } = defineSuite("Per-instance logger routing (#1236)", {
  offline: true,
});

/** An unregistered provider name: rejects inside generate(), reaches no network. */
const UNREGISTERED_PROVIDER = "not-a-registered-provider-1236";

type Captured = { tag: string; level: string; message: string };

/**
 * Drive one instance until it throws, discarding the rejection, and report
 * how many entries the logger recorded while it ran.
 *
 * The count is this suite's precondition: a negative assertion about routing
 * means nothing on a call that logged nothing. `clearLogs()` first so the
 * count is this call's, not the run's — the logger keeps only its last 1000
 * entries and a single call emits several hundred.
 *
 * Console output is muted for the duration: with NEUROLINK_DEBUG on, one call
 * prints hundreds of lines and would bury the suite's own results. The mute
 * is restored in a finally so a throw cannot leave the process mute.
 */
async function emitLogsFrom(instance: NeuroLink): Promise<number> {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  const mute = () => {};
  logger.clearLogs();
  console.log = mute;
  console.info = mute;
  console.warn = mute;
  console.error = mute;
  console.debug = mute;
  try {
    await instance.generate({
      input: { text: "per-instance logger routing probe" },
      provider: UNREGISTERED_PROVIDER,
      timeout: 5_000,
    });
  } catch {
    // Expected: the provider name is not registered. The logs emitted on the
    // way to that rejection are the subject of this suite.
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    console.debug = original.debug;
  }
  return logger.getLogs().length;
}

const originalDebugEnv = process.env.NEUROLINK_DEBUG;
const originalLevelEnv = process.env.NEUROLINK_LOG_LEVEL;
process.env.NEUROLINK_DEBUG = "true";
process.env.NEUROLINK_LOG_LEVEL = "debug";

try {
  const host = new NeuroLink();
  const capturedA: Captured[] = [];
  const capturedB: Captured[] = [];

  const workerA = host.createWorkerInstance({
    logTag: "worker-a",
    onLog: (event) =>
      capturedA.push({
        tag: event.tag,
        level: event.level,
        message: event.message,
      }),
  });
  const workerB = host.createWorkerInstance({
    logTag: "worker-b",
    onLog: (event) =>
      capturedB.push({
        tag: event.tag,
        level: event.level,
        message: event.message,
      }),
  });

  await test("a worker's bridge receives that worker's own log events", async () => {
    const emitted = await emitLogsFrom(workerA);

    assert(emitted > 0, "precondition: the call recorded log entries");
    assert(
      capturedA.length > 0,
      `worker A's bridge received none of its own events (got ${capturedA.length})`,
    );
  });

  await test("a sibling worker's bridge receives none of them", async () => {
    assert(
      capturedA.length > 0,
      "precondition: worker A's bridge captured events from the previous call",
    );
    assert(
      capturedB.length === 0,
      `worker B's bridge received events from a call it did not make (got ${capturedB.length})`,
    );
  });

  await test("the host's own call reaches neither worker bridge", async () => {
    const aBefore = capturedA.length;
    const bBefore = capturedB.length;

    const emitted = await emitLogsFrom(host);

    assert(emitted > 0, "precondition: the host call recorded log entries");
    assert(
      capturedA.length === aBefore,
      `worker A's bridge grew on a host call (by ${capturedA.length - aBefore})`,
    );
    assert(
      capturedB.length === bBefore,
      `worker B's bridge grew on a host call (by ${capturedB.length - bBefore})`,
    );
  });

  await test("routing is reciprocal: B's call reaches B and not A", async () => {
    const aBefore = capturedA.length;

    const emitted = await emitLogsFrom(workerB);

    assert(emitted > 0, "precondition: the call recorded log entries");
    assert(
      capturedB.length > 0,
      `worker B's bridge received none of its own events (got ${capturedB.length})`,
    );
    assert(
      capturedA.length === aBefore,
      `worker A's bridge grew on worker B's call (by ${capturedA.length - aBefore})`,
    );
  });

  await test("every forwarded event carries the owning bridge's tag", async () => {
    assert(
      capturedA.length > 0 && capturedB.length > 0,
      "precondition: both bridges captured events",
    );
    const strayA = capturedA.filter((e) => e.tag !== "worker-a").length;
    const strayB = capturedB.filter((e) => e.tag !== "worker-b").length;
    assert(strayA === 0, `worker A's bridge stamped ${strayA} wrong tags`);
    assert(strayB === 0, `worker B's bridge stamped ${strayB} wrong tags`);
  });

  await test("a process-wide sink still receives every instance's events", async () => {
    // Backward compatibility: narrowing the worker bridges must not narrow
    // logger.setEventEmitter(), which existing hosts rely on. Installing one
    // also displaces whichever instance emitter is active, so this case
    // attaches and detaches it rather than leaving it in place.
    let seen = 0;
    const sink = {
      emit: (event: string) => {
        if (event === "log-event") {
          seen++;
        }
        return true;
      },
    };
    logger.setEventEmitter(sink);
    try {
      const fromHost = await emitLogsFrom(host);
      const afterHost = seen;
      const fromWorker = await emitLogsFrom(workerB);

      assert(
        fromHost > 0 && fromWorker > 0,
        "precondition: both calls recorded log entries",
      );
      assert(
        afterHost > 0,
        `the process-wide sink missed the host's events (got ${afterHost})`,
      );
      assert(
        seen > afterHost,
        `the process-wide sink missed a worker's events (grew by ${seen - afterHost})`,
      );
    } finally {
      logger.clearEventEmitter(sink);
    }
  });

  await test("dispose() unsubscribes a worker's bridge", async () => {
    await workerA.dispose();
    const aAfterDispose = capturedA.length;

    const emitted = await emitLogsFrom(workerB);

    assert(
      emitted > 0,
      "precondition: the post-dispose call recorded log entries",
    );
    assert(
      capturedA.length === aAfterDispose,
      `a disposed worker's bridge still received events (${capturedA.length - aAfterDispose} after dispose)`,
    );
  });

  await test("logs outside any generate call are attributed to no instance", async () => {
    // Construction, background reconnects and module init sit outside every
    // entry point's scope, so they must not be charged to an arbitrary
    // instance. getInstanceScope() reports the scope at the call site.
    assert(
      logger.getInstanceScope() === undefined,
      "a log emitted from suite top level reported an owning instance",
    );

    const bBefore = capturedB.length;
    logger.clearLogs();
    logger.error("[#1236] unattributed probe emitted outside any entry point");
    assert(
      logger.getLogs().length > 0,
      "precondition: the unscoped log was recorded",
    );
    assert(
      capturedB.length === bBefore,
      `an unscoped log reached a worker bridge (by ${capturedB.length - bBefore})`,
    );
  });

  await workerB.dispose();
  await host.dispose();
} finally {
  if (originalDebugEnv === undefined) {
    delete process.env.NEUROLINK_DEBUG;
  } else {
    process.env.NEUROLINK_DEBUG = originalDebugEnv;
  }
  if (originalLevelEnv === undefined) {
    delete process.env.NEUROLINK_LOG_LEVEL;
  } else {
    process.env.NEUROLINK_LOG_LEVEL = originalLevelEnv;
  }
}

await runSuite();
