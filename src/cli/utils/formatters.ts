/**
 * Shared CLI formatting utilities
 *
 * Common formatting functions used across CLI command modules.
 */

import chalk from "chalk";
import type { ExporterStatus } from "../../lib/types/index.js";

/**
 * Format a table row with padding
 */
export function formatRow(label: string, value: string, width = 30): string {
  const paddedLabel = label.padEnd(width);
  return `${paddedLabel} ${value}`;
}

/**
 * Format the status rows of the registered exporters
 */
export function formatExporterLines(exporters: ExporterStatus[]): string[] {
  if (exporters.length === 0) {
    return ["  None registered"];
  }
  return exporters.flatMap((exporter) => {
    const state = !exporter.enabled
      ? "Stopped"
      : exporter.healthy
        ? "Active"
        : "Failing";
    const counts = `pending ${exporter.pendingSpans}, delivered ${exporter.deliveredSpans}, failed ${exporter.failedSpans}`;
    return [
      formatRow(`  ${exporter.name}:`, `${state} (${counts})`),
      ...(exporter.lastExportTime
        ? [formatRow("    Last export:", exporter.lastExportTime)]
        : []),
      ...(exporter.errors ?? []).map((error) => formatRow("    Error:", error)),
    ];
  });
}

/**
 * @description Labels NeuroLink's OpenTelemetry export for the status commands. Beside a host TracerProvider NeuroLink exports nothing to the endpoint, so it is shown as ignored rather than active.
 * @param otel {{ enabled: boolean; endpoint?: string; usingExternalProvider?: boolean }} - `getTelemetryStatus().openTelemetry`.
 * @param on {string} - Label for an export NeuroLink runs.
 * @param off {string} - Label for no export.
 * @returns {string} The coloured label.
 */
export function formatOtelStatus(
  otel: {
    enabled: boolean;
    endpoint?: string;
    usingExternalProvider?: boolean;
  },
  on: string,
  off: string,
): string {
  if (otel.usingExternalProvider) {
    return chalk.yellow(
      otel.endpoint
        ? "Ignored (a host TracerProvider is registered)"
        : "Host TracerProvider",
    );
  }
  return otel.enabled ? chalk.green(on) : chalk.gray(off);
}

/**
 * Format currency value
 */
export function formatCost(cost: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 4,
  }).format(cost);
}
