# Configuration Module Refactoring

**Status**: `[ ]` Not started  
**Priority**: 🔴 High  
**Estimated Effort**: 4-6 hours  
**Prerequisites**: 01-global-imports.md, 02-core-module.md must be completed

## Objective

Refactor the configuration module (`src/lib/config/`) to achieve strict TypeScript compliance, convert interfaces to types, improve backup/restore system typing, and enhance configuration validation.

## Files to Modify

### Main Configuration Files

- `src/lib/config/configManager.ts` - Main configuration manager
- `src/lib/config/types.ts` - Configuration type definitions
- `src/lib/config/conversationMemoryConfig.ts` - Memory configuration

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/config-module
git add -A
git commit -m "Backup before config module refactor"
```

### Step 2: Refactor Configuration Types

**File**: `src/lib/config/types.ts`

#### 2.1 Convert Interfaces to Types

```typescript
import type {
  UnknownRecord,
  JsonValue,
  JsonObject,
  ErrorInfo,
} from "../types/common";
import type { AIProviderName } from "../core/types";

// ❌ Current (if using interfaces)
// export interface NeuroLinkConfig {

// ✅ Convert to type
export type NeuroLinkConfig = {
  version: string;
  providers: Record<AIProviderName, ProviderConfig>;
  models: Record<string, ModelConfig>;
  mcp: MCPConfig;
  analytics: AnalyticsConfig;
  evaluation: EvaluationConfig;
  conversation: ConversationConfig;
  proxy?: ProxyConfig;
  telemetry?: TelemetryConfig;
  lastUpdated: number;
  environment: Environment;
};

export type Environment = "development" | "staging" | "production" | "test";

// Provider Configuration
export type ProviderConfig = {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  timeout: number;
  retries: number;
  models: string[];
  defaultModel?: string;
  headers?: Record<string, string>;
  metadata: ProviderMetadata;
};

export type ProviderMetadata = {
  priority: number;
  healthChecks: boolean;
  circuitBreaker: boolean;
  fallbackProvider?: AIProviderName;
  region?: string;
  capabilities: string[];
};

// Model Configuration
export type ModelConfig = {
  name: string;
  provider: AIProviderName;
  displayName: string;
  description: string;
  maxTokens: number;
  contextWindow: number;
  costPerToken: TokenCost;
  capabilities: ModelCapability[];
  deprecated: boolean;
  replacementModel?: string;
};

export type ModelCapability =
  | "text-generation"
  | "code-generation"
  | "conversation"
  | "tool-calling"
  | "function-calling"
  | "image-understanding"
  | "streaming";

export type TokenCost = {
  input: number;
  output: number;
  currency: "USD" | "EUR" | "GBP";
};

// MCP Configuration
export type MCPConfig = {
  enabled: boolean;
  discoveryEnabled: boolean;
  servers: Record<string, MCPServerConfig>;
  tools: MCPToolsConfig;
  circuitBreaker: CircuitBreakerConfig;
  healthCheck: HealthCheckConfig;
};

export type MCPServerConfig = {
  name: string;
  enabled: boolean;
  transport: "stdio" | "sse" | "websocket" | "http";
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  timeout: number;
  retries: number;
};

export type MCPToolsConfig = {
  enabled: boolean;
  categories: string[];
  whitelist?: string[];
  blacklist?: string[];
  maxExecutionTime: number;
  maxConcurrentExecutions: number;
};

export type CircuitBreakerConfig = {
  enabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
};

export type HealthCheckConfig = {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
};

// Analytics Configuration
export type AnalyticsConfig = {
  enabled: boolean;
  provider: "internal" | "external";
  endpoint?: string;
  apiKey?: string;
  retention: RetentionConfig;
  privacy: PrivacyConfig;
  metrics: MetricsConfig;
};

export type RetentionConfig = {
  duration: number; // days
  aggregation: "daily" | "hourly";
  compression: boolean;
};

export type PrivacyConfig = {
  anonymizeIPs: boolean;
  hashUserIds: boolean;
  excludePrompts: boolean;
  excludeResponses: boolean;
};

export type MetricsConfig = {
  performance: boolean;
  usage: boolean;
  errors: boolean;
  costs: boolean;
};

