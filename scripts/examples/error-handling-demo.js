#!/usr/bin/env node

/**
 * NeuroLink Enhanced Error Handling Demo
 * Demonstrates error accumulation, pattern detection, and recovery strategies
 */

import { MCPOrchestrator } from "../../dist/lib/mcp/orchestrator.js";
import { MCPToolRegistry } from "../../dist/lib/mcp/toolRegistry.js";
import { ErrorManager, ErrorCategory, ErrorSeverity } from "../../dist/lib/mcp/error-manager.js";
import ora from "ora";
import chalk from "chalk";

/**
 * Simulate various error scenarios
 */
class ErrorSimulator {
  constructor(private orchestrator: MCPOrchestrator) {}

  async simulateNetworkTimeout() {
    const error = new Error("Request timed out after 30000ms");
    return this.orchestrator.errorManager.recordError(error, {
      category: ErrorCategory.TIMEOUT_ERROR,
      severity: ErrorSeverity.HIGH,
      toolName: "api-fetch",
      sessionId: "demo-session"
    });
  }

  async simulateRateLimit() {
    const error = new Error("429 Too Many Requests - Rate limit exceeded");
    return this.orchestrator.errorManager.recordError(error, {
      category: ErrorCategory.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      toolName: "api-fetch",
      sessionId: "demo-session"
    });
  }

  async simulateConfigError() {
    const error = new Error("Missing API_KEY environment variable");
    return this.orchestrator.errorManager.recordError(error, {
      category: ErrorCategory.CONFIGURATION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      toolName: "config-loader",
      sessionId: "demo-session"
    });
  }

  async simulateToolError() {
    const error = new Error("Tool execution failed: Invalid parameters");
    return this.orchestrator.errorManager.recordError(error, {
      category: ErrorCategory.TOOL_ERROR,
      severity: ErrorSeverity.MEDIUM,
      toolName: "data-processor",
      parameters: { invalid: true }
    });
  }
}

/**
 * Demo scenarios
 */
async function demoErrorAccumulation(simulator: ErrorSimulator, errorManager: ErrorManager) {
  console.log(chalk.cyan("\n📊 Demo 1: Error Accumulation and Categorization"));
  console.log(chalk.gray("─".repeat(60)));

  const spinner = ora("Simulating various errors...").start();
  
  // Simulate different error types
  const errors = [
    await simulator.simulateNetworkTimeout(),
    await simulator.simulateRateLimit(),
    await simulator.simulateConfigError(),
    await simulator.simulateToolError()
  ];

  spinner.succeed("Errors recorded");

  // Display error details
  console.log("\n" + chalk.yellow("Recorded Errors:"));
  errors.forEach((error, index) => {
    console.log(`\n${index + 1}. ${chalk.red(error.error.message)}`);
    console.log(`   Category: ${chalk.blue(error.category)}`);
    console.log(`   Severity: ${chalk.magenta(error.severity)}`);
    console.log(`   Tool: ${chalk.green(error.context.toolName || "N/A")}`);
    if (error.recovery) {
      console.log(`   Recovery: ${chalk.yellow(error.recovery.suggestion || "No suggestion")}`);
    }
  });

  // Show statistics
  const stats = errorManager.getStats();
  console.log("\n" + chalk.cyan("Error Statistics:"));
  console.log(`Total Errors: ${stats.totalErrors}`);
  console.log(`Error Rate: ${stats.errorRate.toFixed(2)} errors/minute`);
  console.log(`\nErrors by Category:`);
  Object.entries(stats.errorsByCategory).forEach(([cat, count]) => {
    if (count > 0) console.log(`  ${cat}: ${count}`);
  });
}

