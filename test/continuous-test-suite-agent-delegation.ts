#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Async Delegation (N2)
 *
 * Drives the shipped surface only — `NeuroLink` from `../dist/index.js`:
 *   registerDelegationTools() / spawnDelegate() / collectDelegates() /
 *   cancelDelegates() as the host API, and
 *   executeTool("delegate_task" | "collect_results" | "tasks_list" |
 *   "retrieve_context", …) as the exact path a model tool call takes.
 *
 * The claim under test is a TIMING claim — "results come back in the order
 * workers FINISH, not the order they were spawned" — and a live model cannot
 * be made to prove it: two calls to a real provider finish in whatever order
 * the provider feels like. So the mechanical cases run every worker against a
 * loopback chat server that answers `DELAY:<ms>` after exactly that many
 * milliseconds (see helpers/mockChatServer.ts). That is a real NeuroLink
 * instance, a real isolated-agent run, a real HTTP round trip and the real
 * delegation pool — only the model's latency is ours to choose, which is the
 * one thing the assertion is about.
 *
 * Covered: opt-in registration, spawn-returns-immediately, out-of-order
 * completion under `any` and `all`, claimed-exactly-once, pool saturation
 * queueing rather than rejecting, abort, poll semantics, session scoping,
 * every refusal, the checklist's delegate counters (N2.3's notification
 * channel), and byte-exact read-back of each banked worker report (N3).
 * One live case delegates through a real model and SKIPs without credentials.
 *
 * Run: pnpm run test:agent-delegation [--provider=vertex]
 */

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  Skip,
} from "./helpers/harness.js";
import {
  startPacedChatServer,
  type PacedChatServer,
} from "./helpers/mockChatServer.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";
import type {
  ChecklistToolResult,
  DelegateCollectResult,
  DelegateHandle,
  DelegateOutcome,
  DelegateSpawnToolResult,
} from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite, opts, section } = defineSuite("Agent Delegation", {
  defaultProvider: "vertex",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Host = InstanceType<typeof NeuroLink>;

/** The registry wraps every tool result: `{ success, data, usage, metadata }`. */
type ToolEnvelope = { success?: boolean; data?: unknown };
type Refusal = { isError: true; error: string };

function unwrap(envelope: unknown): unknown {
  const record = envelope as ToolEnvelope | undefined;
  return record && typeof record === "object" && "data" in record
    ? record.data
    : envelope;
}

function asRefusal(envelope: unknown): Refusal {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object" && "isError" in payload,
    "expected a refusal, got a successful result",
  );
  return payload as Refusal;
}

function asObject<T>(envelope: unknown, what: string): T {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object" && !("isError" in payload),
    `expected ${what}, got a refusal or an unexpected shape`,
  );
  return payload as T;
}

/**
 * The delegation pool is process-wide and only ever RISES, so no test may
 * raise it: one raise would silently disable the saturation case that runs
 * later. Every host here registers with the default capacity.
 */
const POOL_CAPACITY = 4;

let sessionCounter = 0;

/** A registered host wired to the paced server, plus a session id of its own. */
function newHost(server: PacedChatServer): { host: Host; sessionId: string } {
  const host = new NeuroLink({
    credentials: {
      openai: { apiKey: "sk-mock-local-server", baseURL: server.baseURL },
    },
  });
  host.registerDelegationTools();
  host.registerTaskTools();
  sessionCounter += 1;
  return { host, sessionId: `delegation-suite-${sessionCounter}` };
}

/**
 * Spawn a worker whose model answer lands after exactly `delayMs`.
 *
 * `provider`/`model` are pinned so the worker talks to the loopback server and
 * not to whatever provider the environment happens to have configured — a
 * paced test that silently reached a real model would prove nothing.
 */
function spawnPaced(
  host: Host,
  sessionId: string,
  tag: string,
  delayMs: number,
): Promise<DelegateHandle> {
  return host.spawnDelegate({
    task: `TAG:${tag} DELAY:${delayMs} - investigate and report.`,
    label: tag,
    sessionId,
    provider: "openai",
    model: "gpt-4o-mini",
    maxSteps: 1,
  });
}

function labels(outcomes: DelegateOutcome[]): string {
  return outcomes.map((outcome) => outcome.label).join(",");
}

async function toolNames(host: Host): Promise<string[]> {
  const tools = await host.getAllAvailableTools();
  return tools
    .map((tool: { name: string }) => tool.name)
    .filter(
      (name: string) => name === "delegate_task" || name === "collect_results",
    )
    .sort();
}

