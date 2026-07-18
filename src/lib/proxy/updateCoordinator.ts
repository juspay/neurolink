import type {
  ProxyRuntimeActivity,
  ProxyUpdateWindowOptions,
  ProxyUpdateWindowResult,
} from "../types/index.js";

function isQuiet(
  activity: ProxyRuntimeActivity,
  quietThresholdMs: number,
  nowMs: number,
): boolean {
  if (activity.activeRequests > 0) {
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
    if (activity?.activeRequests === 0) {
      return { ready: true, draining: true };
    }
    await wait(options.pollIntervalMs);
  }

  const activity = await options.getActivity();
  options.onPhase?.("drain_timeout", activity);
  return { ready: false, draining: true, reason: "drain_timeout" };
}
