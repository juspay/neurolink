/**
 * Multi-Provider Zod Schema Validation Test
 *
 * This function tests zod schema validation across multiple providers.
 * Tests the full MetaAdsAnalysisOutputSchema which includes:
 * - Nested objects with required/optional fields
 * - Array validations with length constraints
 * - Enum validations
 * - Conditional/nullish fields
 * - Complex metric comparison patterns
 * - Campaign analysis with top performers and underperformers
 * - Critical issues with quantified impact
 * - Action roadmap with priority tiers
 *
 * Providers tested: vertex with Claude Sonnet 4.5
 *
 * ✅ CORRECT SDK CONTRACT:
 * - schema: MetaAdsAnalysisOutputSchema (top-level)
 * - output: { format: 'json' } (only format field)
 * - result.content contains JSON string (parse with JSON.parse)
 */

import { MetaAdsAnalysisOutputSchema } from "./fixtures/zod-sample.js";
import { NeuroLink } from "../dist/index.js";
import * as path from "path";
import { fileURLToPath } from "url";

// Test data file paths - ES module compatible
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, "./fixtures");
const CAMPAIGN_DATA_FILE = path.join(
  FIXTURES_DIR,
  "meta-ads-campaign-performance.csv",
);
const ACCOUNT_METRICS_FILE = path.join(
  FIXTURES_DIR,
  "meta-ads-account-metrics.json",
);

