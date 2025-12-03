#!/usr/bin/env node

/**
 * Backup & Restore Demo
 * Demonstrates automatic backup creation and manual restoration
 */

const { ConfigManager } = require("@juspay/neurolink/config");
const fs = require("fs").promises;

async function backupRestoreDemo() {
  console.log("💾 NeuroLink Backup & Restore Demo");
  console.log("==================================\n");

  const configManager = new ConfigManager({
    backup: {
      enabled: true,
      retention: 7,
      directory: ".neurolink.backups",
    },
  });

  try {
    console.log("1. Creating initial configuration...");
    const config1 = {
      providers: {
        google: { enabled: true, model: "gemini-2.5-pro" },
      },
      performance: { timeout: 30000 },
    };

    await configManager.updateConfig(config1);
    console.log("✅ Initial config created with backup");

    console.log("\n2. Making several configuration changes...");

    // Change 1: Add OpenAI
    await configManager.updateConfig(
      {
        providers: {
          openai: { enabled: true, model: "gpt-4o" },
        },
      },
      { mergeStrategy: "deep-merge" },
    );
    console.log("✅ Added OpenAI provider");

    // Change 2: Update performance settings
    await configManager.updateConfig(
      {
        performance: {
          timeout: 25000,
          retries: 5,
        },
      },
      { mergeStrategy: "deep-merge" },
    );
    console.log("✅ Updated performance settings");

    // Change 3: Add analytics
    await configManager.updateConfig(
      {
        analytics: {
          enabled: true,
          trackUsage: true,
        },
      },
      { mergeStrategy: "deep-merge" },
    );
    console.log("✅ Added analytics configuration");

    console.log("\n3. Listing all backups...");
    const backups = await configManager.listBackups();
    console.log(`📁 Found ${backups.length} backup(s):`);

    backups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.filename}`);
      console.log(`      - Reason: ${backup.reason}`);
      console.log(`      - Size: ${backup.size} bytes`);
      console.log(
        `      - Created: ${new Date(backup.timestamp).toLocaleString()}`,
      );
    });

    console.log("\n4. Simulating configuration corruption...");

    try {
      // Simulate invalid config that triggers auto-restore
      await configManager.updateConfig({
        performance: {
          timeout: -1000, // Invalid timeout
        },
      });
    } catch (error) {
      console.log("❌ Invalid config detected - auto-restore triggered");
      console.log(`   Error: ${error.message}`);
    }

    console.log("\n5. Manual backup creation...");
    const manualBackupPath =
      await configManager.createBackup("manual-demo-backup");
    console.log(`✅ Manual backup created: ${manualBackupPath}`);

    console.log("\n6. Manual restoration demo...");

    // Get the first backup (oldest)
    const oldestBackup = backups[0];
    if (oldestBackup) {
      console.log(`🔄 Restoring from: ${oldestBackup.filename}`);
      await configManager.restoreFromBackup(oldestBackup.filename);
      console.log("✅ Configuration restored successfully");

      // Verify restoration
      const restoredConfig = await configManager.getConfig();
      console.log("📋 Restored configuration:");
      console.log(
        `   - Providers: ${Object.keys(restoredConfig.providers || {}).join(", ")}`,
      );
      console.log(
        `   - Timeout: ${restoredConfig.performance?.timeout || "not set"}`,
      );
    }

    console.log("\n7. Backup integrity verification...");
    const verification = await configManager.verifyBackups();
    console.log("🔍 Backup Verification Results:");
    console.log(`   - Total backups: ${verification.total}`);
    console.log(`   - Valid backups: ${verification.valid}`);
    console.log(`   - Corrupted backups: ${verification.corrupted}`);

    if (verification.issues.length > 0) {
      console.log("⚠️  Issues found:");
      verification.issues.forEach((issue) => {
        console.log(`   - ${issue}`);
      });
    }

    console.log("\n🎉 Backup & restore demo completed successfully!");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  backupRestoreDemo();
}

module.exports = { backupRestoreDemo };
