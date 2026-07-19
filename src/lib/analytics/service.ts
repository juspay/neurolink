/**
 * Advanced Analytics Service Layer
 * Handles metrics collection, aggregation, cost analysis, and projections.
 */

import { calculateAdvancedCost } from "./pricing.js";
import { InMemoryAnalyticsStorage } from "./storage.js";
import type {
  AnalyticsStorage,
  CostAnalysisOptions,
  CostAnalysisResult,
  CostGroupItem,
  ProviderMetricItem,
  ProviderMetricsOptions,
  ProviderMetricsResult,
  TeamAnalyticsOptions,
  TeamAnalyticsResult,
  TelemetryRecord,
} from "../types/index.js";

export class AnalyticsService {
  private storage: AnalyticsStorage;

  constructor(storage?: AnalyticsStorage) {
    this.storage = storage || new InMemoryAnalyticsStorage();
  }

  /**
   * Helper to parse dynamic time range formats safely
   */
  private parseTimeRange(
    timeRange: unknown,
  ): { start: number; end: number } | null {
    if (!timeRange) {
      return null;
    }

    if (
      typeof timeRange === "object" &&
      "start" in timeRange &&
      "end" in timeRange
    ) {
      const startObj = (timeRange as { start: unknown }).start;
      const endObj = (timeRange as { end: unknown }).end;
      const start =
        startObj instanceof Date
          ? startObj.getTime()
          : new Date(startObj as string | number).getTime();
      const end =
        endObj instanceof Date
          ? endObj.getTime()
          : new Date(endObj as string | number).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        return { start, end };
      }
    }

    if (typeof timeRange === "string") {
      const now = Date.now();
      const dayMs = 24 * 3600 * 1000;
      if (timeRange === "last_24_hours") {
        return { start: now - dayMs, end: now };
      }
      if (timeRange === "last_7_days") {
        return { start: now - 7 * dayMs, end: now };
      }
      if (timeRange === "last_30_days") {
        return { start: now - 30 * dayMs, end: now };
      }
      // Month/quarter bounds use UTC midnight for timezone-stable windows
      if (timeRange === "current_month") {
        const d = new Date();
        const startUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
        return { start: startUtc, end: now };
      }
      if (timeRange === "current_quarter") {
        const d = new Date();
        const qMonth = Math.floor(d.getUTCMonth() / 3) * 3;
        const startUtc = Date.UTC(d.getUTCFullYear(), qMonth, 1);
        return { start: startUtc, end: now };
      }
    }

