/**
 * Analytics storage — in-memory implementation with bounded FIFO capacity.
 * Designed modularly so Redis or a database can later replace the backend.
 */

import type {
  AnalyticsStorage,
  InMemoryAnalyticsStorageOptions,
  TelemetryRecord,
} from "../types/index.js";

/** Default max records retained in memory (FIFO eviction beyond this). */
export const DEFAULT_ANALYTICS_STORAGE_MAX_RECORDS = 10_000;

/**
 * Lightweight bounded in-memory storage implementation.
 * Public surface of AnalyticsStorage is unchanged; maxRecords is optional.
 */
export class InMemoryAnalyticsStorage implements AnalyticsStorage {
  private records: TelemetryRecord[] = [];
  private readonly maxRecords: number;

  constructor(options?: InMemoryAnalyticsStorageOptions) {
    const max = options?.maxRecords ?? DEFAULT_ANALYTICS_STORAGE_MAX_RECORDS;
    this.maxRecords =
      max > 0 ? Math.floor(max) : DEFAULT_ANALYTICS_STORAGE_MAX_RECORDS;
  }

  async saveRecord(record: TelemetryRecord): Promise<void> {
    this.records.push(record);
    // Slice once when over capacity — avoids O(n²) repeated shift() on burst.
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  async getRecords(): Promise<TelemetryRecord[]> {
    return [...this.records];
  }

  async clear(): Promise<void> {
    this.records = [];
  }
}
