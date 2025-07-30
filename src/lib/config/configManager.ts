/**
 * NeuroLink Config Manager with Backup/Restore System
 * Industry standard configuration management with safety mechanisms
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "../utils/logger.js";
import type {
  NeuroLinkConfig,
  ProviderConfig,
  BackupInfo,
  BackupMetadata,
  ConfigValidationResult,
  ConfigUpdateOptions,
  DEFAULT_CONFIG,
} from "./types.js";

const { readFile, writeFile, readdir, mkdir, unlink, access } = fs;

/**
 * Enhanced Config Manager with automatic backup/restore capabilities
 */
export class NeuroLinkConfigManager {
  private configPath = ".neurolink.config";
  private backupDir = ".neurolink.backups";
  private config: NeuroLinkConfig | null = null;
  private configCache = new Map<
    string,
    { data: NeuroLinkConfig; timestamp: number }
  >();

  /**
   * Load configuration with caching
   */
  async loadConfig(): Promise<NeuroLinkConfig> {
    if (!this.config) {
      this.config = await this.readConfigFile();
    }
    return this.config;
  }

  /**
   * Update configuration with automatic backup
   */
  async updateConfig(
    updates: Partial<NeuroLinkConfig>,
    options: ConfigUpdateOptions = {},
  ): Promise<void> {
    const {
      createBackup = true,
      validate = true,
      merge = true,
      reason = "update",
      silent = false,
    } = options;

    // ALWAYS create backup before updating (unless explicitly disabled)
    if (createBackup) {
      await this.createBackup(reason);
      if (!silent) {
        logger.info("💾 Backup created before config update");
      }
    }

    const existing = await this.loadConfig();

    // Merge or replace based on options
    this.config = merge
      ? { ...existing, ...updates, lastUpdated: Date.now() }
      : ({ ...updates, lastUpdated: Date.now() } as NeuroLinkConfig);

    // Validate config if requested
    if (validate) {
      const validation = await this.validateConfig(this.config);
      if (!validation.valid) {
        throw new Error(
          `Config validation failed: ${validation.errors.join(", ")}`,
        );
      }
    }

    try {
      await this.persistConfig(this.config);
      if (!silent) {
        logger.info("✅ Configuration updated successfully");
      }
    } catch (error) {
      // Auto-restore on failure
      if (createBackup) {
        await this.restoreLatestBackup();
        if (!silent) {
          logger.info("🔄 Auto-restored from backup due to error");
        }
      }
      throw new Error(
        `Config update failed, restored from backup: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Create a backup with metadata
   */
  async createBackup(reason = "manual"): Promise<string> {
    await this.ensureBackupDirectory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `neurolink-config-${timestamp}.js`;
    const backupPath = path.join(this.backupDir, backupFilename);

    const currentConfig = await this.loadConfig();
    const configHash = this.generateConfigHash(currentConfig);

    const backupMetadata: BackupMetadata = {
      reason,
      timestamp: Date.now(),
      version: currentConfig.configVersion || "unknown",
      originalPath: this.configPath,
      hash: configHash,
      size: JSON.stringify(currentConfig).length,
      createdBy: "NeuroLinkConfigManager",
    };

    const backupContent = `// NeuroLink Config Backup - ${reason}
// Created: ${new Date().toISOString()}
// Reason: ${reason}
// Hash: ${configHash}
export const metadata = ${JSON.stringify(backupMetadata, null, 2)};
export default ${JSON.stringify(currentConfig, null, 2)};`;

    await writeFile(backupPath, backupContent, "utf-8");
    return backupPath;
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    await this.ensureBackupDirectory();

    try {
      const files = await readdir(this.backupDir);
      const backupFiles = files.filter(
        (f) => f.startsWith("neurolink-config-") && f.endsWith(".js"),
      );

      const backups: BackupInfo[] = [];

      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const content = await readFile(filePath, "utf-8");
          const metadata = this.extractMetadataFromBackup(content);
          const config = this.extractConfigFromBackup(content);

          backups.push({
            filename: file,
            path: filePath,
            metadata,
            config,
          });
        } catch (error) {
          logger.warn(
            `Failed to read backup ${file}:`,
            (error as Error).message,
          );
        }
      }

      return backups.sort(
        (a, b) => b.metadata.timestamp - a.metadata.timestamp,
      );
    } catch (error) {
      logger.warn("Failed to list backups:", (error as Error).message);
      return [];
    }
  }

  /**
   * Restore from specific backup
   */
  async restoreFromBackup(backupFilename: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupFilename);

    // Create backup of current config before restore
    await this.createBackup("pre-restore");

    try {
      const content = await readFile(backupPath, "utf-8");
      const restoredConfig = this.extractConfigFromBackup(content);

      // Validate restored config
      const validation = await this.validateConfig(restoredConfig);
      if (!validation.valid) {
        throw new Error(
          `Backup config is invalid: ${validation.errors.join(", ")}`,
        );
      }

      this.config = restoredConfig;
      await this.persistConfig(this.config);

      logger.info(`✅ Config restored from backup: ${backupFilename}`);
    } catch (error) {
      throw new Error(
        `Failed to restore from backup ${backupFilename}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Restore from latest backup
   */
  async restoreLatestBackup(): Promise<void> {
    const backups = await this.listBackups();
    if (backups.length === 0) {
      throw new Error("No backups available for restore");
    }

    await this.restoreFromBackup(backups[0].filename);
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(keepCount = 10): Promise<void> {
    const backups = await this.listBackups();
    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      try {
        await unlink(backup.path);
        logger.info(`🗑️ Deleted old backup: ${backup.filename}`);
      } catch (error) {
        logger.warn(
          `Failed to delete backup ${backup.filename}:`,
          (error as Error).message,
        );
      }
    }
  }

  /**
   * Update provider status
   */
  async updateProviderStatus(
    providerId: string,
    status: Partial<ProviderConfig>,
  ): Promise<void> {
    const config = await this.loadConfig();
    if (!config.providers) {
      config.providers = {};
    }

    config.providers[providerId] = {
      ...config.providers[providerId],
      ...status,
      lastCheck: Date.now(),
    };

    await this.updateConfig(
      { providers: config.providers },
      { reason: `provider-${providerId}-update` },
    );
  }

  /**
   * Validate configuration
   */
  async validateConfig(
    config: NeuroLinkConfig,
  ): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Basic validation
    if (!config || typeof config !== "object") {
      result.errors.push("Config must be a valid object");
      result.valid = false;
      return result;
    }

    // Version validation
    if (config.configVersion && typeof config.configVersion !== "string") {
      result.errors.push("configVersion must be a string");
      result.valid = false;
    }

    // Provider validation
    if (config.providers) {
      if (typeof config.providers !== "object") {
        result.errors.push("providers must be an object");
        result.valid = false;
      } else {
        // Check for default provider
        if (!config.providers.defaultProvider) {
          result.warnings.push("No default provider specified");
          result.suggestions.push(
            'Consider setting providers.defaultProvider to "googleAi"',
          );
        }
      }
    }

    // Performance validation
    if (config.performance?.cache?.ttlMs) {
      if (config.performance.cache.ttlMs < 1000) {
        result.warnings.push("Cache TTL is very low (< 1 second)");
      }
    }

    return result;
  }

  /**
   * Generate default configuration
   */
  async generateDefaultConfig(): Promise<NeuroLinkConfig> {
    const { DEFAULT_CONFIG } = await import("./types.js");
    return {
      ...DEFAULT_CONFIG,
      lastUpdated: Date.now(),
    };
  }

  // Private helper methods

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      logger.warn(
        "Failed to create backup directory:",
        (error as Error).message,
      );
    }
  }

