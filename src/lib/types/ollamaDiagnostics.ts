/** Native Ollama diagnostic identity, outcome and captured policy state. */
export type OllamaDiagnosticContext = Readonly<{
  /** Private resolved URL: never include it, its key, or credentials in logs. */
  url: string;
  key: string;
  model: string;
}>;

export type OllamaDiagnosticSnapshot = Readonly<{
  count: number;
  lastFailureAt: number | undefined;
  revision: number;
  generation: number;
}>;

export type OllamaDiagnosticState = {
  count: number;
  lastFailureAt: number | undefined;
  revision: number;
  generation: number;
};

export type OllamaDiagnosticPermit = Readonly<{
  kind: "allowed";
  context: OllamaDiagnosticContext;
  generation: number;
}>;

export type OllamaDiagnosticGate =
  | OllamaDiagnosticPermit
  | Readonly<{
      kind: "suppressed";
      count: number;
      reason: string;
      generation: number;
    }>;

export type OllamaDiagnosticOutcome =
  | "success"
  | "transport-failure"
  | "protocol-failure"
  | "not-run";