// Helper functions from continuous-test-suite.ts
function logSection(title: string): void {
  const colors = {
    cyan: "\x1b[36m",
    reset: "\x1b[0m",
  };
  console.log(`\n${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}`);
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "TESTING",
  details = "",
): void {
  const colors = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
  };

  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  const color =
    status === "PASS"
      ? colors.green
      : status === "FAIL"
        ? colors.red
        : colors.yellow;

  console.log(`${color}${icon} ${testName}${colors.reset}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function log(
  message: string,
  color: "blue" | "yellow" | "reset" = "reset",
): void {
  const colors = {
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Validates numeric field constraints from the complex schema
 */
function validateNumericFields(data: unknown): {
  passed: boolean;
  details: string[];
} {
  const details: string[] = [];
  let allPassed = true;

  try {
    const report = data as {
      accountPerformance?: {
        totalSpend?: {
          current?: number;
          previous?: number;
          changePercent?: number;
        };
      };
    };

    // Check that spend values are positive numbers
    const totalSpend = report.accountPerformance?.totalSpend;
    if (totalSpend) {
      if (typeof totalSpend.current === "number") {
        const valid = totalSpend.current >= 0;
        details.push(
          `accountPerformance.totalSpend.current: ${totalSpend.current} (should be >= 0) - ${valid ? "PASS" : "FAIL"}`,
        );
        if (!valid) {
          allPassed = false;
        }
      } else {
        details.push(
          "accountPerformance.totalSpend.current: missing or not a number - FAIL",
        );
        allPassed = false;
      }

      if (typeof totalSpend.previous === "number") {
        const valid = totalSpend.previous >= 0;
        details.push(
          `accountPerformance.totalSpend.previous: ${totalSpend.previous} (should be >= 0) - ${valid ? "PASS" : "FAIL"}`,
        );
        if (!valid) {
          allPassed = false;
        }
      } else {
        details.push(
          "accountPerformance.totalSpend.previous: missing or not a number - FAIL",
        );
        allPassed = false;
      }

      if (typeof totalSpend.changePercent === "number") {
        details.push(
          `accountPerformance.totalSpend.changePercent: ${totalSpend.changePercent}% - PASS`,
        );
      } else {
        details.push(
          "accountPerformance.totalSpend.changePercent: missing or not a number - FAIL",
        );
        allPassed = false;
      }
    } else {
      details.push("accountPerformance.totalSpend: missing - FAIL");
      allPassed = false;
    }
  } catch (error) {
    details.push(
      `Numeric validation error: ${error instanceof Error ? error.message : String(error)}`,
    );
    allPassed = false;
  }

  return { passed: allPassed, details };
}

/**
 * Validates required fields are present in the complex schema
 */
function validateRequiredFields(data: unknown): {
  passed: boolean;
  details: string[];
} {
  const details: string[] = [];
  let allPassed = true;

  try {
    const report = data as {
      analysisMetadata?: {
        accountId?: unknown;
        accountName?: unknown;
        analysisDateRange?: unknown;
        comparisonDateRange?: unknown;
        generatedAt?: unknown;
        currency?: unknown;
      };
      accountPerformance?: unknown;
      campaignAnalysis?: {
        topPerformers?: unknown[];
        underperformers?: unknown[];
      };
      criticalIssues?: unknown[];
      actionRoadmap?: {
        high?: unknown[];
        medium?: unknown[];
        budgetReallocation?: unknown[];
      };
    };

    // Check top-level required sections
    const exists = (field: string, value: unknown) => {
      const present = value !== undefined;
      details.push(`${field}: ${present ? "present" : "MISSING"}`);
      if (!present) {
        allPassed = false;
      }
      return present;
    };

    exists("analysisMetadata", report.analysisMetadata);
    exists("accountPerformance", report.accountPerformance);
    exists("campaignAnalysis", report.campaignAnalysis);
    exists("criticalIssues", report.criticalIssues);
    exists("actionRoadmap", report.actionRoadmap);

    // Check analysisMetadata fields
    if (report.analysisMetadata) {
      exists("analysisMetadata.accountId", report.analysisMetadata.accountId);
      exists(
        "analysisMetadata.accountName",
        report.analysisMetadata.accountName,
      );
    }

    // Check campaignAnalysis arrays
    if (report.campaignAnalysis) {
      exists(
        "campaignAnalysis.topPerformers",
        report.campaignAnalysis.topPerformers,
      );
      exists(
        "campaignAnalysis.underperformers",
        report.campaignAnalysis.underperformers,
      );

      if (Array.isArray(report.campaignAnalysis.topPerformers)) {
        details.push(
          `campaignAnalysis.topPerformers: ${report.campaignAnalysis.topPerformers.length} items - ${report.campaignAnalysis.topPerformers.length >= 1 && report.campaignAnalysis.topPerformers.length <= 3 ? "PASS" : "FAIL (should be 1-3)"}`,
        );
        if (
          report.campaignAnalysis.topPerformers.length < 1 ||
          report.campaignAnalysis.topPerformers.length > 3
        ) {
          allPassed = false;
        }
      }

      if (Array.isArray(report.campaignAnalysis.underperformers)) {
        details.push(
          `campaignAnalysis.underperformers: ${report.campaignAnalysis.underperformers.length} items - ${report.campaignAnalysis.underperformers.length >= 1 && report.campaignAnalysis.underperformers.length <= 3 ? "PASS" : "FAIL (should be 1-3)"}`,
        );
        if (
          report.campaignAnalysis.underperformers.length < 1 ||
          report.campaignAnalysis.underperformers.length > 3
        ) {
          allPassed = false;
        }
      }
    }

    // Check actionRoadmap.high array (required: exactly 1 item)
    if (report.actionRoadmap?.high) {
      if (Array.isArray(report.actionRoadmap.high)) {
        details.push(
          `actionRoadmap.high: ${report.actionRoadmap.high.length} items - ${report.actionRoadmap.high.length === 1 ? "PASS" : "FAIL (should be exactly 1)"}`,
        );
        if (report.actionRoadmap.high.length !== 1) {
          allPassed = false;
        }
      }
    }
  } catch (error) {
    details.push(
      `Required fields check error: ${error instanceof Error ? error.message : String(error)}`,
    );
    allPassed = false;
  }

  return { passed: allPassed, details };
}

/**
 * Validates that output contains actual data from files (not hallucinated)
 */
function validateDataAccuracy(
  data: unknown,
  expectedAccountId: string,
  expectedCampaignIds: string[],
): {
  passed: boolean;
  details: string[];
} {
  const details: string[] = [];
  let allPassed = true;

  try {
    const report = data as {
      analysisMetadata?: {
        accountId?: string;
        accountName?: string;
      };
      campaignAnalysis?: {
        topPerformers?: Array<{ entityId?: string; entityName?: string }>;
        underperformers?: Array<{ entityId?: string; entityName?: string }>;
      };
    };

    // Verify account ID matches actual data
    if (report.analysisMetadata?.accountId === expectedAccountId) {
      details.push(`Account ID matches: ${expectedAccountId} - PASS`);
    } else {
      details.push(
        `Account ID mismatch: expected ${expectedAccountId}, got ${report.analysisMetadata?.accountId} - FAIL`,
      );
      allPassed = false;
    }

    // Verify campaign IDs are from actual data (not hallucinated)
    const allCampaignIds = [
      ...(report.campaignAnalysis?.topPerformers || []),
      ...(report.campaignAnalysis?.underperformers || []),
    ]
      .map((entity) => entity.entityId)
      .filter(Boolean);

    if (allCampaignIds.length === 0) {
      details.push("No campaign IDs found in output - FAIL");
      allPassed = false;
    } else {
      const allCampaignsValid = allCampaignIds.every((id) =>
        expectedCampaignIds.includes(id as string),
      );

      if (allCampaignsValid) {
        details.push(
          `All campaign IDs are from actual data: ${allCampaignIds.join(", ")} - PASS`,
        );
      } else {
        const invalidIds = allCampaignIds.filter(
          (id) => !expectedCampaignIds.includes(id as string),
        );
        details.push(
          `Some campaign IDs are hallucinated: ${invalidIds.join(", ")} - FAIL`,
        );
        allPassed = false;
      }
    }

    // Verify specific high-ROAS campaigns appear in topPerformers
    const topPerformerIds = (report.campaignAnalysis?.topPerformers || [])
      .map((entity) => entity.entityId)
      .filter(Boolean);

    const expectedTopPerformers = ["camp_001", "camp_005", "camp_002"]; // High ROAS from CSV
    const hasExpectedTopPerformer = expectedTopPerformers.some((id) =>
      topPerformerIds.includes(id),
    );

    if (hasExpectedTopPerformer) {
      details.push(
        `Top performers include expected high-ROAS campaigns - PASS`,
      );
    } else {
      details.push(
        `Top performers don't match expected high-ROAS campaigns (expected one of: ${expectedTopPerformers.join(", ")}) - FAIL`,
      );
      allPassed = false;
    }
  } catch (error) {
    details.push(
      `Data accuracy check error: ${error instanceof Error ? error.message : String(error)}`,
    );
    allPassed = false;
  }

  return { passed: allPassed, details };
}