// Evaluation Configuration
export type EvaluationConfig = {
  enabled: boolean;
  provider: AIProviderName;
  model: string;
  criteria: EvaluationCriteria;
  thresholds: EvaluationThresholds;
  caching: EvaluationCaching;
};

export type EvaluationCriteria = {
  relevance: boolean;
  accuracy: boolean;
  completeness: boolean;
  coherence: boolean;
  creativity: boolean;
  domainSpecific: boolean;
};

export type EvaluationThresholds = {
  relevance: number;
  accuracy: number;
  completeness: number;
  overall: number;
};

export type EvaluationCaching = {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // entries
};

// Conversation Configuration
export type ConversationConfig = {
  memory: ConversationMemoryConfig;
  context: ContextConfig;
  summarization: SummarizationConfig;
};

export type ConversationMemoryConfig = {
  enabled: boolean;
  maxMessages: number;
  maxTokens: number;
  persistence: PersistenceConfig;
  compression: CompressionConfig;
};

export type PersistenceConfig = {
  enabled: boolean;
  storage: "file" | "database" | "memory";
  path?: string;
  encryption: boolean;
};

export type CompressionConfig = {
  enabled: boolean;
  algorithm: "gzip" | "brotli" | "lz4";
  threshold: number; // bytes
};

export type ContextConfig = {
  windowSize: number;
  overlap: number;
  prioritization: "recency" | "relevance" | "importance";
};

export type SummarizationConfig = {
  enabled: boolean;
  provider: AIProviderName;
  model: string;
  threshold: number; // messages
  strategy: "extractive" | "abstractive";
};

// Proxy Configuration
export type ProxyConfig = {
  enabled: boolean;
  host: string;
  port: number;
  protocol: "http" | "https" | "socks5";
  auth?: ProxyAuth;
  bypass?: string[];
};

export type ProxyAuth = {
  username: string;
  password: string;
};

// Telemetry Configuration
export type TelemetryConfig = {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  sampling: SamplingConfig;
  privacy: TelemetryPrivacyConfig;
};

export type SamplingConfig = {
  rate: number; // 0.0 to 1.0
  strategy: "random" | "deterministic";
};

export type TelemetryPrivacyConfig = {
  anonymize: boolean;
  excludePrompts: boolean;
  excludeResponses: boolean;
  hashIdentifiers: boolean;
};

// Backup and Restore Types
export type BackupInfo = {
  id: string;
  timestamp: number;
  version: string;
  reason: string;
  size: number;
  checksum: string;
  metadata: BackupMetadata;
};

export type BackupMetadata = {
  environment: Environment;
  configVersion: string;
  createdBy: string;
  automatic: boolean;
  tags?: string[];
};

export type BackupRestoreResult = {
  success: boolean;
  backupId: string;
  restoredAt: number;
  changes: ConfigurationChange[];
  error?: ErrorInfo;
};

export type ConfigurationChange = {
  path: string;
  operation: "added" | "modified" | "removed";
  oldValue?: JsonValue;
  newValue?: JsonValue;
};

// Validation Types
export type ConfigValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
};

export type ValidationError = {
  path: string;
  code: ValidationErrorCode;
  message: string;
  details?: UnknownRecord;
};

export type ValidationWarning = {
  path: string;
  code: ValidationWarningCode;
  message: string;
  suggestion?: string;
};

export type ValidationSuggestion = {
  path: string;
  message: string;
  suggestedValue: JsonValue;
};

export type ValidationErrorCode =
  | "REQUIRED_FIELD_MISSING"
  | "INVALID_TYPE"
  | "INVALID_VALUE"
  | "INVALID_FORMAT"
  | "DEPENDENCY_NOT_MET"
  | "CIRCULAR_DEPENDENCY"
  | "DEPRECATED_FIELD"
  | "UNKNOWN_FIELD";

export type ValidationWarningCode =
  | "DEPRECATED_VALUE"
  | "SUBOPTIMAL_CONFIGURATION"
  | "MISSING_RECOMMENDED_FIELD"
  | "HIGH_RESOURCE_USAGE"
  | "SECURITY_CONCERN";

// Configuration Update Types
export type ConfigUpdateOptions = {
  createBackup: boolean;
  validate: boolean;
  merge: boolean;
  reason: string;
  silent: boolean;
  dryRun: boolean;
};

