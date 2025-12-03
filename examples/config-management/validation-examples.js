#!/usr/bin/env node

/**
 * Configuration Validation Examples
 * Demonstrates comprehensive config validation with suggestions
 */

const { ConfigManager } = require("@juspay/neurolink/config");

async function validationExamplesDemo() {
  console.log("✅ Configuration Validation Examples");
  console.log("===================================\n");

  const configManager = new ConfigManager({
    validation: { strict: false, warnings: true },
  });

  try {
    console.log("1. Valid configuration...");
    const validConfig = {
      providers: {
        google: { enabled: true, model: "gemini-2.5-pro", timeout: 30000 },
      },
      performance: { timeout: 30000, retries: 3, cacheEnabled: true },
    };

    const validation1 = await configManager.validateConfig(validConfig);
    console.log(`✅ Valid: ${validation1.isValid}`);

    console.log("\n2. Configuration with warnings...");
    const warningConfig = {
      providers: {
        google: { enabled: true, model: "gemini-pro", timeout: 5000 }, // Old model
      },
      performance: { timeout: 5000 }, // Low timeout
    };

    const validation2 = await configManager.validateConfig(warningConfig);
    console.log(`⚠️  Valid: ${validation2.isValid}`);
    if (validation2.warnings.length > 0) {
      console.log("Warnings:");
      validation2.warnings.forEach((w) => console.log(`   - ${w.message}`));
    }
    if (validation2.suggestions.length > 0) {
      console.log("Suggestions:");
      validation2.suggestions.forEach((s) => console.log(`   💡 ${s}`));
    }

    console.log("\n3. Invalid configuration...");
    const invalidConfig = {
      providers: {
        google: { enabled: true, timeout: -1000 }, // Invalid timeout
      },
      performance: { retries: -1 }, // Invalid retries
    };

    const validation3 = await configManager.validateConfig(invalidConfig);
    console.log(`❌ Valid: ${validation3.isValid}`);
    if (validation3.errors.length > 0) {
      console.log("Errors:");
      validation3.errors.forEach((e) =>
        console.log(`   - ${e.field}: ${e.message}`),
      );
    }

    console.log("\n🎉 Validation examples completed!");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
  }
}

if (require.main === module) {
  validationExamplesDemo();
}

module.exports = { validationExamplesDemo };
