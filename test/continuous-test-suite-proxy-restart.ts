#!/usr/bin/env tsx
/**
 * Determinism exception (CLAUDE.md rule 15): exercise the built restart CLI
 * against the real built listener, supervisor and socket-worker runtime, with
 * candidate crashes, startup stalls and active streams controlled by a fixture.
 * These failures cannot be induced safely on an installed service. Internal
 * imports construct the isolated service; assertions drive its CLI and HTTP
 * surfaces. Everything uses one built module graph and no live credentials.
 */
import "./helpers/proxyTestIsolation.js";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  chmod,
} from "node:fs/promises";
import { join } from "node:path";
import { request, Server } from "node:http";
import { fileURLToPath } from "node:url";
import {
  assert,
  assertEqual,
  defineSuite,
  runCLI,
  delay,
} from "./helpers/harness.js";
import { startRollingProxyServer } from "../dist/proxy/rollingProxyServer.js";
import { spawnProxySocketWorker } from "../dist/proxy/rollingWorkerProcess.js";
import {
  startProxyRestartControl,
  requestProxySupervisorTelemetry,
} from "../dist/proxy/restartControl.js";
import { createProxyStartApp } from "../dist/cli/commands/proxy.js";
import { markProxyReady } from "../dist/proxy/proxyHealth.js";

const { test, runSuite } = defineSuite("Safe Proxy Restart", { offline: true });
const fixture = fileURLToPath(
  new URL("./fixtures/proxyRestartWorker.mjs", import.meta.url),
);

async function withService(
  mode: string,
  run: (service: {
    command: (check?: boolean) => ReturnType<typeof runCLI>;
    server: Awaited<ReturnType<typeof startRollingProxyServer>>;
    control: Awaited<ReturnType<typeof startProxyRestartControl>>;
    stateDir: string;
    url: string;
    controlMessages: string[];
  }) => Promise<void>,
) {
  // A short absolute path also stays below macOS's Unix socket path limit.
  const home = await mkdtemp("/tmp/nlr-");
  const stateDir = join(home, ".neurolink");
  await mkdir(stateDir);
  const protectedFiles = [
    ".env",
    "proxy-config.yaml",
    "proxy-update-state.json",
  ];
  for (const name of protectedFiles) {
    await writeFile(join(stateDir, name), `preserve-${name}`);
  }
  const server = await startRollingProxyServer({
    host: "127.0.0.1",
    port: 0,
    initialVersion: "1.2.3",
    readyTimeoutMs: 1_200,
    shutdownTimeoutMs: 500,
    spawnWorker: (generation, expectedVersion) =>
      spawnProxySocketWorker({
        generation,
        expectedVersion,
        command: process.execPath,
        args: [fixture],
        env: { NEUROLINK_RESTART_FIXTURE_MODE: mode },
        stdout: "ignore",
        stderr: "ignore",
      }),
  });
  const url = `http://127.0.0.1:${server.address.port}`;
  let counterNoise = 0;
  let statusCalls = 0;
  const controlMessages: string[] = [];
  const control = await startProxyRestartControl({
    stateDir,
    getTelemetry:
      mode === "telemetry-missing"
        ? undefined
        : () => {
            if (mode === "telemetry-unavailable") {
              throw new Error("recorded diagnostics failure");
            }
            return {
              pid: process.pid,
              checkedAt: new Date().toISOString(),
              configuredSink: "otel",
              lifecycleSink: mode === "supervisor-file" ? "file" : "otel",
              otelInitialized: true,
              exportDropped: 0,
              exportUnconfirmed: 0,
              stdio: {
                stdout: mode === "supervisor-descriptors" ? "file" : "non_file",
                stderr: "non_file",
              },
            };
          },
    log: (message) => controlMessages.push(message),
    server: {
      ...server,
      snapshot: () => {
        const snapshot = server.snapshot();
        return {
          ...snapshot,
          rejectedSockets: snapshot.rejectedSockets + counterNoise,
        };
      },
    },
    getInstalledVersion: async () => {
      if (mode === "preflight-noise") {
        counterNoise++;
      }
      return mode === "invalid-install"
        ? undefined
        : mode === "upgrade"
          ? "1.2.4"
          : "1.2.3";
    },
    isUpdatePending: () => mode === "updating",
    getStatus: async () => {
      if (++statusCalls > 1 && mode === "handoff-noise") {
        counterNoise++;
      }
      const response = await fetch(`${url}/status`, {
        headers: { connection: "close" },
        signal: AbortSignal.timeout(1_000),
      });
      return response.json();
    },
  });
  await writeFile(
    join(stateDir, "proxy-supervisor-state.json"),
    JSON.stringify({ pid: process.pid, restartControl: control.identity }),
  );
  try {
    await run({
      server,
      control,
      stateDir,
      url,
      controlMessages,
      command: (check = false) =>
        runCLI(
          [
            "proxy",
            "restart",
            "--format",
            "json",
            ...(check ? ["--check"] : []),
          ],
          {
            env: {
              HOME: home,
              USERPROFILE: home,
              XDG_CONFIG_HOME: join(home, ".config"),
            },
            timeoutMs: 15_000,
          },
        ),
    });
    for (const name of protectedFiles) {
      assertEqual(
        await readFile(join(stateDir, name), "utf8"),
        `preserve-${name}`,
        "restart modified persistent settings",
      );
    }
  } finally {
    await control.close();
    await server.close();
    await rm(home, { recursive: true, force: true });
  }
}

