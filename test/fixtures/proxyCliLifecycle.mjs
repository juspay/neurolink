// This fixture signals only itself and its own short-lived child.
import {
  initializeCliLifecycle,
  registerCliShutdownOwner,
  cleanupCliLifecycle,
} from "../../dist/cli/lifecycle.js";
import { spawn } from "node:child_process";

const mode = process.argv[2];
if (mode.startsWith("signal-")) {
  process.exitCode = 7;
}
initializeCliLifecycle(async () => {
  process.stdout.write("flush\n");
  if (mode.startsWith("late-owner")) {
    // Startup can finish registering its shutdown owner during an ongoing flush.
    await new Promise((resolve) => setTimeout(resolve, 10));
    registerCliShutdownOwner(async (signal) => {
      process.stdout.write(`draining signal=${signal}\n`);
      await new Promise((resolve) => setTimeout(resolve, 60));
      process.stdout.write("drained\n");
      process.exit(0);
    });
    process.stdout.write("owner-registered\n");
    process.kill(process.pid, "SIGINT");
  }
  if (
    mode === "reject" ||
    mode === "late-owner-reject" ||
    mode === "signal-reject-error"
  ) {
    throw new Error("fixture flush failure");
  }
  if (mode.includes("timeout")) {
    if (mode !== "timeout") {
      // A stalled exporter can keep a referenced socket or timer alive.
      setInterval(() => {}, 1000);
    }
    await new Promise(() => {});
  }
}, 40);

