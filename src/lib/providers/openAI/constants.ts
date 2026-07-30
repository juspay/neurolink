import { trace } from "@opentelemetry/api";

export const streamTracer = trace.getTracer("neurolink.provider.openai");