await test("check verifies readiness without spawning a worker or changing settings", async () => {
  await withService("normal", async ({ command, server }) => {
    const before = server.snapshot();
    const outcome = await command(true);
    assertEqual(outcome.exitCode, 0, "restart check failed");
    assertEqual(
      JSON.parse(outcome.stdout).phase,
      "checked",
      "check did not return a checked result",
    );
    assertEqual(
      server.snapshot().generation,
      before.generation,
      "check spawned a worker",
    );
  });
});

await test("restart preserves an active stream and admits new requests throughout handoff", async () => {
  await withService("normal", async ({ command, server, url }) => {
    const before = server.snapshot();
    const stream = await fetch(`${url}/stream`, {
      signal: AbortSignal.timeout(20_000),
    });
    const streamBody = stream.arrayBuffer();
    let polling = true;
    let failures = 0;
    let probes = 0;
    const probesDone = (async () => {
      while (polling) {
        try {
          const res = await fetch(url, {
            headers: { connection: "close" },
            signal: AbortSignal.timeout(1_000),
          });
          if (!res.ok) {
            failures++;
          }
          await res.text();
        } catch {
          failures++;
        }
        probes++;
        await delay(25);
      }
    })();
    try {
      const outcome = await command();
      assertEqual(outcome.exitCode, 0, "worker restart failed");
      const result = JSON.parse(outcome.stdout);
      assertEqual(result.phase, "activated", "replacement was not verified");
      assertEqual(result.supervisorPid, process.pid, "listener owner changed");
      assert(
        result.workerPid !== before.active?.pid,
        "worker was not replaced",
      );
      assert(
        result.drainingWorkers > 0,
        "active stream did not retain its worker",
      );
      const blocked = await command();
      assertEqual(
        blocked.exitCode,
        1,
        "restart accumulated an extra draining worker",
      );
      const body = Buffer.from(await streamBody);
      assertEqual(body.length, 256_000, "stream body was incomplete");
      for (let chunk = 0; chunk < 1_000; chunk++) {
        assert(
          body
            .subarray(chunk * 256, (chunk + 1) * 256)
            .equals(Buffer.alloc(256, chunk % 256)),
          "stream bytes were reordered or duplicated",
        );
      }
    } finally {
      polling = false;
      await probesDone;
      await streamBody.catch(() => undefined);
    }
    assert(probes > 5, "no concurrent admission evidence was collected");
    assertEqual(failures, 0, "admission failed during handoff");
    assertEqual(
      server.snapshot().rejectedSockets,
      0,
      "handoff rejected sockets",
    );
    assertEqual(
      server.snapshot().failedTransfers,
      0,
      "handoff lost a socket transfer",
    );
  });
});

