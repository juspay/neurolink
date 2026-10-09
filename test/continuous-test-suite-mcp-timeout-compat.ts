#!/usr/bin/env tsx
/** Real unshortened stdio/JSON compatibility controls through the shipped SDK. */
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ExternalServerManager } from "../dist/index.js";
import type { MCPServerInfo } from "../src/lib/types/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
assertDistFresh();
// These NEW cases intentionally wait longer than the historical defaults;
// existing deadline suites retain their original 15-second case bounds.
const { test, runSuite } = defineSuite("MCP timeout compatibility", {
  offline: true,
  perTestTimeoutMs: 120_000,
});
const fixture = fileURLToPath(
  new URL("./fixtures/mcp-deadline-server.mjs", import.meta.url),
);
const config = (
  id: string,
  timeout: number,
  init: number,
  call: number,
): MCPServerInfo => ({
  id,
  name: id,
  description: "Owned inert stdio compatibility fixture",
  transport: "stdio",
  status: "initializing",
  tools: [],
  command: process.execPath,
  args: [fixture],
  env: {
    FIXTURE_INITIALIZE_DELAY_MS: String(init),
    FIXTURE_CALL_DELAY_MS: String(call),
  },
  timeout,
  autoRestart: false,
});
await test("an implicit connection cap does not shorten a configured 60-second stdio startup", async () => {
  const manager = new ExternalServerManager({
    enableAutoRestart: false,
    enablePerformanceMonitoring: false,
  });
  const started = Date.now();
  try {
    const result = await manager.addServer(
      "owned-long-init",
      config("owned-long-init", 60_000, 35_000, 0),
    );
    assert(
      result.success,
      "Configured stdio startup was shortened by an implicit connection cap",
    );
    assert(
      Date.now() - started >= 35_000,
      "The real initialization wait was skipped or shortened",
    );
  } finally {
    await manager.shutdown();
  }
});
await test("an implicit request cap does not shorten a configured 90-second stdio tool call", async () => {
  const manager = new ExternalServerManager({
    enableAutoRestart: false,
    enablePerformanceMonitoring: false,
  });
  try {
    assert(
      (
        await manager.addServer(
          "owned-long-call",
          config("owned-long-call", 90_000, 0, 62_000),
        )
      ).success,
      "Owned long-call server did not attach",
    );
    const started = Date.now();
    const result = await manager.executeTool("owned-long-call", "slow", {});
    assert(
      JSON.stringify(result).includes("delayed fixture"),
      "Configured long-running tool did not return its real response",
    );
    assert(
      Date.now() - started >= 62_000,
      "The real tool wait was skipped or shortened",
    );
  } finally {
    await manager.shutdown();
  }
});
await test("null JSON fetch is absent while other non-functions remain rejected", async () => {
  const dir = await mkdtemp(join(tmpdir(), "sdk-mcp-fetch-compat-"));
  try {
    for (const parallel of [false, true]) {
      for (const value of [null, "not-a-function"]) {
        const path = join(
          dir,
          `config-${parallel}-${value === null ? "null" : "invalid"}.json`,
        );
        await writeFile(
          path,
          JSON.stringify({
            mcpServers: {
              owned: {
                command: process.execPath,
                args: [fixture],
                env: { FIXTURE_CALL_DELAY_MS: "0" },
                timeout: 5_000,
                autoRestart: false,
                fetch: value,
              },
            },
          }),
        );
        const manager = new ExternalServerManager({
          enableAutoRestart: false,
          enablePerformanceMonitoring: false,
        });
        try {
          const result = await manager.loadMCPConfiguration(path, { parallel });
          assert(
            value === null
              ? result.serversLoaded === 1
              : result.serversLoaded === 0 && result.errors.length > 0,
            "JSON fetch compatibility or invalid-hook rejection changed",
          );
        } finally {
          await manager.shutdown();
        }
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
await runSuite();
