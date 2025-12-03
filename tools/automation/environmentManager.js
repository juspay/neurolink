#!/usr/bin/env node
/**
 * Advanced Environment Manager for NeuroLink Project
 *
 * Safely manages .env files with backup, merge, and validation capabilities.
 * Ensures no existing configuration is lost during updates.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

class EnvironmentManager {
  constructor() {
    this.envFile = ".env";
    this.envExample = ".env.example";
    this.backupDir = "./env-backups";
    this.validationRules = {
      required: [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_AI_API_KEY",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
      ],
      optional: [
        "GOOGLE_APPLICATION_CREDENTIALS",
        "GOOGLE_SERVICE_ACCOUNT_KEY",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "HUGGINGFACE_API_KEY",
        "MISTRAL_API_KEY",
      ],
    };
  }

  async setupEnvironment() {
    console.log("🔧 Starting safe environment setup...");
    console.log("📋 This process will:");
    console.log("  ✅ Backup existing .env file (if present)");
    console.log("  ✅ Add missing variables from .env.example");
    console.log("  ✅ Preserve all existing configurations");
    console.log("  ✅ Validate provider configurations");

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Check if .env already exists
      const envExists = await this.fileExists(this.envFile);

      if (envExists) {
        console.log("\n📋 Existing .env file detected - entering safe mode");
        await this.safeEnvironmentUpdate();
      } else {
        console.log("\n📄 No .env file found - creating from template");
        await this.createFromExample();
      }

      // Validate environment
      const validation = await this.validateEnvironment();
      this.reportValidation(validation);

      console.log("\n🎉 Environment setup complete!");
      return validation;
    } catch (error) {
      console.error("❌ Environment setup failed:", error.message);
      throw error;
    }
  }

  async safeEnvironmentUpdate() {
    console.log("🔄 Performing safe environment update...");

    // Create backup first
    const backupFile = await this.backupExistingEnv();
    console.log(`💾 Backup created: ${backupFile}`);

    // Parse existing and template files
    const existing = await this.parseEnvFile(this.envFile);
    const template = await this.parseEnvFile(this.envExample);

    console.log(
      `📊 Current .env has ${Object.keys(existing).length} variables`,
    );
    console.log(`📊 Template has ${Object.keys(template).length} variables`);

    // Find new variables to add
    const newVars = Object.keys(template).filter((key) => !(key in existing));
    const preservedVars = Object.keys(existing);

    if (newVars.length > 0) {
      console.log(`\n📝 Adding ${newVars.length} new variables:`);
      newVars.forEach((key) => {
        const value = template[key];
        const displayValue = this.maskSensitiveValue(key, value);
        console.log(`  + ${key}=${displayValue}`);
      });

      // Merge configurations (existing values take priority)
      const merged = { ...template, ...existing };

      // Write updated .env file
      await this.writeEnvFile(merged);
      console.log("✅ Updated .env file with new variables");
    } else {
      console.log("✅ No new variables to add - .env is up to date");
    }

    console.log(
      `\n📊 Final .env has ${preservedVars.length + newVars.length} variables:`,
    );
    console.log(`  - ${preservedVars.length} preserved from existing`);
    console.log(`  - ${newVars.length} added from template`);
  }

  async createFromExample() {
    console.log("📄 Creating .env from template...");

    try {
      await fs.copyFile(this.envExample, this.envFile);
      console.log("✅ .env file created from template");
      console.log("💡 Please edit .env to add your API keys and credentials");
    } catch (error) {
      console.error("❌ Failed to create .env from template:", error.message);
      throw error;
    }
  }

  async backupExistingEnv() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(this.backupDir, `.env.backup.${timestamp}`);

    try {
      // Copy the file
      await fs.copyFile(this.envFile, backupFile);

      // Create integrity hash
      const content = await fs.readFile(this.envFile, "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex");
      await fs.writeFile(`${backupFile}.hash`, hash);

      // Create metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        originalPath: path.resolve(this.envFile),
        backupPath: path.resolve(backupFile),
        hash,
        size: content.length,
        variableCount: content
          .split("\n")
          .filter(
            (line) =>
              line.trim() && !line.trim().startsWith("#") && line.includes("="),
          ).length,
      };

      await fs.writeFile(
        `${backupFile}.metadata.json`,
        JSON.stringify(metadata, null, 2),
      );

      return backupFile;
    } catch (error) {
      console.error("❌ Failed to backup .env file:", error.message);
      throw error;
    }
  }

  async parseEnvFile(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const env = {};

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        // Parse key=value pairs
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          env[key.trim()] = value.trim();
        }
      }

      return env;
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(`⚠️  File ${filePath} not found`);
        return {};
      }
      throw error;
    }
  }

  async writeEnvFile(envObject) {
    try {
      // Read the template to preserve structure and comments
      const templateContent = await fs.readFile(this.envExample, "utf-8");
      const lines = templateContent.split("\n");
      const outputLines = [];

      for (const line of lines) {
        const trimmed = line.trim();

        // Preserve comments and empty lines
        if (!trimmed || trimmed.startsWith("#")) {
          outputLines.push(line);
          continue;
        }

        // Handle key=value pairs
        const match = trimmed.match(/^([^=]+)=/);
        if (match) {
          const key = match[1].trim();
          if (envObject[key] !== undefined) {
            outputLines.push(`${key}=${envObject[key]}`);
          } else {
            outputLines.push(line); // Keep template line as placeholder
          }
        } else {
          outputLines.push(line);
        }
      }

      await fs.writeFile(this.envFile, outputLines.join("\n"));
    } catch (error) {
      console.error("❌ Failed to write .env file:", error.message);
      throw error;
    }
  }

  async validateEnvironment() {
    console.log("\n🔍 Validating environment configuration...");

    const env = await this.parseEnvFile(this.envFile);

    const validation = {
      configured: [],
      missing: [],
      providers: {
        openai: !!env.OPENAI_API_KEY,
        anthropic: !!env.ANTHROPIC_API_KEY,
        "google-ai": !!env.GOOGLE_AI_API_KEY,
        vertex: !!(
          env.GOOGLE_APPLICATION_CREDENTIALS ||
          env.GOOGLE_SERVICE_ACCOUNT_KEY ||
          env.GOOGLE_AUTH_CLIENT_EMAIL
        ),
        bedrock: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
        azure: !!(env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_ENDPOINT),
        huggingface: !!env.HUGGINGFACE_API_KEY,
        ollama: await this.checkOllamaStatus(),
        mistral: !!env.MISTRAL_API_KEY,
      },
      warnings: [],
      recommendations: [],
    };

    // Count configured providers
    validation.configured = Object.entries(validation.providers)
      .filter(([, configured]) => configured)
      .map(([name]) => name);

    validation.missing = Object.entries(validation.providers)
      .filter(([, configured]) => !configured)
      .map(([name]) => name);

    // Add warnings and recommendations
    if (validation.configured.length === 0) {
      validation.warnings.push(
        "No AI providers configured - add at least one API key",
      );
    }

    if (validation.configured.length < 3) {
      validation.recommendations.push(
        "Configure 3+ providers for better reliability",
      );
    }

    if (!env.OPENAI_API_KEY) {
      validation.recommendations.push(
        "OpenAI is recommended as the primary provider",
      );
    }

    return validation;
  }

  async checkOllamaStatus() {
    try {
      // Try to check if Ollama is running
      const { execSync } = await import("child_process");
      execSync("curl -s http://localhost:11434/api/tags", {
        timeout: 3000,
        stdio: "pipe",
      });
      return true;
    } catch {
      return false;
    }
  }

  reportValidation(validation) {
    console.log("\n📊 ENVIRONMENT VALIDATION RESULTS");
    console.log("=".repeat(50));
    console.log(`✅ Configured providers: ${validation.configured.length}/9`);
    console.log(`⚠️  Missing providers: ${validation.missing.length}/9`);

    if (validation.configured.length > 0) {
      console.log(`\n🟢 Configured providers:`);
      validation.configured.forEach((provider) => {
        console.log(`  ✅ ${provider}`);
      });
    }

    if (validation.missing.length > 0) {
      console.log(`\n🔴 Missing providers:`);
      validation.missing.forEach((provider) => {
        console.log(`  ❌ ${provider}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      validation.warnings.forEach((warning) => {
        console.log(`  ⚠️  ${warning}`);
      });
    }

    if (validation.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      validation.recommendations.forEach((rec) => {
        console.log(`  💡 ${rec}`);
      });
    }

    console.log(
      `\n📈 Environment Score: ${this.calculateScore(validation)}/100`,
    );
  }

  calculateScore(validation) {
    const configuredWeight = 70; // 70% for having providers configured
    const diversityWeight = 20; // 20% for provider diversity
    const bestPracticeWeight = 10; // 10% for following best practices

    const configuredScore =
      (validation.configured.length / 9) * configuredWeight;
    const diversityScore =
      Math.min(validation.configured.length / 3, 1) * diversityWeight;
    const bestPracticeScore = validation.configured.includes("openai")
      ? bestPracticeWeight
      : 0;

    return Math.round(configuredScore + diversityScore + bestPracticeScore);
  }

  maskSensitiveValue(key, value) {
    const sensitiveKeys = ["key", "secret", "token", "password", "credentials"];
    const isSensitive = sensitiveKeys.some((sensitive) =>
      key.toLowerCase().includes(sensitive),
    );

    if (isSensitive && value && value.length > 8) {
      return (
        value.substring(0, 4) +
        "*".repeat(value.length - 8) +
        value.substring(value.length - 4)
      );
    }

    return value;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listBackups() {
    console.log("💾 Available environment backups:");

    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files.filter((file) => file.endsWith(".backup"));

      if (backups.length === 0) {
        console.log("  No backups found");
        return;
      }

      for (const backup of backups) {
        const metadataFile = `${backup}.metadata.json`;

        if (files.includes(metadataFile)) {
          const metadata = JSON.parse(
            await fs.readFile(path.join(this.backupDir, metadataFile), "utf-8"),
          );

          console.log(`  📄 ${backup}`);
          console.log(
            `     Created: ${new Date(metadata.timestamp).toLocaleString()}`,
          );
          console.log(`     Variables: ${metadata.variableCount}`);
          console.log(`     Size: ${metadata.size} bytes`);
        } else {
          console.log(`  📄 ${backup} (no metadata)`);
        }
      }
    } catch (error) {
      console.error("❌ Failed to list backups:", error.message);
    }
  }
}

// Export for use as module
export { EnvironmentManager };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new EnvironmentManager();

  try {
    if (process.argv.includes("--validate")) {
      const validation = await manager.validateEnvironment();
      manager.reportValidation(validation);
    } else if (process.argv.includes("--backup")) {
      if (await manager.fileExists(manager.envFile)) {
        const backupFile = await manager.backupExistingEnv();
        console.log(`✅ Backup created: ${backupFile}`);
      } else {
        console.log("❌ No .env file found to backup");
      }
    } else if (process.argv.includes("--list-backups")) {
      await manager.listBackups();
    } else {
      await manager.setupEnvironment();
    }
  } catch (error) {
    console.error("❌ Environment management failed:", error.message);
    process.exit(1);
  }
}
