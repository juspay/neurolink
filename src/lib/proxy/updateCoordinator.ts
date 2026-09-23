import type {
  ProxyRuntimeActivity,
  ProxyServingWorkerIdentity,
  ProxyUpdateWindowOptions,
  ProxyUpdateWindowResult,
} from "../types/index.js";

/**
 * Parse serving identity conservatively from `/status`. A rolling status is
 * trusted only when the worker-local fields agree with the supervisor snapshot.
 */
export function parseProxyServingWorkerIdentity(
  payload: unknown,
  rollingSupervisor: boolean,
): ProxyServingWorkerIdentity | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = payload as {
    version?: unknown;
    pid?: unknown;
    autoUpdate?: {
      rolling?: {
        active?: {
          version?: unknown;
          pid?: unknown;
          generation?: unknown;
        } | null;
      } | null;
    };
  };
  if (
    typeof value.version !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(value.version) ||
    !Number.isSafeInteger(value.pid) ||
    Number(value.pid) <= 0
  ) {
    return null;
  }
  if (!rollingSupervisor) {
    return { version: value.version, pid: Number(value.pid), generation: null };
  }
  const active = value.autoUpdate?.rolling?.active;
  if (
    !active ||
    active.version !== value.version ||
    active.pid !== value.pid ||
    !Number.isSafeInteger(active.generation) ||
    Number(active.generation) <= 0
  ) {
    return null;
  }
  return {
    version: value.version,
    pid: Number(value.pid),
    generation: Number(active.generation),
  };
}

/** A long-running update may mutate live selection only for its original worker. */
export function isSameProxyServingWorker(
  expected: ProxyServingWorkerIdentity,
  current: ProxyServingWorkerIdentity | null | undefined,
): boolean {
  return (
    current?.version === expected.version &&
    current.pid === expected.pid &&
    current.generation === expected.generation
  );
}

/**
 * A replacement updater starts from the newly installed package. The registry
 * then reports no newer version even when its launchd parent still runs the
 * old package, so parent reconciliation must be decided from both live
 * generations instead of `updateAvailable` alone.
 */
export function shouldRefreshStaleSupervisor(options: {
  updateAvailable: boolean;
  rollingSupervisor: boolean;
  runningVersion: string;
  workerVersion?: string;
  supervisorVersion?: string;
}): boolean {
  return (
    !options.updateAvailable &&
    options.rollingSupervisor &&
    options.workerVersion === options.runningVersion &&
    typeof options.supervisorVersion === "string" &&
    options.supervisorVersion !== options.runningVersion
  );
}

/** An idle active worker alone does not make its supervisor safe to stop. */
export function isProxyRuntimeSettled(activity: ProxyRuntimeActivity): boolean {
  return (
    activity.activeRequests === 0 &&
    (activity.drainingWorkers ?? 0) === 0 &&
    (activity.queuedSockets ?? 0) === 0 &&
    (activity.pendingTransfers ?? 0) === 0 &&
    (activity.candidateWorkers ?? 0) === 0
  );
}

/** Parse untrusted status conservatively; incomplete rolling evidence is busy. */
export function parseProxyRuntimeActivity(
  payload: unknown,
): ProxyRuntimeActivity | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = payload as {
    activity?: Partial<ProxyRuntimeActivity>;
    autoUpdate?: {
      supervisorPid?: unknown;
      rolling?: {
        draining?: unknown;
        queuedSockets?: unknown;
        pendingTransfers?: unknown;
        candidate?: unknown;
      } | null;
    };
  };
  const active = value.activity?.activeRequests;
  if (
    typeof active !== "number" ||
    !Number.isSafeInteger(active) ||
    active < 0
  ) {
    return null;
  }
  const result: ProxyRuntimeActivity = {
    activeRequests: active,
    lastActivityAt:
      typeof value.activity?.lastActivityAt === "string"
        ? value.activity.lastActivityAt
        : null,
  };
  const rolling = value.autoUpdate?.rolling;
  if (value.autoUpdate?.supervisorPid && !rolling) {
    return null;
  }
  if (rolling) {
    if (
      !Array.isArray(rolling.draining) ||
      typeof rolling.queuedSockets !== "number" ||
      !Number.isSafeInteger(rolling.queuedSockets) ||
      rolling.queuedSockets < 0 ||
      typeof rolling.pendingTransfers !== "number" ||
      !Number.isSafeInteger(rolling.pendingTransfers) ||
      rolling.pendingTransfers < 0 ||
      rolling.candidate === undefined
    ) {
      return null;
    }
    result.drainingWorkers = rolling.draining.length;
    result.queuedSockets = rolling.queuedSockets;
    result.pendingTransfers = rolling.pendingTransfers;
    result.candidateWorkers = rolling.candidate === null ? 0 : 1;
  }
  return result;
}