export type ConfigUpdateResult = {
  success: boolean;
  changes: ConfigurationChange[];
  backupId?: string;
  validation?: ConfigValidationResult;
  error?: ErrorInfo;
  timing: {
    duration: number;
    backupTime?: number;
    validationTime?: number;
    updateTime?: number;
  };
};

// Default Configuration
export const DEFAULT_CONFIG: NeuroLinkConfig = {
  version: "1.0.0",
  environment: "development",
  providers: {},
  models: {},
  mcp: {
    enabled: false,
    discoveryEnabled: false,
    servers: {},
    tools: {
      enabled: true,
      categories: [],
      maxExecutionTime: 30000,
      maxConcurrentExecutions: 5,
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
    },
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      retries: 3,
    },
  },
  analytics: {
    enabled: false,
    provider: "internal",
    retention: {
      duration: 30,
      aggregation: "daily",
      compression: true,
    },
    privacy: {
      anonymizeIPs: true,
      hashUserIds: true,
      excludePrompts: false,
      excludeResponses: false,
    },
    metrics: {
      performance: true,
      usage: true,
      errors: true,
      costs: true,
    },
  },
  evaluation: {
    enabled: false,
    provider: "openai" as AIProviderName,
    model: "gpt-4o-mini",
    criteria: {
      relevance: true,
      accuracy: true,
      completeness: true,
      coherence: false,
      creativity: false,
      domainSpecific: false,
    },
    thresholds: {
      relevance: 7.0,
      accuracy: 8.0,
      completeness: 7.0,
      overall: 7.5,
    },
    caching: {
      enabled: true,
      ttl: 3600,
      maxSize: 1000,
    },
  },
  conversation: {
    memory: {
      enabled: true,
      maxMessages: 50,
      maxTokens: 4000,
      persistence: {
        enabled: false,
        storage: "memory",
        encryption: false,
      },
      compression: {
        enabled: false,
        algorithm: "gzip",
        threshold: 1024,
      },
    },
    context: {
      windowSize: 10,
      overlap: 2,
      prioritization: "recency",
    },
    summarization: {
      enabled: false,
      provider: "openai" as AIProviderName,
      model: "gpt-4o-mini",
      threshold: 20,
      strategy: "abstractive",
    },
  },
  lastUpdated: Date.now(),
};
```

### Step 3: Refactor Configuration Manager

**File**: `src/lib/config/configManager.ts`

#### 3.1 Improve Type Safety

```typescript
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "../utils/logger";
import type {
  NeuroLinkConfig,
  BackupInfo,
  BackupMetadata,
  ConfigValidationResult,
  ConfigUpdateOptions,
  ConfigUpdateResult,
  ValidationError,
  ValidationWarning,
  ConfigurationChange,
  DEFAULT_CONFIG,
  Environment,
} from "./types";
import type { UnknownRecord, JsonValue, ErrorInfo } from "../types/common";

const { readFile, writeFile, readdir, mkdir, unlink, access } = fs;

export type ConfigManagerOptions = {
  configPath: string;
  backupDir: string;
  maxBackups: number;
  encryptionKey?: string;
  autoValidate: boolean;
};

export class NeuroLinkConfigManager {
  private configPath: string;
  private backupDir: string;
  private maxBackups: number;
  private encryptionKey?: string;
  private autoValidate: boolean;
  private config: NeuroLinkConfig | null = null;
  private configCache = new Map<
    string,
    { data: NeuroLinkConfig; timestamp: number; checksum: string }
  >();

  constructor(options?: Partial<ConfigManagerOptions>) {
    const defaults: ConfigManagerOptions = {
      configPath: ".neurolink.config",
      backupDir: ".neurolink.backups",
      maxBackups: 10,
      autoValidate: true,
    };

    const finalOptions = { ...defaults, ...options };

    this.configPath = finalOptions.configPath;
    this.backupDir = finalOptions.backupDir;
    this.maxBackups = finalOptions.maxBackups;
    this.encryptionKey = finalOptions.encryptionKey;
    this.autoValidate = finalOptions.autoValidate;
  }

  async loadConfig(): Promise<NeuroLinkConfig> {
    try {
      if (!this.config) {
        this.config = await this.readConfigFile();
      }
      return this.config;
    } catch (error) {
      logger.warn(
        `Failed to load config, using defaults: ${(error as Error).message}`,
      );
      this.config = { ...DEFAULT_CONFIG };
      return this.config;
    }
  }

