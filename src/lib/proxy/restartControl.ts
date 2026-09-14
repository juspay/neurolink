import { createServer, request } from "node:http";
import { chmod, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  ProxyRestartControlIdentity,
  ProxyRestartControlOptions,
  ProxyRestartResult,
} from "../types/index.js";

const statusSchema = z.object({
  pid: z.number().int().positive(),
  version: z.string(),
  health: z.object({
    ready: z.literal(true),
    acceptingConnections: z.literal(true),
    drainingForUpdate: z.literal(false),
  }),
  observability: z.object({
    requestLogs: z.object({
      diskEnabled: z.boolean(),
      otel: z.object({ initialized: z.boolean() }),
    }),
  }),
});

const resultSchema = z.object({
  ok: z.boolean(),
  phase: z.enum([
    "checked",
    "refused",
    "failed",
    "activated",
    "activated_unverified",
  ]),
  message: z.string(),
  supervisorPid: z.number().int().positive(),
  previousWorkerPid: z.number().int().positive().optional(),
  workerPid: z.number().int().positive().optional(),
  version: z.string().optional(),
  drainingWorkers: z.number().int().nonnegative(),
  rejectedSocketsDelta: z.number().int().optional(),
  failedTransfersDelta: z.number().int().optional(),
});

/**
 * Own restart completion in the supervisor, so a disconnected CLI cannot leave
 * admission closed. The control socket is private to the service's OS user.
 * No update history, launcher, environment file or launchd unit is rewritten.
 */
