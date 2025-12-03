#!/usr/bin/env node

/**
 * NeuroLink Health Monitoring Demo
 * Demonstrates health checks, auto-recovery, and reporting
 */

import { HealthMonitor, ConnectionStatus, PingHealthCheck, ToolListValidationCheck, PerformanceCheck } from "../../dist/lib/mcp/healthMonitor.js";
import { MCPToolRegistry } from "../../dist/lib/mcp/toolRegistry.js";
import { ErrorManager } from "../../dist/lib/mcp/error-manager.js";
import ora from "ora";
import chalk from "chalk";

/**
 * Simulate different server behaviors
 */
class MockMCPRegistry extends MCPToolRegistry {
  private serverBehaviors = new Map();
  
  setServerBehavior(serverId, behavior) {
    this.serverBehaviors.set(serverId, behavior);
  }
  
  listServers() {
    return ["api-server", "database-server", "ai-modelServer", "slow-server"];
  }
  
  async listTools() {
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate different behaviors based on context
    const behavior = this.getCurrentBehavior();
    
    if (behavior === "fail") {
      throw new Error("Service unavailable");
    } else if (behavior === "slow") {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Slow response
    } else if (behavior === "empty") {
      return [];
    }
    
    return [
      { name: "process-data", description: "Process data", inputSchema: {} },
      { name: "fetch-info", description: "Fetch information", inputSchema: {} }
    ];
  }
  
  getCurrentBehavior() {
    // Simulate dynamic behavior changes
    const random = Math.random();
    if (random < 0.1) return "fail";
    if (random < 0.15) return "slow";
    if (random < 0.18) return "empty";
    return "normal";
  }
}

/**
 * Demo scenarios
 */
async function demoHealthChecks(healthMonitor) {
  console.log(chalk.cyan("\n🔍 Demo 1: Health Check Strategies"));
  console.log(chalk.gray("─".repeat(60)));

  const servers = ["api-server", "database-server", "ai-modelServer"];
  const strategies = ["ping", "tool-validation", "performance"];
  
  for (const server of servers) {
    console.log(`\n${chalk.yellow(`Checking ${server}:`)}`);
    
    for (const strategy of strategies) {
      const spinner = ora(`${strategy} check...`).start();
      
      try {
        const result = await healthMonitor.checkServerHealth(server, strategy);
        
        if (result.success) {
          spinner.succeed(`${strategy}: ${chalk.green("✓")} ${result.latency}ms`);
          if (result.message) {
            console.log(`    ${chalk.gray(result.message)}`);
          }
        } else {
          spinner.fail(`${strategy}: ${chalk.red("✗")} ${result.error?.message}`);
        }
      } catch (error) {
        spinner.fail(`${strategy}: ${chalk.red("Error")} ${error.message}`);
      }
    }
  }
}

