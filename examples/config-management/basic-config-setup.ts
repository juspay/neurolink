#!/usr/bin/env node

/**
 * Basic Configuration Setup Example
 * Demonstrates enterprise configuration management with automatic backup/restore
 */

import { ConfigManager } from "@juspay/neurolink";
import { fileURLToPath } from "url";

async function basicConfigSetup() {
  console.log("🏗️ NeuroLink Configuration Management Demo");
  console.log("==========================================\n");

  try {
    // Initialize config manager with enterprise features
    const configManager = new ConfigManager({
      backup: {
        enabled: true,
        retention: 30,
        directory: ".neurolink.backups",
      },
      validation: {
        strict: false,
        warnings: true,
      },
    });

    console.log("1. Creating initial configuration...");

    // Create basic configuration
    const initialConfig = {
      providers: {
        google: {
          enabled: true,
          model: "gemini-2.5-pro",
          timeout: 30000,
        },
        openai: {
          enabled: true,
          model: "gpt-4o",
          timeout: 25000,
        },
      },
      performance: {
        timeout: 30000,
        retries: 3,
        cacheEnabled: true,
        cacheTTL: 300,
      },
      analytics: {
        enabled: true,
        trackUsage: true,
        trackPerformance: true,
      },
    };

    // Update config (automatic backup created)
    await configManager.updateConfig(initialConfig);
    console.log("✅ Configuration created with automatic backup");

    console.log("\n2. Listing available backups...");
    const backups = await configManager.listBackups();
    console.log(`📁 Found ${backups.length} backup(s):`);
    backups.forEach((backup: { filename: string; reason: string }) => {
      console.log(`   - ${backup.filename} (${backup.reason})`);
    });

    console.log("\n3. Updating provider configuration...");

    // Update specific provider (creates another backup)
    await configManager.updateConfig(
      {
        providers: {
          google: {
            model: "gemini-2.5-flash", // Switch to faster model
          },
        },
      },
      {
        mergeStrategy: "deep-merge",
      },
    );
    console.log("✅ Provider configuration updated");

    console.log("\n4. Validating current configuration...");
    const validation = await configManager.validateConfig();

    if (validation.isValid) {
      console.log("✅ Configuration is valid");
    } else {
      console.log("❌ Configuration has issues:");
      validation.errors.forEach((error: { field: string; message: string }) => {
        console.log(`   - ${error.field}: ${error.message}`);
      });
    }

    if (validation.suggestions.length > 0) {
      console.log("💡 Suggestions:");
      validation.suggestions.forEach((suggestion: string) => {
        console.log(`   - ${suggestion}`);
      });
    }

    console.log("\n5. Getting configuration status...");
    const status = await configManager.getStatus();
    console.log("📊 Config Status:");
    console.log(`   - Valid: ${status.isValid}`);
    console.log(`   - Last Updated: ${status.lastUpdated}`);
    console.log(`   - Backup Count: ${status.backupCount}`);
    console.log(
      `   - Provider Status: ${Object.keys(status.providers).length} configured`,
    );

    console.log("\n🎉 Configuration management demo completed successfully!");
  } catch (error) {
    const err = error as Error & { errors?: unknown[] };
    console.error("❌ Configuration demo failed:", err.message);

    if (err.name === "ConfigValidationError") {
      console.error("Validation errors:", err.errors);
    }

    process.exit(1);
  }
}

// CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  basicConfigSetup();
}

export { basicConfigSetup };
