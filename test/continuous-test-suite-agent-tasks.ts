#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Agent Task Checklist (N1)
 *
 * Drives the shipped surface only — `NeuroLink` from `../dist/index.js`:
 *   registerTaskTools() / getTaskState() / clearTaskState() as the host API,
 *   and executeTool("tasks_create" | "tasks_update" | "tasks_list", …) as the
 *   exact path a model tool call takes (same registry, same execution-context
 *   merge, same result envelope).
 *
 * Covered: opt-in registration, engine-assigned ids, append semantics, status
 * transitions and notes, the full-list re-anchor that makes the checklist
 * survive compaction, both refusals (unknown id, closed without a reason),
 * session scoping, the host read used by a completeness gate, and one live
 * two-turn run that SKIPs without provider credentials.
 *
 * Run: pnpm run test:agent-tasks [--provider=vertex]
 */

import { defineSuite, assert, assertEqual, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink } from "../dist/index.js";
import type {
  ChecklistItem,
  ChecklistToolResult,
} from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite, opts, section } = defineSuite("Agent Task Checklist", {
  defaultProvider: "vertex",
});

// ---------------------------------------------------------------------------
// Helpers — every call goes through the public executeTool() path
// ---------------------------------------------------------------------------

/** The registry wraps every tool result: `{ success, data, usage, metadata }`. */
type ToolEnvelope = { success?: boolean; data?: unknown };

type Refusal = { isError: true; error: string };

function unwrap(envelope: unknown): unknown {
  const record = envelope as ToolEnvelope | undefined;
  return record && typeof record === "object" && "data" in record
    ? record.data
    : envelope;
}

function asChecklist(envelope: unknown): ChecklistToolResult {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object" && "items" in payload,
    "expected a checklist result, got a refusal or an unexpected shape",
  );
  return payload as ChecklistToolResult;
}

function asRefusal(envelope: unknown): Refusal {
  const payload = unwrap(envelope);
  assert(
    !!payload && typeof payload === "object" && "isError" in payload,
    "expected a refusal, got a checklist result",
  );
  return payload as Refusal;
}

function ids(items: ChecklistItem[]): string {
  return items.map((item) => item.id).join(",");
}

function statuses(items: ChecklistItem[]): string {
  return items.map((item) => `${item.id}:${item.status}`).join(",");
}

type Host = InstanceType<typeof NeuroLink>;

function callTool(
  host: Host,
  name: string,
  params: unknown,
  sessionId: string,
): Promise<unknown> {
  return host.executeTool(name, params, { authContext: { sessionId } });
}

/** A registered instance plus a session id unique to the calling test. */
let sessionCounter = 0;
function newHost(): { host: Host; sessionId: string } {
  const host = new NeuroLink();
  host.registerTaskTools();
  sessionCounter += 1;
  return { host, sessionId: `checklist-suite-${sessionCounter}` };
}

