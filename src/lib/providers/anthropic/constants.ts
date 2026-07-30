import { trace } from "@opentelemetry/api";

export const ANTHROPIC_BETA_HEADERS = {
  "anthropic-beta": [
    "claude-code-20250219",
    "fine-grained-tool-streaming-2025-05-14",
  ].join(","),
};

export const streamTracer = trace.getTracer("neurolink.provider.anthropic");
