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

  // createWorkerInstance registers worker A's bridge under an instance id
  // nothing outside NeuroLink can name (it is a private field). Spying on
  // the logger's own public registration hook for the duration of this one
  // synchronous call captures the real id, so the dispose test below can
  // re-enter worker A's own scope directly afterwards, rather than relying
  // on worker B's scope — which can never reach A's emitter regardless of
  // whether dispose removed it.
  let workerAInstanceId: string | undefined;
  const originalAddScopedEventEmitter = logger.addScopedEventEmitter;
  logger.addScopedEventEmitter = (instanceId, emitter) => {
    workerAInstanceId = instanceId;
    originalAddScopedEventEmitter(instanceId, emitter);
  };
  const workerA = host.createWorkerInstance({
    logTag: "worker-a",
    onLog: (event) =>
      capturedA.push({
        tag: event.tag,
        level: event.level,
        message: event.message,
      }),
  });
  logger.addScopedEventEmitter = originalAddScopedEventEmitter;

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

  await test("a scoped emitter's in-place mutation of data does not corrupt the global sink or log history", async () => {
    // addScopedEventEmitter's own JSDoc documents several emitters sharing an
    // id, and the global sink runs alongside every scoped one on the SAME
    // call — a designed multi-consumer configuration. A worker bridge doing
    // an ordinary thing (redacting a field before it forwards an event)
    // must not be able to reach into what a sibling consumer, or stored log
    // history, observes for that same call.
    const probeInstanceId = "shared-mutable-data-probe-1236";
    let globalSawSecret: boolean | undefined;
    const globalSink = {
      emit: (event: string, ...args: unknown[]) => {
        if (event === "log-event") {
          const ev = args[0] as { data?: { secret?: unknown } } | undefined;
          globalSawSecret = ev?.data?.secret === "sk-probe";
        }
        return true;
      },
    };
    const redactingEmitter = {
      emit: (event: string, ...args: unknown[]) => {
        if (event === "log-event") {
          const ev = args[0] as { data?: Record<string, unknown> } | undefined;
          if (ev?.data && typeof ev.data === "object") {
            delete ev.data.secret;
          }
        }
        return true;
      },
    };

    logger.clearLogs();
    logger.setEventEmitter(globalSink);
    logger.addScopedEventEmitter(probeInstanceId, redactingEmitter);
    try {
      // error, like the other explicit single-call probes in this suite:
      // shouldLog() gates "debug" on `this.logLevel`, which the logger
      // singleton reads from NEUROLINK_LOG_LEVEL only once, at module import
      // — before this file's top-level `process.env.NEUROLINK_LOG_LEVEL =
      // "debug"` assignment runs. "error" always passes shouldLog()
      // regardless of that timing, which is exactly why the suite's other
      // direct probes use it too.
      logger.runInInstanceScope(probeInstanceId, () => {
        logger.error("[#1236] shared-data probe", {
          secret: "sk-probe",
          keep: true,
        });
      });

      assert(
        globalSawSecret !== undefined,
        "precondition: the global sink received the probe event",
      );
      assert(
        globalSawSecret === true,
        "a sibling scoped emitter's in-place redaction leaked into the global sink's data",
      );

      const lastEntry = logger.getLogs()[logger.getLogs().length - 1];
      const storedData = lastEntry?.data as Record<string, unknown> | undefined;
      assert(
        storedData?.secret === "sk-probe",
        "a sibling scoped emitter's in-place redaction corrupted stored log history",
      );
    } finally {
      logger.removeScopedEventEmitter(probeInstanceId, redactingEmitter);
      logger.clearEventEmitter(globalSink);
    }
  });

  await test("dispose() unsubscribes a worker's bridge", async () => {
    assert(
      workerAInstanceId !== undefined,
      "precondition: worker A's construction registered a scoped emitter",
    );

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

    // The two assertions above hold whether or not dispose() actually
    // unsubscribed anything: worker B's own AsyncLocalStorage scope can
    // never reach worker A's scoped emitter, so a retained bridge would
    // slip through undetected. Re-enter worker A's own scope directly
    // (the id captured at construction) and prove the removal for real.
    logger.runInInstanceScope(workerAInstanceId as string, () => {
      logger.error("[#1236] dispose-removal probe");
    });
    assert(
      capturedA.length === aAfterDispose,
      "worker A's bridge still received an event when its own scope was re-entered after dispose",
    );
  });

  await test("disposing the host also removes a still-undisposed worker's log bridge", async () => {
    // The scoped-emitter registry lives on the process-global logger, keyed
    // by the WORKER's id, not the host's — so a caller who disposes only the
    // long-lived host and forgets the short-lived worker must not leak that
    // worker's bridge (and everything its onLog closes over) for the rest of
    // the process. A separate host/worker pair keeps this from disturbing
    // the suite's shared host/workerA/workerB above.
    const scopedHost = new NeuroLink();
    let scopedWorkerInstanceId: string | undefined;
    const originalAddScopedEventEmitter = logger.addScopedEventEmitter;
    logger.addScopedEventEmitter = (instanceId, emitter) => {
      scopedWorkerInstanceId = instanceId;
      originalAddScopedEventEmitter(instanceId, emitter);
    };
    const capturedScoped: Captured[] = [];
    const scopedWorker = scopedHost.createWorkerInstance({
      logTag: "host-dispose-sweep-probe",
      onLog: (event) =>
        capturedScoped.push({
          tag: event.tag,
          level: event.level,
          message: event.message,
        }),
    });
    logger.addScopedEventEmitter = originalAddScopedEventEmitter;

    assert(
      scopedWorkerInstanceId !== undefined,
      "precondition: the worker's construction registered a scoped emitter",
    );

    // The caller disposes only the host — the worker itself is never
    // disposed. This is the shape of the leak: forgetting one cleanup call
    // in a delegation pattern where the host outlives the worker.
    await scopedHost.dispose();

    logger.runInInstanceScope(scopedWorkerInstanceId as string, () => {
      logger.error("[#1236] host-dispose sweep probe");
    });
    assert(
      capturedScoped.length === 0,
      `the worker's bridge still received an event after only the host was disposed (got ${capturedScoped.length})`,
    );

    await scopedWorker.dispose();
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
