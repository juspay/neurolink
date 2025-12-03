#!/usr/bin/env node

/**
 * NeuroLink Semaphore Demo
 * Demonstrates race condition prevention and concurrent execution control
 */

import { MCPOrchestrator } from "../../dist/lib/mcp/orchestrator.js";
import { MCPToolRegistry } from "../../dist/lib/mcp/toolRegistry.js";
import { SemaphoreManager } from "../../dist/lib/mcp/semaphore-manager.js";

// Color utilities for better visualization
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Demo 1: Race Condition Prevention
 * Shows how semaphores prevent concurrent execution of the same tool
 */
async function demoRaceConditionPrevention() {
  log("\n🔒 Demo 1: Race Condition Prevention", "cyan");
  log("━".repeat(50), "cyan");
  
  const registry = new MCPToolRegistry();
  const orchestrator = new MCPOrchestrator(registry);
  const executionLog = [];
  
  // Register a tool that simulates shared resource access
  registry.registerTool("database-write", {
    name: "database-write",
    description: "Simulates database write operation",
    inputSchema: { type: "object", properties: {} },
    execute: async (args) => {
      const id = args.id;
      executionLog.push({ event: "start", id, time: Date.now() });
      log(`  [${id}] Starting database write...`, "yellow");
      
      // Simulate database operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      executionLog.push({ event: "end", id, time: Date.now() });
      log(`  [${id}] Database write completed ✓`, "green");
      
      return {
        success: true,
        data: { written: id },
        usage: { duration: 1000 }
      };
    }
  });
  
  log("\nExecuting 3 concurrent database writes...", "blue");
  const startTime = Date.now();
  
  // Try to execute the same tool concurrently
  const promises = [
    orchestrator.executeTool("database-write", { id: "Write-1" }),
    orchestrator.executeTool("database-write", { id: "Write-2" }),
    orchestrator.executeTool("database-write", { id: "Write-3" })
  ];
  
  await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  log(`\n✅ All writes completed in ${totalTime}ms", "green");
  log("\n📊 Execution Timeline:", "magenta");
  
  // Verify serialized execution
  let hasOverlap = false;
  for (let i = 0; i < executionLog.length - 1; i++) {
    const current = executionLog[i];
    const next = executionLog[i + 1];
    
    if (current.event === "start" && next.event === "start") {
      hasOverlap = true;
      break;
    }
  }
  
  if (!hasOverlap) {
    log("  ✓ No concurrent executions detected - semaphore working correctly!", "green");
    log("  ✓ Each operation completed before the next one started", "green");
  } else {
    log("  ✗ Concurrent executions detected - semaphore failed!", "red");
  }
}

/**
 * Demo 2: Parallel Execution of Different Tools
 * Shows that different tools can execute in parallel
 */
async function demoParallelExecution() {
  log("\n⚡ Demo 2: Parallel Execution of Different Tools", "cyan");
  log("━".repeat(50), "cyan");
  
  const registry = new MCPToolRegistry();
  const orchestrator = new MCPOrchestrator(registry);
  
  // Register different tools
  const tools = ["api-call", "file-read", "cache-lookup"];
  tools.forEach((toolName, index) => {
    registry.registerTool(toolName, {
      name: toolName,
      description: `Simulates ${toolName} operation`,
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        log(`  [${toolName}] Starting operation...`, "yellow");
        await new Promise(resolve => setTimeout(resolve, 1000));
        log(`  [${toolName}] Operation completed ✓`, "green");
        return {
          success: true,
          data: { tool: toolName },
          usage: { duration: 1000 }
        };
      }
    });
  });
  
  log("\nExecuting 3 different tools concurrently...", "blue");
  const startTime = Date.now();
  
  // Execute different tools concurrently
  await Promise.all([
    orchestrator.executeTool("api-call", {}),
    orchestrator.executeTool("file-read", {}),
    orchestrator.executeTool("cache-lookup", {})
  ]);
  
  const totalTime = Date.now() - startTime;
  
  log(`\n✅ All operations completed in ${totalTime}ms", "green");
  
  if (totalTime < 1500) {
    log("  ✓ Tools executed in parallel (time < 1500ms)", "green");
    log("  ✓ Different tools don't block each other", "green");
  } else {
    log("  ✗ Tools executed sequentially (time >= 1500ms)", "red");
  }
}

/**
 * Demo 3: Error Handling and Recovery
 * Shows how semaphores handle errors gracefully
 */
async function demoErrorHandling() {
  log("\n🛡️ Demo 3: Error Handling with Semaphores", "cyan");
  log("━".repeat(50), "cyan");
  
  const registry = new MCPToolRegistry();
  const semaphoreManager = new SemaphoreManager();
  const orchestrator = new MCPOrchestrator(registry, undefined, semaphoreManager);
  
  let callCount = 0;
  
  // Register a tool that fails on second call
  registry.registerTool("flaky-service", {
    name: "flaky-service",
    description: "Simulates a flaky service",
    inputSchema: { type: "object", properties: {} },
    execute: async (args) => {
      callCount++;
      const id = args.id;
      log(`  [${id}] Attempt ${callCount}...`, "yellow");
      
      if (callCount === 2) {
        log(`  [${id}] Service failed! ✗`, "red");
        throw new Error("Service temporarily unavailable");
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      log(`  [${id}] Service call succeeded ✓`, "green");
      
      return {
        success: true,
        data: { call: callCount },
        usage: { duration: 500 }
      };
    }
  });
  
  log("\nExecuting 3 service calls (2nd will fail)...", "blue");
  
  // Execute multiple calls
  const results = await Promise.allSettled([
    orchestrator.executeTool("flaky-service", { id: "Call-1" }),
    orchestrator.executeTool("flaky-service", { id: "Call-2" }),
    orchestrator.executeTool("flaky-service", { id: "Call-3" })
  ]);
  
  log("\n📊 Results:", "magenta");
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const success = result.value.success;
      log(`  Call-${index + 1}: ${success ? "✓ Success" : "✗ Failed"} - ${result.value.error?.message || "OK"}`,
        success ? "green" : "red");
    }
  });
  
  // Show semaphore stats
  const stats = semaphoreManager.getStats("tool:flaky-service");
  log("\n📈 Semaphore Statistics:", "magenta");
  log(`  Total operations: ${stats.totalOperations}`);
  log(`  Active operations: ${stats.activeOperations}`);
  log(`  Average wait time: ${stats.averageWaitTime.toFixed(2)}ms`);
  log(`  Peak queue depth: ${stats.peakQueueDepth}`);
}

/**
 * Main demo runner
 */
async function main() {
  log("🚀 NeuroLink Semaphore Demo", "cyan");
  log("=".repeat(50), "cyan");
  log("This demo showcases the semaphore pattern that prevents race conditions");
  log("while allowing maximum parallelism for different operations.\n");
  
  try {
    // Run all demos
    await demoRaceConditionPrevention();
    await demoParallelExecution();
    await demoErrorHandling();
    
    log("\n✨ All demos completed successfully!", "green");
    log("\n💡 Key Takeaways:", "magenta");
    log("  • Same tool executions are serialized to prevent race conditions");
    log("  • Different tools can execute in parallel for maximum performance");
    log("  • Errors are handled gracefully without blocking other operations");
    log("  • Semaphore statistics provide insights into execution patterns");
    
  } catch (error) {
    log(`\n❌ Demo error: ${error.message}`, "red");
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);