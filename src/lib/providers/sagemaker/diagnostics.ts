/**
 * SageMaker Simple Diagnostics Module
 *
 * Provides basic diagnostic functions for SageMaker configuration and connectivity.
 */

import chalk from "chalk";
import { checkSageMakerConfiguration } from "./config.js";
import { createSageMakerProvider } from "./index.js";

/**
 * Simple diagnostic result interface
 */
export type DiagnosticResult = {
  name: string;
  category: "configuration" | "connectivity" | "streaming";
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
  recommendation?: string;
};

/**
 * Diagnostic report interface
 */
export type DiagnosticReport = {
  overallStatus: "healthy" | "issues" | "critical";
  results: DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
};

/**
 * Run quick diagnostics for SageMaker configuration
 */
export async function runQuickDiagnostics(
  endpoint?: string,
): Promise<DiagnosticReport> {
  const results: DiagnosticResult[] = [];

  // Test 1: Configuration check
  try {
    const configStatus = checkSageMakerConfiguration();
    results.push({
      name: "Configuration Validation",
      category: "configuration",
      status: configStatus.configured ? "pass" : "fail",
      message: configStatus.configured
        ? "SageMaker configuration is valid"
        : "SageMaker configuration has issues",
      details: configStatus.issues.join(", "),
      recommendation: configStatus.configured
        ? undefined
        : "Run 'neurolink sagemaker setup' to configure",
    });
  } catch (error) {
    results.push({
      name: "Configuration Validation",
      category: "configuration",
      status: "fail",
      message: "Failed to validate configuration",
      details: error instanceof Error ? error.message : String(error),
      recommendation: "Check your AWS credentials and configuration",
    });
  }

  // Test 2: Connectivity check (if endpoint provided)
  if (endpoint) {
    try {
      const provider = createSageMakerProvider(undefined, endpoint);
      const connectivityTest = await provider.testConnectivity();

      results.push({
        name: `Endpoint Connectivity (${endpoint})`,
        category: "connectivity",
        status: connectivityTest.success ? "pass" : "fail",
        message: connectivityTest.success
          ? "Endpoint is accessible"
          : "Endpoint connectivity failed",
        details: connectivityTest.error || "Connection successful",
        recommendation: connectivityTest.success
          ? undefined
          : "Check endpoint name and AWS permissions",
      });
    } catch (error) {
      results.push({
        name: `Endpoint Connectivity (${endpoint})`,
        category: "connectivity",
        status: "fail",
        message: "Connectivity test failed",
        details: error instanceof Error ? error.message : String(error),
        recommendation: "Verify endpoint exists and you have access",
      });
    }
  }

  // Calculate summary
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warnings = results.filter((r) => r.status === "warning").length;

  let overallStatus: "healthy" | "issues" | "critical" = "healthy";
  if (failed > 0) {
    overallStatus = failed >= results.length / 2 ? "critical" : "issues";
  } else if (warnings > 0) {
    overallStatus = "issues";
  }

  return {
    overallStatus,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      warnings,
    },
  };
}

/**
 * Format diagnostic report for console output
 */
export function formatDiagnosticReport(report: DiagnosticReport): string {
  const lines: string[] = [];

  lines.push(chalk.blue("🔍 SageMaker Diagnostic Results\n"));

  // Summary
  lines.push(
    `📊 Summary: ${report.summary.passed}/${report.summary.total} tests passed`,
  );
  if (report.summary.failed > 0) {
    lines.push(chalk.red(`   Failed: ${report.summary.failed}`));
  }
  if (report.summary.warnings > 0) {
    lines.push(chalk.yellow(`   Warnings: ${report.summary.warnings}`));
  }
  lines.push("");

  // Individual results
  report.results.forEach((result, index) => {
    const icon =
      result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⚠️";
    const color =
      result.status === "pass"
        ? chalk.green
        : result.status === "fail"
          ? chalk.red
          : chalk.yellow;

    lines.push(`${index + 1}. ${icon} ${color(result.name)}`);
    lines.push(`   ${result.message}`);

    if (result.details) {
      lines.push(`   Details: ${result.details}`);
    }

    if (result.recommendation) {
      lines.push(chalk.blue(`   💡 ${result.recommendation}`));
    }

    lines.push("");
  });

  // Overall status
  const statusIcon =
    report.overallStatus === "healthy"
      ? "✅"
      : report.overallStatus === "issues"
        ? "⚠️"
        : "🚨";
  const statusColor =
    report.overallStatus === "healthy"
      ? chalk.green
      : report.overallStatus === "issues"
        ? chalk.yellow
        : chalk.red;

  lines.push(
    `${statusIcon} Overall Status: ${statusColor(report.overallStatus.toUpperCase())}`,
  );

  return lines.join("\n");
}
