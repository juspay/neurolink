/** Isolated IPC peer for deterministic cross-generation token budget tests. */
import {
  reserveProxyTokenBudget,
  getProxyTokenBudgetError,
} from "../../src/lib/proxy/proxyTokenBudget.js";
import type {
  ProxyTokenBudgetLease,
  ProxyTokenBudgetReservation,
} from "../../src/lib/types/index.js";
const leases = new Map<string, ProxyTokenBudgetLease>();
process.on("message", async (value: unknown) => {
  if (!value || typeof value !== "object") {
    return;
  }
  const request = value as {
    type?: string;
    id: string;
    reservation: ProxyTokenBudgetReservation;
    key?: string;
    actual?: number;
  };
  if (!request.type?.startsWith("test:")) {
    return;
  }
  try {
    if (request.type === "test:reserve") {
      const lease = await reserveProxyTokenBudget(request.reservation);
      leases.set(request.id, lease);
      process.send?.({
        type: "test:result",
        id: request.id,
        ok: true,
        snapshot: lease.snapshot,
      });
    } else if (request.type === "test:settle") {
      await leases.get(request.key!)!.settle(request.actual);
      process.send?.({ type: "test:result", id: request.id, ok: true });
    } else if (request.type === "test:cancel") {
      await leases.get(request.key!)!.cancelBeforeDispatch();
      process.send?.({ type: "test:result", id: request.id, ok: true });
    }
  } catch (error) {
    process.send?.({
      type: "test:result",
      id: request.id,
      ok: false,
      error: getProxyTokenBudgetError(error),
    });
  }
});
process.send?.({ type: "test:ready" });
