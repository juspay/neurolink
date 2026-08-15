import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import { startProxyLogCleanupScheduler } from "../src/lib/proxy/logCleanupScheduler.js";

describe("proxy test isolation", () => {
  it("runs Vitest with a disposable home and blocks the installed proxy", async () => {
    expect(process.env.NEUROLINK_PROXY_TEST_ISOLATED).toBe("1");
    expect(homedir()).toContain("neurolink-vitest-home-");
    await expect(fetch("http://127.0.0.1:55669/health")).rejects.toThrow(
      "Blocked network access from isolated test",
    );
    await expect(
      fetch("https://api.anthropic.com/v1/messages"),
    ).rejects.toThrow("Blocked network access from isolated test");
    await expect(
      fetch("https://api.anthropic.com./v1/messages"),
    ).rejects.toThrow("Blocked network access from isolated test");
    await expect(fetch("http://localhost.:55669/health")).rejects.toThrow(
      "Blocked network access from isolated test",
    );
  });

  it("keeps the process-starting proxy suite offline and current-model only", async () => {
    const source = await readFile(
      new URL("./continuous-test-suite-proxy.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("neurolink-proxy-e2e-home-");
    expect(source).toContain(
      'process.env.NEUROLINK_PROXY_TEST_ALLOW_LIVE === "1"',
    );
    expect(source).toContain("delete process.env[variable]");
    expect(source).toContain('"claude-sonnet-4-6"');
    expect(source).not.toContain('"claude-sonnet-4-20250514"');
    expect(source).not.toContain("backupAndClearProxyState");
    expect(source).not.toContain("restoreProxyState");
    expect(source).not.toContain("backupClaudeSettings");
    expect(source).not.toContain("restoreClaudeSettings");
  });

  it("keeps log retention outside startup and the serving event loop", async () => {
    const [proxySource, schedulerSource] = await Promise.all([
      readFile(
        new URL("../src/cli/commands/proxy.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../src/lib/proxy/logCleanupScheduler.ts", import.meta.url),
        "utf8",
      ),
    ]);

    expect(proxySource).not.toContain("cleanupLogs(7, 500)");
    expect(proxySource).toContain("startProxyLogCleanupScheduler({ logsDir })");
    expect(schedulerSource).toContain("new Worker(");
    expect(schedulerSource).toContain("if (stopped || activeWorker)");
  });

  it("coalesces cleanup workers and terminates the active worker", async () => {
    const workerUrl = new URL(
      "data:text/javascript," +
        encodeURIComponent("setInterval(() => undefined, 1000);"),
    );
    const scheduler = startProxyLogCleanupScheduler({
      logsDir: homedir(),
      initialDelayMs: 60_000,
      intervalMs: 60_000,
      workerUrl,
    });

    expect(scheduler.trigger()).toBe(true);
    expect(scheduler.trigger()).toBe(false);
    await scheduler.stop();
    expect(scheduler.trigger()).toBe(false);
  });

  it("contains synchronous cleanup worker construction failures", async () => {
    const scheduler = startProxyLogCleanupScheduler({
      logsDir: homedir(),
      initialDelayMs: 60_000,
      intervalMs: 60_000,
      workerUrl: new URL("https://invalid.neurolink.test/worker.js"),
    });

    expect(scheduler.trigger()).toBe(false);
    await expect(scheduler.stop()).resolves.toBeUndefined();
  });
});
