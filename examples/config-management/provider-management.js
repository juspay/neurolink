#!/usr/bin/env node

/**
 * Provider Management Demo
 * Demonstrates advanced provider configuration and management
 */

const { ConfigManager } = require("@juspay/neurolink/config");

async function providerManagementDemo() {
  console.log("🔧 Provider Management Demo");
  console.log("===========================\n");

  const configManager = new ConfigManager();

  try {
    console.log("1. Setting up multiple providers...");

    const providerConfig = {
      providers: {
        google: {
          enabled: true,
          model: "gemini-2.5-pro",
          apiKey: process.env.GOOGLE_AI_API_KEY,
          timeout: 30000,
          priority: 1,
          costPerToken: 0.000002,
        },
        openai: {
          enabled: true,
          model: "gpt-4o",
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 25000,
          priority: 2,
          costPerToken: 0.000006,
        },
        anthropic: {
          enabled: false,
          model: "claude-3-sonnet",
          apiKey: process.env.ANTHROPIC_API_KEY,
          timeout: 35000,
          priority: 3,
          costPerToken: 0.000003,
        },
      },
    };

    await configManager.updateConfig(providerConfig);
    console.log("✅ Multiple providers configured");

    console.log("\n2. Checking provider status...");
    const providers = await configManager.checkProviderHealth();

    providers.forEach((provider) => {
      const status = provider.enabled
        ? provider.apiKey
          ? "🟢 Ready"
          : "🟡 No API Key"
        : "🔴 Disabled";
      console.log(`   ${provider.name}: ${status}`);
    });

    console.log("\n3. Dynamic provider enabling/disabling...");

    // Enable Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      await configManager.updateConfig(
        {
          providers: {
            anthropic: { enabled: true },
          },
        },
        { mergeStrategy: "deep-merge" },
      );
      console.log("✅ Enabled Anthropic provider");
    }

    // Disable OpenAI temporarily
    await configManager.updateConfig(
      {
        providers: {
          openai: { enabled: false },
        },
      },
      { mergeStrategy: "deep-merge" },
    );
    console.log("⏸️  Temporarily disabled OpenAI");

    console.log("\n4. Provider failover configuration...");

    const failoverConfig = {
      providers: {
        primary: "google",
        fallback: ["anthropic", "openai"],
        failoverDelay: 1000,
        maxRetries: 3,
        healthCheckInterval: 60000,
      },
    };

    await configManager.updateConfig(failoverConfig, {
      mergeStrategy: "deep-merge",
    });
    console.log("✅ Failover configuration set");

    console.log("\n5. Cost optimization settings...");

    const costConfig = {
      costOptimization: {
        enabled: true,
        maxCostPerRequest: 0.01,
        preferCheaperProviders: true,
        budgetAlert: 10.0,
      },
    };

    await configManager.updateConfig(costConfig, {
      mergeStrategy: "deep-merge",
    });
    console.log("✅ Cost optimization enabled");

    console.log("\n🎉 Provider management demo completed!");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  providerManagementDemo();
}

module.exports = { providerManagementDemo };
