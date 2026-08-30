/**
 * zod validator for the single-JSON provider catalog authoring format.
 * Mirrors src/lib/types/providerCatalog.ts field-for-field with
 * z.strictObject (unknown keys are authoring mistakes) plus the
 * cross-field refinements the plain types cannot express. See
 * docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md.
 *
 * provider-catalog.schema.json is a hand-kept JSON Schema mirror for
 * editor validation only — this file is the authoritative validator.
 */
import { z } from "zod";
import type { ProviderCatalogJson } from "../../types/index.js";

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const KEBAB_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const catalogPricingPerMTokSchema = z.strictObject({
  input: z.number(),
  output: z.number(),
  cachedInput: z.number().optional(),
});

const catalogModelStatusSchema = z.enum(["production", "preview", "retired"]);

const catalogModelSpecSchema = z.strictObject({
  contextWindow: z.number().optional(),
  maxOutputTokens: z.number().optional(),
  pricingPerMTok: catalogPricingPerMTokSchema.optional(),
  vision: z.boolean(),
  status: catalogModelStatusSchema,
  description: z.string(),
  enumMember: z
    .string()
    .regex(IDENTIFIER_PATTERN, "enumMember must be a valid identifier")
    .optional(),
});

const catalogWireSchema = z
  .strictObject({
    baseURL: z.string().optional(),
    baseURLTemplate: z.string().optional(),
    extraCredentials: z.array(z.string()).optional(),
    missingCredentialMessage: z.string().optional(),
    envOverrides: z
      .strictObject({
        apiKey: z.string().optional(),
        baseURL: z.string().optional(),
        model: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((wire, ctx) => {
    const hasBaseURL = wire.baseURL !== undefined;
    const hasTemplate = wire.baseURLTemplate !== undefined;

    if (hasBaseURL === hasTemplate) {
      ctx.addIssue({
        code: "custom",
        path: ["baseURL"],
        message: "wire requires exactly one of baseURL or baseURLTemplate",
      });
    }

    if (wire.extraCredentials !== undefined) {
      if (wire.extraCredentials.length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["extraCredentials"],
          message: "wire.extraCredentials must have exactly one entry",
        });
      } else if (!IDENTIFIER_PATTERN.test(wire.extraCredentials[0])) {
        // Embedded verbatim in generated credential typing — a non-identifier
        // value would emit invalid TypeScript.
        ctx.addIssue({
          code: "custom",
          path: ["extraCredentials", 0],
          message: "wire.extraCredentials entry must be a valid identifier",
        });
      }
      if (!hasTemplate) {
        ctx.addIssue({
          code: "custom",
          path: ["extraCredentials"],
          message: "wire.extraCredentials is only valid with baseURLTemplate",
        });
      }
    }

    if (wire.missingCredentialMessage !== undefined && !hasTemplate) {
      ctx.addIssue({
        code: "custom",
        path: ["missingCredentialMessage"],
        message:
          "wire.missingCredentialMessage is only valid with baseURLTemplate",
      });
    }

    if (
      hasTemplate &&
      wire.extraCredentials !== undefined &&
      wire.extraCredentials.length === 1
    ) {
      const placeholder = `{${wire.extraCredentials[0]}}`;
      if (!wire.baseURLTemplate?.includes(placeholder)) {
        ctx.addIssue({
          code: "custom",
          path: ["baseURLTemplate"],
          message:
            "wire.baseURLTemplate must contain the extraCredentials[0] placeholder",
        });
      }
    }
  });

const catalogErrorRuleClassSchema = z.enum([
  "authentication",
  "rate-limit",
  "invalid-model",
  "network",
  "provider",
]);

const catalogErrorRuleJsonSchema = z
  .strictObject({
    status: z.number().optional(),
    pattern: z.string().optional(),
    class: catalogErrorRuleClassSchema,
    message: z.string(),
  })
  .superRefine((rule, ctx) => {
    if (rule.status === undefined && rule.pattern === undefined) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "errorRules entry requires status or pattern",
      });
    }
    if (rule.pattern !== undefined) {
      try {
        new RegExp(rule.pattern, "i");
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["pattern"],
          message: "errorRules pattern must compile as a regular expression",
        });
      }
    }
  });

const catalogQuirksSchema = z.strictObject({
  timeoutErrorClass: z.literal("provider").optional(),
  messageContentFormat: z.literal("string").optional(),
  registryDefaultIgnoresModelEnvVar: z.boolean().optional(),
});

const catalogBillingPolicySchema = z.enum([
  "free-tier",
  "free-with-card",
  "no-free-tier",
]);

const catalogSetupSchema = z.strictObject({
  url: z.string(),
  apiKeyFormat: z.string().nullable(),
  billingPolicy: catalogBillingPolicySchema,
  instructions: z.array(z.string()),
  description: z.string().optional(),
});

const catalogProbeEvidenceSchema = z.strictObject({
  date: z.string().regex(DATE_PATTERN, "date must match YYYY-MM-DD"),
  status: z.number().optional(),
  code: z.string().optional(),
  method: z.string().optional(),
});

