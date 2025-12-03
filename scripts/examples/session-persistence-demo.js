#!/usr/bin/env node

/**
 * NeuroLink Session Persistence Demo
 * Demonstrates session storage, recovery, and continuous tool calling
 */

import { MCPOrchestrator } from "../../dist/lib/mcp/orchestrator.js";
import { MCPToolRegistry } from "../../dist/lib/mcp/toolRegistry.js";
import { SessionManager } from "../../dist/lib/mcp/session-manager.js";
import fs from "fs/promises";
import path from "path";

// Color utilities
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
 * Demo 1: Session Creation and Persistence
 */
async function demoSessionPersistence() {
  log("\n💾 Demo 1: Session Creation and Persistence", "cyan");
  log("━".repeat(50), "cyan");
  
  // Create session manager with persistence
  const sessionManager = new SessionManager(
    60000,    // 1 minute TTL for demo
    30000,    // 30 second cleanup
    false,    // No auto cleanup
    true      // Enable persistence
  );
  
  // Initialize with custom directory
  await sessionManager.initialize({
    directory: ".demo/sessions",
    snapshotInterval: 5000,  // 5 seconds for demo
    enableChecksum: true
  });
  
  // Create registry and orchestrator
  const registry = new MCPToolRegistry();
  const orchestrator = new MCPOrchestrator(
    registry,
    undefined,
    undefined,
    sessionManager
  );
  
  // Register a demo tool
  registry.registerTool("counter", {
    name: "counter",
    description: "Increments a counter",
    inputSchema: { type: "object", properties: {} },
    execute: async (args, context) => {
      const session = await orchestrator.getSession(context.sessionId);
      const currentCount = await orchestrator.getSessionState(context.sessionId, "count") || 0;
      const newCount = currentCount + 1;
      await orchestrator.setSessionState(context.sessionId, "count", newCount);
      
      return {
        success: true,
        data: { count: newCount },
        usage: { duration: 10 }
      };
    }
  });
  
  // Create a session and execute tools
  log("\n1️⃣ Creating new session and executing tools...", "blue");
  const session = await orchestrator.createSession(
    { userId: "demo-user-1", aiProvider: "demo" },
    { metadata: { tags: ["demo", "persistence"] } }
  );
  
  log(`  ✓ Created session: ${session.id}`, "green");
  
  // Execute tool multiple times
  for (let i = 0; i < 3; i++) {
    const result = await orchestrator.executeTool("counter", {}, {
      sessionId: session.id
    });
    log(`  ✓ Counter value: ${result.data.count}`, "yellow");
  }
  
  // Set some additional state
  await orchestrator.setSessionState(session.id, "username", "DemoUser");
  await orchestrator.setSessionState(session.id, "preferences", {
    theme: "dark",
    language: "en"
  });
  
  log("\n📁 Session files created in .demo/sessions/", "magenta");
  
  // List session files
  const files = await fs.readdir(".demo/sessions");
  for (const file of files) {
    if (file.endsWith(".json")) {
      log(`  • ${file}`, "gray");
    }
  }
  
  return { sessionId: session.id, finalCount: 3 };
}

/**
 * Demo 2: Process Restart Simulation
 */
