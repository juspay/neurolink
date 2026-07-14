import type {
  StreamTerminalOutcome,
  StreamTerminalOutcomeTracker,
} from "../types/index.js";

export function createStreamTerminalOutcomeTracker(): StreamTerminalOutcomeTracker {
  let settled = false;
  let resolveOutcome!: (outcome: StreamTerminalOutcome) => void;
  const outcome = new Promise<StreamTerminalOutcome>((resolve) => {
    resolveOutcome = resolve;
  });

  const settle = (value: StreamTerminalOutcome): void => {
    if (settled) {
      return;
    }
    settled = true;
    resolveOutcome(value);
  };

  return {
    outcome,
    complete: () => settle({ kind: "completed" }),
    fail: (message) => settle({ kind: "upstream_error", message }),
    cancel: () => settle({ kind: "client_cancelled" }),
  };
}

export function mergeStreamTerminalOutcome(
  outcome: StreamTerminalOutcome,
  sseErrorMessage?: string,
): StreamTerminalOutcome {
  if (outcome.kind === "completed" && sseErrorMessage) {
    return { kind: "upstream_error", message: sseErrorMessage };
  }
  return outcome;
}