  async updateConfig(
    updates: Partial<NeuroLinkConfig>,
    options: ConfigUpdateOptions = {
      createBackup: true,
      validate: true,
      merge: true,
      reason: "update",
      silent: false,
      dryRun: false,
    },
  ): Promise<ConfigUpdateResult> {
    const startTime = Date.now();
    let backupTime = 0;
    let validationTime = 0;
    let updateTime = 0;

    try {
      // Create backup if requested
      let backupId: string | undefined;
      if (options.createBackup && !options.dryRun) {
        const backupStart = Date.now();
        backupId = await this.createBackup(options.reason);
        backupTime = Date.now() - backupStart;

        if (!options.silent) {
          logger.info(`💾 Backup created: ${backupId}`);
        }
      }

      // Load existing configuration
      const existing = await this.loadConfig();

      // Merge or replace based on options
      const newConfig: NeuroLinkConfig = options.merge
        ? this.mergeConfigs(existing, updates)
        : { ...DEFAULT_CONFIG, ...updates, lastUpdated: Date.now() };

      // Validate configuration if requested
      let validation: ConfigValidationResult | undefined;
      if (options.validate || this.autoValidate) {
        const validationStart = Date.now();
        validation = await this.validateConfig(newConfig);
        validationTime = Date.now() - validationStart;

        if (!validation.valid) {
          throw new Error(
            `Configuration validation failed: ${validation.errors.map((e) => e.message).join(", ")}`,
          );
        }
      }

      // Calculate changes
      const changes = this.calculateChanges(existing, newConfig);

      // Dry run - return without persisting
      if (options.dryRun) {
        return {
          success: true,
          changes,
          backupId,
          validation,
          timing: {
            duration: Date.now() - startTime,
            backupTime: backupTime || undefined,
            validationTime: validationTime || undefined,
            updateTime: 0,
          },
        };
      }

      // Persist configuration
      const updateStart = Date.now();
      await this.persistConfig(newConfig);
      updateTime = Date.now() - updateStart;

      this.config = newConfig;
      this.clearCache();

      if (!options.silent) {
        logger.info(
          `✅ Configuration updated successfully (${changes.length} changes)`,
        );
      }

      return {
        success: true,
        changes,
        backupId,
        validation,
        timing: {
          duration: Date.now() - startTime,
          backupTime: backupTime || undefined,
          validationTime: validationTime || undefined,
          updateTime,
        },
      };
    } catch (error) {
      // Auto-restore on failure if backup was created
      if (options.createBackup && !options.dryRun) {
        try {
          await this.restoreLatestBackup();
          if (!options.silent) {
            logger.info("🔄 Auto-restored from backup due to error");
          }
        } catch (restoreError) {
          logger.error(
            `Failed to auto-restore: ${(restoreError as Error).message}`,
          );
        }
      }

      const errorInfo: ErrorInfo = {
        message: (error as Error).message,
        code: "CONFIG_UPDATE_FAILED",
        details: { originalError: (error as Error).stack },
      };

      return {
        success: false,
        changes: [],
        error: errorInfo,
        timing: {
          duration: Date.now() - startTime,
          backupTime: backupTime || undefined,
          validationTime: validationTime || undefined,
          updateTime,
        },
      };
    }
  }

  async validateConfig(
    config: NeuroLinkConfig,
  ): Promise<ConfigValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Validate required fields
      this.validateRequiredFields(config, errors);

      // Validate provider configurations
      this.validateProviders(config, errors, warnings);

      // Validate model configurations
      this.validateModels(config, errors, warnings);

      // Validate MCP configuration
      this.validateMCPConfig(config, errors, warnings);