  private async readConfigFile(): Promise<NeuroLinkConfig> {
    try {
      // Check if config file exists
      await access(this.configPath);
      const content = await readFile(this.configPath, "utf-8");

      // Parse as JavaScript module
      const configMatch = content.match(/export default ([\s\S]+);?$/);
      if (configMatch) {
        const configJson = configMatch[1].trim();
        return JSON.parse(configJson);
      }

      throw new Error("Invalid config file format");
    } catch (error) {
      logger.info("Config file not found, generating default...");
      return await this.generateDefaultConfig();
    }
  }

  private async persistConfig(config: NeuroLinkConfig): Promise<void> {
    const configContent = `export default ${JSON.stringify(config, null, 2)};`;
    await writeFile(this.configPath, configContent, "utf-8");

    // Clear cache after persisting
    this.config = config;
  }

  private generateConfigHash(config: NeuroLinkConfig): string {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto
      .createHash("sha256")
      .update(configString)
      .digest("hex")
      .substring(0, 8);
  }

  private extractMetadataFromBackup(content: string): BackupMetadata {
    const metadataMatch = content.match(/export const metadata = ([\s\S]+?);/);
    if (metadataMatch) {
      return JSON.parse(metadataMatch[1]);
    }
    throw new Error("No metadata found in backup file");
  }

  private extractConfigFromBackup(content: string): NeuroLinkConfig {
    const configMatch = content.match(/export default ([\s\S]+);$/);
    if (configMatch) {
      return JSON.parse(configMatch[1]);
    }
    throw new Error("No config found in backup file");
  }
}