const catalogEvidenceSchema = z.strictObject({
  rosterVerified: catalogProbeEvidenceSchema,
  authProbe: catalogProbeEvidenceSchema.optional(),
  billingProbe: catalogProbeEvidenceSchema.optional(),
  liveMatrix: z
    .strictObject({
      date: z.string().regex(DATE_PATTERN, "date must match YYYY-MM-DD"),
      result: z.string(),
    })
    .nullable(),
  addedInPR: z.string(),
});

const catalogCapabilitiesSchema = z.strictObject({
  text: z.boolean(),
  streaming: z.boolean(),
  tools: z.boolean(),
  toolsWithStreaming: z.boolean(),
  structuredOutput: z.boolean(),
  structuredOutputWithTools: z.boolean(),
  embeddings: z.boolean(),
  thinking: z.boolean(),
});

const catalogModelsSchema = z
  .strictObject({
    default: z.string(),
    fallbacks: z.array(z.string()),
    fallbackModelName: z.string().optional(),
    registryDefaultModel: z.string().optional(),
    defaultContextWindow: z.number(),
    defaultMaxOutputTokens: z.number(),
    catalog: z.record(z.string(), catalogModelSpecSchema),
    topModels: z.array(z.string()).min(1).optional(),
    visionModel: z.string().optional(),
    // Deliberately NOT constrained to catalog keys: testModel captures what
    // the testing account can actually reach today, which may be a model
    // the transcribed catalog predates.
    testModel: z.string().min(1).optional(),
  })
  .superRefine((models, ctx) => {
    const catalogKeys = new Set(Object.keys(models.catalog));

    if (models.fallbacks.length === 0) {
      // The loader's fallbackModelName default is fallbacks[1] ?? fallbacks[0],
      // which depends on fallbacks[0] existing.
      ctx.addIssue({
        code: "custom",
        path: ["fallbacks"],
        message: "models.fallbacks must have at least one entry",
      });
    }

    if (!catalogKeys.has(models.default)) {
      ctx.addIssue({
        code: "custom",
        path: ["default"],
        message: "models.default must be a key of models.catalog",
      });
    }

    models.fallbacks.forEach((fallback, index) => {
      if (!catalogKeys.has(fallback)) {
        ctx.addIssue({
          code: "custom",
          path: ["fallbacks", index],
          message: "models.fallbacks entry must be a key of models.catalog",
        });
      }
    });

    if (
      models.fallbackModelName !== undefined &&
      !catalogKeys.has(models.fallbackModelName)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fallbackModelName"],
        message: "models.fallbackModelName must be a key of models.catalog",
      });
    }

    if (
      models.registryDefaultModel !== undefined &&
      !catalogKeys.has(models.registryDefaultModel)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["registryDefaultModel"],
        message: "models.registryDefaultModel must be a key of models.catalog",
      });
    }

    if (models.topModels !== undefined) {
      models.topModels.forEach((modelId, index) => {
        if (!catalogKeys.has(modelId)) {
          ctx.addIssue({
            code: "custom",
            path: ["topModels", index],
            message: "models.topModels entry must be a key of models.catalog",
          });
        }
      });

      const seen = new Set<string>();
      models.topModels.forEach((modelId, index) => {
        if (seen.has(modelId)) {
          ctx.addIssue({
            code: "custom",
            path: ["topModels", index],
            message: "models.topModels must not contain duplicate entries",
          });
        }
        seen.add(modelId);
      });
    }

    if (models.visionModel !== undefined) {
      const spec = models.catalog[models.visionModel];
      if (!spec) {
        ctx.addIssue({
          code: "custom",
          path: ["visionModel"],
          message: "models.visionModel must be a key of models.catalog",
        });
      } else if (!spec.vision) {
        ctx.addIssue({
          code: "custom",
          path: ["visionModel"],
          message: "models.visionModel entry must have vision: true",
        });
      }
    }
  });

export const providerCatalogJsonSchema = z.strictObject({
  $schema: z.string().optional(),
  id: z.string().regex(KEBAB_ID_PATTERN, "id must be kebab-case"),
  displayName: z.string(),
  enumTypeName: z
    .string()
    .regex(IDENTIFIER_PATTERN, "enumTypeName must be a valid identifier")
    .optional(),
  credentialsKey: z
    .string()
    .regex(IDENTIFIER_PATTERN, "credentialsKey must be a valid identifier")
    .optional(),
  aliases: z.array(z.string()),
  tier: z.literal(2),
  wire: catalogWireSchema,
  models: catalogModelsSchema,
  capabilities: catalogCapabilitiesSchema,
  errorRules: z.array(catalogErrorRuleJsonSchema),
  quirks: catalogQuirksSchema.optional(),
  setup: catalogSetupSchema,
  evidence: catalogEvidenceSchema,
});

export function parseProviderCatalogJson(
  raw: unknown,
  sourcePath: string,
): ProviderCatalogJson {
  const result = providerCatalogJsonSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid provider catalog file ${sourcePath}: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}
