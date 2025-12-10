// Optional Telemetry Infrastructure (Phase 2)
export { TelemetryService, type HealthMetrics } from "./telemetryService.js";

// Generic processor telemetry (recommended for all processors)
export {
  ProcessorTelemetry,
  ProcessorTelemetryRegistry,
  type ProcessingMetrics,
  type ProcessingStats,
} from "./processorTelemetry.js";

// Legacy image-specific telemetry (deprecated - use ProcessorTelemetry instead)
// @deprecated Use ProcessorTelemetryRegistry.getInstance('image') instead
export {
  ImageProcessingTelemetry,
  type ImageOperation,
  type ImageProcessingMetrics,
  type ImageProcessingStats,
} from "./imageProcessingTelemetry.js";

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