async function demoRealTimeMonitoring(healthMonitor) {
  console.log(chalk.cyan("\n📊 Demo 2: Real-Time Health Monitoring"));
  console.log(chalk.gray("─".repeat(60)));

  healthMonitor.startMonitoring();
  
  console.log("\n" + chalk.yellow("Starting continuous monitoring..."));
  console.log(chalk.gray("Monitor will run for 30 seconds, checking every 5 seconds\n"));
  
  // Monitor for 30 seconds
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const metrics = healthMonitor.getHealthMetrics();
    
    // Display real-time status
    const statusColor = metrics.status === "healthy" ? chalk.green :
                       metrics.status === "degraded" ? chalk.yellow :
                       chalk.red;
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${chalk.gray(timestamp)} | Status: ${statusColor(metrics.status.toUpperCase())} | ` +
               `Health: ${metrics.healthScore}% | ` +
               `Alerts: ${metrics.activeAlerts.length}`);
    
    // Show any active alerts
    if (metrics.activeAlerts.length > 0) {
      metrics.activeAlerts.forEach(alert => {
        const severityColor = alert.severity === "critical" ? chalk.red :
                             alert.severity === "high" ? chalk.magenta :
                             alert.severity === "medium" ? chalk.yellow :
                             chalk.cyan;
        console.log(`    🚨 ${severityColor(alert.severity.toUpperCase())}: ${alert.serverId} - ${alert.message}`);
      });
    }
  }
  
  healthMonitor.stopMonitoring();
}

async function demoHealthReport(healthMonitor) {
  console.log(chalk.cyan("\n📋 Demo 3: Comprehensive Health Report"));
  console.log(chalk.gray("─".repeat(60)));
  
  const report = healthMonitor.generateHealthReport();
  
  // Display summary
  console.log("\n" + chalk.yellow("System Health Summary:"));
  console.log(`Total Servers: ${report.summary.totalServers}`);
  console.log(`Healthy: ${chalk.green(report.summary.healthyServers)}`);
  console.log(`Unhealthy: ${chalk.red(report.summary.unhealthyServers)}`);
  console.log(`Recovering: ${chalk.yellow(report.summary.recoveringServers)}`);
  
  // Health score with visual bar
  const healthScore = report.summary.overallHealth;
  const healthColor = healthScore >= 80 ? chalk.green :
                     healthScore >= 50 ? chalk.yellow :
                     chalk.red;
  
  const healthBar = "█".repeat(Math.floor(healthScore / 10)) + 
                   "░".repeat(10 - Math.floor(healthScore / 10));
  
  console.log(`\nOverall Health: ${healthColor(healthScore + "%")} ${healthBar}`);
  
  // Server details
  console.log("\n" + chalk.yellow("Server Details:"));
  report.servers.forEach(server => {
    const statusIcon = server.status === "CONNECTED" ? "🟢" :
                      server.status === "ERROR" ? "🔴" :
                      server.status === "RECOVERING" ? "🟡" : "⚪";
    
    console.log(`\n${statusIcon} ${chalk.bold(server.serverId)}`);
    console.log(`   Health: ${server.health}% | Uptime: ${server.uptime.toFixed(1)}% | Latency: ${server.avgLatency}ms`);
    console.log(`   Checks: ${server.metrics.successfulChecks}/${server.metrics.totalChecks} successful`);
    
    if (server.lastError) {
      console.log(`   ${chalk.red("Last Error:"))} ${server.lastError}`);
    }
    
    if (server.metrics.recoveryAttempts > 0) {
      console.log(`   ${chalk.yellow("Recovery Attempts:"))} ${server.metrics.recoveryAttempts}`);
    }
  });
  
  // Performance metrics
  console.log("\n" + chalk.yellow("Performance Metrics:"));
  const perf = healthMonitor.getHealthMetrics().performance;
  console.log(`Average Latency: ${perf.avgLatency}ms`);
  console.log(`Maximum Latency: ${perf.maxLatency}ms`);
  console.log(`Success Rate: ${perf.successRate.toFixed(1)}%`);
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log("\n" + chalk.yellow("💡 Recommendations:"));
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }
}

async function demoAutoRecovery(healthMonitor, registry) {
  console.log(chalk.cyan("\n🔄 Demo 4: Auto-Recovery Mechanisms"));
  console.log(chalk.gray("─".repeat(60)));
  
  // Register recovery callbacks
  const recoveryCallbacks = {
    "api-server": async (serverId) => {
      console.log(chalk.blue(`    🔧 Attempting to recover ${serverId}...`));
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(chalk.green(`    ✅ ${serverId} recovery completed`));
    },
    "database-server": async (serverId) => {
      console.log(chalk.blue(`    🔧 Restarting ${serverId} connection...`));
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(chalk.green(`    ✅ ${serverId} connection restored`));
    }
  };
  
  Object.entries(recoveryCallbacks).forEach(([serverId, callback]) => {
    healthMonitor.registerRecoveryCallback(serverId, callback);
  });
  
  console.log("\n" + chalk.yellow("Simulating server failures to trigger auto-recovery:"));
  
  // Force failures to trigger recovery
  registry.setServerBehavior("api-server", "fail");
  registry.setServerBehavior("database-server", "fail");
  
  const failingServers = ["api-server", "database-server"];
  
  for (const serverId of failingServers) {
    console.log(`\n${chalk.red("⚠️")} Triggering failure for ${serverId}`);
    
    const result = await healthMonitor.checkServerHealth(serverId);
    console.log(`   Health check result: ${result.success ? "✅" : "❌"} ${result.error?.message || "OK"}`);
    
    if (!result.success) {
      console.log(chalk.yellow(`   🔄 Auto-recovery will trigger in 1 second...`));
      
      // Wait for recovery to trigger
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Reset behaviors
  registry.setServerBehavior("api-server", "normal");
  registry.setServerBehavior("database-server", "normal");
}

async function demoCustomHealthChecks(healthMonitor) {
  console.log(chalk.cyan("\n⚙️ Demo 5: Custom Health Check Strategies"));
  console.log(chalk.gray("─".repeat(60)));
  
  // Add custom health check strategy
  const customStrategy = {
    name: "business-logic",
    async check(serverId, registry) {
      console.log(`      Running business logic validation for ${serverId}...`);
      
      const startTime = Date.now();
      
      // Simulate business logic validation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate random business rule violations
      const success = Math.random() > 0.3;
      
      return {
        success,
        status: success ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR,
        message: success ? "Business rules validated" : "Business rule violation detected",
        latency: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  };
  
  healthMonitor.addStrategy(customStrategy);
  
  console.log("\n" + chalk.yellow("Testing custom 'business-logic' health check:"));
  
  const servers = ["api-server", "database-server", "ai-modelServer"];
  
  for (const serverId of servers) {
    const spinner = ora(`Checking ${serverId}...`).start();
    
    try {
      const result = await healthMonitor.checkServerHealth(serverId, "business-logic");
      
      if (result.success) {
        spinner.succeed(`${serverId}: ${chalk.green("✓")} ${result.message} (${result.latency}ms)`);
      } else {
        spinner.fail(`${serverId}: ${chalk.red("✗")} ${result.message}`);
      }
    } catch (error) {
      spinner.fail(`${serverId}: ${chalk.red("Error")} ${error.message}`);
    }
  }
}

/**
 * Main demo runner
 */
async function main() {
  console.log(chalk.bold.cyan("\n🏥 NeuroLink Health Monitoring System Demo"));
  console.log(chalk.gray("=".repeat(60)));
  console.log("\nThis demo showcases:");
  console.log("• Multiple health check strategies (ping, validation, performance)");
  console.log("• Real-time monitoring with alerts");
  console.log("• Comprehensive health reporting");
  console.log("• Automatic recovery mechanisms");
  console.log("• Custom health check strategies\n");

  // Initialize components
  const errorManager = new ErrorManager({ enableStackTrace: false });
  const registry = new MockMCPRegistry();
  
  const healthMonitor = new HealthMonitor(registry, errorManager, {
    checkInterval: 5000, // 5 seconds
    checkTimeout: 1000,  // 1 second
    maxRecoveryAttempts: 2,
    recoveryDelay: 1000, // 1 second
    enableAutoRecovery: true
  });

  try {
    // Run demos
    await demoHealthChecks(healthMonitor);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoRealTimeMonitoring(healthMonitor);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await demoHealthReport(healthMonitor);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoAutoRecovery(healthMonitor, registry);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await demoCustomHealthChecks(healthMonitor);
    
    console.log(chalk.green("\n✨ Health Monitoring Demo completed successfully!"));
    console.log(chalk.gray("\nKey Features Demonstrated:"));
    console.log("• Proactive health monitoring prevents downtime");
    console.log("• Auto-recovery reduces manual intervention");
    console.log("• Real-time alerts enable quick response");
    console.log("• Comprehensive reporting aids in optimization");
    console.log("• Custom strategies allow domain-specific health checks\n");
    
  } catch (error) {
    console.error(chalk.red("\n❌ Demo error:"), error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);