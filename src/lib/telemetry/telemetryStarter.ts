import { ProxyTracerProvider, trace } from "@opentelemetry/api";

let starter: (() => void) | undefined;

/**
 * @description Registers the function that starts NeuroLink's tracing. The shared tracers call it through `startTelemetry`, so they depend on this module and on `@opentelemetry/api` only, and the OpenTelemetry SDK loads with the entries that register a starter.
 * @param start {() => void} - Starts tracing once per process; safe to call repeatedly.
 * @returns {void} Nothing.
 */
export function registerTelemetryStarter(start: () => void): void {
  starter = start;
}

/**
 * @description Starts NeuroLink's tracing through the registered starter. Without one nothing starts and spans go to whatever provider the host registered.
 * @returns {void} Nothing.
 */
export function startTelemetry(): void {
  starter?.();
}

/**
 * @description Reports whether a TracerProvider other than the API's placeholder is registered globally, whoever registered it.
 * @returns {boolean} `true` when spans reach a real provider.
 */
export function hasHostTracerProvider(): boolean {
  const global = trace.getTracerProvider();
  if (!(global instanceof ProxyTracerProvider)) {
    return true;
  }
  return global.getDelegateTracer("ai") !== undefined;
}
