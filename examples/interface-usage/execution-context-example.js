#!/usr/bin/env node

/**
 * ExecutionContext Rich Context Demo
 * Demonstrates the new ExecutionContext interface with 15+ fields
 */

const { createMCPRegistry } = require("@juspay/neurolink/mcp");
const crypto = require("crypto");

async function executionContextDemo() {
  console.log("🌟 Rich ExecutionContext Demo");
  console.log("============================\n");

  try {
    // Create MCP registry
    const registry = await createMCPRegistry({
      autoDiscovery: true,
      caching: true,
    });

    console.log("1. Basic ExecutionContext...");

    // Basic context with identity
    const basicContext = {
      sessionId: "session-123",
      userId: "user-456",
      aiProvider: "google-ai",
    };

    if (registry.executeTool) {
      const result = await registry.executeTool(
        "test-tool",
        { input: "basic test" },
        basicContext,
      );
      console.log("✅ Basic context execution completed");
    }

    console.log("\n2. Rich ExecutionContext with Performance Options...");

    // Rich context with caching and performance
    const richContext = {
      sessionId: "session-456",
      userId: "user-789",
      aiProvider: "google-ai",

      // Performance optimization
      cacheOptions: {
        enabled: true,
        ttl: 300,
        key: "analysis-cache",
        strategy: "memory",
        compression: true,
        tags: ["analysis", "user-789"],
      },

      // Execution control
      priority: "high",
      timeout: 15000,
      retries: 2,

      // Security & permissions
      permissions: ["read", "execute", "cache"],

      // Monitoring & debugging
      correlationId: crypto.randomUUID(),
      requestId: `req-${Date.now()}`,
      userAgent: "NeuroLink-Example/1.0",
      clientVersion: "3.0.1",
      environment: "development",

      // Custom metadata
      metadata: {
        department: "research",
        project: "ai-enhancement",
        experimentId: "exp-001",
        debugLevel: "verbose",
        traceEnabled: true,
      },
    };

    console.log("📊 Context Details:");
    console.log(`   - Session: ${richContext.sessionId}`);
    console.log(`   - User: ${richContext.userId}`);
    console.log(`   - Provider: ${richContext.aiProvider}`);
    console.log(
      `   - Cache: ${richContext.cacheOptions.enabled ? "enabled" : "disabled"}`,
    );
    console.log(`   - Priority: ${richContext.priority}`);
    console.log(`   - Timeout: ${richContext.timeout}ms`);
    console.log(`   - Permissions: ${richContext.permissions.join(", ")}`);
    console.log(`   - Correlation ID: ${richContext.correlationId}`);

    if (registry.executeTool) {
      const result = await registry.executeTool(
        "analysis-tool",
        {
          data: "complex analysis data",
          options: { deep: true },
        },
        richContext,
      );
      console.log("✅ Rich context execution completed");
    }

    console.log("\n3. Fallback & Error Recovery Context...");

    // Context with fallback options
    const fallbackContext = {
      sessionId: "session-789",
      userId: "user-012",
      aiProvider: "google-ai",

      // Fallback configuration
      fallbackOptions: {
        enabled: true,
        providers: ["google-ai", "openai", "anthropic"],
        maxRetries: 3,
        retryDelay: 1000,
        circuitBreaker: true,
        healthCheck: true,
      },

      // Error handling
      timeout: 30000,
      retries: 5,

      metadata: {
        operation: "critical-task",
        requiresReliability: true,
      },
    };

    console.log("🔄 Fallback Configuration:");
    console.log(`   - Enabled: ${fallbackContext.fallbackOptions.enabled}`);
    console.log(
      `   - Providers: ${fallbackContext.fallbackOptions.providers.join(", ")}`,
    );
    console.log(
      `   - Max Retries: ${fallbackContext.fallbackOptions.maxRetries}`,
    );
    console.log(
      `   - Circuit Breaker: ${fallbackContext.fallbackOptions.circuitBreaker}`,
    );

    if (registry.executeTool) {
      const result = await registry.executeTool(
        "reliable-tool",
        {
          task: "critical operation",
        },
        fallbackContext,
      );
      console.log("✅ Fallback context execution completed");
    }

    console.log("\n4. Context Inheritance Pattern...");

    // Base context for common settings
    const baseContext = {
      userId: "user-345",
      environment: "production",
      clientVersion: "3.0.1",
      permissions: ["read", "execute"],

      cacheOptions: {
        enabled: true,
        ttl: 600,
      },

      metadata: {
        application: "neurolink-demo",
        version: "1.0.0",
      },
    };

    // Extend base context for specific operations
    const analysisContext = {
      ...baseContext,
      sessionId: "analysis-session",
      aiProvider: "google-ai",
      priority: "high",

      metadata: {
        ...baseContext.metadata,
        operation: "data-analysis",
        requiresML: true,
      },
    };

    const generationContext = {
      ...baseContext,
      sessionId: "generation-session",
      aiProvider: "openai",
      priority: "normal",

      metadata: {
        ...baseContext.metadata,
        operation: "text-generation",
        creative: true,
      },
    };

    console.log("🧬 Context Inheritance:");
    console.log("   Analysis Context:");
    console.log(`     - Provider: ${analysisContext.aiProvider}`);
    console.log(`     - Priority: ${analysisContext.priority}`);
    console.log(`     - Operation: ${analysisContext.metadata.operation}`);

    console.log("   Generation Context:");
    console.log(`     - Provider: ${generationContext.aiProvider}`);
    console.log(`     - Priority: ${generationContext.priority}`);
    console.log(`     - Operation: ${generationContext.metadata.operation}`);

    console.log("\n🎉 ExecutionContext demo completed successfully!");
    console.log("\n💡 Key Benefits:");
    console.log("   - Rich context information for better tool execution");
    console.log("   - Performance optimization through caching and priorities");
    console.log("   - Error recovery with fallback providers");
    console.log("   - Comprehensive monitoring and debugging support");
    console.log("   - Flexible metadata system for custom requirements");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  executionContextDemo();
}

module.exports = { executionContextDemo };