function callTool(
  host: Host,
  name: string,
  params: unknown,
  sessionId: string,
): Promise<unknown> {
  return host.executeTool(name, params, { authContext: { sessionId } });
}

async function counters(
  host: Host,
  sessionId: string,
): Promise<ChecklistToolResult> {
  return asObject<ChecklistToolResult>(
    await callTool(host, "tasks_list", {}, sessionId),
    "a checklist result",
  );
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** One server for the whole suite: it holds no state between requests. */
let server: PacedChatServer;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

await runSuite(async () => {
  server = await startPacedChatServer();
  try {
    section("Registration (opt-in, additive)");

    await test("delegation tools are absent until registerDelegationTools()", async () => {
      const bare = new NeuroLink();
      assertEqual(
        (await toolNames(bare)).join(","),
        "",
        "a fresh instance must expose no delegation tools",
      );
    });

    await test("registration exposes both tools and is idempotent", async () => {
      const { host } = newHost(server);
      assertEqual(
        (await toolNames(host)).join(","),
        "collect_results,delegate_task",
      );
      host.registerDelegationTools();
      host.registerDelegationTools();
      assertEqual(
        (await toolNames(host)).join(","),
        "collect_results,delegate_task",
        "re-registering must not duplicate or throw",
      );
    });

    section("Spawn returns before the worker runs");

    await test("spawnDelegate hands back a handle while the worker is still working", async () => {
      const { host, sessionId } = newHost(server);
      const startedAt = Date.now();
      const handle = await spawnPaced(host, sessionId, "SLOWSPAWN", 3_000);
      const elapsed = Date.now() - startedAt;

      assert(handle.workerId.length > 0, "a spawn must name its worker");
      assertEqual(
        handle.queued,
        false,
        "the first worker takes a free pool slot",
      );
      assert(
        elapsed < 1_000,
        `spawn must not wait for the worker (returned after ${elapsed}ms, worker takes 3000ms)`,
      );
      assertEqual(
        (await counters(host, sessionId)).delegatesPending,
        1,
        "the worker must be visible as outstanding while it runs",
      );

      const collected = await host.collectDelegates({ mode: "all", sessionId });
      assertEqual(collected.completed.length, 1);
    });

    section("Out-of-order completion");

    await test("four workers spawned slowest-first come back fastest-first", async () => {
      const { host, sessionId } = newHost(server);
      // Deliberately reversed: spawn order and finish order are opposites, so
      // "results happen to be in spawn order" cannot pass this.
      const spawnOrder: Array<[string, number]> = [
        ["D-3600", 3_600],
        ["C-2400", 2_400],
        ["B-1200", 1_200],
        ["A-0100", 100],
      ];
      for (const [tag, ms] of spawnOrder) {
        await spawnPaced(host, sessionId, tag, ms);
      }

      const collected = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 120_000,
      });
      assertEqual(
        collected.completed.length,
        4,
        "every worker must be claimed",
      );
      assertEqual(
        labels(collected.completed),
        "A-0100,B-1200,C-2400,D-3600",
        "collection order must follow completion, not spawn order",
      );
      assertEqual(collected.pending, 0);
      assertEqual(collected.ready, 0);
      assertEqual(collected.timedOut, false);
      for (const outcome of collected.completed) {
        assertEqual(
          outcome.ok,
          true,
          `${outcome.label} should have produced evidence`,
        );
        assertIncludes(outcome.summary, `WORKER-REPORT ${outcome.label}`);
      }
    });

    await test("`any` returns the first finisher, then the next, each exactly once", async () => {
      const { host, sessionId } = newHost(server);
      await spawnPaced(host, sessionId, "LATE", 2_600);
      await spawnPaced(host, sessionId, "EARLY", 100);

      const first = await host.collectDelegates({
        mode: "any",
        sessionId,
        waitMs: 120_000,
      });
      assertEqual(
        labels(first.completed),
        "EARLY",
        "the fastest worker lands first",
      );
      assertEqual(first.pending, 1, "the slow worker is still outstanding");

      const second = await host.collectDelegates({
        mode: "any",
        sessionId,
        waitMs: 120_000,
      });
      assertEqual(labels(second.completed), "LATE");
      assertEqual(second.pending, 0);

      const third = await host.collectDelegates({
        mode: "any",
        sessionId,
        waitMs: 0,
      });
      assertEqual(
        third.completed.length,
        0,
        "an outcome claimed once must never be handed out again",
      );
      assertEqual(
        third.timedOut,
        false,
        "nothing outstanding is not a timeout",
      );
    });

    await test("a named worker is collected on its own", async () => {
      const { host, sessionId } = newHost(server);
      const slow = await spawnPaced(host, sessionId, "NAMED-SLOW", 2_400);
      await spawnPaced(host, sessionId, "NAMED-FAST", 100);

      const collected = await host.collectDelegates({
        workerId: slow.workerId,
        sessionId,
        waitMs: 120_000,
      });
      assertEqual(labels(collected.completed), "NAMED-SLOW");
      assertEqual(
        collected.ready,
        1,
        "the faster worker finished and is still waiting to be claimed",
      );
      await host.collectDelegates({ mode: "all", sessionId, waitMs: 60_000 });
    });

    section("Counters are the completion notification (N2.3)");

    await test("tasks_list reports pending, then ready, then nothing", async () => {
      const { host, sessionId } = newHost(server);
      await spawnPaced(host, sessionId, "COUNTED", 1_500);

      const running = await counters(host, sessionId);
      assertEqual(running.delegatesPending, 1);
      assertEqual(running.delegatesReady, 0);

      // No polling machinery: the model learns a worker landed from a tool it
      // was going to call anyway.
      const settled = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 0,
        // Deliberately a poll, repeated, so this asserts the counter flips
        // without any collect having waited for it.
      });
      assertEqual(settled.completed.length, 0, "a zero wait must not block");

      // Repeated identical calls: `tasks_list` takes no arguments, so a cached
      // result would replay the first answer forever and the model would never
      // learn that a worker landed.
      let ready = 0;
      for (let attempt = 0; attempt < 60 && ready === 0; attempt++) {
        await delay(250);
        ready = (await counters(host, sessionId)).delegatesReady;
      }
      assertEqual(
        ready,
        1,
        "a finished worker must show as ready without being collected",
      );

      const claimed = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 0,
      });
      assertEqual(claimed.completed.length, 1);
      const empty = await counters(host, sessionId);
      assertEqual(empty.delegatesPending, 0);
      assertEqual(empty.delegatesReady, 0);
    });

    section("Every report is banked in full (N3)");

    await test("the worker's full report reads back through retrieve_context", async () => {
      const { host, sessionId } = newHost(server);
      // A task long enough that the report cannot fit in a preview: the point
      // of banking is that the conversation gets a POINTER, so a report that
      // happened to fit would prove nothing.
      const filler = "context-line ".repeat(400);
      await host.spawnDelegate({
        task: `TAG:BANKED DELAY:100 - investigate and report.\n${filler}`,
        label: "BANKED",
        sessionId,
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 1,
      });
      const collected = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 120_000,
      });
      const outcome = collected.completed[0];
      assert(outcome !== undefined, "a worker must have been collected");
      assert(
        outcome.report.artifactId.length > 0,
        "the report must actually have been banked",
      );
      assertIncludes(outcome.report.readBackHint, "retrieve_context");
      assertEqual(outcome.report.kind, "worker-report");

      // The model's own read-back path, not a host shortcut.
      const page = asObject<{ content?: string; totalSize?: number }>(
        await host.executeTool("retrieve_context", {
          artifactId: outcome.report.artifactId,
          offset: 0,
          limit: 200_000,
        }),
        "an artifact page",
      );
      const content = page.content ?? "";
      assertEqual(
        content.length,
        page.totalSize ?? -1,
        "one page must have covered the whole report",
      );
      assertIncludes(content, "## Task");
      assertIncludes(content, "TAG:BANKED");
      assertIncludes(content, "WORKER-REPORT BANKED");
      assertIncludes(content, "## Tool executions");
      assertEqual(
        Buffer.byteLength(content, "utf-8"),
        outcome.report.sizeBytes,
        "the banked file must be byte-for-byte what the reference describes",
      );
      assert(
        content.length > outcome.report.preview.length * 2,
        "the conversation must get a pointer, not the whole report",
      );
      assertEqual(
        content.startsWith(outcome.report.preview.replace(/…$/, "")),
        true,
        "the preview must be a head slice of the banked report, not a summary of it",
      );
    });

    section("Pool saturation queues, never rejects");

    await test(`${POOL_CAPACITY + 2} workers against ${POOL_CAPACITY} slots all finish`, async () => {
      const { host, sessionId } = newHost(server);
      const handles: DelegateHandle[] = [];
      for (let i = 0; i < POOL_CAPACITY + 2; i++) {
        handles.push(await spawnPaced(host, sessionId, `POOL-${i}`, 600));
      }
      const queued = handles.filter((handle) => handle.queued).length;
      assertEqual(
        queued,
        2,
        `two spawns past a ${POOL_CAPACITY}-slot pool must queue, not be refused`,
      );

      const collected = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 180_000,
      });
      assertEqual(
        collected.completed.length,
        POOL_CAPACITY + 2,
        "a queued worker must still run once a slot frees",
      );
      assertEqual(
        collected.completed.filter((outcome) => outcome.ok).length,
        POOL_CAPACITY + 2,
        "queueing must not degrade a worker's result",
      );
    });

    section("Abort");

    await test("cancelDelegates kills in-flight workers and they stay collectable", async () => {
      const { host, sessionId } = newHost(server);
      await spawnPaced(host, sessionId, "DOOMED-1", 30_000);
      await spawnPaced(host, sessionId, "DOOMED-2", 30_000);
      await delay(500);

      const startedAt = Date.now();
      const cancelled = await host.cancelDelegates();
      const elapsed = Date.now() - startedAt;
      assertEqual(cancelled, 2, "both in-flight workers must be cancelled");
      assert(
        elapsed < 20_000,
        `cancel must not wait out the worker (took ${elapsed}ms of a 30000ms worker)`,
      );

      const collected = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 30_000,
      });
      assertEqual(
        collected.completed.length,
        2,
        "a cancelled worker must still report back — silence would strand the supervisor",
      );
      for (const outcome of collected.completed) {
        assertEqual(
          outcome.ok,
          false,
          "a cancelled worker did not finish its job",
        );
        assertIncludes(outcome.error ?? "", "cancelled");
        assert(
          outcome.report.artifactId.length > 0,
          "even a cancelled worker banks what it had",
        );
      }
    });

    await test("an aborted parent signal cancels the worker it spawned", async () => {
      const { host, sessionId } = newHost(server);
      const controller = new AbortController();
      await host.spawnDelegate({
        task: "TAG:PARENT-ABORT DELAY:30000 - investigate and report.",
        label: "PARENT-ABORT",
        sessionId,
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 1,
        abortSignal: controller.signal,
      });
      await delay(500);
      controller.abort();

      const collected = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 30_000,
      });
      assertEqual(collected.completed.length, 1);
      assertEqual(collected.completed[0]?.ok, false);
    });

    section("Waiting, polling and scoping");

    await test("waitMs 0 polls: nothing yet, then everything", async () => {
      const { host, sessionId } = newHost(server);
      await spawnPaced(host, sessionId, "POLLED", 1_800);

      const polled = await host.collectDelegates({
        mode: "any",
        sessionId,
        waitMs: 0,
      });
      assertEqual(polled.completed.length, 0);
      assertEqual(polled.pending, 1);
      assertEqual(
        polled.timedOut,
        true,
        "outstanding work after the wait is exactly what timedOut reports",
      );

      const waited = await host.collectDelegates({
        mode: "any",
        sessionId,
        waitMs: 120_000,
      });
      assertEqual(labels(waited.completed), "POLLED");
      assertEqual(waited.timedOut, false);
    });

    await test("one session never collects another session's worker", async () => {
      const { host, sessionId } = newHost(server);
      const other = `${sessionId}-other`;
      const mine = await spawnPaced(host, sessionId, "MINE", 100);
      await spawnPaced(host, other, "THEIRS", 100);

      const theirs = await host.collectDelegates({
        mode: "all",
        sessionId: other,
        waitMs: 120_000,
      });
      assertEqual(labels(theirs.completed), "THEIRS");

      const ours = await host.collectDelegates({
        mode: "all",
        sessionId,
        waitMs: 120_000,
      });
      assertEqual(labels(ours.completed), "MINE");
      assertEqual(ours.completed[0]?.workerId, mine.workerId);
    });

    section("Refusals (recovery instruction included)");

    await test("an empty task is refused with the fix named", async () => {
      const { host, sessionId } = newHost(server);
      const refused = asRefusal(
        await callTool(host, "delegate_task", { task: "   " }, sessionId),
      );
      assertIncludes(refused.error, "task");
      assertEqual(
        (await counters(host, sessionId)).delegatesPending,
        0,
        "a refused spawn must not leave a phantom worker outstanding",
      );
    });

    await test("the depth ceiling refuses further delegation", async () => {
      const { host, sessionId } = newHost(server);
      // What a worker's own delegate_task call looks like: the execution
      // context carries the depth this registrar stamped on it.
      host.setToolContext({ sessionId, agentDepth: 1 });
      const refused = asRefusal(
        await callTool(
          host,
          "delegate_task",
          { task: "spawn a grandchild" },
          sessionId,
        ),
      );
      assertIncludes(refused.error, "depth limit reached");
      assertIncludes(
        refused.error,
        "yourself with your own tools",
        "a refusal must say what to do instead",
      );
      assertEqual((await counters(host, sessionId)).delegatesPending, 0);
    });

    await test("an unknown workerId refusal names the outstanding workers", async () => {
      const { host, sessionId } = newHost(server);
      const live = await spawnPaced(host, sessionId, "REAL", 100);
      const refused = asRefusal(
        await callTool(
          host,
          "collect_results",
          { workerId: "w-nope" },
          sessionId,
        ),
      );
      assertIncludes(refused.error, "w-nope");
      assertIncludes(
        refused.error,
        live.workerId,
        "the refusal must list the ids that would have worked",
      );
      await host.collectDelegates({ mode: "all", sessionId, waitMs: 60_000 });

      const exhausted = asRefusal(
        await callTool(
          host,
          "collect_results",
          { workerId: live.workerId },
          sessionId,
        ),
      );
      assertIncludes(
        exhausted.error,
        "already been collected",
        "collecting a claimed worker must say so, not hang",
      );
    });

    section("The model-facing tool path");

    await test("delegate_task and collect_results work through executeTool", async () => {
      const { host, sessionId } = newHost(server);
      const spawned = asObject<DelegateSpawnToolResult>(
        await callTool(
          host,
          "delegate_task",
          {
            task: "TAG:TOOLPATH DELAY:200 - investigate and report.",
            scope: "the auth module only",
            context: "the supervisor is reviewing a pull request",
            model: "gpt-4o-mini",
          },
          sessionId,
        ),
        "a spawn result",
      );
      assert(spawned.workerId.length > 0, "the tool must return a worker id");
      assertEqual(spawned.pending + spawned.ready, 1);

      const collected = asObject<DelegateCollectResult>(
        await callTool(
          host,
          "collect_results",
          { mode: "all", waitMs: 120_000 },
          sessionId,
        ),
        "a collect result",
      );
      assertEqual(collected.completed.length, 1);
      const outcome = collected.completed[0];
      assert(outcome !== undefined, "the tool must hand back the outcome");
      assertEqual(outcome.workerId, spawned.workerId);
      assertIncludes(outcome.report.readBackHint, outcome.report.artifactId);

      // The scope and context handed down must have reached the worker's
      // system prompt, or "delegate with a scope" is a lie.
      const sent = server.getAllRequestBodies().join("\n");
      assertIncludes(sent, "the auth module only");
      assertIncludes(sent, "the supervisor is reviewing a pull request");
    });

    await test("two identical collect_results calls claim two different workers", async () => {
      // The tool-result cache is keyed by tool name + arguments + session, and
      // both of these calls are identical in all three. `collect_results` hands
      // each outcome out exactly once, so a cached second call would replay the
      // FIRST worker and quietly lose the second one forever.
      const { host, sessionId } = newHost(server);
      await spawnPaced(host, sessionId, "CACHE-A", 100);
      await spawnPaced(host, sessionId, "CACHE-B", 100);

      const params = { mode: "any", waitMs: 120_000 };
      const first = asObject<DelegateCollectResult>(
        await callTool(host, "collect_results", params, sessionId),
        "a collect result",
      );
      const second = asObject<DelegateCollectResult>(
        await callTool(host, "collect_results", params, sessionId),
        "a collect result",
      );
      assertEqual(first.completed.length, 1);
      assertEqual(second.completed.length, 1);
      assert(
        first.completed[0]?.workerId !== second.completed[0]?.workerId,
        "the same worker was handed out twice — the second call was served from cache",
      );
      assertEqual(
        [first.completed[0]?.label, second.completed[0]?.label]
          .sort()
          .join(","),
        "CACHE-A,CACHE-B",
        "both workers must be accounted for",
      );
    });

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
      assert(
        /w\d+/.test(content),
        "the model should have reported a worker id",
      );

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
  } finally {
    await server?.close();
  }
});
