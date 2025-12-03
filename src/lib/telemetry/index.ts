// Optional Telemetry Infrastructure (Phase 2)
export { TelemetryService, type HealthMetrics } from "./telemetryService.js";
import { logger } from "../utils/logger.js";

/**
 * Initialize telemetry for NeuroLink
 * OPTIONAL - Only works when NEUROLINK_TELEMETRY_ENABLED=true
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