for (const mode of [
  "never-ready",
  "ignores-term",
  "crash",
  "wrong-version",
  "draining",
  "invalid-install",
  "updating",
]) {
  await test(`failed preflight or candidate preserves the serving worker: ${mode}`, async () => {
    await withService(mode, async ({ command, server, url }) => {
      const before = server.snapshot();
      const start = Date.now();
      const outcome = await command();
      assertEqual(outcome.exitCode, 1, "unsafe restart reported success");
      assertEqual(
        JSON.parse(outcome.stdout).ok,
        false,
        "failure result was hidden",
      );
      assert(
        Date.now() - start < 10_000,
        "failed candidate did not complete within the bounded test deadline",
      );
      assertEqual(
        server.snapshot().active?.pid,
        before.active?.pid,
        "failure displaced the serving worker",
      );
      assertEqual(
        server.snapshot().candidate,
        null,
        "failed candidate remained selected",
      );
      if (mode === "ignores-term") {
        const deadline = Date.now() + 3_000;
        while (
          !server
            .snapshot()
            .recentEvents.some(
              (event) =>
                event.type === "worker_exit" &&
                event.generation === 2 &&
                event.workerExitSignal === "SIGKILL",
            ) &&
          Date.now() < deadline
        ) {
          await delay(10);
        }
        assert(
          server
            .snapshot()
            .recentEvents.some(
              (event) =>
                event.type === "worker_exit" &&
                event.generation === 2 &&
                event.workerExitSignal === "SIGKILL",
            ),
          "unresponsive candidate survived bounded cleanup",
        );
      }
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      assertEqual(response.status, 200, "original worker stopped serving");
      await response.text();
    });
  });
}

await test("concurrent commands do not queue multiple replacements", async () => {
  await withService("never-ready", async ({ command, server }) => {
    const outcomes = await Promise.all([command(), command()]);
    assert(
      outcomes.every((outcome) => outcome.exitCode === 1),
      "overlapping restart unexpectedly succeeded",
    );
    assert(
      outcomes.some(
        (outcome) => JSON.parse(outcome.stdout).phase === "refused",
      ),
      "overlapping operation was not refused",
    );
    assertEqual(
      server.snapshot().generation,
      2,
      "overlap queued another replacement",
    );
  });
});

await test("an installed newer version activates without replacing the listener owner", async () => {
  await withService("upgrade", async ({ command, server }) => {
    const outcome = await command();
    assertEqual(outcome.exitCode, 0, "installed version did not activate");
    assertEqual(
      JSON.parse(outcome.stdout).version,
      "1.2.4",
      "wrong installed version activated",
    );
    assertEqual(
      server.snapshot().active?.version,
      "1.2.4",
      "active version differs from the command result",
    );
  });
});

await test("a lost CLI connection does not cancel supervisor-owned completion", async () => {
  await withService("normal", async ({ control, server }) => {
    const previousPid = server.snapshot().active?.pid;
    const req = request({
      socketPath: control.identity.socketPath,
      method: "POST",
      path: "/restart",
      headers: { "x-neurolink-instance": control.identity.instanceId },
    });
    req.on("error", () => {});
    req.end();
    const deadline = Date.now() + 4_000;
    while (!server.snapshot().candidate && Date.now() < deadline) {
      await delay(5);
    }
    assert(!!server.snapshot().candidate, "fixture restart was not accepted");
    req.destroy();
    while (
      server.snapshot().active?.pid === previousPid &&
      Date.now() < deadline
    ) {
      await delay(10);
    }
    assert(
      server.snapshot().active?.pid !== previousPid,
      "client disconnect stranded restart completion",
    );
    assertEqual(
      server.snapshot().candidate,
      null,
      "candidate did not finish activation",
    );
  });
});

for (const mode of [
  "logging-regression",
  "disk-logging-lost",
  "otel-uninitialized",
]) {
  await test(`logging change is reported as activated but unverified: ${mode}`, async () => {
    await withService(mode, async ({ command }) => {
      const outcome = await command();
      assertEqual(
        outcome.exitCode,
        1,
        "logging regression was reported healthy",
      );
      assertEqual(
        JSON.parse(outcome.stdout).phase,
        "activated_unverified",
        "activation and verification were conflated",
      );
    });
  });
}

