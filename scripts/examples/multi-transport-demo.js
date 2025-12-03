#!/usr/bin/env node

/**
 * NeuroLink Multi-Transport Demo
 * Demonstrates stdio, SSE, and HTTP transport capabilities
 */

import { MCPOrchestrator } from "../../dist/lib/mcp/orchestrator.js";
import { TransportConfig } from "../../dist/lib/mcp/transport-manager.js";

// Configuration for different transport types
const transportConfigs = {
  stdio: {
    type: "stdio",
    command: "node",
    args: ["../test-servers/echo-server.js"],
    cwd: process.cwd()
  },
  sse: {
    type: "sse",
    url: "http://localhost:8080/sse",
    headers: {
      "Authorization": "Bearer demo-token"
    },
    maxRetryTime: 5000,
    withCredentials: false
  },
  http: {
    type: "http",
    url: "http://localhost:8080/api",
    headers: {
      "X-API-Key": "demo-key"
    },
    timeout: 30
  }
};

async function demonstrateTransport(type, config) {
  console.log(`\n🚀 Testing ${type.toUpperCase()} Transport...`);
  console.log("━".repeat(50));
  
  const orchestrator = new MCPOrchestrator();
  
  try {
    // Initialize transport manager with auto-reconnect
    orchestrator.initializeTransportManager({
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      healthCheckInterval: 5000
    });
    
    // Connect using specified transport
    console.log(`📡 Connecting to ${config.type} transport...`);
    const client = await orchestrator.connectTransport(config);
    
    // Check connection status
    const status = orchestrator.getTransportStatus();
    console.log("✅ Connected successfully!");
    console.log(`📊 Status:`, {
      connected: status.connected,
      type: status.type,
      lastConnected: status.lastConnected
    });
    
    // Simulate some work
    console.log("⚡ Performing operations...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if still connected
    if (orchestrator.isTransportConnected()) {
      console.log("✅ Transport still connected");
    }
    
    // Disconnect
    console.log("🔌 Disconnecting...");
    await orchestrator.disconnectTransport();
    console.log("✅ Disconnected successfully");
    
  } catch (error) {
    console.error(`❌ Error with ${type} transport:`, error.message);
  }
}

async function demonstrateReconnection() {
  console.log("\n🔄 Testing Reconnection Logic...");
  console.log("━".repeat(50));
  
  const orchestrator = new MCPOrchestrator();
  
  // Initialize with aggressive reconnection settings
  orchestrator.initializeTransportManager({
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 500,
    healthCheckInterval: 2000
  });
  
  try {
    // Connect to a server that will "fail"
    const config = {
      type: "stdio",
      command: "node",
      args: ["../test-servers/flaky-server.js"] // Simulates connection issues
    };
    
    console.log("📡 Connecting to flaky server...");
    await orchestrator.connectTransport(config);
    console.log("✅ Initial connection successful");
    
    // Monitor status changes
    let previousStatus = orchestrator.getTransportStatus();
    const statusMonitor = setInterval(() => {
      const currentStatus = orchestrator.getTransportStatus();
      if (currentStatus.connected !== previousStatus.connected ||
          currentStatus.reconnectAttempts !== previousStatus.reconnectAttempts) {
        console.log("📊 Status update:", {
          connected: currentStatus.connected,
          reconnectAttempts: currentStatus.reconnectAttempts,
          lastError: currentStatus.lastError?.message
        });
        previousStatus = currentStatus;
      }
    }, 500);
    
    // Wait for reconnection attempts
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    clearInterval(statusMonitor);
    await orchestrator.disconnectTransport();
    
  } catch (error) {
    console.error("❌ Reconnection demo error:", error.message);
  }
}

async function main() {
  console.log("🎯 NeuroLink Multi-Transport Demo");
  console.log("=".repeat(50));
  console.log("This demo showcases the new multi-transport capabilities:");
  console.log("- stdio transport for local processes");
  console.log("- SSE transport for server-sent events");
  console.log("- HTTP transport for REST-like communication");
  console.log("- Automatic reconnection with exponential backoff");
  console.log("- Health monitoring and recovery");
  
  // Note: These demos require actual servers to be running
  // In a real scenario, you would start the servers first
  
  // Demonstrate stdio transport
  if (process.argv.includes("--stdio")) {
    await demonstrateTransport("stdio", transportConfigs.stdio);
  }
  
  // Demonstrate SSE transport
  if (process.argv.includes("--sse")) {
    await demonstrateTransport("sse", transportConfigs.sse);
  }
  
  // Demonstrate HTTP transport
  if (process.argv.includes("--http")) {
    await demonstrateTransport("http", transportConfigs.http);
  }
  
  // Demonstrate reconnection
  if (process.argv.includes("--reconnect")) {
    await demonstrateReconnection();
  }
  
  if (!process.argv.slice(2).length) {
    console.log("\n📌 Usage:");
    console.log("  node multi-transport-demo.js [options]");
    console.log("\n📌 Options:");
    console.log("  --stdio      Test stdio transport");
    console.log("  --sse        Test SSE transport");
    console.log("  --http       Test HTTP transport");
    console.log("  --reconnect  Test reconnection logic");
    console.log("\n📌 Example:");
    console.log("  node multi-transport-demo.js --stdio --reconnect");
  }
  
  console.log("\n✨ Demo complete!");
}

// Run the demo
main().catch(console.error);