      // Validate analytics configuration
      this.validateAnalyticsConfig(config, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        path: "root",
        code: "INVALID_TYPE",
        message: `Configuration validation error: ${(error as Error).message}`,
      });

      return {
        valid: false,
        errors,
        warnings,
      };
    }
  }

  private mergeConfigs(
    existing: NeuroLinkConfig,
    updates: Partial<NeuroLinkConfig>,
  ): NeuroLinkConfig {
    return {
      ...existing,
      ...updates,
      providers: { ...existing.providers, ...updates.providers },
      models: { ...existing.models, ...updates.models },
      mcp: { ...existing.mcp, ...updates.mcp },
      analytics: { ...existing.analytics, ...updates.analytics },
      evaluation: { ...existing.evaluation, ...updates.evaluation },
      conversation: { ...existing.conversation, ...updates.conversation },
      lastUpdated: Date.now(),
    };
  }

  private calculateChanges(
    oldConfig: NeuroLinkConfig,
    newConfig: NeuroLinkConfig,
  ): ConfigurationChange[] {
    const changes: ConfigurationChange[] = [];

    // Simple implementation - in practice, this would be more sophisticated
    const oldJson = JSON.stringify(oldConfig, null, 2);
    const newJson = JSON.stringify(newConfig, null, 2);

    if (oldJson !== newJson) {
      changes.push({
        path: "root",
        operation: "modified",
        oldValue: oldConfig as JsonValue,
        newValue: newConfig as JsonValue,
      });
    }

    return changes;
  }

  private validateRequiredFields(
    config: NeuroLinkConfig,
    errors: ValidationError[],
  ): void {
    if (!config.version) {
      errors.push({
        path: "version",
        code: "REQUIRED_FIELD_MISSING",
        message: "Configuration version is required",
      });
    }

    if (!config.environment) {
      errors.push({
        path: "environment",
        code: "REQUIRED_FIELD_MISSING",
        message: "Environment is required",
      });
    }
  }

  private validateProviders(
    config: NeuroLinkConfig,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    if (!config.providers || typeof config.providers !== "object") {
      errors.push({
        path: "providers",
        code: "INVALID_TYPE",
        message: "Providers configuration must be an object",
      });
      return;
    }

    // Validate each provider configuration
    for (const [providerName, providerConfig] of Object.entries(
      config.providers,
    )) {
      if (!providerConfig.models || !Array.isArray(providerConfig.models)) {
        errors.push({
          path: `providers.${providerName}.models`,
          code: "INVALID_TYPE",
          message: "Provider models must be an array",
        });
      }

      if (providerConfig.timeout && providerConfig.timeout < 1000) {
        warnings.push({
          path: `providers.${providerName}.timeout`,
          code: "SUBOPTIMAL_CONFIGURATION",
          message: "Timeout less than 1 second may cause frequent failures",
          suggestion: "Consider using a timeout of at least 10 seconds",
        });
      }
    }
  }

  private validateModels(
    config: NeuroLinkConfig,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Implementation for model validation
  }

  private validateMCPConfig(
    config: NeuroLinkConfig,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Implementation for MCP validation
  }

  private validateAnalyticsConfig(
    config: NeuroLinkConfig,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Implementation for analytics validation
  }

  // ... rest of the implementation with proper typing
}
```

## Validation Checklist

### Type Safety Checks

- [ ] All interfaces converted to types
- [ ] Configuration types properly defined
- [ ] Backup system properly typed
- [ ] Validation system type-safe

### Functionality Checks

- [ ] Configuration loading works
- [ ] Backup/restore system functions
- [ ] Validation catches errors correctly
- [ ] Configuration merging works properly

### Integration Checks

- [ ] Core module uses config types
- [ ] CLI uses configuration system
- [ ] Providers use configuration

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit src/lib/config/*.ts

# Test configuration module
pnpm test test/config/

# Test configuration validation
node -e "
const { NeuroLinkConfigManager } = require('./dist/lib/config/configManager.js');
const manager = new NeuroLinkConfigManager();
manager.validateConfig({}).then(result => console.log('Validation:', result));
"
```

## Success Criteria

- ✅ All interfaces converted to types
- ✅ Configuration system properly typed
- ✅ Backup/restore system type-safe
- ✅ Validation system comprehensive
- ✅ No `any` types in configuration module
- ✅ Integration with core module works
- ✅ All configuration tests pass

## Next Steps

After completing this refactor:

1. **07-types-module.md** - Enhance type system
2. **08-utils-module.md** - Refactor utilities
3. Update CLI to use new configuration types
4. Update providers to use new configuration

## Impact Assessment

**High Impact**:

- Configuration becomes type-safe
- Validation system more robust
- Backup/restore system more reliable

**Medium Impact**:

- CLI configuration commands improve
- Provider configuration becomes easier

**Low Impact**:

- Runtime performance (minimal change)
- Core functionality (preserved)