async function demoProcessRestart(previousSessionId) {
  log("\n🔄 Demo 2: Simulating Process Restart", "cyan");
  log("━".repeat(50), "cyan");
  
  log("\n💤 Simulating process shutdown...", "red");
  log("  (In real scenario, the process would terminate)", "gray");
  
  // Simulate restart by creating new instances
  log("\n🚀 Starting new process...", "green");
  
  // Create new session manager (simulating fresh start)
  const newSessionManager = new SessionManager(
    60000,    // Same config as before
    30000,
    false,
    true
  );
  
  // Initialize - this will load sessions from disk
  log("\n📂 Loading sessions from disk...", "blue");
  await newSessionManager.initialize({
    directory: ".demo/sessions",
    snapshotInterval: 5000,
    enableChecksum: true
  });
  
  // Create new registry and orchestrator
  const registry = new MCPToolRegistry();
  const orchestrator = new MCPOrchestrator(
    registry,
    undefined,
    undefined,
    newSessionManager
  );
  
  // Re-register the counter tool
  registry.registerTool("counter", {
    name: "counter",
    description: "Increments a counter",
    inputSchema: { type: "object", properties: {} },
    execute: async (args, context) => {
      const currentCount = await orchestrator.getSessionState(context.sessionId, "count") || 0;
      const newCount = currentCount + 1;
      await orchestrator.setSessionState(context.sessionId, "count", newCount);
      
      return {
        success: true,
        data: { count: newCount },
        usage: { duration: 10 }
      };
    }
  });
  
  // Try to retrieve the previous session
  log(`\n🔍 Looking for session: ${previousSessionId}`, "yellow");
  const recoveredSession = await orchestrator.getSession(previousSessionId);
  
  if (recoveredSession) {
    log("  ✓ Session recovered from disk!", "green");
    
    // Retrieve state
    const count = await orchestrator.getSessionState(previousSessionId, "count");
    const username = await orchestrator.getSessionState(previousSessionId, "username");
    const preferences = await orchestrator.getSessionState(previousSessionId, "preferences");
    
    log("\n📊 Recovered Session State:", "magenta");
    log(`  • Count: ${count}`, "gray");
    log(`  • Username: ${username}`, "gray");
    log(`  • Preferences: ${JSON.stringify(preferences)}`, "gray");
    log(`  • Tool History: ${recoveredSession.toolHistory.length} executions`, "gray");
    
    // Continue using the session
    log("\n🔢 Continuing counter from recovered session...", "blue");
    for (let i = 0; i < 2; i++) {
      const result = await orchestrator.executeTool("counter", {}, {
        sessionId: previousSessionId
      });
      log(`  ✓ Counter value: ${result.data.count}`, "yellow");
    }
  } else {
    log("  ✗ Session not found (may have expired)", "red");
  }
}

/**
 * Demo 3: Session Expiration and Cleanup
 */
async function demoSessionCleanup() {
  log("\n🧹 Demo 3: Session Expiration and Cleanup", "cyan");
  log("━".repeat(50), "cyan");
  
  const sessionManager = new SessionManager(
    2000,     // 2 second TTL for demo
    1000,     // 1 second cleanup
    false,    // Manual cleanup
    true      // Enable persistence
  );
  
  await sessionManager.initialize({
    directory: ".demo/sessions",
    snapshotInterval: 1000,
    retentionPeriod: 5000  // 5 seconds for demo
  });
  
  // Create short-lived sessions
  log("\n⏱️ Creating sessions with 2-second TTL...", "blue");
  
  const session1 = await sessionManager.createSession({
    sessionId: "short-lived-1",
    userId: "demo-user"
  });
  
  const session2 = await sessionManager.createSession({
    sessionId: "short-lived-2",
    userId: "demo-user"
  });
  
  log(`  ✓ Created sessions: ${session1.id}, ${session2.id}`, "green");
  
  // Wait for expiration
  log("\n⏳ Waiting 3 seconds for sessions to expire...", "yellow");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Run cleanup
  log("\n🧹 Running cleanup...", "blue");
  const cleaned = await sessionManager.cleanup();
  
  log(`  ✓ Cleaned ${cleaned} expired sessions`, "green");
  
  // Verify files are removed
  const remainingFiles = await fs.readdir(".demo/sessions");
  log(`\n📁 Remaining session files: ${remainingFiles.filter(f => f.endsWith('.json')).length}`, "magenta");
}

/**
 * Clean up demo directory
 */
async function cleanupDemo() {
  try {
    await fs.rm(".demo", { recursive: true, force: true });
    log("\n🧹 Demo directory cleaned up", "gray");
  } catch (error) {
    // Directory might not exist
  }
}

/**
 * Main demo runner
 */
async function main() {
  log("🚀 NeuroLink Session Persistence Demo", "cyan");
  log("=".repeat(50), "cyan");
  log("This demo showcases session persistence across process restarts");
  log("and automatic cleanup of expired sessions.\n");
  
  try {
    // Clean up any previous demo data
    await cleanupDemo();
    
    // Run demos
    const { sessionId } = await demoSessionPersistence();
    await demoProcessRestart(sessionId);
    await demoSessionCleanup();
    
    log("\n✨ All demos completed successfully!", "green");
    log("\n💡 Key Features Demonstrated:", "magenta");
    log("  • Sessions persist to disk with atomic writes");
    log("  • Session state and tool history survive process restarts");
    log("  • Checksum validation ensures data integrity");
    log("  • Automatic cleanup removes expired sessions");
    log("  • Snapshots provide periodic backups");
    
    // Final cleanup
    await cleanupDemo();
    
  } catch (error) {
    log(`\n❌ Demo error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);