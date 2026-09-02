import type {
  ProxyProviderTransportPermit,
  ProxyProviderTransportProbeOutcome,
} from "../types/index.js";
import { TimeoutError, withTimeout } from "../utils/async/withTimeout.js";

const SHARED_TRANSPORT_BACKOFF_MS = 250;
const RECOVERY_PROBE_WAIT_TIMEOUT_MS = 30_000;

export class ProviderTransportCoordinator {
  private generation = 0;
  private degraded = false;
  private backoffUntil = 0;
  private lastErrorCode: string | null = null;
  private lastTransportScope:
    | "shared_provider_transport"
    | "connection_transport" = "shared_provider_transport";
  /** Whether the failure that degraded the transport happened before any
   *  request byte was sent. Waiters use it to pick their retry budget. */
  private lastFailureConnectPhase = false;
  private probe:
    | {
        generation: number;
        promise: Promise<ProxyProviderTransportProbeOutcome>;
        resolve: (outcome: ProxyProviderTransportProbeOutcome) => void;
      }
    | undefined;

  async acquire(signal?: AbortSignal): Promise<ProxyProviderTransportPermit> {
    if (!this.degraded) {
      return { allowed: true, probe: false, generation: this.generation };
    }

    const waitMs = Math.max(0, this.backoffUntil - Date.now());
    if (waitMs > 0) {
      await this.wait(waitMs, signal);
    }
    if (!this.degraded) {
      return { allowed: true, probe: false, generation: this.generation };
    }
    if (this.probe) {
      const outcome = await this.waitForProbe(this.probe.promise, signal);
      if (outcome === "recovered") {
        return { allowed: true, probe: false, generation: this.generation };
      }
      if (outcome === "abandoned") {
        return this.acquire(signal);
      }
      return {
        allowed: false,
        errorCode: this.lastErrorCode,
        transportScope: this.lastTransportScope,
        connectPhase: this.lastFailureConnectPhase,
      };
    }

    let resolveProbe!: (outcome: ProxyProviderTransportProbeOutcome) => void;
    const promise = new Promise<ProxyProviderTransportProbeOutcome>(
      (resolve) => {
        resolveProbe = resolve;
      },
    );
    this.probe = {
      generation: this.generation,
      promise,
      resolve: resolveProbe,
    };
    return { allowed: true, probe: true, generation: this.generation };
  }

  reportSuccess(permit: ProxyProviderTransportPermit): void {
    if (!permit.allowed || permit.generation !== this.generation) {
      return;
    }
    if (permit.probe && this.probe?.generation !== permit.generation) {
      return;
    }
    this.degraded = false;
    this.backoffUntil = 0;
    this.lastErrorCode = null;
    this.lastTransportScope = "shared_provider_transport";
    this.lastFailureConnectPhase = false;
    if (permit.probe && this.probe?.generation === permit.generation) {
      this.probe.resolve("recovered");
      this.probe = undefined;
    }
  }

  reportTransportFailure(
    errorCode: string | undefined,
    transportScope: "shared_provider_transport" | "connection_transport",
    permit: ProxyProviderTransportPermit,
    connectPhase = false,
  ): void {
    if (!permit.allowed || permit.generation !== this.generation) {
      return;
    }
    if (permit.probe && this.probe?.generation !== permit.generation) {
      return;
    }
    this.degraded = true;
    this.backoffUntil = Date.now() + SHARED_TRANSPORT_BACKOFF_MS;
    this.lastErrorCode = errorCode ?? null;
    this.lastTransportScope = transportScope;
    this.lastFailureConnectPhase = connectPhase;
    if (permit.probe && this.probe?.generation === permit.generation) {
      this.probe.resolve("failed");
      this.probe = undefined;
    }
    this.generation += 1;
  }

  reportProbeAbandoned(permit: ProxyProviderTransportPermit): void {
    if (
      !permit.allowed ||
      !permit.probe ||
      permit.generation !== this.generation ||
      this.probe?.generation !== permit.generation
    ) {
      return;
    }
    this.probe.resolve("abandoned");
    this.probe = undefined;
    this.generation += 1;
  }

  clear(): void {
    this.probe?.resolve("failed");
    this.probe = undefined;
    this.generation += 1;
    this.degraded = false;
    this.backoffUntil = 0;
    this.lastErrorCode = null;
    this.lastTransportScope = "shared_provider_transport";
    this.lastFailureConnectPhase = false;
  }

  private async wait(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw signal.reason;
    }
    await new Promise<void>((resolve, reject) => {
      const timeoutRef: { current?: ReturnType<typeof setTimeout> } = {};
      const onAbort = (): void => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        reject(signal?.reason);
      };
      timeoutRef.current = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      timeoutRef.current.unref?.();
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  private async waitForProbe(
    probe: Promise<ProxyProviderTransportProbeOutcome>,
    signal?: AbortSignal,
  ): Promise<ProxyProviderTransportProbeOutcome> {
    const boundedProbe = withTimeout(
      probe,
      RECOVERY_PROBE_WAIT_TIMEOUT_MS,
      "Anthropic transport recovery probe timed out",
    );
    try {
      return await this.waitForProbeOrAbort(boundedProbe, signal);
    } catch (error) {
      if (error instanceof TimeoutError && this.probe?.promise === probe) {
        this.probe.resolve("failed");
        this.probe = undefined;
        this.generation += 1;
        this.backoffUntil = Date.now() + SHARED_TRANSPORT_BACKOFF_MS;
        return "failed";
      }
      throw error;
    }
  }

  private waitForProbeOrAbort(
    probe: Promise<ProxyProviderTransportProbeOutcome>,
    signal?: AbortSignal,
  ): Promise<ProxyProviderTransportProbeOutcome> {
    if (!signal) {
      return probe;
    }
    if (signal.aborted) {
      throw signal.reason;
    }
    return new Promise<ProxyProviderTransportProbeOutcome>(
      (resolve, reject) => {
        const onAbort = (): void => reject(signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        probe.then(
          (result) => {
            signal.removeEventListener("abort", onAbort);
            resolve(result);
          },
          (error: unknown) => {
            signal.removeEventListener("abort", onAbort);
            reject(error);
          },
        );
      },
    );
  }
}