await test("preflight counter activity is excluded from the handoff result", async () => {
  await withService("preflight-noise", async ({ command }) => {
    const outcome = await command();
    assertEqual(
      outcome.exitCode,
      0,
      "preflight activity was attributed to handoff",
    );
    assertEqual(
      JSON.parse(outcome.stdout).rejectedSocketsDelta,
      0,
      "handoff counter baseline was too early",
    );
  });
});

await test("counter activity during handoff is visible without claiming the worker failed", async () => {
  await withService("handoff-noise", async ({ command }) => {
    const outcome = await command();
    const result = JSON.parse(outcome.stdout);
    assertEqual(outcome.exitCode, 1, "handoff socket activity was hidden");
    assertEqual(
      result.phase,
      "activated_unverified",
      "verified activation was conflated with loss-free handoff",
    );
    assertEqual(
      result.rejectedSocketsDelta,
      1,
      "observed handoff delta was not reported",
    );
  });
});

await test("a second control instance does not collide with or unlink the first instance", async () => {
  await withService(
    "normal",
    async ({ command, control, server, stateDir, url }) => {
      const second = await startProxyRestartControl({
        stateDir,
        server,
        getInstalledVersion: async () => "1.2.3",
        isUpdatePending: () => false,
        getStatus: async () =>
          (
            await fetch(`${url}/status`, { signal: AbortSignal.timeout(1_000) })
          ).json(),
      });
      try {
        assert(
          second.identity.socketPath !== control.identity.socketPath,
          "control path reused an earlier instance identity",
        );
        assertEqual(
          (await command(true)).exitCode,
          0,
          "new control instance clobbered the existing socket",
        );
      } finally {
        await second.close();
      }
      assertEqual(
        (await command(true)).exitCode,
        0,
        "closing a control instance unlinked another instance",
      );
    },
  );
});

await test("control server errors after binding are reported without stopping requests", async () => {
  // Deterministically emit accept failures without exhausting host descriptors.
  // Capture the real HTTP control server; assertions still drive CLI and HTTP.
  const listen = Server.prototype.listen;
  let controlServer: Server | undefined;
  Server.prototype.listen = function (...args: unknown[]) {
    controlServer = this;
    return Reflect.apply(listen, this, args);
  };
  try {
    await withService(
      "normal",
      async ({ command, server, url, controlMessages }) => {
        Server.prototype.listen = listen;
        if (!controlServer) {
          throw new Error("control server was not captured");
        }
        const before = server.snapshot().active?.pid;
        controlServer.emit("error", new Error("isolated accept failure 1"));
        controlServer.emit("error", new Error("isolated accept failure 2"));
        assertEqual(
          controlMessages.length,
          2,
          "control errors were not reported",
        );
        assert(
          controlMessages[1].includes("isolated accept failure 2"),
          "control error detail was lost",
        );
        assertEqual(
          (await command(true)).exitCode,
          0,
          "control check stopped working after an error",
        );
        const response = await fetch(url, {
          signal: AbortSignal.timeout(1_000),
        });
        await response.text();
        assertEqual(response.status, 200, "control error stopped requests");
        assertEqual(
          server.snapshot().active?.pid,
          before,
          "serving worker changed",
        );
      },
    );
  } finally {
    Server.prototype.listen = listen;
  }
});

await test("unsafe control socket permissions are refused", async () => {
  await withService("normal", async ({ command, server, control }) => {
    const before = server.snapshot().generation;
    await chmod(control.identity.socketPath, 0o666);
    assertEqual(
      (await command()).exitCode,
      1,
      "unsafe socket permissions were accepted",
    );
    await chmod(control.identity.socketPath, 0o600);
    assertEqual(
      server.snapshot().generation,
      before,
      "refusal changed the worker",
    );
  });
});

