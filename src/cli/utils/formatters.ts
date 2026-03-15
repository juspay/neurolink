/**
 * Shared CLI formatting utilities
 *
 * Common formatting functions used across CLI command modules.
 */

/**
 * Format a table row with padding
 */
export function formatRow(label: string, value: string, width = 30): string {
  const paddedLabel = label.padEnd(width);
  return `${paddedLabel} ${value}`;
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