export async function startProxyRestartControl(
  options: ProxyRestartControlOptions,
): Promise<{
  identity: ProxyRestartControlIdentity;
  close: () => Promise<void>;
}> {
  const instanceId = randomUUID();
  const socketPath = join(
    options.stateDir,
    `restart-${process.pid}-${instanceId}.sock`,
  );
  await mkdir(options.stateDir, { recursive: true, mode: 0o700 });
  // Never unlink an existing path: an unexpected owner must make setup fail.
  let busy = false;
  let closing = false;
  const result = (
    phase: ProxyRestartResult["phase"],
    message: string,
  ): ProxyRestartResult => {
    const snapshot = options.server.snapshot();
    return {
      ok: phase === "checked" || phase === "activated",
      phase,
      message,
      supervisorPid: process.pid,
      workerPid: snapshot.active?.pid,
      version: snapshot.active?.version,
      drainingWorkers: snapshot.draining.length,
    };
  };
  const assertIdle = (): void => {
    const snapshot = options.server.snapshot();
    if (closing || !snapshot.active) {
      throw new Error("No serving worker is available for a rolling restart.");
    }
    if (snapshot.candidate || options.isUpdatePending()) {
      throw new Error(
        "An update or worker replacement is already in progress.",
      );
    }
    if (snapshot.draining.length) {
      throw new Error(
        "A previous worker is still finishing requests; another restart is deferred.",
      );
    }
  };
  const operate = async (restart: boolean): Promise<ProxyRestartResult> => {
    if (busy || closing) {
      return result(
        "refused",
        "A restart check or activation is already in progress.",
      );
    }
    busy = true;
    let activated = false;
    let previousWorkerPid: number | undefined;
    let handoffBaseline: ReturnType<typeof options.server.snapshot> | undefined;
    const transferDeltas = (): Pick<
      ProxyRestartResult,
      "rejectedSocketsDelta" | "failedTransfersDelta"
    > => {
      if (!handoffBaseline) {
        return {};
      }
      const latest = options.server.snapshot();
      return {
        rejectedSocketsDelta:
          latest.rejectedSockets - handoffBaseline.rejectedSockets,
        failedTransfersDelta:
          latest.failedTransfers - handoffBaseline.failedTransfers,
      };
    };
    try {
      assertIdle();
      const before = options.server.snapshot();
      const active = before.active;
      if (!active) {
        throw new Error("The serving worker exited during preflight.");
      }
      previousWorkerPid = active.pid;
      const status = statusSchema.parse(await options.getStatus());
      if (
        status.pid !== previousWorkerPid ||
        status.version !== active.version
      ) {
        throw new Error(
          "Serving worker identity changed during preflight; retry the check.",
        );
      }
      const version = await options.getInstalledVersion();
      if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(
          "The configured worker executable did not report a valid installed version.",
        );
      }
      assertIdle();
      if (options.server.snapshot().active?.pid !== previousWorkerPid) {
        throw new Error(
          "Serving worker changed during preflight; retry the check.",
        );
      }
      if (!restart) {
        return {
          ...result(
            "checked",
            "Rolling restart is available. Service settings and existing streams will be preserved.",
          ),
          version,
        };
      }

      // The existing supervisor imposes a 120-second candidate readiness
      // deadline and retains the serving worker when startup/activation fails.
      // It switches new sockets before draining the previous generation.
      handoffBaseline = options.server.snapshot();
      const after = await options.server.replace(version);
      activated = true;
      const fresh = statusSchema.parse(await options.getStatus());
      if (
        fresh.pid !== after.active?.pid ||
        fresh.pid === previousWorkerPid ||
        fresh.version !== version
      ) {
        throw new Error(
          "The replacement's serving identity could not be verified.",
        );
      }
      const beforeLogs = status.observability.requestLogs;
      const afterLogs = fresh.observability.requestLogs;
      // Preserve the selected sink in both directions. Unexpected disk writes
      // regress OTel-only deployments; disabling an existing disk sink loses
      // requested logs. Restart must not silently make either policy change.
      if (
        beforeLogs.diskEnabled !== afterLogs.diskEnabled ||
        (beforeLogs.otel.initialized && !afterLogs.otel.initialized)
      ) {
        throw new Error(
          "The replacement's logging state regressed; inspect telemetry before further changes.",
        );
      }
      const latest = options.server.snapshot();
      const deltas = transferDeltas();
      // These are observed failures, not attribution to the restart. A ready
      // worker can coexist with a handoff whose no-loss claim is unverified.
      if (
        latest.active?.pid !== fresh.pid ||
        deltas.rejectedSocketsDelta !== 0 ||
        deltas.failedTransfersDelta !== 0
      ) {
        throw new Error(
          "Worker identity or socket transfer counters changed during verification.",
        );
      }
      return {
        ...result(
          "activated",
          "Replacement is serving and accepting requests. Previous streams finish on their original worker.",
        ),
        previousWorkerPid,
        ...deltas,
      };
    } catch (error) {
      // Schema errors contain paths only; never echo the status payload or env.
      const message =
        error instanceof z.ZodError
          ? "Readiness, admission or logging status could not be verified."
          : error instanceof Error
            ? error.message
            : "Restart verification failed.";
      return {
        ...result(activated ? "activated_unverified" : "failed", message),
        previousWorkerPid,
        ...transferDeltas(),
      };
    } finally {
      busy = false;
    }
  };
  const control = createServer((req, res) => {
    // The instance nonce prevents a stale client from acting on a reused path.
    if (closing || req.headers["x-neurolink-instance"] !== instanceId) {
      res.writeHead(409).end();
      return;
    }
    if (
      req.headers["transfer-encoding"] ||
      (req.headers["content-length"] && req.headers["content-length"] !== "0")
    ) {
      res.writeHead(400, { connection: "close" }).end();
      return;
    }
    if (
      !(
        (req.method === "GET" && req.url === "/check") ||
        (req.method === "POST" && req.url === "/restart")
      )
    ) {
      res.writeHead(404).end();
      return;
    }
    req.resume();
    void operate(req.method === "POST")
      .then((outcome) => {
        if (res.destroyed || res.writableEnded) {
          return;
        }
        res.writeHead(outcome.ok ? 200 : 409, {
          "content-type": "application/json",
          connection: "close",
        });
        res.end(JSON.stringify(outcome));
      })
      .catch(() => {
        if (res.destroyed || res.writableEnded) {
          return;
        }
        res.writeHead(500).end();
      });
  });
  control.headersTimeout = 5_000;
  control.requestTimeout = 5_000;
  control.maxHeadersCount = 10;
  control.maxConnections = 16;
  await new Promise<void>((resolve, reject) => {
    control.once("error", reject);
    control.listen(socketPath, () => {
      control.off("error", reject);
      // Keep handling errors after binding: a control-plane accept failure
      // must not become an unhandled event that stops the serving listener.
      control.on("error", (error: Error) => {
        options.log?.(
          `[proxy-supervisor] safe restart control error: ${error.message}`,
        );
      });
      resolve();
    });
  });
  try {
    await chmod(socketPath, 0o600);
  } catch (error) {
    control.close();
    throw error;
  }
  return {
    identity: { protocol: 1, socketPath, instanceId },
    close: async () => {
      closing = true;
      control.closeAllConnections();
      await new Promise<void>((resolve) => control.close(() => resolve()));
      await rm(socketPath, { force: true });
    },
  };
}

/** Perform one local control operation; never fall back to killing a process. */
export async function requestProxyRestart(
  identity: ProxyRestartControlIdentity,
  check: boolean,
): Promise<ProxyRestartResult> {
  return new Promise((resolve, reject) => {
    const req = request({
      socketPath: identity.socketPath,
      path: check ? "/check" : "/restart",
      method: check ? "GET" : "POST",
      headers: {
        "x-neurolink-instance": identity.instanceId,
        connection: "close",
      },
    });
    const timeout = setTimeout(
      () =>
        req.destroy(
          new Error(
            "Restart result timed out; outcome is unknown. Inspect proxy status before retrying.",
          ),
        ),
      check ? 15_000 : 150_000,
    );
    req.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    req.once("response", (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
        if (body.length > 65_536) {
          req.destroy(new Error("Invalid restart control response."));
        }
      });
      res.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      res.once("end", () => {
        clearTimeout(timeout);
        try {
          resolve(resultSchema.parse(JSON.parse(body)));
        } catch {
          reject(
            new Error(
              "Restart control did not return a verified result; no service restart fallback was attempted.",
            ),
          );
        }
      });
    });
    req.end();
  });
}
