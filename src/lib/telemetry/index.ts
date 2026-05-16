// Optional Telemetry Infrastructure (Phase 2)

export { TelemetryService } from "./telemetryService.js";
export { tracers } from "./tracers.js";

export {
  withSpan,
  withClientSpan,
  withStreamSpan,
  withClientStreamSpan,
} from "./withSpan.js";
export { ATTR } from "./attributes.js";
import { logger } from "../utils/logger.js";

/**
 * Initialize telemetry for NeuroLink
 * Reuses an existing global TracerProvider when one is already registered,
 * otherwise bootstraps Neurolink telemetry when an exporter endpoint is configured.
 */
export async function initializeTelemetry() {
  const { TelemetryService } = await import("./telemetryService.js");
  const telemetry = TelemetryService.getInstance();
  if (telemetry.isEnabled()) {
    await telemetry.initialize();
    logger.info("[NeuroLink] Telemetry initialized");
  }
  return telemetry;
}

/**
 * Get telemetry status
 */
export async function getTelemetryStatus() {
  const { TelemetryService } = await import("./telemetryService.js");
  return TelemetryService.getInstance().getStatus();
}