if (mode.startsWith("supervisor-stop-")) {
  const { mock } = await import("node:test");
  const { logger } = await import("../../dist/utils/logger.js");
  mock.method(logger, "warn", (...args) => {
    process.stderr.write(`${args.map(String).join(" ")}\n`);
  });
  const stage = mode.slice("supervisor-stop-".length);
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const signalSelf = process.kill.bind(process);
  process.kill = (pid, signal) => {
    if (pid !== process.pid) {
      throw new Error("fixture refused a signal outside its own process");
    }
    return signalSelf(pid, signal);
  };
  const stop = () => {
    process.stdout.write("signal-sent\n");
    process.kill(process.pid, "SIGTERM");
    setTimeout(() => process.kill(process.pid, "SIGINT"), 10);
  };
  const replaceModule = async (path, overrides) => {
    const url = new URL(path, import.meta.url);
    mock.module(url.href, {
      namedExports: { ...(await import(url.href)), ...overrides },
    });
  };
  if (stage.includes("timeout") || stage === "worker-late") {
    const { withTimeout } =
      await import("../../dist/utils/async/withTimeout.js");
    await replaceModule("../../dist/utils/async/withTimeout.js", {
      withTimeout: (promise, ms, message) => {
        process.stdout.write(`shutdown-budget=${ms}\n`);
        return withTimeout(
          promise,
          stage === "worker-late" && message?.includes("telemetry")
            ? 200
            : Math.min(ms, 40),
          message,
        );
      },
    });
  }
  await replaceModule("../../dist/cli/utils/serverUtils.js", {
    StateFileManager: class {
      state = null;
      load() {
        return this.state;
      }
      save(state) {
        this.state = state;
      }
      clear() {
        this.state = null;
        process.stdout.write("state-cleared\n");
      }
    },
  });
  await replaceModule("../../dist/proxy/proxyEnv.js", {
    loadProxyEnvFile: async () => {
      if (stage === "bootstrap") {
        stop();
        await pause(60);
      }
      return { path: undefined };
    },
  });
  await replaceModule("../../dist/proxy/otelLogSink.js", {
    initializeProxyOtelLogs: () => {},
    routeProxyConsoleToOtel: () => {},
    flushProxyOtelLogs: async () => {
      if (stage === "otel-flush-reject") {
        throw new Error("fixture OTel flush failure");
      }
      if (stage === "worker-late") {
        // Observe a late resource while bounded telemetry cleanup is pending.
        await pause(140);
      }
      process.stdout.write("otel-flushed\n");
    },
    shutdownProxyOtelLogs: async () => {
      if (stage === "telemetry-reject") {
        throw new Error("fixture telemetry shutdown failure");
      }
      if (stage === "telemetry-timeout") {
        setInterval(() => {}, 1000);
        await new Promise(() => {});
      }
      process.stdout.write("otel-stopped\n");
    },
  });
  await replaceModule("../../dist/proxy/proxyLifecycle.js", {
    configureProxyLifecycleLogger: () => {},
    flushProxyLifecycleEvents: async () => {
      if (stage === "lifecycle-reject") {
        throw new Error("fixture lifecycle flush failure");
      }
    },
  });
  await replaceModule("../../dist/proxy/rollingProxyServer.js", {
    startRollingProxyServer: async (options) => {
      options.onStateChange({});
      if (stage.startsWith("worker")) {
        stop();
        if (stage === "worker-timeout") {
          setInterval(() => {}, 1000);
          await new Promise(() => {});
        }
        await pause(stage === "worker-late" ? 100 : 60);
      }
      process.stdout.write("worker-created\n");
      return {
        address: { port: 0 },
        snapshot: () => ({}),
        close: async () => {
          await pause(20);
          process.stdout.write("worker-closed\n");
        },
      };
    },
  });
  await replaceModule("../../dist/proxy/restartControl.js", {
    startProxyRestartControl: async () => {
      if (stage.startsWith("control")) {
        stop();
        if (stage === "control-timeout") {
          setInterval(() => {}, 1000);
          await new Promise(() => {});
        }
        await pause(60);
      }
      process.stdout.write("control-created\n");
      return {
        identity: {},
        close: async () => {
          process.stdout.write("control-closed\n");
          if (stage === "cleanup-error") {
            throw new Error("fixture control close failure");
          }
        },
      };
    },
  });
  await replaceModule("../../dist/proxy/updaterSupervisor.js", {
    startUpdaterWorkerSupervisor: () => {
      process.stdout.write("updater-created\n");
      stop();
      return {
        currentPid: () => undefined,
        stop: () => process.stdout.write("updater-stopped\n"),
      };
    },
  });
  const { proxyStartCommand } =
    await import("../../dist/cli/commands/proxy.js");
  Object.defineProperty(process, "platform", { get: () => "darwin" });
  Object.defineProperty(process, "ppid", { get: () => 1 });
  if (process.platform !== "darwin" || process.ppid !== 1) {
    throw new Error("fixture refused startup outside its simulated supervisor");
  }
  await proxyStartCommand.handler({ quiet: true, host: "127.0.0.1", port: 0 });
} else if (mode === "reload-startup" || mode === "reload-bootstrap") {
  // Drive the shipped start command with startup held at restart-control setup.
  // Only this child receives an OS signal; all worker/service operations are fixtures.
  const { mock } = await import("node:test");
  const fixtureWorkerPid = process.pid + 1;
  const replaceModule = async (path, overrides) => {
    const url = new URL(path, import.meta.url);
    mock.module(url.href, {
      namedExports: { ...(await import(url.href)), ...overrides },
    });
  };
  await replaceModule("../../dist/cli/utils/serverUtils.js", {
    StateFileManager: class {
      load() {
        return null;
      }
      save() {}
      clear() {}
    },
  });
  await replaceModule("../../dist/proxy/proxyEnv.js", {
    loadProxyEnvFile: async () => {
      if (mode === "reload-bootstrap") {
        process.kill(process.pid, "SIGHUP");
        await new Promise((resolve) => setTimeout(resolve, 40));
        if (forwarded) {
          throw new Error("reload reached a worker before readiness");
        }
        process.stdout.write("supervisor-bootstrap-alive\n");
      }
      return { path: undefined };
    },
  });
  await replaceModule("../../dist/proxy/otelLogSink.js", {
    initializeProxyOtelLogs: () => {},
    routeProxyConsoleToOtel: () => {},
  });
  await replaceModule("../../dist/proxy/rollingProxyServer.js", {
    startRollingProxyServer: async () => ({
      address: { port: 0 },
      snapshot: () => ({ active: { pid: fixtureWorkerPid } }),
    }),
  });
  const signalSelf = process.kill.bind(process);
  let forwarded = false;
  process.kill = (pid, signal) => {
    if (pid === fixtureWorkerPid && signal === "SIGHUP") {
      forwarded = true;
      process.stdout.write("startup-worker-reloaded\n");
      return true;
    }
    if (pid === process.pid) {
      return signalSelf(pid, signal);
    }
    throw new Error("fixture refused a signal outside its own process");
  };
  await replaceModule("../../dist/proxy/restartControl.js", {
    startProxyRestartControl: async () => {
      process.stdout.write("restart-control-starting\n");
      process.kill(process.pid, "SIGHUP");
      await new Promise((resolve) => setTimeout(resolve, 40));
      if (forwarded) {
        process.stdout.write("supervisor-startup-alive\n");
      }
      process.exit(forwarded ? 0 : 2);
    },
  });
  const { proxyStartCommand } =
    await import("../../dist/cli/commands/proxy.js");
  // Node 22 keeps refreshing its native ppid value; an accessor overrides it.
  Object.defineProperty(process, "platform", { get: () => "darwin" });
  Object.defineProperty(process, "ppid", { get: () => 1 });
  if (process.platform !== "darwin" || process.ppid !== 1) {
    throw new Error("fixture refused startup outside its simulated supervisor");
  }
  await proxyStartCommand.handler({ quiet: true, host: "127.0.0.1", port: 0 });
} else if (mode === "owner" || mode === "owner-error") {
  registerCliShutdownOwner(async () => {
    process.stdout.write("draining\n");
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (mode === "owner-error") {
      throw new Error("fixture drain failure");
    }
    process.stdout.write("drained\n");
    process.exit(0);
  });
  process.kill(process.pid, "SIGTERM");
  setTimeout(() => process.kill(process.pid, "SIGINT"), 20);
} else if (mode === "reload") {
  const { registerProxySupervisorReload } =
    await import("../../dist/cli/commands/proxy.js");
  const child = spawn(
    process.execPath,
    [
      "-e",
      `
    process.on('SIGHUP', () => process.stdout.write('reloaded\\n'));
    setInterval(() => {}, 1000);
    process.stdout.write('ready\\n');
  `,
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  let activePid;
  const dispose = registerProxySupervisorReload(() => activePid);
  const deadline = setTimeout(() => {
    child.kill();
    process.exit(2);
  }, 5000);
  child.stdout.on("data", (data) => {
    if (String(data).includes("ready")) {
      activePid = child.pid;
      process.kill(process.pid, "SIGHUP");
    }
    if (String(data).includes("reloaded")) {
      process.stdout.write("worker-reloaded\n");
      activePid = undefined;
      process.kill(process.pid, "SIGHUP");
      setTimeout(() => {
        process.stdout.write("supervisor-alive\n");
        dispose();
        child.kill();
        clearTimeout(deadline);
      }, 20);
    }
  });
} else if (mode === "before-exit-timeout") {
  // Let beforeExit initiate cleanup, which then creates a referenced handle.
} else if (mode === "normal" || mode.startsWith("normal-timeout")) {
  if (mode === "normal-timeout-error") {
    process.exitCode = 7;
  }
  await Promise.all([cleanupCliLifecycle(), cleanupCliLifecycle()]);
} else {
  process.kill(process.pid, "SIGTERM");
  setTimeout(() => process.kill(process.pid, "SIGINT"), 10);
}
