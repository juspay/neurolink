import type { RollingProxyServer } from "./proxy.js";
import type { ProxySupervisorState } from "./cli.js";

/** Supervisor state with the optional local restart capability. */
export type ProxyRestartSupervisorState = ProxySupervisorState & {
  restartControl?: ProxyRestartControlIdentity;
};

export type ProxyRestartArgs = {
  check: boolean;
  dev: boolean;
  format: "text" | "json";
};

/** Local supervisor control identity; contains no account credentials. */
export type ProxyRestartControlIdentity = {
  protocol: 1;
  socketPath: string;
  instanceId: string;
};

/** Terminal result of a local restart check or worker activation. */
export type ProxyRestartResult = {
  ok: boolean;
  phase:
    | "checked"
    | "refused"
    | "failed"
    | "activated"
    | "activated_unverified";
  message: string;
  supervisorPid: number;
  previousWorkerPid?: number;
  workerPid?: number;
  version?: string;
  drainingWorkers: number;
  /** Observed during handoff/verification; does not attribute the cause. */
  rejectedSocketsDelta?: number;
  failedTransfersDelta?: number;
};

/** CLI failure before a supervisor result can be authenticated or received. */
export type CliProxyRestartError = {
  ok: false;
  phase: "unverified";
  message: string;
};

/** JSON emitted by the restart CLI, including an unknown control outcome. */
export type CliProxyRestartOutput = ProxyRestartResult | CliProxyRestartError;

/** Supervisor-owned restart dependencies, injectable for isolated process tests. */
export type ProxyRestartControlOptions = {
  stateDir: string;
  server: RollingProxyServer;
  getInstalledVersion: () => Promise<string | undefined>;
  isUpdatePending: () => boolean;
  getStatus: () => Promise<unknown>;
  /** Report control-server errors without stopping the serving listener. */
  log?: (message: string) => void;
};
