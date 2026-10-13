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
import type {
  CatalogEntry,
  DecideCatalogJson,
  ProviderCatalogJson,
} from "../../types/index.js";

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
  tools: z.boolean().optional(),
  status: catalogModelStatusSchema,
  description: z.string(),
  enumMember: z
    .string()
    .regex(IDENTIFIER_PATTERN, "enumMember must be a valid identifier")
    .optional(),
});

function buildWireSchema(requireExactlyOneBaseURL: boolean) {
  return z
    .strictObject({
      baseURL: z.string().optional(),
      baseURLTemplate: z.string().optional(),
      extraCredentials: z.array(z.string()).optional(),
      missingCredentialMessage: z.string().optional(),
      apiKeyFallbackEnvVars: z.array(z.string()).optional(),
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

      if (requireExactlyOneBaseURL && hasBaseURL === hasTemplate) {
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
}

const catalogWireSchema = buildWireSchema(true);
const decideWireSchema = buildWireSchema(false);

// Chat providers read these; ConfiguredDecisionProvider does not. Accepting one
// would give a descriptor that says "configured" next to a provider that
// ignores the setting, so each is refused until the engine reads it.
const UNSUPPORTED_DECIDE_WIRE_KEYS = [
  "baseURLTemplate",
  "extraCredentials",
  "missingCredentialMessage",
  "apiKeyFallbackEnvVars",
] as const;

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
    patternStatuses: z.array(z.number().int()).min(1).optional(),
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
    if (rule.patternStatuses !== undefined && rule.pattern === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["patternStatuses"],
        message: "errorRules patternStatuses requires pattern",
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
  maxTokensField: z.literal("max_completion_tokens").optional(),
  omitStreamOptions: z.boolean().optional(),
  timeoutErrorClass: z.literal("provider").optional(),
  messageContentFormat: z.literal("string").optional(),
  registryDefaultIgnoresModelEnvVar: z.boolean().optional(),
  responseFormatDowngrade: z.literal("json-schema-to-json-object").optional(),
  replayReasoningContent: z.boolean().optional(),
  rejectRequiredToolChoice: z.boolean().optional(),
  authHeaderStyle: z.literal("x-api-key").optional(),
});

const catalogTimeoutsSchema = z.strictObject({
  generateMs: z.number().optional(),
  streamMs: z.number().optional(),
});

const catalogBillingPolicySchema = z.enum([
  "free-tier",
  "free-with-card",
  "no-free-tier",
  "promotional-credit",
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
  tools: z.union([z.boolean(), z.literal("model-dependent")]),
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
    // Catalog defaults are real model ceilings, never an unknown/zero
    // placeholder. Caller maxTokens and optional model overrides are separate
    // contracts and deliberately keep their existing validation semantics.
    defaultContextWindow: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
    defaultMaxOutputTokens: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
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

    // A fallback that resolves to the default model cannot fall back.
    //
    // `loader.ts` derives it positionally as
    // `fallbackModelName ?? fallbacks[1] ?? fallbacks[0]`, and nothing checked
    // the result. A provider with one model has no choice and is left alone;
    // a provider with alternatives that still lands on its own default has
    // silently disabled its retry path — the primary fails, the SDK retries
    // the same model, and it fails again for the same reason.
    //
    // This is not hypothetical. `mistral.json` ships 32 models and explicitly
    // sets `fallbackModelName` to its own default, overriding a perfectly good
    // `fallbacks[1]`. Two single-model catalogs also resolve this way and are
    // correctly exempt.
    const derivedFallback =
      models.fallbackModelName ?? models.fallbacks[1] ?? models.fallbacks[0];
    // Count only entries that could actually serve as a fallback. The whole
    // `catalog` map also carries retired ids, so its size both over-reports in
    // the message below and could fire this rule on a catalog whose only other
    // entries are unusable — the mirror of the single-model exemption.
    const selectableModels = Object.values(models.catalog).filter(
      (spec) => (spec as { status?: string }).status !== "retired",
    ).length;
    if (
      derivedFallback !== undefined &&
      derivedFallback === models.default &&
      selectableModels > 1
    ) {
      ctx.addIssue({
        code: "custom",
        path:
          models.fallbackModelName !== undefined
            ? ["fallbackModelName"]
            : ["fallbacks"],
        message:
          `the fallback model resolves to "${derivedFallback}", which is also models.default — ` +
          `a fallback identical to the primary cannot fall back. This catalog declares ` +
          `${selectableModels} selectable models, so name a different one (or drop ` +
          `fallbackModelName to ` +
          `let fallbacks[1] apply). Single-model catalogs are exempt.`,
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

const catalogIdentityShape = {
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
};

export const providerCatalogJsonSchema = z.strictObject({
  ...catalogIdentityShape,
  tier: z.literal(2).optional(),
  wire: catalogWireSchema,
  models: catalogModelsSchema,
  capabilities: catalogCapabilitiesSchema,
  errorRules: z.array(catalogErrorRuleJsonSchema),
  quirks: catalogQuirksSchema.optional(),
  timeouts: catalogTimeoutsSchema.optional(),
  autoSelectPriority: z.number().optional(),
  setup: catalogSetupSchema,
  evidence: catalogEvidenceSchema,
});

const decideStatusSchema = z.number().int().min(100).max(599);
const decidePositiveInt = z.number().int().positive();
const decidePositiveNumber = z.number().positive();

const decideErrorKindSchema = z.enum([
  "authentication",
  "invalid_request",
  "max_tokens_exceeded",
  "rate_limit",
  "overloaded",
  "server",
  "timeout",
  "network",
]);

const decideErrorRuleSchema = z.strictObject({
  status: z
    .union([decideStatusSchema, z.array(decideStatusSchema).min(1)])
    .optional(),
  statusMin: decideStatusSchema.optional(),
  kind: decideErrorKindSchema,
  retryable: z.boolean().optional(),
});

const UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
const HTTP_TOKEN_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

const decidePathSchema = z
  .string()
  .refine(
    (path) =>
      /^[^.\s]+(?:\.[^.\s]+)*$/.test(path) &&
      path.split(".").every((segment) => !UNSAFE_PATH_SEGMENTS.has(segment)),
    {
      message:
        "path must be dot-separated segments without whitespace, and must not use __proto__, constructor or prototype",
    },
  );

const decideHeaderNameSchema = z
  .string()
  .regex(HTTP_TOKEN_PATTERN, "header name must be an HTTP token");

const decideEndpointSchema = z
  .string()
  .refine(
    (endpoint) =>
      endpoint.trim().length > 0 &&
      !/[{}]/.test(endpoint.split("{baseURL}").join("")),
    {
      message:
        "endpoint must not be blank and may only use the {baseURL} placeholder",
    },
  );

const decideBodyShapeSchema = z
  .strictObject({
    path: decidePathSchema,
    isArray: z.boolean().optional(),
    formatter: z.enum(["fastapi-validation"]).optional(),
    kind: decideErrorKindSchema.optional(),
    retryable: z.boolean().optional(),
  })
  .refine(
    (shape) => (shape.formatter !== undefined) === (shape.isArray === true),
    {
      path: ["formatter"],
      message:
        "a body shape sets isArray: true together with a formatter, or neither: an array without a formatter never matches, and a formatter on a body that is not an array reads the text as an empty list",
    },
  );

const decideBlockSchema = z.strictObject({
  dialect: z.enum(["system-one"]),
  order: decidePositiveInt,
  baseURLRequired: z.boolean().optional(),
  baseURLNormalize: z.array(z.enum(["strip-trailing-slash"])).optional(),
  endpoint: decideEndpointSchema,
  model: z.strictObject({
    placement: z.enum(["body", "body-unless-alias"]),
    alias: z.string().min(1).optional(),
  }),
  requestIdHeaders: z.array(decideHeaderNameSchema).optional(),
  response: z
    .strictObject({ modelPaths: z.array(decidePathSchema).optional() })
    .optional(),
  errors: z.strictObject({
    rules: z.array(decideErrorRuleSchema),
    default: decideErrorKindSchema,
    bodyShapes: z.array(decideBodyShapeSchema),
  }),
});

// A window of 0 or less would reach every reader of the derived model manifest,
// and a model without its own window inherits the default's through `??`,
// which keeps a 0. Chat entries keep the looser catalogModelSpecSchema.
const decideModelSpecSchema = catalogModelSpecSchema.extend({
  contextWindow: decidePositiveInt.optional(),
  maxOutputTokens: decidePositiveInt.optional(),
});

// Here and not in the entry-level refinement below: that one does not run once
// a sibling field fails a type check, and an author who deletes the TODO lines
// of a scaffold should see these gaps beside the other errors.
const decideModelsSchema = z
  .strictObject({
    default: z.string(),
    catalog: z.record(z.string(), decideModelSpecSchema),
    topModels: z.array(z.string()).min(1).optional(),
    testModel: z.string().min(1).optional(),
  })
  .superRefine((models, ctx) => {
    // The "must be a key" rule reports a default that is not an own key.
    if (!Object.hasOwn(models.catalog, models.default)) {
      return;
    }
    const base = models.catalog[models.default];
    for (const field of ["contextWindow", "maxOutputTokens"] as const) {
      if (base[field] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["catalog", models.default, field],
          message: `${field} is required on the default model; the derived model manifest reads it`,
        });
      }
    }
  });

// `media` is deliberately absent: no decide provider migrated yet needs it.
const decideLimitsSchema = z.strictObject({
  maxStateTokens: decidePositiveInt,
  maxQuestions: decidePositiveInt.optional(),
  nonAsciiTokensPerChar: decidePositiveNumber.optional(),
  digitTokensPerChar: decidePositiveNumber.optional(),
  symbolTokensPerChar: decidePositiveNumber.optional(),
  astralTokensPerChar: decidePositiveNumber.optional(),
  models: z
    .record(
      z.string(),
      z.strictObject({
        maxStateTokens: decidePositiveInt,
        nonAsciiTokensPerChar: decidePositiveNumber.optional(),
      }),
    )
    .optional(),
  advisory: z.boolean().optional(),
});

const decideCatalogJsonSchema = z
  .strictObject({
    ...catalogIdentityShape,
    inferenceKinds: z.tuple([z.literal("decide")]),
    tier: z.literal(2).optional(),
    wire: decideWireSchema,
    models: decideModelsSchema,
    timeouts: z
      .strictObject({ decideMs: decidePositiveInt.optional() })
      .optional(),
    decisionLimits: decideLimitsSchema.optional(),
    decide: decideBlockSchema,
    setup: catalogSetupSchema,
    evidence: catalogEvidenceSchema,
  })
  .superRefine((entry, ctx) => {
    const { wire, decide } = entry;
    const issue = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: "custom", path, message });
    };

    const seenStatus = new Set<number>();
    const seenStatusMin = new Set<number>();
    decide.errors.rules.forEach((rule, index) => {
      const at = ["decide", "errors", "rules", index];
      if ((rule.status === undefined) === (rule.statusMin === undefined)) {
        issue(
          at,
          "errors.rules entry needs exactly one of status or statusMin",
        );
      }
      const statuses =
        typeof rule.status === "number" ? [rule.status] : (rule.status ?? []);
      for (const status of statuses) {
        if (seenStatus.has(status)) {
          issue(
            [...at, "status"],
            `errors.rules lists status ${status} more than once`,
          );
        }
        seenStatus.add(status);
      }
      if (rule.statusMin !== undefined) {
        if (seenStatusMin.has(rule.statusMin)) {
          issue(
            [...at, "statusMin"],
            `errors.rules lists statusMin ${rule.statusMin} more than once`,
          );
        }
        seenStatusMin.add(rule.statusMin);
      }
    });

    const modelKeys = new Set(Object.keys(entry.models.catalog));
    if (!modelKeys.has(entry.models.default)) {
      issue(
        ["models", "default"],
        "models.default must be a key of models.catalog",
      );
    }

    const seenTopModels = new Set<string>();
    (entry.models.topModels ?? []).forEach((id, index) => {
      if (!modelKeys.has(id)) {
        issue(
          ["models", "topModels", index],
          "models.topModels entry must be a key of models.catalog",
        );
      }
      if (seenTopModels.has(id)) {
        issue(
          ["models", "topModels", index],
          "models.topModels must not contain duplicate entries",
        );
      }
      seenTopModels.add(id);
    });

    const { alias, placement } = decide.model;
    if (placement === "body-unless-alias" && alias === undefined) {
      issue(
        ["decide", "model", "alias"],
        "decide.model.alias is required when placement is body-unless-alias",
      );
    }
    if (placement === "body" && alias !== undefined) {
      issue(
        ["decide", "model", "alias"],
        "decide.model.alias is only valid with placement body-unless-alias",
      );
    }
    if (alias !== undefined && !modelKeys.has(alias)) {
      issue(
        ["decide", "model", "alias"],
        "decide.model.alias must be a key of models.catalog",
      );
    }

    for (const id of Object.keys(entry.decisionLimits?.models ?? {})) {
      if (!modelKeys.has(id)) {
        issue(
          ["decisionLimits", "models", id],
          "decisionLimits.models key must be a key of models.catalog",
        );
      }
    }

    if (
      decide.baseURLRequired === true &&
      !decide.endpoint.includes("{baseURL}")
    ) {
      issue(
        ["decide", "endpoint"],
        "decide.endpoint must contain {baseURL} when decide.baseURLRequired is true",
      );
    }

    const seenShapes = new Set<string>();
    decide.errors.bodyShapes.forEach((shape, index) => {
      const key = `${shape.path}|${shape.isArray === true}`;
      if (seenShapes.has(key)) {
        issue(
          ["decide", "errors", "bodyShapes", index],
          "errors.bodyShapes lists the same path and isArray twice",
        );
      }
      seenShapes.add(key);
    });

    const seenHeaders = new Set<string>();
    (decide.requestIdHeaders ?? []).forEach((header, index) => {
      if (seenHeaders.has(header.toLowerCase())) {
        issue(
          ["decide", "requestIdHeaders", index],
          "requestIdHeaders lists the same header twice; header names are case-insensitive",
        );
      }
      seenHeaders.add(header.toLowerCase());
    });

    for (const key of UNSUPPORTED_DECIDE_WIRE_KEYS) {
      if (wire[key] !== undefined) {
        issue(
          ["wire", key],
          `wire.${key} is not supported on decide entries yet; ConfiguredDecisionProvider does not read it`,
        );
      }
    }

    const hasBaseURL = wire.baseURL !== undefined;
    const hasTemplate = wire.baseURLTemplate !== undefined;

    if (decide.baseURLRequired === true) {
      if (hasBaseURL || hasTemplate) {
        ctx.addIssue({
          code: "custom",
          path: ["wire", hasBaseURL ? "baseURL" : "baseURLTemplate"],
          message:
            "wire must not set baseURL or baseURLTemplate when decide.baseURLRequired is true; the caller supplies the base URL",
        });
      }
    } else if (hasBaseURL === hasTemplate) {
      ctx.addIssue({
        code: "custom",
        path: ["wire", "baseURL"],
        message:
          "wire requires exactly one of baseURL or baseURLTemplate unless decide.baseURLRequired is true",
      });
    }
  });

function describeIssues(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

function carriesInferenceKinds(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { inferenceKinds?: unknown }).inferenceKinds !== undefined
  );
}

export function parseCatalogEntry(
  raw: unknown,
  sourcePath = "<in-memory entry>",
): CatalogEntry {
  if (!carriesInferenceKinds(raw)) {
    return parseProviderCatalogJson(raw, sourcePath);
  }
  const result = decideCatalogJsonSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid decide catalog file ${sourcePath}: ${describeIssues(result.error)}`,
    );
  }
  return result.data;
}

export function isDecideCatalogEntry(
  entry: CatalogEntry,
): entry is DecideCatalogJson {
  return "inferenceKinds" in entry;
}

export function parseProviderCatalogJson(
  raw: unknown,
  sourcePath: string,
): ProviderCatalogJson {
  if (carriesInferenceKinds(raw)) {
    throw new Error(
      `Invalid provider catalog file ${sourcePath}: inferenceKinds is set, so this is a decide entry; parse it with parseCatalogEntry`,
    );
  }
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