async function demoPatternDetection(simulator: ErrorSimulator, errorManager: ErrorManager) {
  console.log(chalk.cyan("\n🔍 Demo 2: Pattern Detection"));
  console.log(chalk.gray("─".repeat(60)));

  const spinner = ora("Creating error patterns...").start();

  // Create timeout pattern (3+ timeouts)
  for (let i = 0; i < 4; i++) {
    await simulator.simulateNetworkTimeout();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Create rate limit pattern
  for (let i = 0; i < 2; i++) {
    await simulator.simulateRateLimit();
  }

  spinner.succeed("Patterns created");

  // Detect patterns
  const patterns = errorManager.detectPatterns();
  
  console.log("\n" + chalk.yellow("Detected Patterns:"));
  patterns.patterns.forEach(pattern => {
    console.log(`\n📌 ${chalk.red(pattern.pattern)}`);
    console.log(`   Count: ${pattern.count}`);
    console.log(`   Severity: ${chalk.magenta(pattern.severity)}`);
    console.log(`   Recommendation: ${chalk.green(pattern.recommendation)}`);
  });

  if (patterns.correlations.length > 0) {
    console.log("\n" + chalk.yellow("Error Correlations:"));
    patterns.correlations.forEach(corr => {
      console.log(`\n🔗 "${corr.error1}" ↔ "${corr.error2}"`);
      console.log(`   Correlation: ${(corr.correlation * 100).toFixed(0)}%`);
    });
  }
}

async function demoRetryStrategy(simulator: ErrorSimulator, errorManager: ErrorManager) {
  console.log(chalk.cyan("\n🔄 Demo 3: Retry Strategy with Exponential Backoff"));
  console.log(chalk.gray("─".repeat(60)));

  // Create a retriable error
  const error = await simulator.simulateNetworkTimeout();
  
  console.log("\n" + chalk.yellow("Simulating retry attempts:"));
  
  // Get recovery details from the error (already attempted in recordError)
  if (error.recovery) {
    console.log(`\nInitial recovery attempt:`);
    console.log(`  Strategy: Retry`);
    console.log(`  Next Action: ${error.recovery.nextAction || "retry"}`);
    console.log(`  Delay: ${error.recovery.delay || 1000}ms`);
    console.log(`  Suggestion: ${error.recovery.suggestion}`);
  }

  // Simulate multiple retry attempts by creating more errors
  const delays = [];
  for (let i = 1; i <= 3; i++) {
    const retryError = await errorManager.recordError(
      new Error(`Retry attempt ${i} failed`),
      {
        category: ErrorCategory.NETWORK_ERROR,
        toolName: "api-fetch",
        sessionId: "demo-session"
      }
    );
    
    if (retryError.recovery?.delay) {
      delays.push(retryError.recovery.delay);
    }
  }

  console.log("\n" + chalk.green("Exponential Backoff Pattern:"));
  delays.forEach((delay, index) => {
    console.log(`  Attempt ${index + 2}: Wait ${delay}ms before retry`);
  });
}

async function demoCircuitBreaker(orchestrator: MCPOrchestrator) {
  console.log(chalk.cyan("\n⚡ Demo 4: Circuit Breaker Pattern"));
  console.log(chalk.gray("─".repeat(60)));

  const registry = orchestrator.registry;
  
  // Register a failing tool
  registry.registerTool("flaky-api", {
    name: "flaky-api",
    description: "Simulates a flaky API that triggers circuit breaker",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      throw new Error("503 Service Unavailable");
    }
  });

  console.log("\n" + chalk.yellow("Triggering circuit breaker with repeated failures:"));

  // Try to execute the tool multiple times
  for (let i = 1; i <= 6; i++) {
    const spinner = ora(`Attempt ${i}...`).start();
    
    try {
      await orchestrator.executeTool("flaky-api", {}, {
        sessionId: "circuit-demo"
      });
      spinner.succeed(`Attempt ${i} succeeded`);
    } catch (error) {
      spinner.fail(`Attempt ${i} failed`);
      
      // After 5 failures, circuit should open
      if (i === 5) {
        console.log(chalk.red("\n🔴 Circuit Breaker OPENED - Service protected from overload"));
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Show circuit breaker status
  const recoveryStats = orchestrator.errorManager.getRecoveryStats();
  console.log("\n" + chalk.cyan("Circuit Breaker Status:"));
  Object.entries(recoveryStats.circuitBreakerStates).forEach(([tool, state]) => {
    const stateColor = state === "OPEN" ? chalk.red : 
                      state === "HALF_OPEN" ? chalk.yellow : 
                      chalk.green;
    console.log(`  ${tool}: ${stateColor(state)}`);
  });
}

async function demoHealthInsights(errorManager: ErrorManager) {
  console.log(chalk.cyan("\n🏥 Demo 5: Health Insights and Recommendations"));
  console.log(chalk.gray("─".repeat(60)));

  const insights = errorManager.getInsights();
  
  console.log("\n" + chalk.yellow("System Health Report:"));
  
  // Health score with visual indicator
  const healthColor = insights.healthScore > 80 ? chalk.green :
                     insights.healthScore > 50 ? chalk.yellow :
                     chalk.red;
  
  const healthBar = "█".repeat(Math.floor(insights.healthScore / 10)) + 
                   "░".repeat(10 - Math.floor(insights.healthScore / 10));
  
  console.log(`\nHealth Score: ${healthColor(insights.healthScore + "/100")} ${healthBar}`);
  
  if (insights.criticalIssues.length > 0) {
    console.log("\n" + chalk.red("⚠️  Critical Issues:"));
    insights.criticalIssues.forEach(issue => {
      console.log(`  • ${issue}`);
    });
  }
  
  if (insights.recommendations.length > 0) {
    console.log("\n" + chalk.yellow("💡 Recommendations:"));
    insights.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  // Error trends
  const trends = errorManager.getErrorTrends(60000, 300000); // 1-min buckets, 5-min window
  const recentTrend = trends.slice(-5);
  
  console.log("\n" + chalk.cyan("📈 Error Trends (last 5 minutes):"));
  recentTrend.forEach((bucket, index) => {
    const bar = "▇".repeat(Math.min(bucket.count, 20));
    console.log(`  ${index + 1}min ago: ${bar} (${bucket.count} errors)`);
  });
}

/**
 * Main demo runner
 */
async function main() {
  console.log(chalk.bold.cyan("\n🚀 NeuroLink Enhanced Error Handling Demo"));
  console.log(chalk.gray("=".repeat(60)));
  console.log("\nThis demo showcases:");
  console.log("• Error accumulation and categorization");
  console.log("• Pattern detection and correlation");
  console.log("• Retry strategies with exponential backoff");
  console.log("• Circuit breaker protection");
  console.log("• Health insights and recommendations\n");

  // Initialize components
  const errorManager = new ErrorManager({
    maxHistorySize: 1000,
    enableStackTrace: true,
    autoRecovery: true,
    errorRateWindow: 60000
  });

  const registry = new MCPToolRegistry();
  const orchestrator = new MCPOrchestrator(
    registry,
    undefined,
    undefined,
    undefined,
    errorManager
  );

  const simulator = new ErrorSimulator(orchestrator);

  try {
    // Run demos
    await demoErrorAccumulation(simulator, errorManager);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoPatternDetection(simulator, errorManager);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoRetryStrategy(simulator, errorManager);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoCircuitBreaker(orchestrator);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoHealthInsights(errorManager);
    
    console.log(chalk.green("\n✨ Demo completed successfully!"));
    console.log(chalk.gray("\nKey Takeaways:"));
    console.log("• Errors are automatically categorized and tracked");
    console.log("• Patterns help identify systemic issues");
    console.log("• Recovery strategies prevent cascading failures");
    console.log("• Circuit breakers protect services from overload");
    console.log("• Health insights enable proactive monitoring\n");
    
  } catch (error) {
    console.error(chalk.red("\n❌ Demo error:"), error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);