    return null;
  }

  /**
   * Capture a request lifecycle record
   */
  async trackRequest(
    record: Omit<TelemetryRecord, "id" | "cost"> & { cost?: number },
  ): Promise<void> {
    // Preserve explicit costs (including 0). Only price when cost is omitted.
    const cost =
      record.cost !== undefined
        ? record.cost
        : calculateAdvancedCost(
            record.model,
            record.inputTokens,
            record.outputTokens,
            record.provider,
          );

    const fullRecord: TelemetryRecord = {
      ...record,
      id: crypto.randomUUID(),
      cost,
    };

    await this.storage.saveRecord(fullRecord);
  }

  /**
   * getProviderMetrics implementation
   */
  async getProviderMetrics(
    options: ProviderMetricsOptions = {},
  ): Promise<ProviderMetricsResult> {
    const allRecords = await this.storage.getRecords();
    const range = this.parseTimeRange(options.timeRange);

    // Filter records
    const records = allRecords.filter((r) => {
      if (range && (r.timestamp < range.start || r.timestamp > range.end)) {
        return false;
      }
      if (options.providers && options.providers.length > 0) {
        if (!options.providers.includes(r.provider)) {
          return false;
        }
      }
      return true;
    });

    // Compute top-level aggregated metrics
    let totalLatency = 0;
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let errors = 0;
    let totalCost = 0;
    const requestCount = records.length;

    // Group by provider
    const providerMap: Record<string, TelemetryRecord[]> = {};

    for (const r of records) {
      totalLatency += r.latency;
      totalTokens += r.totalTokens;
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;
      if (r.isError) {
        errors++;
      }
      totalCost += r.cost;

      if (!providerMap[r.provider]) {
        providerMap[r.provider] = [];
      }
      providerMap[r.provider].push(r);
    }

    const averageLatency = requestCount > 0 ? totalLatency / requestCount : 0;
    const errorRate = requestCount > 0 ? errors / requestCount : 0;
    // Empty datasets must not report a fabricated 100% success rate
    const successRate = requestCount > 0 ? 1 - errorRate : 0;
    const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

    // Build per-provider results
    const providers: ProviderMetricItem[] = [];
    for (const [name, pRecords] of Object.entries(providerMap)) {
      const pCount = pRecords.length;
      let pLatency = 0;
      let pTotalTokens = 0;
      let pInputTokens = 0;
      let pOutputTokens = 0;
      let pErrors = 0;
      let pCost = 0;

      for (const r of pRecords) {
        pLatency += r.latency;
        pTotalTokens += r.totalTokens;
        pInputTokens += r.inputTokens;
        pOutputTokens += r.outputTokens;
        if (r.isError) {
          pErrors++;
        }
        pCost += r.cost;
      }

      const pAvgLatency = pCount > 0 ? pLatency / pCount : 0;
      const pErrorRate = pCount > 0 ? pErrors / pCount : 0;
      const pSuccessRate = 1 - pErrorRate;
      const pCostPerToken = pTotalTokens > 0 ? pCost / pTotalTokens : 0;

      providers.push({
        name,
        averageLatency: pAvgLatency,
        averageResponseTime: pAvgLatency, // docs compatibility
        totalTokens: pTotalTokens,
        inputTokens: pInputTokens,
        outputTokens: pOutputTokens,
        errorRate: pErrorRate,
        successRate: pSuccessRate,
        costPerToken: pCostPerToken,
        totalCost: pCost,
        requestCount: pCount,
      });
    }

    return {
      averageLatency,
      averageResponseTime: averageLatency,
      totalTokens,
      inputTokens,
      outputTokens,
      errorRate,
      successRate,
      costPerToken,
      totalCost,
      requestCount,
      providers,
    };
  }

  /**
   * Helper to format timestamps for date groupings.
   * Clones the Date so week arithmetic never mutates the caller's value.
   */
  private formatGroupDate(
    timestamp: number,
    type: "day" | "week" | "month",
  ): string {
    const d = new Date(timestamp);
    if (type === "day") {
      return d.toISOString().split("T")[0];
    }
    if (type === "month") {
      return d.toISOString().substring(0, 7);
    }
    if (type === "week") {
      // UTC Monday of the containing ISO week — never mutate caller input
      // and avoid local/UTC drift from mixing getDay()/toISOString().
      const clone = new Date(timestamp);
      const day = clone.getUTCDay();
      const diff = clone.getUTCDate() - day + (day === 0 ? -6 : 1);
      clone.setUTCDate(diff);
      return clone.toISOString().split("T")[0];
    }
    return d.toISOString().split("T")[0];
  }

  /**
   * getCostAnalysis implementation
   */
  async getCostAnalysis(
    options: CostAnalysisOptions = {},
  ): Promise<CostAnalysisResult> {
    const allRecords = await this.storage.getRecords();
    const range = this.parseTimeRange(options.timeRange);

    const records = allRecords.filter((r) => {
      if (range && (r.timestamp < range.start || r.timestamp > range.end)) {
        return false;
      }
      return true;
    });

    let totalCost = 0;
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const requestCount = records.length;

    const groups: Record<string, CostGroupItem> = {};
    const providerGroupsMap: Record<string, CostGroupItem> = {};

    const groupByArr: string[] = Array.isArray(options.groupBy)
      ? options.groupBy
      : typeof options.groupBy === "string"
        ? [options.groupBy]
        : ["provider"];

    for (const r of records) {
      totalCost += r.cost;
      totalTokens += r.totalTokens;
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;

      // Ensure per-provider items are always built for documentation support
      if (!providerGroupsMap[r.provider]) {
        providerGroupsMap[r.provider] = {
          groupKey: r.provider,
          provider: r.provider,
          totalCost: 0,
          costPerToken: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          requestCount: 0,
        };
      }
      const pg = providerGroupsMap[r.provider];
      pg.totalCost += r.cost;
      pg.inputTokens += r.inputTokens;
      pg.outputTokens += r.outputTokens;
      pg.totalTokens += r.totalTokens;
      pg.requestCount += 1;
      pg.costPerToken = pg.totalTokens > 0 ? pg.totalCost / pg.totalTokens : 0;

      // Build specific requested group key
      const keyParts: string[] = [];
      for (const g of groupByArr) {
        if (g === "provider") {
          keyParts.push(r.provider);
        } else if (g === "model") {
          keyParts.push(r.model);
        } else if (g === "user_id" || g === "userId") {
          keyParts.push(r.userId || "unknown");
        } else if (g === "day" || g === "week" || g === "month") {
          keyParts.push(this.formatGroupDate(r.timestamp, g));
        } else {
          keyParts.push(r.provider);
        }
      }

      const groupKey = keyParts.join("#") || r.provider;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey,
          provider: r.provider,
          model: r.model,
          userId: r.userId,
          totalCost: 0,
          costPerToken: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          requestCount: 0,
        };
      }
      const gItem = groups[groupKey];
      gItem.totalCost += r.cost;
      gItem.inputTokens += r.inputTokens;
      gItem.outputTokens += r.outputTokens;
      gItem.totalTokens += r.totalTokens;
      gItem.requestCount += 1;
      gItem.costPerToken =
        gItem.totalTokens > 0 ? gItem.totalCost / gItem.totalTokens : 0;
    }

    const providers = Object.values(providerGroupsMap);

    // Optional future projections using simple average-based estimation
    let projections: { nextMonth: number; nextQuarter: number } | undefined;

    if (options.includeProjections) {
      if (records.length === 0) {
        projections = { nextMonth: 0, nextQuarter: 0 };
      } else {
        // Find span of records in days
        const timestamps = records.map((r) => r.timestamp);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const diffDays = Math.max(1, (maxTime - minTime) / (24 * 3600 * 1000));
        const dailyAverage = totalCost / diffDays;

        projections = {
          nextMonth: dailyAverage * 30,
          nextQuarter: dailyAverage * 90,
        };
      }
    }

    return {
      totalCost,
      totalTokens,
      inputTokens,
      outputTokens,
      requestCount,
      groups,
      providers,
      projections,
    };
  }

  /**
   * getTeamAnalytics implementation
   */
  async getTeamAnalytics(
    options: TeamAnalyticsOptions = {},
  ): Promise<TeamAnalyticsResult> {
    const allRecords = await this.storage.getRecords();
    const range = this.parseTimeRange(options.timeRange);

    // teamId and departments are independent AND filters (docs: both supported).
    const records = allRecords.filter((r) => {
      if (range && (r.timestamp < range.start || r.timestamp > range.end)) {
        return false;
      }
      if (options.teamId) {
        const recTeam = r.teamId || "default";
        if (recTeam !== options.teamId) {
          return false;
        }
      }
      if (options.departments && options.departments.length > 0) {
        const dept = r.department;
        if (!dept || !options.departments.includes(dept)) {
          return false;
        }
      }
      return true;
    });

    const totalRequests = records.length;
    const uniqueUsersSet = new Set<string>();
    const providersSet = new Set<string>();
    const costBreakdownByProvider: Record<string, number> = {};
    const costBreakdownByUser: Record<string, number> = {};

    let totalQualityScore = 0;
    let totalRelevance = 0;
    let totalAccuracy = 0;
    let totalCompleteness = 0;
    let scoredCount = 0;

    for (const r of records) {
      if (r.userId) {
        uniqueUsersSet.add(r.userId);
      }
      providersSet.add(r.provider);

      costBreakdownByProvider[r.provider] =
        (costBreakdownByProvider[r.provider] || 0) + r.cost;
      const uKey = r.userId || "anonymous";
      costBreakdownByUser[uKey] = (costBreakdownByUser[uKey] || 0) + r.cost;

      if (r.qualityScore) {
        scoredCount++;
        totalQualityScore += r.qualityScore.overall;
        totalRelevance += r.qualityScore.relevance;
        totalAccuracy += r.qualityScore.accuracy;
        totalCompleteness += r.qualityScore.completeness;
      }
    }

    // Omit fabricated scores when no requests were evaluated
    const qualityScores: TeamAnalyticsResult["qualityScores"] =
      scoredCount > 0
        ? {
            overall: totalQualityScore / scoredCount,
            relevance: totalRelevance / scoredCount,
            accuracy: totalAccuracy / scoredCount,
            completeness: totalCompleteness / scoredCount,
            reasoning: "Aggregated automated response evaluations",
          }
        : undefined;

    return {
      totalRequests,
      // Count only attributed users — never fabricate a user when none present
      uniqueUsers: uniqueUsersSet.size,
      providersUsed: Array.from(providersSet),
      costBreakdownByProvider,
      costBreakdownByUser,
      qualityScores,
    };
  }
}
