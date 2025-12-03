#!/usr/bin/env node

/**
 * Error Recovery Demo
 * Demonstrates automatic error recovery and manual recovery procedures
 */

const { ConfigManager } = require("@juspay/neurolink/config");

async function errorRecoveryDemo() {
  console.log("🚨 Error Recovery Demo");
  console.log("====================\n");

  const configManager = new ConfigManager({
    backup: { enabled: true, retention: 5 },
    validation: { strict: false },
  });

  try {
    console.log("1. Creating initial valid configuration...");
    await configManager.updateConfig({
      providers: { google: { enabled: true, model: "gemini-2.5-pro" } },
      performance: { timeout: 30000, retries: 3 },
    });
    console.log("✅ Valid configuration created");

    console.log(
      "\n2. Attempting invalid config update (triggers auto-recovery)...",
    );
    try {
      await configManager.updateConfig(
        {
          performance: { timeout: -5000 }, // Invalid negative timeout
        },
        { validateBeforeUpdate: true },
      );
    } catch (error) {
      console.log("❌ Invalid config rejected - auto-recovery triggered");
      console.log(`   Error: ${error.message}`);
    }

    console.log("\n3. Simulating config corruption...");
    // Simulate corrupted config file
    const corruptedConfig = { invalid: "data", missing: "required fields" };
    try {
      await configManager.forceUpdateConfig(corruptedConfig); // Force update without validation
    } catch (error) {
      console.log("🔧 Corruption detected - initiating recovery...");
      await configManager.autoRestore();
      console.log("✅ Auto-recovery completed");
    }

    console.log("\n4. Manual recovery procedures...");
    const backups = await configManager.listBackups();
    if (backups.length > 0) {
      console.log(`📁 Available backups: ${backups.length}`);
      const latestBackup = backups[backups.length - 1];
      await configManager.restoreFromBackup(latestBackup.filename);
      console.log(`🔄 Restored from: ${latestBackup.filename}`);
    }

    console.log("\n5. Health check and verification...");
    const health = await configManager.checkHealth();
    console.log(
      `🏥 Config Health: ${health.isHealthy ? "Healthy" : "Issues detected"}`,
    );

    if (health.issues.length > 0) {
      console.log("Issues found:");
      health.issues.forEach((issue) => console.log(`   - ${issue}`));
    }

    console.log("\n🎉 Error recovery demo completed!");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
  }
}

if (require.main === module) {
  errorRecoveryDemo();
}

module.exports = { errorRecoveryDemo };
