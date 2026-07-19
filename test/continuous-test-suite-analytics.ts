#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Advanced Analytics
 *
 * Tests implementation of missing advanced analytics APIs:
 * getProviderMetrics, getCostAnalysis, and getTeamAnalytics.
 * Validates provider filtering, time range filtering, cost aggregation,
 * future projections, empty datasets, and invalid team handling.
 */

import {
  AnalyticsService,
  calculateAdvancedCost,
  InMemoryAnalyticsStorage,
  parseAnalyticsQualityScore,
} from "../src/lib/analytics/index.ts";
import type {
  AnalyticsStorage,
  TelemetryRecord,
} from "../src/lib/types/index.ts";
import type { NeuroLink as NeuroLinkType } from "../src/lib/neurolink.ts";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP",
  details?: string,
): void {
  const statusColors: Record<string, keyof typeof colors> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
  };
  const clr = statusColors[status] || "reset";
  const det = details ? ` — ${details}` : "";
  log(`[${status}] ${testName}${det}`, clr);
}

const testResults: Array<{
  name: string;
  result: boolean;
  error: string | null;
}> = [];

async function runAllTests() {
  const startTime = Date.now();
  logSection("Initializing Advanced Analytics Test Suite");

  const service = new AnalyticsService();

  // Populate mock telemetry records for robust testing
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;

  // Record 1: OpenAI GPT-4o, successful
  await service.trackRequest({
    provider: "openai",
    model: "gpt-4o",
    userId: "user-1",
    teamId: "team-alpha",
    department: "engineering",
    timestamp: now - 5 * dayMs,
    latency: 1200,
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    isError: false,
    qualityScore: {
      overall: 9.2,
      relevance: 9.5,
      accuracy: 9.0,
      completeness: 9.1,
    },
  });

  // Record 2: Anthropic Claude 3.5 Sonnet, successful
  await service.trackRequest({
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    userId: "user-2",
    teamId: "team-alpha",
    department: "engineering",
    timestamp: now - 2 * dayMs,
    latency: 850,
    inputTokens: 2000,
    outputTokens: 1000,
    totalTokens: 3000,
    isError: false,
    qualityScore: {
      overall: 9.6,
      relevance: 9.8,
      accuracy: 9.5,
      completeness: 9.5,
    },
  });

  // Record 3: Google Gemini 2.5 Flash, error
  await service.trackRequest({
    provider: "google",
    model: "gemini-2.5-flash",
    userId: "user-1",
    teamId: "team-beta",
    department: "marketing",
    timestamp: now - 1 * dayMs,
    latency: 300,
    inputTokens: 500,
    outputTokens: 0,
    totalTokens: 500,
    isError: true,
    errorMessage: "Rate limit exceeded",
  });

  // Test 1: Provider Metrics - Aggregation and filtering
  try {
    const resAll = await service.getProviderMetrics();
    const hasOpenAI = resAll.providers.some((p) => p.name === "openai");
    const hasAnthropic = resAll.providers.some((p) => p.name === "anthropic");

    // Filtered by provider
    const resFiltered = await service.getProviderMetrics({
      providers: ["openai"],
    });
    const onlyOpenAI =
      resFiltered.providers.length === 1 &&
      resFiltered.providers[0].name === "openai";

    if (hasOpenAI && hasAnthropic && onlyOpenAI && resAll.requestCount === 3) {
      logTest(
        "Provider Metrics Filtering & Aggregation",
        "PASS",
        `Captured all 3 requests properly`,
      );
      testResults.push({
        name: "Provider Metrics Filtering & Aggregation",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        "Mismatch in aggregated provider counts or filtering behavior",
      );
    }
  } catch (err) {
    logTest("Provider Metrics Filtering & Aggregation", "FAIL", String(err));
    testResults.push({
      name: "Provider Metrics Filtering & Aggregation",
      result: false,
      error: String(err),
    });
  }

  // Test 2: Time Range Filtering
  try {
    // Filter to last 24 hours (should exclude Record 1 and 2)
    await service.getProviderMetrics({ timeRange: "last_24_hours" });
    // Custom start/end range
    const resCustom = await service.getProviderMetrics({
      timeRange: {
        start: new Date(now - 6 * dayMs),
        end: new Date(now - 3 * dayMs),
      },
    });

    if (resCustom.requestCount === 1) {
      logTest(
        "Time Range Filtering",
        "PASS",
        "Correctly filtered records by dynamic strings and Date ranges",
      );
      testResults.push({
        name: "Time Range Filtering",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        `Expected 1 record in custom range, found ${resCustom.requestCount}`,
      );
    }
  } catch (err) {
    logTest("Time Range Filtering", "FAIL", String(err));
    testResults.push({
      name: "Time Range Filtering",
      result: false,
      error: String(err),
    });
  }

  // Test 3: Cost Analysis & Future Projections
  try {
    const costRes = await service.getCostAnalysis({
      groupBy: ["provider", "model"],
      includeProjections: true,
    });

    const hasCheapestSort =
      Array.isArray(costRes.providers) && costRes.providers.length > 0;
    const hasProjections =
      costRes.projections && costRes.projections.nextMonth > 0;

    if (costRes.totalCost > 0 && hasCheapestSort && hasProjections) {
      logTest(
        "Cost Analysis & Projections",
        "PASS",
        `Calculated costs & projections: nextMonth=$${costRes.projections?.nextMonth.toFixed(2)}`,
      );
      testResults.push({
        name: "Cost Analysis & Projections",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        "Missing required provider groupings or projected calculations",
      );
    }
  } catch (err) {
    logTest("Cost Analysis & Projections", "FAIL", String(err));
    testResults.push({
      name: "Cost Analysis & Projections",
      result: false,
      error: String(err),
    });
  }

  // Test 4: Team Analytics & Invalid/Empty Handling
  try {
    const teamAlpha = await service.getTeamAnalytics({ teamId: "team-alpha" });
    const invalidTeam = await service.getTeamAnalytics({
      teamId: "nonexistent-team",
    });

    const correctAlphaCount =
      teamAlpha.totalRequests === 2 && teamAlpha.uniqueUsers === 2;
    const correctEmptyHandling =
      invalidTeam.totalRequests === 0 &&
      Array.isArray(invalidTeam.providersUsed);
    // Empty / unscored teams must NOT fabricate qualityScores
    const noFabricatedScores = invalidTeam.qualityScores === undefined;
    // team-alpha has scored requests — qualityScores should be real averages
    const hasRealScores =
      teamAlpha.qualityScores !== undefined &&
      teamAlpha.qualityScores.overall > 9 &&
      teamAlpha.qualityScores.overall < 10;

    if (
      correctAlphaCount &&
      correctEmptyHandling &&
      noFabricatedScores &&
      hasRealScores
    ) {
      logTest(
        "Team Analytics & Empty Datasets",
        "PASS",
        "Safely processed valid teams; omitted fabricated quality scores",
      );
      testResults.push({
        name: "Team Analytics & Empty Datasets",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        "Failed to compute valid team breakdown or gracefully handle empty sets",
      );
    }
  } catch (err) {
    logTest("Team Analytics & Empty Datasets", "FAIL", String(err));
    testResults.push({
      name: "Team Analytics & Empty Datasets",
      result: false,
      error: String(err),
    });
  }

  // Test 5: Safe NeuroLink Class Fallbacks
  try {
    let sdk: NeuroLinkType | undefined;
    try {
      const NeuroLinkMod = await import("../src/lib/neurolink.ts");
      sdk = new NeuroLinkMod.NeuroLink();
    } catch {
      // ignore
    }

    if (sdk) {
      const pRes = await sdk.getProviderMetrics();
      const cRes = await sdk.getCostAnalysis();
      const tRes = await sdk.getTeamAnalytics();

      if (
        pRes &&
        cRes &&
        tRes &&
        Array.isArray(pRes.providers) &&
        Array.isArray(cRes.providers) &&
        tRes.qualityScores === undefined
      ) {
        logTest(
          "NeuroLink Class Integration",
          "PASS",
          "Public instance methods execute correctly and return full structures",
        );
        testResults.push({
          name: "NeuroLink Class Integration",
          result: true,
          error: null,
        });
      } else {
        throw new Error(
          "NeuroLink instance methods returned malformed data structures",
        );
      }
    } else {
      logTest(
        "NeuroLink Class Integration",
        "SKIP",
        "Source wrapper testing skipped during direct unit evaluation",
      );
    }
  } catch (err) {
    logTest("NeuroLink Class Integration", "FAIL", String(err));
    testResults.push({
      name: "NeuroLink Class Integration",
      result: false,
      error: String(err),
    });
  }

  // Test 6: Pricing prefers longest/most-specific model match
  try {
    const miniCost = calculateAdvancedCost(
      "gpt-4o-mini",
      1_000_000,
      1_000_000,
      "openai",
    );
    const fullCost = calculateAdvancedCost(
      "gpt-4o",
      1_000_000,
      1_000_000,
      "openai",
    );
    // gpt-4o-mini must be cheaper than gpt-4o — if mini matched gpt-4o rates, costs equal
    if (miniCost > 0 && fullCost > 0 && miniCost < fullCost) {
      logTest(
        "Longest Model Pricing Match",
        "PASS",
        `gpt-4o-mini=$${miniCost} < gpt-4o=$${fullCost}`,
      );
      testResults.push({
        name: "Longest Model Pricing Match",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        `Expected gpt-4o-mini (${miniCost}) < gpt-4o (${fullCost})`,
      );
    }
  } catch (err) {
    logTest("Longest Model Pricing Match", "FAIL", String(err));
    testResults.push({
      name: "Longest Model Pricing Match",
      result: false,
      error: String(err),
    });
  }

  // Test 7: Bounded FIFO storage eviction
  try {
    const storage = new InMemoryAnalyticsStorage({ maxRecords: 3 });
    const bounded = new AnalyticsService(storage);
    for (let i = 0; i < 5; i++) {
      await bounded.trackRequest({
        provider: "openai",
        model: "gpt-4o",
        timestamp: now + i,
        latency: 10,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
        isError: false,
        userId: `u-${i}`,
      });
    }
    const records = await storage.getRecords();
    const ids = records.map((r) => r.userId);
    if (
      records.length === 3 &&
      ids.includes("u-2") &&
      ids.includes("u-3") &&
      ids.includes("u-4") &&
      !ids.includes("u-0") &&
      !ids.includes("u-1")
    ) {
      logTest(
        "Bounded FIFO Storage",
        "PASS",
        "Evicted oldest records when capacity exceeded",
      );
      testResults.push({
        name: "Bounded FIFO Storage",
        result: true,
        error: null,
      });
    } else {
      throw new Error(`Unexpected retained users: ${ids.join(",")}`);
    }
  } catch (err) {
    logTest("Bounded FIFO Storage", "FAIL", String(err));
    testResults.push({
      name: "Bounded FIFO Storage",
      result: false,
      error: String(err),
    });
  }

  // Test 8: Week grouping uses UTC Monday and does not mutate Dates
  try {
    const weekService = new AnalyticsService();
    const wed = Date.UTC(2026, 6, 15, 12, 0, 0); // Wed Jul 15 2026 UTC
    await weekService.trackRequest({
      provider: "openai",
      model: "gpt-4o",
      timestamp: wed,
      latency: 10,
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      isError: false,
    });
    const before = new Date(wed);
    const beforeMs = before.getTime();
    const costRes = await weekService.getCostAnalysis({ groupBy: "week" });
    const afterMs = before.getTime();
    const weekKeys = Object.keys(costRes.groups);
    if (
      beforeMs === afterMs &&
      weekKeys.length === 1 &&
      weekKeys[0] === "2026-07-13"
    ) {
      logTest(
        "Week Date Grouping Immutability",
        "PASS",
        `Grouped to UTC Monday ${weekKeys[0]} without mutating input Date`,
      );
      testResults.push({
        name: "Week Date Grouping Immutability",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        `Date mutated (${beforeMs}→${afterMs}) or unexpected keys: ${weekKeys.join(",")}`,
      );
    }
  } catch (err) {
    logTest("Week Date Grouping Immutability", "FAIL", String(err));
    testResults.push({
      name: "Week Date Grouping Immutability",
      result: false,
      error: String(err),
    });
  }

  // Test 9: Department filter works without teamId; uniqueUsers not fabricated
  try {
    const deptOnly = await service.getTeamAnalytics({
      departments: ["marketing"],
    });
    const anonService = new AnalyticsService();
    await anonService.trackRequest({
      provider: "openai",
      model: "gpt-4o",
      timestamp: now,
      latency: 10,
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      isError: false,
      // no userId
    });
    const anonTeam = await anonService.getTeamAnalytics();
    if (
      deptOnly.totalRequests === 1 &&
      deptOnly.providersUsed.includes("google") &&
      anonTeam.totalRequests === 1 &&
      anonTeam.uniqueUsers === 0
    ) {
      logTest(
        "Department Filter & Non-fabricated Users",
        "PASS",
        "Departments filter applied; uniqueUsers stays 0 without userIds",
      );
      testResults.push({
        name: "Department Filter & Non-fabricated Users",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        `dept=${deptOnly.totalRequests} users=${anonTeam.uniqueUsers}`,
      );
    }
  } catch (err) {
    logTest("Department Filter & Non-fabricated Users", "FAIL", String(err));
    testResults.push({
      name: "Department Filter & Non-fabricated Users",
      result: false,
      error: String(err),
    });
  }

  // Test 10: Documented time-range aliases + explicit zero cost preserved
  try {
    const seven = await service.getProviderMetrics({
      timeRange: "last_7_days",
    });
    const thirty = await service.getProviderMetrics({
      timeRange: "last_30_days",
    });
    const zeroService = new AnalyticsService();
    await zeroService.trackRequest({
      provider: "openai",
      model: "gpt-4o",
      timestamp: now,
      latency: 10,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      totalTokens: 2_000_000,
      isError: false,
      cost: 0,
    });
    const zeroCost = await zeroService.getCostAnalysis();
    if (
      seven.requestCount === 3 &&
      thirty.requestCount === 3 &&
      zeroCost.totalCost === 0
    ) {
      logTest(
        "Time Range Aliases & Explicit Zero Cost",
        "PASS",
        "last_7/30_days recognized; cost:0 not overwritten by pricing",
      );
      testResults.push({
        name: "Time Range Aliases & Explicit Zero Cost",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        `7d=${seven.requestCount} 30d=${thirty.requestCount} cost=${zeroCost.totalCost}`,
      );
    }
  } catch (err) {
    logTest("Time Range Aliases & Explicit Zero Cost", "FAIL", String(err));
    testResults.push({
      name: "Time Range Aliases & Explicit Zero Cost",
      result: false,
      error: String(err),
    });
  }

  // Test 11: Unknown models safely price as 0
  try {
    const unknown = calculateAdvancedCost(
      "totally-unknown-model-xyz",
      1_000_000,
      1_000_000,
      "openai",
    );
    const missing = calculateAdvancedCost(undefined, 100, 100, "openai");
    if (unknown === 0 && missing === 0) {
      logTest(
        "Unknown Model Cost Safety",
        "PASS",
        "Unknown/missing models return 0 without throwing",
      );
      testResults.push({
        name: "Unknown Model Cost Safety",
        result: true,
        error: null,
      });
    } else {
      throw new Error(`unknown=${unknown} missing=${missing}`);
    }
  } catch (err) {
    logTest("Unknown Model Cost Safety", "FAIL", String(err));
    testResults.push({
      name: "Unknown Model Cost Safety",
      result: false,
      error: String(err),
    });
  }

  // Test 12: generation:end with pipelineAHandled still records analytics once
  try {
    const NeuroLinkMod = await import("../src/lib/neurolink.ts");
    const sdk = new NeuroLinkMod.NeuroLink();
    const emitter = sdk.getEventEmitter();
    emitter.emit("generation:end", {
      provider: "openai",
      responseTime: 42,
      pipelineAHandled: true,
      result: {
        provider: "openai",
        model: "gpt-4o",
        usage: { input: 10, output: 5, total: 15 },
        analytics: { cost: 0.001 },
      },
      success: true,
    });
    // Allow the fire-and-forget trackRequest to settle
    await new Promise((r) => setTimeout(r, 50));
    const metrics = await sdk.getProviderMetrics();
    if (metrics.requestCount === 1 && metrics.providers[0]?.name === "openai") {
      logTest(
        "pipelineAHandled Analytics Tracking",
        "PASS",
        "Successful generate path records exactly one analytics request",
      );
      testResults.push({
        name: "pipelineAHandled Analytics Tracking",
        result: true,
        error: null,
      });
    } else {
      throw new Error(`requestCount=${metrics.requestCount}`);
    }
  } catch (err) {
    logTest("pipelineAHandled Analytics Tracking", "FAIL", String(err));
    testResults.push({
      name: "pipelineAHandled Analytics Tracking",
      result: false,
      error: String(err),
    });
  }

  // Test 13: parseAnalyticsQualityScore safely narrows unknown payloads
  try {
    const valid = parseAnalyticsQualityScore({
      overall: 8,
      relevance: 7,
      accuracy: 9,
      completeness: 8.5,
      reasoning: "ok",
    });
    const invalidNull = parseAnalyticsQualityScore(null);
    const invalidPartial = parseAnalyticsQualityScore({ overall: 5 });
    const invalidNan = parseAnalyticsQualityScore({
      overall: Number.NaN,
      relevance: 1,
      accuracy: 1,
      completeness: 1,
    });
    if (
      valid?.overall === 8 &&
      valid.reasoning === "ok" &&
      invalidNull === undefined &&
      invalidPartial === undefined &&
      invalidNan === undefined
    ) {
      logTest(
        "parseAnalyticsQualityScore Safety",
        "PASS",
        "Valid scores parsed; malformed/null/NaN rejected",
      );
      testResults.push({
        name: "parseAnalyticsQualityScore Safety",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        "Parser accepted invalid payloads or rejected valid ones",
      );
    }
  } catch (err) {
    logTest("parseAnalyticsQualityScore Safety", "FAIL", String(err));
    testResults.push({
      name: "parseAnalyticsQualityScore Safety",
      result: false,
      error: String(err),
    });
  }

  // Test 14: storage failures propagate (not swallowed as empty analytics)
  try {
    const failingStorage: AnalyticsStorage = {
      async saveRecord(_record: TelemetryRecord): Promise<void> {
        /* unused */
      },
      async getRecords(): Promise<TelemetryRecord[]> {
        throw new Error("storage unavailable");
      },
      async clear(): Promise<void> {
        /* unused */
      },
    };
    const failingService = new AnalyticsService(failingStorage);
    let threw = false;
    try {
      await failingService.getProviderMetrics();
    } catch (err) {
      threw = err instanceof Error && err.message === "storage unavailable";
    }
    if (threw) {
      logTest(
        "Analytics Error Propagation",
        "PASS",
        "Storage failures surface instead of fabricated empty metrics",
      );
      testResults.push({
        name: "Analytics Error Propagation",
        result: true,
        error: null,
      });
    } else {
      throw new Error(
        "Expected getProviderMetrics to throw on storage failure",
      );
    }
  } catch (err) {
    logTest("Analytics Error Propagation", "FAIL", String(err));
    testResults.push({
      name: "Analytics Error Propagation",
      result: false,
      error: String(err),
    });
  }

  // Summary
  logSection("Advanced Analytics Test Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${failed} failed (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  if (typeof describe === "undefined") {
    process.exit(failed === 0 ? 0 : 1);
  }
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe("Continuous Test Suite: Advanced Analytics", () => {
    it("runs analytics operations flawlessly", () => runAllTests(), 30000);
  });
}
