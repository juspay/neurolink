#!/usr/bin/env tsx

/**
 * Continuous Test Suite — MCP servers are keyed by id; a failed tool call keeps
 * its message.
 *
 * Two defects that a host embedding the SDK hit, both through the public API:
 *
 *   1. `MCPToolRegistry.registerServer()` stored the server under its display
 *      name (`metadata.name`) while `unregisterServer(serverId)` removes by
 *      id. A server whose name differs from its id could therefore never be
 *      unregistered, `get(serverId)` found nothing, and two servers sharing a
 *      display name silently replaced one another. The registry is now keyed
 *      by server id and the display name stays metadata.
 *
 *   2. When a tool call fails, `NeuroLink.executeTool()` rebuilds the structured
 *      error with its execution context by spreading the original into a new
 *      `NeuroLinkError`. `Error#message` is not enumerable, so the spread left
 *      the message out and the error callers caught had `message === ""`
 *      (code, category and context were intact). The message is now carried
 *      across.
 *
 * Everything comes from `dist/index.js` (Critical Rule 15, one module graph).
 * No API keys, no provider, no network.
 *
 * Run: pnpm run build && pnpm run test:mcp-server-id-and-tool-error
 */

import { MCPToolRegistry, NeuroLink } from "../dist/index.js";
import type { MCPServerInfo } from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("MCP server id keying and tool error", {
  offline: true,
});

function serverNamed(id: string, name: string): MCPServerInfo {
  return {
    id,
    name,
    description: `${name} test server`,
    tools: [
      {
        name: "ping",
        description: "Answers pong.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({ success: true, data: "pong" }),
      },
    ],
    transport: "stdio",
    status: "connected",
  };
}

await test("a registered server is found by its id, with the display name kept as metadata", async () => {
  const registry = new MCPToolRegistry();
  await registry.registerServer(serverNamed("server-a", "Display A"));
  const plugin = registry.get("server-a");
  assert(plugin !== undefined, "get(serverId) found nothing");
  assertEqual(plugin?.metadata.name, "Display A", "display name");
  assert(registry.get("Display A") === undefined, "still keyed by name");
});

await test("two servers that share a display name are both kept", async () => {
  const registry = new MCPToolRegistry();
  await registry.registerServer(serverNamed("server-a", "Shared"));
  await registry.registerServer(serverNamed("server-b", "Shared"));
  assertEqual(registry.list().length, 2, "registered plugins");
  assert(registry.get("server-a") !== undefined, "server-a was replaced");
  assert(registry.get("server-b") !== undefined, "server-b was replaced");
});

await test("unregisterServer removes exactly the server it names", async () => {
  const registry = new MCPToolRegistry();
  await registry.registerServer(serverNamed("server-a", "Shared"));
  await registry.registerServer(serverNamed("server-b", "Shared"));
  assertEqual(registry.unregisterServer("server-a"), true, "removed");
  assert(registry.get("server-a") === undefined, "server-a remains");
  assert(registry.get("server-b") !== undefined, "server-b was removed too");
  assertEqual(registry.unregisterServer("server-a"), false, "second removal");
  assertEqual(registry.unregisterServer("never-registered"), false, "unknown");
});

await test("a failed tool call rejects with the original message", async () => {
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  let caught: unknown;
  try {
    await neurolink.executeTool("tool-that-was-never-registered", {});
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof Error, "executeTool did not reject");
  const failure = caught as Error & { code?: string };
  assertEqual(failure.name, "NeuroLinkError", "error name");
  assertEqual(failure.code, "TOOL_NOT_FOUND", "error code");
  assert(failure.message !== "", "message was dropped");
  assert(
    failure.message.includes("tool-that-was-never-registered"),
    "message does not name the tool",
  );
});

await runSuite();
