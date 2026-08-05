#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — tool execution storage parity across backends
 *
 * `storeToolExecution` existed only on the Redis manager, and the caller
 * reached it by casting. On in-memory storage tool activity therefore never
 * became `tool_call` / `tool_result` messages at all, so every downstream path
 * that reasons about tool batches — compaction, pruning, and the id-based pair
 * repair — saw a different history shape depending on `STORAGE_TYPE`. Two code
 * paths, one of them barely exercised.
 *
 * This suite pins the in-memory implementation to the same contract the Redis
 * one follows: calls written before results, `toolCallId` carried on BOTH
 * sides, and the resulting history surviving `repairToolPairs` untouched.
 *
 * No API keys, no network, no Redis, no LLM — pure in-memory assertions.
 *
 * Run: npx tsx test/continuous-test-suite-tool-storage-parity.ts
 *      pnpm run test:tool-storage-parity
 */

import { ConversationMemoryManager } from "../src/lib/core/conversationMemoryManager.js";
import { repairToolPairs } from "../src/lib/context/toolPairRepair.js";
import type { ChatMessage } from "../src/lib/types/index.js";
import { defineSuite } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("Tool storage parity");

/**
 * NOTE: assertion messages must NEVER interpolate message content or tool
 * payloads — `defineSuite` downgrades a throw to SKIP when the text matches
 * `isExpectedProviderError()`, silently turning a failure into ⊘.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function newManager(): ConversationMemoryManager {
  return new ConversationMemoryManager({
    enabled: true,
    maxSessions: 10,
    maxTurnsPerSession: 100,
    enableSummarization: false,
  });
}

async function storeBatch(
  manager: ConversationMemoryManager,
  sessionId: string,
  pairs: Array<{ id: string; name: string; output: unknown; error?: string }>,
): Promise<ChatMessage[]> {
  await manager.storeToolExecution(
    sessionId,
    "user-1",
    pairs.map((p) => ({
      toolCallId: p.id,
      toolName: p.name,
      args: { q: p.name },
    })),
    pairs.map((p) => ({
      toolCallId: p.id,
      output: p.output,
      ...(p.error ? { error: p.error } : {}),
    })),
  );
  return manager.getSessionMessages(sessionId, "user-1");
}

await runSuite(async () => {
  section("The in-memory backend must implement the contract");

  await test("storeToolExecution exists on the in-memory manager", async () => {
    const manager = newManager();
    assert(
      typeof manager.storeToolExecution === "function",
      "in-memory manager does not implement storeToolExecution",
    );
  });

  await test("a single call/result pair is persisted", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "s1", [
      { id: "t1", name: "read_file", output: "file body" },
    ]);
    assert(
      messages.filter((m) => m.role === "tool_call").length === 1,
      "tool_call message was not persisted",
    );
    assert(
      messages.filter((m) => m.role === "tool_result").length === 1,
      "tool_result message was not persisted",
    );
  });

  section("Shape must match what downstream paths expect");

  await test("toolCallId is carried on both sides", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "s2", [
      { id: "t1", name: "read_file", output: "body" },
    ]);
    const call = messages.find((m) => m.role === "tool_call");
    const result = messages.find((m) => m.role === "tool_result");
    assert(call?.toolCallId === "t1", "tool_call lost its toolCallId");
    assert(result?.toolCallId === "t1", "tool_result lost its toolCallId");
  });

  await test("calls are written before results", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "s3", [
      { id: "t1", name: "a", output: "1" },
      { id: "t2", name: "b", output: "2" },
    ]);
    const roles = messages.map((m) => m.role);
    assert(
      roles.join(",") === "tool_call,tool_call,tool_result,tool_result",
      "batch ordering does not match the Redis backend contract",
    );
  });

  await test("tool name is resolved onto the result via id", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "s4", [
      { id: "t1", name: "read_file", output: "body" },
    ]);
    const result = messages.find((m) => m.role === "tool_result");
    assert(
      result?.tool === "read_file",
      "result did not inherit the tool name",
    );
  });

  await test("non-string output is serialized, errors are recorded", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "s5", [
      { id: "t1", name: "a", output: { nested: { value: 7 } } },
      { id: "t2", name: "b", output: null, error: "boom" },
    ]);
    const results = messages.filter((m) => m.role === "tool_result");
    assert(
      results[0].content.includes("nested"),
      "object output was not serialized",
    );
    assert(
      results[1].result?.success === false,
      "error result was marked successful",
    );
    assert(results[1].result?.error === "boom", "error text was not recorded");
  });

  section("The persisted history must survive pair repair untouched");

  await test("a parallel batch round-trips through repairToolPairs", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "s6", [
      { id: "t1", name: "read_file", output: "body" },
      { id: "t2", name: "grep", output: "matches" },
      { id: "t3", name: "ls", output: "listing" },
    ]);
    const repaired = repairToolPairs(messages);
    assert(
      !repaired.repaired,
      "pair repair modified a healthy in-memory tool batch",
    );
    assert(
      repaired.messages.filter((m) => m.role === "tool_call").length ===
        repaired.messages.filter((m) => m.role === "tool_result").length,
      "pair repair left the batch unbalanced",
    );

    // Counts and roles alone would pass even if two parallel results traded
    // toolCallIds — and a swapped id is exactly what the id-based repair is
    // supposed to make impossible. Pin the id -> name mapping on both sides.
    const expected = new Map([
      ["t1", "read_file"],
      ["t2", "grep"],
      ["t3", "ls"],
    ]);
    for (const role of ["tool_call", "tool_result"] as const) {
      const seen = repaired.messages
        .filter((m) => m.role === role)
        .map((m) => [m.toolCallId, m.tool] as const);
      assert(
        seen.length === expected.size,
        `pair repair changed the ${role} count in a parallel batch`,
      );
      for (const [id, tool] of seen) {
        assert(
          id !== undefined && expected.has(id),
          `a ${role} carries an id that was never issued`,
        );
        assert(
          tool === expected.get(id!),
          `a ${role} is bound to the wrong tool for its id`,
        );
      }
    }
  });

  section("Session lifecycle");

  await test("storing tools creates the session when absent", async () => {
    const manager = newManager();
    const messages = await storeBatch(manager, "brand-new", [
      { id: "t1", name: "a", output: "1" },
    ]);
    assert(messages.length === 2, "session was not created on tool storage");
  });

  await test("empty batches are harmless", async () => {
    const manager = newManager();
    await manager.storeToolExecution("s7", "user-1", [], []);
    const messages = await manager.getSessionMessages("s7", "user-1");
    assert(messages.length === 0, "an empty batch wrote messages");
  });

  await test("tool messages append onto an existing session", async () => {
    const manager = newManager();
    await manager.storeConversationTurn({
      sessionId: "s8",
      userId: "user-1",
      userMessage: "hello",
      aiResponse: "hi",
      enableSummarization: false,
    });
    const messages = await storeBatch(manager, "s8", [
      { id: "t1", name: "a", output: "1" },
    ]);
    assert(
      messages.length === 4,
      "tool messages did not append onto the existing turn",
    );
    assert(
      messages[0].role === "user" && messages[1].role === "assistant",
      "existing turn ordering was disturbed",
    );
  });
});