await test("CLI JSON reports unverified outcome without invented supervisor fields", async () => {
  await withService("normal", async ({ command, server, stateDir }) => {
    const before = server.snapshot().generation;
    await writeFile(
      join(stateDir, "proxy-supervisor-state.json"),
      JSON.stringify({ pid: process.pid, rolling: server.snapshot() }),
    );
    const outcome = await command();
    assertEqual(outcome.exitCode, 1, "legacy supervisor was signalled");
    const result = JSON.parse(outcome.stdout);
    assertEqual(result.ok, false, "unknown outcome claimed success");
    assertEqual(
      result.phase,
      "unverified",
      "unknown outcome was misclassified",
    );
    assert(
      typeof result.message === "string" && result.message.length > 0,
      "unknown outcome omitted its explanation",
    );
    assertEqual(
      Object.keys(result).sort().join(","),
      "message,ok,phase",
      "unknown outcome invented supervisor fields",
    );
    assertEqual(
      server.snapshot().generation,
      before,
      "refusal changed the worker",
    );
  });
});

await test("rolling workers reject the legacy global drain without changing admission", async () => {
  const previous = process.env.NEUROLINK_PROXY_SOCKET_WORKER;
  process.env.NEUROLINK_PROXY_SOCKET_WORKER = "1";
  try {
    const { app, readiness } = await createProxyStartApp({
      neurolink: { getToolRegistry: () => ({}) } as Parameters<
        typeof createProxyStartApp
      >[0]["neurolink"],
      modelRouter: undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 0,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: undefined,
      updateControlToken: "isolated-restart-fixture",
    });
    markProxyReady(readiness);
    const response = await app.request("/internal/update-control", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-update-token": "isolated-restart-fixture",
      },
      body: JSON.stringify({ action: "drain" }),
    });
    assertEqual(
      response.status,
      409,
      "global drain was accepted on a rolling worker",
    );
    assertEqual(
      readiness.acceptingConnections,
      true,
      "legacy drain closed admission",
    );
    assertEqual(
      readiness.drainingForUpdate,
      false,
      "legacy drain changed readiness",
    );
    const refreshDrain = await app.request("/internal/update-control", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-update-token": "isolated-restart-fixture",
      },
      body: JSON.stringify({ action: "drain_for_supervisor_refresh" }),
    });
    assertEqual(
      refreshDrain.status,
      200,
      "bounded supervisor refresh drain was rejected",
    );
    assertEqual(readiness.drainingForUpdate, true);
    const resume = await app.request("/internal/update-control", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-update-token": "isolated-restart-fixture",
      },
      body: JSON.stringify({ action: "resume" }),
    });
    assertEqual(resume.status, 200);
    assertEqual(readiness.drainingForUpdate, false);
  } finally {
    if (previous === undefined) {
      delete process.env.NEUROLINK_PROXY_SOCKET_WORKER;
    } else {
      process.env.NEUROLINK_PROXY_SOCKET_WORKER = previous;
    }
  }
});

