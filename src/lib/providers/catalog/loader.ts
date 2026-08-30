/**
 * Converts the JSON authoring format into the runtime
 * OpenAICompatCatalogEntry shape the registry loop consumes. All
 * knowledge about deriving env vars, template interpolation and error
 * rule matching lives HERE — the JSON stays declarative.
 */
import { CATALOG_JSON_ENTRIES } from "./index.generated.js";
import { DEFAULT_ERROR_RULES } from "../../utils/errorClassifier.js";
import {
  AuthenticationError,
  RateLimitError,
  InvalidModelError,
  NetworkError,
  ProviderError,
} from "../../types/index.js";
import type {
  OpenAICompatCatalogEntry,
  ProviderCatalogJson,
  ProviderErrorRule,
  ProviderConfigOptions,
  CatalogErrorRuleClass,
} from "../../types/index.js";
import type { AIProviderName } from "../../constants/enums.js";

const ERROR_CLASS_MAP: Record<
  CatalogErrorRuleClass,
  new (message: string, provider?: string) => Error
> = {
  authentication: AuthenticationError,
  "rate-limit": RateLimitError,
  "invalid-model": InvalidModelError,
  network: NetworkError,
  provider: ProviderError,
};

// Duplicated from tools/codegen-catalog.ts intentionally: src/ must not
// import from tools/ (build-time tooling depends on runtime source, not the
// reverse).
function toCamelCase(id: string): string {
  return id.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

// Resolves the NeurolinkCredentials key for an entry — respects a
// credentialsKey override (required where the derived camelCase would
// rename a pre-existing public credential field; see together-ai). Single
// source of truth shared with codegen's own credentialsKeyFor() so the
// generated NeurolinkCredentials keys and any runtime consumer (Task 7's
// descriptors) can never drift from each other.
export function catalogCredentialsKey(entry: ProviderCatalogJson): string {
  return entry.credentialsKey ?? toCamelCase(entry.id);
}

export function catalogEnvVar(
  entry: ProviderCatalogJson,
  kind: "apiKey" | "baseURL" | "model",
): string {
  const override = entry.wire.envOverrides?.[kind];
  if (override) {
    return override;
  }
  const base = entry.id.toUpperCase().replace(/-/g, "_");
  return kind === "apiKey"
    ? `${base}_API_KEY`
    : kind === "baseURL"
      ? `${base}_BASE_URL`
      : `${base}_MODEL`;
}

function interpolate(
  template: string,
  entry: ProviderCatalogJson,
  modelName?: string,
): string {
  return template
    .replace(/\{apiKeyEnvVar\}/g, catalogEnvVar(entry, "apiKey"))
    .replace(/\{setupUrl\}/g, entry.setup.url)
    .replace(/\{model\}/g, modelName ?? "");
}

export function buildCatalogConfigOptions(
  entry: ProviderCatalogJson,
): ProviderConfigOptions {
  return {
    providerName: entry.displayName,
    envVarName: catalogEnvVar(entry, "apiKey"),
    setupUrl: entry.setup.url,
    description: entry.setup.description ?? "API key",
    instructions: entry.setup.instructions.map((line) =>
      interpolate(line, entry),
    ),
  };
}

function buildErrorRules(entry: ProviderCatalogJson): ProviderErrorRule[] {
  const bespoke: ProviderErrorRule[] = entry.errorRules.map((rule) => {
    const regex = rule.pattern ? new RegExp(rule.pattern, "i") : undefined;
    return {
      match: (ctx) =>
        (rule.status !== undefined && ctx.statusCode === rule.status) ||
        (regex !== undefined && regex.test(ctx.message)),
      errorClass: ERROR_CLASS_MAP[rule.class],
      message: rule.message.includes("{model}")
        ? (ctx) => interpolate(rule.message, entry, ctx.modelName)
        : interpolate(rule.message, entry),
    };
  });
  return [...bespoke, ...DEFAULT_ERROR_RULES];
}

export function getCatalogJsonEntries(): ProviderCatalogJson[] {
  return CATALOG_JSON_ENTRIES;
}

export function buildCatalogEntries(): OpenAICompatCatalogEntry[] {
  return CATALOG_JSON_ENTRIES.map((entry) => {
    const base: OpenAICompatCatalogEntry = {
      providerName: entry.id as AIProviderName,
      aliases: [entry.id, ...entry.aliases],
      apiKeyEnvVar: catalogEnvVar(entry, "apiKey"),
      configOptions: buildCatalogConfigOptions(entry),
      modelEnvVar: catalogEnvVar(entry, "model"),
      defaultModel: entry.models.default,
      registryDefaultModel:
        entry.models.registryDefaultModel ?? entry.models.default,
      registryDefaultModelChecksEnvVar:
        entry.quirks?.registryDefaultIgnoresModelEnvVar !== true,
      fallbackModelName:
        entry.models.fallbackModelName ??
        entry.models.fallbacks[1] ??
        entry.models.fallbacks[0],
      fallbackModels: [...entry.models.fallbacks],
      errorRules: buildErrorRules(entry),
    };
    const { baseURLTemplate } = entry.wire;
    if (baseURLTemplate) {
      // Schema constrains extraCredentials to exactly one entry (Task 1) —
      // [0] is the whole list by construction, mirroring the deliberately
      // accountId-shaped runtime computedBaseURL type.
      const extra = entry.wire.extraCredentials?.[0] ?? "accountId";
      base.computedBaseURL = {
        envVar: `${entry.id.toUpperCase().replace(/-/g, "_")}_${extra.replace(/([A-Z])/g, "_$1").toUpperCase()}`,
        missingValueMessage:
          entry.wire.missingCredentialMessage ??
          `Missing ${extra} for ${entry.displayName}`,
        build: (value: string) =>
          baseURLTemplate.replaceAll(`{${extra}}`, value),
      };
    } else {
      base.baseURLEnvVar = catalogEnvVar(entry, "baseURL");
      base.defaultBaseURL = entry.wire.baseURL;
    }
    if (entry.quirks?.messageContentFormat) {
      base.messageContentFormat = entry.quirks.messageContentFormat;
    }
    if (entry.quirks?.timeoutErrorClass === "provider") {
      base.timeoutErrorClass = ProviderError;
    }
    return base;
  });
}
