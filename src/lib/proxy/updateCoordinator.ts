import type {
  ProxyRuntimeActivity,
  ProxyUpdateWindowOptions,
  ProxyUpdateWindowResult,
} from "../types/index.js";

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
      return { ready: true, draining: false };
    }
    options.onPhase?.("waiting_for_quiet", activity);
    await wait(options.pollIntervalMs);
  }

  if (!(await options.setDraining(true))) {
    // The control response may have been lost after the parent applied it.
    // Treat state as unknown/draining so the caller always attempts resume.
    return { ready: false, draining: true, reason: "drain_failed" };
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