await test("supervisor refresh drain retries recovery until admission resumes", async () => {
  const previous = process.env.NEUROLINK_PROXY_SOCKET_WORKER;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const timers: Array<{
    callback: () => void;
    delay: number;
    handle: NodeJS.Timeout;
  }> = [];
  const cleared = new Set<NodeJS.Timeout>();
  process.env.NEUROLINK_PROXY_SOCKET_WORKER = "1";
  try {
    const { app, readiness } = await createProxyStartApp({
      neurolink: { getToolRegistry: () => ({}) } as Parameters<
        typeof createProxyStartApp
      >[0]["neurolink"],
      modelRouter: undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 0,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: undefined,
      updateControlToken: "isolated-restart-fixture",
    });
    markProxyReady(readiness);
    globalThis.setTimeout = ((
      callback: (...args: unknown[]) => void,
      delay?: number,
      ...args: unknown[]
    ) => {
      const handle = realSetTimeout(() => undefined, 2_147_000_000);
      timers.push({
        callback: () => callback(...args),
        delay: Number(delay),
        handle,
      });
      return handle;
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((handle?: NodeJS.Timeout) => {
      if (handle) {
        cleared.add(handle);
      }
      realClearTimeout(handle);
    }) as typeof clearTimeout;
    const control = (action: string) =>
      app.request("/internal/update-control", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-neurolink-update-token": "isolated-restart-fixture",
        },
        body: JSON.stringify({ action }),
      });

    assertEqual((await control("drain_for_supervisor_refresh")).status, 200);
    assertEqual(timers[0]?.delay, 35 * 60 * 1000);
    readiness.ready = false;
    assertEqual((await control("resume")).status, 409);
    assert(
      !cleared.has(timers[0].handle),
      "failed explicit resume discarded the recovery lease",
    );
    assertEqual(readiness.drainingForUpdate, true);

    readiness.ready = true;
    assertEqual((await control("resume")).status, 200);
    assert(
      cleared.has(timers[0].handle),
      "successful explicit resume retained the recovery lease",
    );
    assertEqual(readiness.drainingForUpdate, false);

    assertEqual((await control("drain_for_supervisor_refresh")).status, 200);
    assertEqual(timers[1]?.delay, 35 * 60 * 1000);
    readiness.ready = false;
    realClearTimeout(timers[1].handle);
    timers[1].callback();
    assertEqual(timers[2]?.delay, 30_000);
    assertEqual(readiness.drainingForUpdate, true);

    readiness.ready = true;
    realClearTimeout(timers[2].handle);
    timers[2].callback();
    assertEqual(readiness.drainingForUpdate, false);
    assertEqual(readiness.acceptingConnections, true);
    assertEqual(timers.length, 3, "successful timer recovery rearmed itself");
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
    for (const timer of timers) {
      realClearTimeout(timer.handle);
    }
    if (previous === undefined) {
      delete process.env.NEUROLINK_PROXY_SOCKET_WORKER;
    } else {
      process.env.NEUROLINK_PROXY_SOCKET_WORKER = previous;
    }
  }
});

await test("supervisor telemetry is read from the private control without replacing a worker", async () => {
  await withService("healthy", async ({ control, server }) => {
    const before = server.snapshot();
    const evidence = await requestProxySupervisorTelemetry(
      control.identity,
      process.pid,
    );
    assertEqual(
      evidence.status,
      "available",
      "supervisor evidence was not returned",
    );
    if (evidence.status === "available") {
      assertEqual(
        evidence.process.pid,
        process.pid,
        "supervisor identity was lost",
      );
      assertEqual(
        evidence.process.lifecycleSink,
        "otel",
        "supervisor sink was not observed",
      );
    }
    assertEqual(
      server.snapshot().active?.pid,
      before.active?.pid,
      "telemetry read replaced worker",
    );
    const missing = await requestProxySupervisorTelemetry(
      undefined,
      process.pid,
    );
    assertEqual(
      missing.status,
      "unavailable",
      "legacy supervisor inferred a healthy sink",
    );
  });
});

await test("worker-only restart refuses file logging, inherited disk descriptors or unavailable supervisor evidence", async () => {
  for (const mode of [
    "supervisor-file",
    "supervisor-descriptors",
    "telemetry-missing",
  ]) {
    await withService(mode, async ({ command, server }) => {
      const before = server.snapshot().active?.pid;
      const result = await command(true);
      assertEqual(
        result.exitCode,
        1,
        "incomplete logging cutover passed preflight",
      );
      const resultBody = JSON.parse(result.stdout);
      assertEqual(
        resultBody.ok,
        false,
        "incomplete supervisor logging reported success",
      );
      assertEqual(
        server.snapshot().active?.pid,
        before,
        "logging preflight replaced worker",
      );
    });
  }
});

await test("supervisor diagnostic failure remains unavailable without interrupting the worker", async () => {
  await withService(
    "telemetry-unavailable",
    async ({ control, server, url }) => {
      const before = server.snapshot().active?.pid;
      const evidence = await requestProxySupervisorTelemetry(
        control.identity,
        process.pid,
      );
      assertEqual(
        evidence.status,
        "unavailable",
        "diagnostic failure claimed healthy evidence",
      );
      assertEqual(
        server.snapshot().active?.pid,
        before,
        "diagnostic failure replaced worker",
      );
      assertEqual(
        (await fetch(`${url}/health`)).status,
        200,
        "diagnostic failure interrupted serving",
      );
    },
  );
});

await runSuite();
