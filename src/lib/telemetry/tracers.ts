import { trace } from "@opentelemetry/api";

export const tracers = {
  sdk: trace.getTracer("neurolink"),
  provider: trace.getTracer("neurolink.provider"),
  generation: trace.getTracer("neurolink.generation"),
  stream: trace.getTracer("neurolink.stream"),
  http: trace.getTracer("neurolink.http"),
  mcp: trace.getTracer("neurolink.mcp"),
  memory: trace.getTracer("neurolink.memory"),
  redis: trace.getTracer("neurolink.redis"),
  factory: trace.getTracer("neurolink.factory"),
  rag: trace.getTracer("neurolink.rag"),
  context: trace.getTracer("neurolink.context"),
  middleware: trace.getTracer("neurolink.middleware"),
  processor: trace.getTracer("neurolink.processor"),
  file: trace.getTracer("neurolink.file"),
} as const;
