# NeuroLink Configuration Patterns

This document provides a comprehensive analysis of NeuroLink's configuration architecture, patterns, and best practices for adding new configuration options.

## Table of Contents

1. [Configuration Architecture Overview](#configuration-architecture-overview)
2. [Configuration Sources and Layering](#configuration-sources-and-layering)
3. [Environment Variable Patterns](#environment-variable-patterns)
4. [Validation Patterns](#validation-patterns)
5. [Default Value Handling](#default-value-handling)
6. [Provider-Specific Configuration](#provider-specific-configuration)
7. [Runtime Configuration](#runtime-configuration)
8. [CLI Configuration System](#cli-configuration-system)
9. [Build Configuration](#build-configuration)
10. [Best Practices](#best-practices)
11. [Configuration Module Template](#configuration-module-template)

---

## Configuration Architecture Overview

NeuroLink employs a **multi-layered configuration architecture** that provides flexibility, type safety, and enterprise-grade configuration management. The architecture consists of:

### Core Configuration Modules

```
src/lib/config/
├── configManager.ts           # Central config manager with backup/restore
├── conversationMemory.ts      # Memory feature configuration
├── taskClassificationConfig.ts # Task classification patterns and weights
└── modelSpecificPrompts.ts    # Model-specific prompt configurations
```

### Supporting Configuration Infrastructure

```
src/lib/core/
├── constants.ts              # Core AI generation defaults
├── modelConfiguration.ts     # Runtime model configuration manager
└── factory.ts                # Provider factory with env var resolution

src/lib/constants/
├── index.ts                  # Unified constants export
├── timeouts.ts               # Timeout constants
├── retry.ts                  # Retry logic constants
├── performance.ts            # Performance thresholds
└── tokens.ts                 # Token limits

src/lib/types/
├── configTypes.ts            # Configuration type definitions
├── conversation.ts           # Conversation memory types
└── observability.ts          # Observability config types

src/lib/utils/
└── providerConfig.ts         # Provider configuration utilities
```

### Key Design Principles

1. **Type Safety**: All configurations have TypeScript type definitions
2. **Immutable Defaults**: Default values are defined as constants
3. **Environment Override**: Environment variables can override defaults
4. **Validation**: Zod schemas validate configuration at runtime
5. **Backup/Restore**: Configuration changes are backed up automatically
6. **Lazy Loading**: Configurations are loaded on first access

---

## Configuration Sources and Layering

NeuroLink supports multiple configuration sources with a clear precedence hierarchy:

### Configuration Precedence (Highest to Lowest)

```
1. Runtime API Parameters    (highest priority)
2. Environment Variables
3. Configuration Files
4. CLI Configuration (~/.neurolink/config.json)
5. SDK Default Values        (lowest priority)
```

### Configuration Source Types

#### 1. Environment Variables

```typescript
// Primary source for credentials and runtime config
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o";
```

#### 2. Configuration Files

```typescript
// .neurolink.config (project root)
// Supports JavaScript export format
export default {
  providers: { defaultProvider: "googleAi" },
  performance: { cache: { ttlMs: 300000 } },
};
```

#### 3. CLI Configuration

```typescript
// ~/.neurolink/config.json (user home directory)
{
  "defaultProvider": "auto",
  "preferences": {
    "outputFormat": "text",
    "temperature": 0.7
  }
}
```

#### 4. SDK Constructor Config

```typescript
// Direct SDK configuration
const neurolink = new NeuroLink({
  conversationMemory: { enabled: true },
  hitl: { enabled: true },
  observability: { langfuse: { enabled: true } },
});
```

---

## Environment Variable Patterns

### Naming Conventions

NeuroLink follows consistent naming patterns for environment variables:

```
PROVIDER_SETTING_NAME
NEUROLINK_FEATURE_OPTION
```

#### Provider Variables

| Pattern                | Example           | Purpose                    |
| ---------------------- | ----------------- | -------------------------- |
| `{PROVIDER}_API_KEY`   | `OPENAI_API_KEY`  | Primary authentication     |
| `{PROVIDER}_MODEL`     | `GOOGLE_AI_MODEL` | Default model selection    |
| `{PROVIDER}_{SETTING}` | `OLLAMA_BASE_URL` | Provider-specific settings |

#### Feature Variables

| Pattern                         | Example                         | Purpose               |
| ------------------------------- | ------------------------------- | --------------------- |
| `NEUROLINK_{FEATURE}_ENABLED`   | `NEUROLINK_MEMORY_ENABLED`      | Feature toggle        |
| `NEUROLINK_{FEATURE}_{SETTING}` | `NEUROLINK_TOKEN_THRESHOLD`     | Feature configuration |
| `NEUROLINK_DEFAULT_{PARAM}`     | `NEUROLINK_DEFAULT_TEMPERATURE` | Default parameters    |

### Environment Variable Access Pattern

```typescript
// Pattern 1: Direct access with fallback
const model = process.env.OPENAI_MODEL || "gpt-4o";

// Pattern 2: Function-based lazy evaluation (recommended for dynamic values)
export function getConversationMemoryDefaults(): ConversationMemoryConfig {
  return {
    enabled: process.env.NEUROLINK_MEMORY_ENABLED === "true",
    maxSessions:
      Number(process.env.NEUROLINK_MEMORY_MAX_SESSIONS) || DEFAULT_MAX_SESSIONS,
  };
}

// Pattern 3: Type-safe parsing with validation
export const ENV_DEFAULTS = {
  maxTokens: (() => {
    if (!process.env.NEUROLINK_DEFAULT_MAX_TOKENS) return undefined;
    const n = parseInt(process.env.NEUROLINK_DEFAULT_MAX_TOKENS, 10);
    return Number.isFinite(n) ? n : undefined;
  })(),
  temperature: process.env.NEUROLINK_DEFAULT_TEMPERATURE
    ? (() => {
        const t = parseFloat(process.env.NEUROLINK_DEFAULT_TEMPERATURE);
        return Number.isFinite(t) ? t : DEFAULT_TEMPERATURE;
      })()
    : DEFAULT_TEMPERATURE,
};
```

### Fallback Environment Variables

Some configurations support multiple environment variable names for flexibility:

```typescript
// From providerConfig.ts
export function createVertexProjectConfig(): ProviderConfigOptions {
  return {
    providerName: "Google Vertex AI",
    envVarName: "GOOGLE_CLOUD_PROJECT_ID",
    fallbackEnvVars: [
      "VERTEX_PROJECT_ID",
      "GOOGLE_VERTEX_PROJECT",
      "GOOGLE_CLOUD_PROJECT",
    ],
    // ...
  };
}
```

---

## Validation Patterns

### Zod Schema Validation

NeuroLink uses Zod for runtime configuration validation:

```typescript
// CLI configuration schema (config.ts)
const ConfigSchema = z.object({
  defaultProvider: z
    .enum(["auto", "openai", "bedrock", "vertex", "anthropic" /* ... */])
    .default("auto"),
  providers: z
    .object({
      openai: z
        .object({
          apiKey: z.string().optional(),
          model: z.string().default("gpt-4"),
          baseURL: z.string().optional(),
        })
        .optional(),
      // ... other providers
    })
    .default({}),
  preferences: z
    .object({
      outputFormat: z.enum(["text", "json", "yaml"]).default("text"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(1).max(64000).optional(),
      enableLogging: z.boolean().default(false),
    })
    .default({}),
});
```

### Provider-Specific Validation (SageMaker Example)

```typescript
// From sagemaker/config.ts
const SageMakerConfigSchema = z.object({
  region: z.string().min(1, "AWS region is required"),
  accessKeyId: z.string().min(1, "AWS access key ID is required"),
  secretAccessKey: z.string().min(1, "AWS secret access key is required"),
  sessionToken: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  endpoint: z.string().url().optional(),
});

// Validation function
export function getSageMakerConfig(region?: string): SageMakerConfig {
  const config = {
    /* ... loaded from env */
  };

  try {
    const validatedConfig = SageMakerConfigSchema.parse(config);
    configCache = validatedConfig; // Cache validated config
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      );
      throw new Error(
        `SageMaker configuration validation failed:\n${errorMessages.join("\n")}`,
      );
    }
    throw error;
  }
}
```

### API Key Format Validation

```typescript
// From providerConfig.ts
export const API_KEY_FORMATS: Record<string, RegExp> = {
  openai: /^sk-[A-Za-z0-9]{48,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9\-_]{95,}$/,
  "google-ai": /^AIza[A-Za-z0-9\-_]{35}$/,
  huggingface: /^hf_[A-Za-z0-9]{37}$/,
  mistral: /^[A-Za-z0-9]{32}$/,
  azure: /^[A-Za-z0-9]{32}$/,
  bedrock: /^[A-Z0-9]{20}$/, // AWS access key ID format
};

export function validateApiKeyFormat(
  providerKey: string,
  apiKey: string,
): boolean {
  const format = API_KEY_FORMATS[providerKey.toLowerCase()];
  if (!format) {
    return apiKey.length > 0; // No format validation, just check non-empty
  }
  return format.test(apiKey);
}
```

### Configuration Validation Result Type

```typescript
// From configTypes.ts
export type ConfigValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
};
```

---

## Default Value Handling

### Centralized Constants

Default values are defined in centralized constant files:

```typescript
// From core/constants.ts
export const DEFAULT_MAX_TOKENS = undefined; // Let providers decide
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TIMEOUT = 60000;
export const DEFAULT_MAX_STEPS = 200;
export const DEFAULT_TOOL_MAX_RETRIES = 2;

// Provider-specific defaults
export const PROVIDER_MAX_TOKENS = {
  anthropic: { default: 64000 },
  openai: { default: 128000 },
  "google-ai": { default: 64000 },
  vertex: { default: 64000 },
  bedrock: { default: 64000 },
  azure: { default: 128000 },
  mistral: { default: 128000 },
  ollama: { default: 64000 },
  litellm: { default: 128000 },
  default: 64000,
};

// Use-case specific defaults
export const PROVIDER_CONFIG = {
  evaluation: {
    maxTokens: 500,
    model: "gemini-2.5-flash",
    temperature: 0.3,
  },
  analysis: {
    maxTokens: 800,
    temperature: 0.5,
  },
  documentation: {
    maxTokens: 12000,
    temperature: 0.4,
  },
};
```

### Default Configuration Objects

```typescript
// From configTypes.ts
export const DEFAULT_CONFIG: NeuroLinkConfig = {
  providers: {
    googleAi: {
      model: "gemini-2.5-pro",
      available: true,
      features: ["streaming", "functionCalling"],
    },
  },
  performance: {
    cache: {
      enabled: true,
      ttlMs: 300000, // 5 minutes
      strategy: "memory",
      maxSize: 1000,
    },
    fallback: {
      enabled: true,
      maxAttempts: 3,
      delayMs: 1000,
      circuitBreaker: true,
    },
    timeoutMs: 30000,
    maxConcurrency: 5,
  },
  analytics: {
    enabled: true,
    trackTokens: true,
    trackCosts: true,
    trackPerformance: true,
    retention: { days: 30, maxEntries: 10000 },
  },
  tools: {
    disableBuiltinTools: false,
    allowCustomTools: true,
    maxToolsPerProvider: 100,
    enableMCPTools: true,
  },
  configVersion: "3.0.1",
};
```

### Model-Tier Default Pattern

```typescript
// From modelConfiguration.ts
export const MODEL_NAMES = {
  OPENAI: {
    FAST: "gpt-4o-mini",
    BALANCED: "gpt-4o",
    QUALITY: "gpt-4o",
  },
  ANTHROPIC: {
    FAST: "claude-3-haiku-20240307",
    BALANCED: "claude-3-sonnet-20240229",
    QUALITY: "claude-3-5-sonnet-20241022",
  },
  GOOGLE_AI: {
    FAST: "gemini-2.5-flash",
    BALANCED: "gemini-2.5-pro",
    QUALITY: "gemini-2.5-pro",
  },
  // ... other providers
} as const;
```

---

## Provider-Specific Configuration

### Provider Configuration Factory Pattern

```typescript
// From providerConfig.ts
export function createOpenAIConfig(): ProviderConfigOptions {
  return {
    providerName: "OPENAI",
    envVarName: "OPENAI_API_KEY",
    setupUrl: "https://platform.openai.com/api-keys",
    description: "Credentials",
    instructions: [
      "1. Visit: https://platform.openai.com/api-keys",
      "2. Create new API key",
      "3. Copy the key",
    ],
  };
}

export function createVertexProjectConfig(): ProviderConfigOptions {
  return {
    providerName: "Google Vertex AI",
    envVarName: "GOOGLE_CLOUD_PROJECT_ID",
    setupUrl: "https://console.cloud.google.com/",
    description: "Google Cloud Credentials",
    instructions: [
      "1. Visit: https://console.cloud.google.com/",
      "2. Create or select a project",
      "3. Enable Vertex AI API",
      "4. Set up authentication",
    ],
    fallbackEnvVars: [
      "VERTEX_PROJECT_ID",
      "GOOGLE_VERTEX_PROJECT",
      "GOOGLE_CLOUD_PROJECT",
    ],
  };
}
```

### Provider Configuration Manager (Model-Level)

```typescript
// From modelConfiguration.ts
class ModelConfigurationManager {
  private configurations = new Map<string, ProviderConfiguration>();
  private configSource: ConfigSource = "default";

  private createGoogleAIConfig(): ProviderConfiguration {
    return {
      provider: "google-ai",
      models: {
        fast: this.getConfigValue(
          "GOOGLE_AI_FAST_MODEL",
          MODEL_NAMES.GOOGLE_AI.FAST,
        ),
        balanced: this.getConfigValue(
          "GOOGLE_AI_BALANCED_MODEL",
          MODEL_NAMES.GOOGLE_AI.BALANCED,
        ),
        quality: this.getConfigValue(
          "GOOGLE_AI_QUALITY_MODEL",
          MODEL_NAMES.GOOGLE_AI.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(
          process.env.GOOGLE_AI_DEFAULT_INPUT_COST,
          0.000075,
        ),
        output: this.parseFloat(
          process.env.GOOGLE_AI_DEFAULT_OUTPUT_COST,
          0.0003,
        ),
      },
      requiredEnvVars: ["GOOGLE_AI_API_KEY"],
      performance: {
        speed: this.parseInt(process.env.GOOGLE_AI_SPEED_RATING, 3),
        quality: this.parseInt(process.env.GOOGLE_AI_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.GOOGLE_AI_COST_RATING, 3),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("GOOGLE_AI_MAX_TOKENS_ISSUES", []),
      },
    };
  }

  // Helper methods for type-safe config value retrieval
  private getConfigValue(envVar: string, defaultValue: string): string {
    const value = process.env[envVar];
    if (value && !this.isValidConfigValue(value)) {
      logger.warn(`Invalid value for ${envVar}, using default`);
      return defaultValue;
    }
    return value || defaultValue;
  }

  private parseFloat(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
}
```

---

## Runtime Configuration

### Configuration Manager with Backup/Restore

```typescript
// From configManager.ts
export class NeuroLinkConfigManager {
  private configPath = ".neurolink.config";
  private backupDir = ".neurolink.backups";
  private config: NeuroLinkConfig | null = null;

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

    // ALWAYS create backup before updating
    if (createBackup) {
      await this.createBackup(reason);
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
    } catch (error) {
      // Auto-restore on failure
      if (createBackup) {
        await this.restoreLatestBackup();
      }
      throw new Error(`Config update failed, restored from backup`);
    }
  }

  async createBackup(reason = "manual"): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `neurolink-config-${timestamp}.js`;

    const backupMetadata: BackupMetadata = {
      reason,
      timestamp: Date.now(),
      version: currentConfig.configVersion || "unknown",
      hash: this.generateConfigHash(currentConfig),
    };

    // Write backup with metadata
    const backupContent = `// NeuroLink Config Backup
export const metadata = ${JSON.stringify(backupMetadata, null, 2)};
export default ${JSON.stringify(currentConfig, null, 2)};`;

    await writeFile(backupPath, backupContent, "utf-8");
    return backupPath;
  }
}
```

### Configuration Caching

```typescript
// Pattern: Configuration caching with validation
let configCache: SageMakerConfig | null = null;
const modelConfigCache: Map<string, SageMakerModelConfig> = new Map();

export function getSageMakerConfig(region?: string): SageMakerConfig {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  const config = loadConfigFromEnv();
  const validatedConfig = SageMakerConfigSchema.parse(config);

  // Cache the validated configuration
  configCache = validatedConfig;
  return validatedConfig;
}

export function clearConfigurationCache(): void {
  configCache = null;
  modelConfigCache.clear();
}
```

---

## CLI Configuration System

### CLI Config Manager

```typescript
// From cli/commands/config.ts
export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private config: NeuroLinkConfig;

  constructor() {
    this.configDir = path.join(os.homedir(), ".neurolink");
    this.configFile = path.join(this.configDir, "config.json");
    this.config = this.loadConfig();
  }

  private loadConfig(): NeuroLinkConfig {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = JSON.parse(fs.readFileSync(this.configFile, "utf8"));
        return ConfigSchema.parse(configData);
      }
    } catch (error) {
      logger.warn(`Invalid config file: ${error.message}`);
    }
    return ConfigSchema.parse({}); // Return defaults
  }

  private saveConfig(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const validatedConfig = ConfigSchema.parse(this.config);
    fs.writeFileSync(this.configFile, JSON.stringify(validatedConfig, null, 2));
  }

  async initInteractive(): Promise<void> {
    // Interactive setup with inquirer
    const preferences = await inquirer.prompt([
      {
        type: "list",
        name: "defaultProvider",
        message: "Select your default AI provider:",
        choices: [
          { name: "Auto (recommended)", value: "auto" },
          { name: "OpenAI - GPT models", value: "openai" },
          { name: "Amazon Bedrock", value: "bedrock" },
          // ... more choices
        ],
      },
      // ... more prompts
    ]);

    this.config.defaultProvider = preferences.defaultProvider;
    this.saveConfig();
  }
}
```

---

## Build Configuration

### TypeScript Configuration

```json
// tsconfig.json (SDK)
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "noImplicitReturns": true,
    "allowSyntheticDefaultImports": true,
    "types": ["vite/client", "@sveltejs/kit", "vitest/globals", "node"]
  }
}

// tsconfig.cli.json (CLI-specific)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  },
  "include": ["src/cli/**/*.ts", "src/lib/**/*.ts"],
  "exclude": ["test", "**/*.test.ts", "**/*.spec.ts", "node_modules", "dist"]
}
```

### Vite Configuration

```typescript
// vite.config.ts
const config: VitestConfig = {
  plugins: [sveltekit()],

  ssr: {
    external: ["canvas"],
    noExternal: [],
  },

  test: {
    include: ["test/**/*.ts"],
    exclude: ["**/node_modules/**"],
    testTimeout: 30000,
    hookTimeout: 10000,
    globals: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    isolate: true,
    maxConcurrency: 1,
  },
};
```

### SvelteKit Configuration

```javascript
// svelte.config.js
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: "./src/lib",
    },
  },
};
```

---

## Best Practices

### 1. Use Type-Safe Configuration

```typescript
// DO: Define types for all configuration
export type ProviderConfig = {
  model?: string;
  available?: boolean;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

// DON'T: Use untyped configuration objects
const config = { model: "gpt-4" }; // No type safety
```

### 2. Centralize Default Values

```typescript
// DO: Define defaults in constants file
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TIMEOUT = 60000;

// DON'T: Scatter magic numbers throughout code
const options = { temperature: 0.7, timeout: 60000 }; // Magic numbers
```

### 3. Use Environment Variable Patterns

```typescript
// DO: Follow naming conventions
const apiKey = process.env.PROVIDER_API_KEY;
const setting = process.env.NEUROLINK_FEATURE_SETTING;

// DON'T: Use inconsistent naming
const key = process.env.apiKey; // Inconsistent naming
```

### 4. Validate Configuration Early

```typescript
// DO: Validate on load with clear error messages
export function loadConfig(): Config {
  const config = loadFromEnv();
  const result = ConfigSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Configuration invalid: ${result.error.message}`);
  }

  return result.data;
}

// DON'T: Skip validation or fail silently
```

### 5. Support Configuration Layering

```typescript
// DO: Support multiple configuration sources
function getConfig(): Config {
  return {
    ...DEFAULT_CONFIG, // Lowest priority
    ...loadFromFile(), // File config
    ...loadFromEnv(), // Environment variables
    ...runtimeOverrides, // Highest priority
  };
}
```

### 6. Cache Validated Configuration

```typescript
// DO: Cache after validation
let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  cachedConfig = validateAndLoad();
  return cachedConfig;
}

export function clearCache(): void {
  cachedConfig = null;
}
```

### 7. Provide Sensible Fallbacks

```typescript
// DO: Provide fallback environment variables
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT_ID ||
  process.env.GOOGLE_VERTEX_PROJECT ||
  process.env.GOOGLE_PROJECT_ID;

// DO: Use lazy evaluation for defaults
export function getDefaults() {
  return {
    model: process.env.MODEL || "default-model",
    // Evaluated at call time, not module load time
  };
}
```

---

## Configuration Module Template

Use this template when adding new configuration modules:

```typescript
/**
 * [Feature Name] Configuration
 * Provides configuration management for [feature description]
 */

import { z } from "zod";
import { logger } from "../utils/logger.js";

// =============================================================================
// CONSTANTS AND DEFAULTS
// =============================================================================

/**
 * Default values for [feature name]
 */
export const FEATURE_DEFAULTS = {
  SETTING_A: "default_value",
  SETTING_B: 1000,
  SETTING_C: true,
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Configuration type for [feature name]
 */
export type FeatureConfig = {
  /** Description of setting A */
  settingA?: string;
  /** Description of setting B */
  settingB?: number;
  /** Description of setting C */
  settingC?: boolean;
};

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Zod schema for configuration validation
 */
const FeatureConfigSchema = z.object({
  settingA: z.string().min(1).optional(),
  settingB: z.number().min(0).max(10000).optional(),
  settingC: z.boolean().optional(),
});

// =============================================================================
// CONFIGURATION CACHE
// =============================================================================

let configCache: FeatureConfig | null = null;

// =============================================================================
// CONFIGURATION FUNCTIONS
// =============================================================================

/**
 * Load configuration from environment variables with defaults
 * Reads environment variables when called (not at module load time)
 */
export function getFeatureConfig(): FeatureConfig {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  const config: FeatureConfig = {
    settingA:
      process.env.NEUROLINK_FEATURE_SETTING_A || FEATURE_DEFAULTS.SETTING_A,
    settingB: process.env.NEUROLINK_FEATURE_SETTING_B
      ? parseInt(process.env.NEUROLINK_FEATURE_SETTING_B, 10)
      : FEATURE_DEFAULTS.SETTING_B,
    settingC: process.env.NEUROLINK_FEATURE_SETTING_C !== "false",
  };

  // Validate configuration
  try {
    const validated = FeatureConfigSchema.parse(config);
    configCache = validated;
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`Invalid [feature] config: ${error.message}, using defaults`);
    }
    return {
      settingA: FEATURE_DEFAULTS.SETTING_A,
      settingB: FEATURE_DEFAULTS.SETTING_B,
      settingC: FEATURE_DEFAULTS.SETTING_C,
    };
  }
}

/**
 * Clear configuration cache
 * Useful for testing or when environment changes
 */
export function clearFeatureConfigCache(): void {
  configCache = null;
}

/**
 * Validate configuration object
 */
export function validateFeatureConfig(config: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = FeatureConfigSchema.safeParse(config);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

// =============================================================================
// ENVIRONMENT VARIABLE DOCUMENTATION
// =============================================================================

/**
 * Environment variables for [feature name]:
 *
 * - NEUROLINK_FEATURE_SETTING_A: Description of setting A
 *   Default: "default_value"
 *
 * - NEUROLINK_FEATURE_SETTING_B: Description of setting B
 *   Default: 1000
 *   Range: 0-10000
 *
 * - NEUROLINK_FEATURE_SETTING_C: Description of setting C
 *   Default: true
 *   Values: true/false
 */
```

---

## Summary

NeuroLink's configuration system provides:

1. **Multi-layered configuration** with clear precedence
2. **Type-safe configuration** with TypeScript and Zod
3. **Environment variable patterns** that are consistent and documented
4. **Validation at multiple levels** (format, schema, business rules)
5. **Backup and restore** for configuration safety
6. **Runtime updates** with caching and cache invalidation
7. **Provider-specific configurations** with factory patterns
8. **CLI configuration management** for user preferences

When adding new features, follow the established patterns and use the template provided to ensure consistency across the codebase.