function isQuiet(
  activity: ProxyRuntimeActivity,
  quietThresholdMs: number,
  nowMs: number,
): boolean {
  if (!isProxyRuntimeSettled(activity)) {
    return false;
  }
  if (!activity.lastActivityAt) {
    return true;
  }
  const lastActivityMs = Date.parse(activity.lastActivityAt);
  return (
    Number.isFinite(lastActivityMs) &&
    nowMs - lastActivityMs >= quietThresholdMs
  );
}

/**
 * Prefer a naturally quiet window, then briefly drain new inference traffic.
 * Automatic supervisor refresh uses allowBusyDrain=false: it fences admission
 * only after a quiet observation and never waits for busy workers behind it.
 * Existing requests are never interrupted; a bounded drain failure is returned
 * to the caller so admission can be reopened and retried later.
 */
export async function waitForProxyUpdateWindow(
  options: ProxyUpdateWindowOptions,
): Promise<ProxyUpdateWindowResult> {
  const now = options.now ?? Date.now;
  const wait =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const quietDeadline = now() + options.quietWaitMs;

  while (now() < quietDeadline) {
    if (options.isStopping()) {
      return { ready: false, draining: false, reason: "stopping" };
    }
    if (!options.isParentAlive()) {
      return { ready: false, draining: false, reason: "parent_stopped" };
    }
    const activity = await options.getActivity();
    if (activity && isQuiet(activity, options.quietThresholdMs, now())) {
      if (options.allowBusyDrain !== false) {
        return { ready: true, draining: false };
      }
      break;
    }
    options.onPhase?.("waiting_for_quiet", activity);
    await wait(options.pollIntervalMs);
  }

  if (options.allowBusyDrain === false) {
    if (options.isStopping()) {
      return { ready: false, draining: false, reason: "stopping" };
    }
    if (!options.isParentAlive()) {
      return { ready: false, draining: false, reason: "parent_stopped" };
    }
    const activity = await options.getActivity();
    if (!activity || !isQuiet(activity, options.quietThresholdMs, now())) {
      options.onPhase?.("waiting_for_quiet", activity);
      return { ready: false, draining: false, reason: "busy" };
    }
  }

  if (!(await options.setDraining(true))) {
    // The control response may have been lost after the parent applied it.
    // Treat state as unknown/draining so the caller always attempts resume.
    return { ready: false, draining: true, reason: "drain_failed" };
  }

  if (options.allowBusyDrain === false) {
    // The worker's idle fence closes the observation/admission race. Any new
    // cross-generation activity means resume immediately, never hold a busy
    // service behind maintenance responses for the normal drain timeout.
    const activity = await options.getActivity();
    if (activity && isProxyRuntimeSettled(activity)) {
      return { ready: true, draining: true };
    }
    const resumed = await options.setDraining(false);
    return { ready: false, draining: !resumed, reason: "busy" };
  }

  const drainDeadline = now() + options.drainWaitMs;
  while (now() < drainDeadline) {
    if (options.isStopping()) {
      return { ready: false, draining: true, reason: "stopping" };
    }
    if (!options.isParentAlive()) {
      return { ready: false, draining: true, reason: "parent_stopped" };
    }
    const activity = await options.getActivity();
    options.onPhase?.("draining", activity);
    if (activity && isProxyRuntimeSettled(activity)) {
      return { ready: true, draining: true };
    }
    await wait(options.pollIntervalMs);
  }

  const activity = await options.getActivity();
  options.onPhase?.("drain_timeout", activity);
  return { ready: false, draining: true, reason: "drain_timeout" };
}

/** An asynchronous staging job must not publish after its service owner changes. */
export function isProxyUpdateOwnerCurrent(options: {
  stopping: boolean;
  parentPid: number;
  updaterPid: number;
  parentStatus: "running" | "not_running" | "unknown";
  runtimePid?: number;
  runtimeUpdaterPid?: number;
}): boolean {
  return (
    !options.stopping &&
    options.parentStatus === "running" &&
    options.runtimePid === options.parentPid &&
    options.runtimeUpdaterPid === options.updaterPid
  );
}