/**
 * Tests complex zod schema validation across multiple providers
 *
 * @param providerOverride - Optional provider to use (defaults to "vertex")
 * @param modelOverride - Optional model to use (uses provider default if not specified)
 * @returns Promise<boolean> - true if all tests pass, false otherwise
 */
export async function testComplexZodSchemaMultiProvider(
  providerOverride?: string,
  modelOverride?: string,
): Promise<boolean> {
  logSection("Testing Complex Zod Schema Validation (Multi-Provider)");

  // Use provided provider/model or defaults
  const providerName = providerOverride || "vertex";
  const modelName = modelOverride || undefined;

  // Check if this is a Gemini MODEL - Gemini cannot use tools + JSON schema together
  // This is a documented Gemini limitation, not a bug in the SDK.
  // Note: provider name alone is not sufficient - Vertex can run Claude too.
  const isGeminiModel =
    modelName?.toLowerCase().includes("gemini") ||
    (!modelName &&
      (providerName === "google-ai" || providerName === "googleAiStudio"));

  if (isGeminiModel) {
    logTest(
      "Complex Zod Schema Multi-Provider",
      "PASS",
      "SKIPPED: Gemini providers cannot use tools + JSON schema together (documented limitation). Test requires tools to read data files.",
    );
    return true; // Return true since this is an expected limitation, not a failure
  }

  const providers = [
    {
      name: providerName,
      model: modelName,
    },
  ];
  const results: {
    provider: string;
    model: string;
    success: boolean;
    error?: string;
  }[] = [];

  // Sample prompt for META Ads analysis
  const prompt = `You are a META Ads performance analyst. Analyze the account performance and generate a comprehensive structured report.

IMPORTANT: You MUST use the available tools to gather the actual data:

1. Use the 'readFile' tool to read campaign performance data from: ${CAMPAIGN_DATA_FILE}

2. Use the 'readFile' tool to read account-level metrics from: ${ACCOUNT_METRICS_FILE}

3. Use the 'getCurrentTime' tool to get the current timestamp for the 'generatedAt' field

ANALYSIS REQUIREMENTS:
- Parse the CSV and JSON data from the files you read
- Calculate period-over-period changes and trends (compare currentPeriod vs previousPeriod)
- Identify top 1-3 performing campaigns (highest ROAS values from CSV)
- Identify 1-3 underperforming campaigns (lowest ROAS values from CSV)
- Generate critical issues based on actual data patterns (e.g., low ROAS, poor CTR)
- Create actionable recommendations with specific campaign IDs and metrics from the data
- Use the actual accountId, accountName, and currency from the JSON file
- Calculate businessImplication for each metric comparison

DO NOT hallucinate data. ALL metrics, campaign IDs, and account information must come from the files you read using the tools.`;

  for (const providerConfig of providers) {
    try {
      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Zod Schema Test`,
        "TESTING",
        "Generating structured output with complex schema...",
      );

      const sdk = new NeuroLink();

      // Debug: Check available tools
      const toolsList = await sdk.getAllAvailableTools();
      console.log("Available tools before generation:", toolsList.length);

      // Try with schema + tools together (Claude on Vertex should support this)
      const result = await sdk.generate({
        input: { text: prompt },
        schema: MetaAdsAnalysisOutputSchema,
        output: { format: "json" },
        provider: providerConfig.name,
        model: providerConfig.model,
        temperature: 0.1,
      });

      console.log("Tools used in result:", result.toolsUsed);

      // Dispose SDK instance
      await sdk.dispose();

      // ========== TOOL USAGE VERIFICATION ==========
      // Verify that tools were actually used
      if (!result.toolExecutions || result.toolExecutions.length === 0) {
        throw new Error(
          "No tools were executed. Claude must use readFile and getCurrentTime tools.",
        );
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Tool Usage Check`,
        "TESTING",
        `Verifying tool executions...`,
      );

      // Verify specific tools were called
      const toolNames = result.toolExecutions.map((te) => te.name);
      const hasReadFile = toolNames.includes("readFile");
      const hasGetCurrentTime = toolNames.includes("getCurrentTime");

      if (!hasReadFile) {
        throw new Error(
          "readFile tool was not called. Claude must read the data files.",
        );
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Tool Usage`,
        "PASS",
        `Tools used: ${[...new Set(toolNames)].join(", ")} (${result.toolExecutions.length} executions)`,
      );

      // Verify tool usage: readFile should have been called at least twice
      const readFileCount =
        result.toolExecutions?.filter((te) => te.name === "readFile").length ||
        0;
      const getCurrentTimeUsed =
        result.toolExecutions?.some((te) => te.name === "getCurrentTime") ||
        false;

      if (readFileCount < 2) {
        throw new Error(
          `Expected at least 2 readFile calls, but got ${readFileCount}. Claude must read both CSV and JSON files.`,
        );
      }

      if (!getCurrentTimeUsed) {
        throw new Error(
          "getCurrentTime tool was not called. Claude must use it for the generatedAt field.",
        );
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Tool Usage Verification`,
        "PASS",
        `readFile called ${readFileCount} times, getCurrentTime called`,
      );

      log(
        `${providerConfig.name}: Generation completed, validating output...`,
        "blue",
      );

      // ✅ CORRECT: Parse from result.content
      let parsedOutput: unknown;
      try {
        // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
        let jsonString = result.content.trim();
        if (jsonString.startsWith("```")) {
          jsonString = jsonString
            .replace(/^```(?:json)?\s*\n?/, "")
            .replace(/\n?```\s*$/, "");
        }
        parsedOutput = JSON.parse(jsonString);
        logTest(
          `JSON Parse : ${JSON.stringify(parsedOutput)}`,
          "PASS",
          "Successfully parsed JSON from result.content",
        );
      } catch (parseError) {
        throw new Error(
          `Failed to parse JSON from result.content: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }

      // Validate with zod schema
      const validation = MetaAdsAnalysisOutputSchema.safeParse(parsedOutput);

      if (!validation.success) {
        const errorDetails = validation.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");

        logTest(
          `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Zod Schema Validation`,
          "FAIL",
          `Schema validation failed: ${errorDetails}`,
        );

        results.push({
          provider: providerConfig.name,
          model: providerConfig.model,
          success: false,
          error: `Zod validation failed: ${errorDetails}`,
        });
        continue;
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Zod Schema Validation`,
        "PASS",
        "Schema validation successful",
      );

      // Additional constraint validations
      log(
        `${providerConfig.name}: Validating numeric field constraints...`,
        "blue",
      );
      const numericValidation = validateNumericFields(validation.data);

      if (!numericValidation.passed) {
        logTest(
          `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Numeric Fields`,
          "FAIL",
          numericValidation.details.join("; "),
        );
        results.push({
          provider: providerConfig.name,
          model: providerConfig.model,
          success: false,
          error: `Numeric field validation failed: ${numericValidation.details.join("; ")}`,
        });
        continue;
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Numeric Fields`,
        "PASS",
        numericValidation.details.join("; "),
      );

      // Validate required fields
      log(`${providerConfig.name}: Validating required fields...`, "blue");
      const fieldsValidation = validateRequiredFields(validation.data);

      if (!fieldsValidation.passed) {
        logTest(
          `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Required Fields`,
          "FAIL",
          fieldsValidation.details.join("; "),
        );
        results.push({
          provider: providerConfig.name,
          model: providerConfig.model,
          success: false,
          error: `Required fields validation failed: ${fieldsValidation.details.join("; ")}`,
        });
        continue;
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Required Fields`,
        "PASS",
        "All required fields present",
      );

      // Validate data accuracy - ensure data comes from files, not hallucinated
      log(`${providerConfig.name}: Validating data accuracy...`, "blue");
      const dataValidation = validateDataAccuracy(
        validation.data,
        "act_123456789", // From JSON file
        ["camp_001", "camp_002", "camp_003", "camp_004", "camp_005"], // From CSV
      );

      if (!dataValidation.passed) {
        logTest(
          `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Data Accuracy`,
          "FAIL",
          dataValidation.details.join("; "),
        );
        results.push({
          provider: providerConfig.name,
          model: providerConfig.model,
          success: false,
          error: `Data accuracy validation failed: ${dataValidation.details.join("; ")}`,
        });
        continue;
      }

      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Data Accuracy`,
        "PASS",
        dataValidation.details.join("; "),
      );

      // All validations passed for this provider
      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Overall`,
        "PASS",
        "All validations passed successfully",
      );

      results.push({
        provider: providerConfig.name,
        model: providerConfig.model,
        success: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logTest(
        `${providerConfig.name.toUpperCase()} (${providerConfig.model}) - Execution`,
        "FAIL",
        errorMessage,
      );
      results.push({
        provider: providerConfig.name,
        model: providerConfig.model,
        success: false,
        error: errorMessage,
      });
    }

    // Add delay between provider tests to avoid rate limits
    const isLastProvider = providerConfig === providers[providers.length - 1];
    if (!isLastProvider) {
      log("Waiting 5s before next provider test...", "yellow");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Summary
  logSection("Multi-Provider Zod Schema Test Results");

  const passedCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  results.forEach((result) => {
    const status: "PASS" | "FAIL" = result.success ? "PASS" : "FAIL";
    logTest(
      `${result.provider.toUpperCase()} (${result.model})`,
      status,
      result.error || "All validations passed",
    );
  });

  const allPassed = passedCount === totalCount;

  logTest(
    "Multi-Provider Zod Schema Test",
    allPassed ? "PASS" : "FAIL",
    `${passedCount}/${totalCount} providers passed all validations`,
  );

  return allPassed;
}