async function toolNames(host: Host): Promise<string[]> {
  const tools = await host.getAllAvailableTools();
  return tools
    .map((tool: { name: string }) => tool.name)
    .filter((name: string) => name.startsWith("tasks_"))
    .sort();
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

await runSuite(async () => {
  section("Registration (opt-in, additive)");

  await test("checklist tools are absent until registerTaskTools()", async () => {
    const bare = new NeuroLink();
    assertEqual(
      (await toolNames(bare)).join(","),
      "",
      "a fresh instance must expose no tasks_* tools",
    );
  });

  await test("registerTaskTools registers exactly the three tools", async () => {
    const { host } = newHost();
    assertEqual(
      (await toolNames(host)).join(","),
      "tasks_create,tasks_list,tasks_update",
    );
  });

  await test("registerTaskTools is idempotent", async () => {
    const { host } = newHost();
    host.registerTaskTools();
    host.registerTaskTools();
    assertEqual(
      (await toolNames(host)).join(","),
      "tasks_create,tasks_list,tasks_update",
    );
  });

  section("Checklist lifecycle");

  await test("tasks_create assigns engine ids and returns the whole list", async () => {
    const { host, sessionId } = newHost();
    const result = asChecklist(
      await callTool(
        host,
        "tasks_create",
        { titles: ["Audit auth changes", "Read the migrations"] },
        sessionId,
      ),
    );
    assertEqual(
      ids(result.items),
      "t1,t2",
      "ids are engine-assigned, in order",
    );
    assertEqual(result.counts.pending, 2);
    assertEqual(result.counts.done, 0);
    assertEqual(result.delegatesPending, 0, "no delegation primitive in use");
    assertEqual(result.delegatesReady, 0);
    assertEqual(result.items[0].title, "Audit auth changes");
  });

  await test("tasks_create appends and drops blank titles", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["first"] }, sessionId);
    const result = asChecklist(
      await callTool(
        host,
        "tasks_create",
        { titles: ["   ", "second"] },
        sessionId,
      ),
    );
    assertEqual(ids(result.items), "t1,t2", "blank titles never become tasks");
    assertEqual(result.items[1].title, "second");
  });

  await test("tasks_update sets status, records the note, re-anchors the list", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["a", "b"] }, sessionId);
    const started = asChecklist(
      await callTool(
        host,
        "tasks_update",
        { id: "t1", status: "in_progress" },
        sessionId,
      ),
    );
    assertEqual(statuses(started.items), "t1:in_progress,t2:pending");

    const finished = asChecklist(
      await callTool(
        host,
        "tasks_update",
        { id: "t1", status: "done", note: "no findings" },
        sessionId,
      ),
    );
    assertEqual(finished.items[0].status, "done");
    assertEqual(finished.items[0].note, "no findings");
    assertEqual(
      finished.items.length,
      2,
      "every result carries the FULL list — that is the post-compaction re-anchor",
    );
    assert(
      finished.items[0].updatedAt >= finished.items[0].createdAt,
      "updatedAt must advance with the edit",
    );
  });

  await test("counts track every status", async () => {
    const { host, sessionId } = newHost();
    await callTool(
      host,
      "tasks_create",
      { titles: ["a", "b", "c", "d"] },
      sessionId,
    );
    await callTool(
      host,
      "tasks_update",
      { id: "t1", status: "in_progress" },
      sessionId,
    );
    await callTool(
      host,
      "tasks_update",
      { id: "t2", status: "done" },
      sessionId,
    );
    await callTool(
      host,
      "tasks_update",
      { id: "t3", status: "closed", note: "out of scope" },
      sessionId,
    );
    const list = asChecklist(await callTool(host, "tasks_list", {}, sessionId));
    assertEqual(list.counts.pending, 1);
    assertEqual(list.counts.in_progress, 1);
    assertEqual(list.counts.done, 1);
    assertEqual(list.counts.closed, 1);
  });

  await test("a repeated tasks_list sees the update between the two calls", async () => {
    // `tasks_list` takes no arguments, so two calls in one session are
    // identical in tool name, arguments and context — exactly the key the
    // tool-result cache uses. A cached second call replays the first answer,
    // and a checklist that never appears to change is worse than no checklist.
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["only task"] }, sessionId);
    const before = asChecklist(
      await callTool(host, "tasks_list", {}, sessionId),
    );
    assertEqual(before.counts.pending, 1);

    await callTool(
      host,
      "tasks_update",
      { id: "t1", status: "done", note: "finished" },
      sessionId,
    );
    const after = asChecklist(
      await callTool(host, "tasks_list", {}, sessionId),
    );
    assertEqual(
      after.counts.done,
      1,
      "the second tasks_list must show the update, not a cached copy of the first",
    );
    assertEqual(after.counts.pending, 0);
  });

  section("Refusals carry the recovery step");

  await test("unknown id refuses and names the valid ids", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["a", "b"] }, sessionId);
    const refusal = asRefusal(
      await callTool(
        host,
        "tasks_update",
        { id: "t7", status: "done" },
        sessionId,
      ),
    );
    assertEqual(refusal.isError, true);
    assert(refusal.error.includes("t1"), "refusal must name the valid ids");
    assert(refusal.error.includes("t2"), "refusal must name the valid ids");
    assertEqual(
      host.getTaskState(sessionId).items.length,
      2,
      "a refused update changes nothing",
    );
  });

  await test("closed without a reason refuses and names the fix", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["a"] }, sessionId);
    const refusal = asRefusal(
      await callTool(
        host,
        "tasks_update",
        { id: "t1", status: "closed" },
        sessionId,
      ),
    );
    assert(
      refusal.error.includes("note"),
      "refusal must name the missing field",
    );
    assertEqual(
      host.getTaskState(sessionId).items[0].status,
      "pending",
      "the item must not close without a reason",
    );

    const closed = asChecklist(
      await callTool(
        host,
        "tasks_update",
        { id: "t1", status: "closed", note: "superseded" },
        sessionId,
      ),
    );
    assertEqual(closed.items[0].status, "closed");
    assertEqual(closed.items[0].note, "superseded");
  });

  await test("malformed input refuses instead of throwing", async () => {
    const { host, sessionId } = newHost();
    const badCreate = asRefusal(
      await callTool(
        host,
        "tasks_create",
        { titles: "not-an-array" },
        sessionId,
      ),
    );
    assert(
      badCreate.error.includes("titles"),
      "refusal must name the argument",
    );

    const noTitles = asRefusal(
      await callTool(host, "tasks_create", { titles: ["  "] }, sessionId),
    );
    assert(
      noTitles.error.includes("tasks_create"),
      "refusal must name the retry",
    );

    const badStatus = asRefusal(
      await callTool(
        host,
        "tasks_update",
        { id: "t1", status: "almost-done" },
        sessionId,
      ),
    );
    assert(
      badStatus.error.includes("in_progress"),
      "refusal must list the valid statuses",
    );
  });

  await test("tasks_update on an empty checklist points at tasks_create", async () => {
    const { host, sessionId } = newHost();
    const refusal = asRefusal(
      await callTool(
        host,
        "tasks_update",
        { id: "t1", status: "done" },
        sessionId,
      ),
    );
    assert(
      refusal.error.includes("tasks_create"),
      "refusal must name the tool that fixes it",
    );
  });

  section("Session scoping and the host read");

  await test("sessions are independent", async () => {
    const { host, sessionId } = newHost();
    const other = `${sessionId}-other`;
    await callTool(host, "tasks_create", { titles: ["a", "b"] }, sessionId);
    await callTool(host, "tasks_create", { titles: ["only"] }, other);
    assertEqual(host.getTaskState(sessionId).items.length, 2);
    assertEqual(host.getTaskState(other).items.length, 1);
    assertEqual(host.getTaskState(other).items[0].title, "only");
  });

  await test("getTaskState matches exactly what the tool returned", async () => {
    const { host, sessionId } = newHost();
    const fromTool = asChecklist(
      await callTool(host, "tasks_create", { titles: ["a", "b"] }, sessionId),
    );
    await callTool(
      host,
      "tasks_update",
      { id: "t2", status: "done", note: "n" },
      sessionId,
    );
    const listed = asChecklist(
      await callTool(host, "tasks_list", {}, sessionId),
    );
    const fromHost = host.getTaskState(sessionId);
    assertEqual(fromHost.sessionId, sessionId);
    assertEqual(JSON.stringify(fromHost.items), JSON.stringify(listed.items));
    assertEqual(ids(fromTool.items), ids(fromHost.items));
  });

  await test("the completeness gate is one host line", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["a", "b"] }, sessionId);
    const open = () =>
      host
        .getTaskState(sessionId)
        .items.filter(
          (item: ChecklistItem) =>
            item.status === "pending" || item.status === "in_progress",
        );
    assertEqual(open().length, 2);
    await callTool(
      host,
      "tasks_update",
      { id: "t1", status: "done" },
      sessionId,
    );
    await callTool(
      host,
      "tasks_update",
      { id: "t2", status: "closed", note: "not reachable in this diff" },
      sessionId,
    );
    assertEqual(open().length, 0, "done + closed leaves nothing pending");
  });

  await test("getTaskState of an unknown session is empty, never throws", async () => {
    const { host } = newHost();
    const state = host.getTaskState("no-such-session");
    assertEqual(state.items.length, 0);
    assertEqual(state.sessionId, "no-such-session");
  });

  await test("getTaskState hands out a copy, not the live state", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["a"] }, sessionId);
    const state = host.getTaskState(sessionId);
    state.items[0].status = "done";
    state.items.push({
      id: "tX",
      title: "injected",
      status: "pending",
      createdAt: 0,
      updatedAt: 0,
    });
    const fresh = host.getTaskState(sessionId);
    assertEqual(fresh.items.length, 1, "host-side mutation must not leak in");
    assertEqual(fresh.items[0].status, "pending");
  });

  await test("clearTaskState drops the session exactly once", async () => {
    const { host, sessionId } = newHost();
    await callTool(host, "tasks_create", { titles: ["a"] }, sessionId);
    assertEqual(host.clearTaskState(sessionId), true);
    assertEqual(host.clearTaskState(sessionId), false);
    assertEqual(host.getTaskState(sessionId).items.length, 0);
  });

  await test("engine placeholder session ids collapse to one checklist", async () => {
    // NeuroLink's tool-context merge invents `fallback-<timestamp>` when no
    // session was declared anywhere. Honouring it would file every model tool
    // call under a different checklist — a silently empty list.
    const { host } = newHost();
    await callTool(host, "tasks_create", { titles: ["a"] }, "fallback-1");
    await callTool(host, "tasks_create", { titles: ["b"] }, "fallback-2");
    const list = asChecklist(
      await callTool(host, "tasks_list", {}, "fallback-3"),
    );
    assertEqual(ids(list.items), "t1,t2", "placeholders share one checklist");
    assertEqual(
      host.getTaskState().items.length,
      2,
      "the no-argument host read finds that same checklist",
    );
  });

  await test("the declared tool-context session wins over the default", async () => {
    const host = new NeuroLink();
    host.registerTaskTools();
    host.setToolContext({ sessionId: "declared-session" });
    await host.executeTool("tasks_create", { titles: ["a"] });
    assertEqual(host.getTaskState("declared-session").items.length, 1);
    assertEqual(host.getTaskState().items.length, 1, "no-arg read agrees");
  });

  section("Checklist state is not conversation state (N1.3)");

  await test("state outlives the tool context that named it", async () => {
    // The checklist is keyed by session in module state, never carried in the
    // message list — so nothing that rewrites or drops conversation state
    // (compaction, summarization, clearing the tool context) can lose it.
    const host = new NeuroLink();
    host.registerTaskTools();
    host.setToolContext({ sessionId: "durable-session" });
    await host.executeTool("tasks_create", { titles: ["survive me"] });
    host.clearToolContext();
    const state = host.getTaskState("durable-session");
    assertEqual(state.items.length, 1);
    assertEqual(state.items[0].title, "survive me");
  });

  await test("a second instance reads the same session's checklist", async () => {
    // Session-keyed, not instance-keyed: a host that rebuilds its NeuroLink
    // (or a worker sharing the tool registry) still sees the same checklist.
    const first = new NeuroLink();
    first.registerTaskTools();
    await callTool(
      first,
      "tasks_create",
      { titles: ["shared"] },
      "cross-instance",
    );
    const second = new NeuroLink();
    assertEqual(second.getTaskState("cross-instance").items.length, 1);
    assertEqual(second.clearTaskState("cross-instance"), true);
    assertEqual(first.getTaskState("cross-instance").items.length, 0);
  });

  section("Live model run");

  await test("the model plans with tasks_create and finishes with tasks_update", async () => {
    if (!opts.provider) {
      throw new Skip("no provider configured");
    }
    const host = new NeuroLink();
    host.registerTaskTools();
    const sessionId = "checklist-live";
    host.setToolContext({ sessionId });
    try {
      await host.generate({
        input: {
          text:
            "You are reviewing a pull request. First call tasks_create with exactly two " +
            "tasks: 'Review the auth changes' and 'Review the migrations'. Then mark task " +
            "t1 done with tasks_update. Then stop.",
        },
        provider: opts.provider,
        ...(opts.model ? { model: opts.model } : {}),
        maxSteps: 6,
        timeout: 120_000,
      });
    } catch (error) {
      throw new Skip(
        `provider "${opts.provider}" unavailable: ${
          error instanceof Error ? error.message.slice(0, 160) : String(error)
        }`,
      );
    }
    const state = host.getTaskState(sessionId);
    assert(
      state.items.length >= 2,
      "the model's checklist must be visible to the host with no message parsing",
    );
    assertEqual(
      ids(state.items).startsWith("t1,t2"),
      true,
      "ids stay engine-assigned even when the model refers to its own",
    );
    assert(
      state.items.some((item: ChecklistItem) => item.status === "done"),
      "the model's tasks_update must have landed in host-readable state",
    );
  });
});
