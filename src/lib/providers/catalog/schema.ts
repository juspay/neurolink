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

// The most steps one `{n}` or `{n,m}` may stand for.
const MAX_PATTERN_COUNT = 255;

// The most ways a pattern's counts may multiply: each `?` is 2 and each `{n,m}`
// is m-n+1. Adjacent bounded counts multiply on a miss (`.{0,255}` three times
// took 38 s on one 2,000-character message), and a miss on a 5xx is retried.
// XOR's pattern is 3,362.
const MAX_PATTERN_WAYS = 4096;

// What can make a pattern backtrack catastrophically on an error message, so
// that a catalog author cannot write it: `*`, `+` and an open-ended `{n,}` have
// no upper bound; any quantifier on a group (`(a|a){0,30}`, `(ab)?`) repeats
// whatever its alternatives match, and quantifiers nested that way multiply; a
// count above MAX_PATTERN_COUNT is as good as no bound. A quantifier on a plain
// character, class or escape is fine. Inside a character class all of them are
// plain characters, and a backslash makes the next one plain everywhere.
// Counts that sit side by side multiply, so their product has a budget too
// (MAX_PATTERN_WAYS); within it a pattern is still not a guarantee of linear
// time, and wants reading.
function hasRiskyQuantifier(pattern: string): boolean {
  const count = /\{(\d+)(?:,(\d*))?\}/y;
  let inClass = false;
  let afterGroup = false;
  let ways = 1;
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const onGroup = afterGroup;
    afterGroup = false;
    if (char === "\\") {
      index += 1;
    } else if (inClass) {
      inClass = char !== "]";
    } else if (char === "[") {
      inClass = true;
    } else if (char === ")") {
      afterGroup = true;
    } else if (char === "*" || char === "+" || (char === "?" && onGroup)) {
      return true;
    } else if (char === "?") {
      // The `?` that opens a group (`(?:`, `(?=`) is not a quantifier.
      if (pattern[index - 1] !== "(") {
        ways *= 2;
      }
    } else if (char === "{") {
      count.lastIndex = index;
      const found = count.exec(pattern);
      if (
        found &&
        (onGroup ||
          found[2] === "" ||
          Math.max(Number(found[1]), Number(found[2] ?? 0)) > MAX_PATTERN_COUNT)
      ) {
        return true;
      }
      if (found && found[2] !== undefined) {
        ways *= Number(found[2]) - Number(found[1]) + 1;
      }
    }
    if (ways > MAX_PATTERN_WAYS) {
      return true;
    }
  }
  return false;
}

function compilesAsPattern(pattern: string): boolean {
  try {
    new RegExp(pattern, "i");
    return true;
  } catch {
    return false;
  }
}

const decideMessagePatternSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(compilesAsPattern, {
    message: "messagePattern is not a valid regular expression",
  })
  .refine((pattern) => !hasRiskyQuantifier(pattern), {
    message:
      "messagePattern must be bounded: an unescaped * or +, an open-ended {n,}, a {n,m} count above 255, or any quantifier on a group, outside a character class, can backtrack catastrophically on an error message. Put ?, or {n,m} up to 255, only on a plain character, a character class or an escape, and keep the counts side by side to 4096 ways in all (each ? is 2, each {n,m} is m-n+1)",
  });

const decideErrorHintSchema = z
  .string()
  .min(1)
  .max(300)
  .refine((hint) => !/[{}]/.test(hint.split("{apiKeyEnvVar}").join("")), {
    message: "hint may only use the {apiKeyEnvVar} placeholder",
  });

const decideErrorRuleSchema = z.strictObject({
  status: z
    .union([decideStatusSchema, z.array(decideStatusSchema).min(1)])
    .optional(),
  statusMin: decideStatusSchema.optional(),
  messagePattern: decideMessagePatternSchema.optional(),
  kind: decideErrorKindSchema,
  retryable: z.boolean().optional(),
  hint: decideErrorHintSchema.optional(),
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

// The keys the body already uses, and the names an object must not take as an
// own key from data.
const RESERVED_MEDIA_KEYS: ReadonlySet<string> = new Set([
  "model",
  "state",
  "questions",
  "__proto__",
  "constructor",
  "prototype",
]);

const decideMediaKeySchema = z
  .string()
  .regex(
    /^[A-Za-z][A-Za-z0-9_]*$/,
    "a media key must start with a letter and use only letters, digits and underscores",
  )
  .refine((key) => !RESERVED_MEDIA_KEYS.has(key), {
    message:
      "a media key must not be model, state, questions, __proto__, constructor or prototype",
  });

const decideMediaSchema = z
  .strictObject({
    imagesKey: decideMediaKeySchema,
    videoKey: decideMediaKeySchema.optional(),
    audioKey: decideMediaKeySchema.optional(),
  })
  .refine((media) => media.imagesKey !== media.videoKey, {
    path: ["videoKey"],
    message:
      "decide.media.videoKey must differ from imagesKey: one body key cannot carry both",
  })
  .refine(
    (media) =>
      media.audioKey === undefined ||
      (media.audioKey !== media.imagesKey && media.audioKey !== media.videoKey),
    {
      path: ["audioKey"],
      message:
        "decide.media.audioKey must differ from imagesKey and videoKey: one body key cannot carry two kinds of media",
    },
  );

const DECIDE_QUESTION_TYPES = [
  "boolean",
  "choice",
  "score",
  "value",
  "choice-unknown",
] as const;

// The openai-decisions dialect writes predicates, choices and levels only.
const OPENAI_DECISIONS_QUESTION_TYPES: ReadonlySet<string> = new Set([
  "boolean",
  "choice",
  "score",
]);

const GUARD_LIST_MAX = 8;

const ambientGuardEnvNameSchema = z
  .string()
  .max(64)
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "an environment variable name must be upper-case letters, digits and underscores, and start with a letter",
  );

// Lower-case scheme, host labels and an optional port, nothing else: the
// origin is compared after the same parsing a base URL gets, so a spelling
// that URL would normalise (a trailing slash, a path, an upper-case host) is
// refused here instead of being quietly accepted.
const AMBIENT_GUARD_ORIGIN_PATTERN =
  /^https?:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::[0-9]{1,5})?$/;

function parsesAsUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const ambientGuardOriginSchema = z
  .string()
  .max(100)
  .regex(
    AMBIENT_GUARD_ORIGIN_PATTERN,
    "a trusted origin must be an http(s) origin: a lower-case scheme, host and optional port, with no path, query, fragment or userinfo",
  )
  .refine(parsesAsUrl, {
    message:
      "a trusted origin must parse as a URL (a valid host, port 0 to 65535)",
  });

const ambientGuardCredentialKeySchema = z
  .string()
  .max(64)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9]*$/,
    "a credentials key must be letters and digits, and start with a letter",
  );

const ambientKeyGuardSchema = z.strictObject({
  baseURLEnvVars: z.array(ambientGuardEnvNameSchema).min(1).max(GUARD_LIST_MAX),
  trustedOrigins: z.array(ambientGuardOriginSchema).min(1).max(GUARD_LIST_MAX),
  credentialBaseURLs: z
    .array(
      z.strictObject({
        key: ambientGuardCredentialKeySchema,
        field: z.literal("baseURL"),
      }),
    )
    .min(1)
    .max(GUARD_LIST_MAX)
    .optional(),
});

const decideBlockSchema = z.strictObject({
  dialect: z.enum(["system-one", "openai-decisions"]),
  order: decidePositiveInt,
  baseURLRequired: z.boolean().optional(),
  baseURLNormalize: z
    .array(z.enum(["strip-trailing-slash", "strip-v1-suffix"]))
    .optional(),
  baseURLShape: z.enum(["origin"]).optional(),
  endpoint: decideEndpointSchema,
  model: z.strictObject({
    placement: z.enum(["body", "body-unless-alias"]),
    alias: z.string().min(1).optional(),
  }),
  authHeader: z.enum(["bearer", "x-api-key"]).optional(),
  stateEncoding: z.enum(["text"]).optional(),
  media: decideMediaSchema.optional(),
  capableModel: z
    .strictObject({
      model: z.string().min(1),
      questionTypes: z.array(z.enum(DECIDE_QUESTION_TYPES)),
    })
    .optional(),
  ambientKeyGuard: ambientKeyGuardSchema.optional(),
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

// `media` is the allowance the base class prepares and gates a request's images
// and video against; `decide.media` names the body keys they go out under, and
// the entry refinement below requires the two together.
const decideLimitsSchema = z.strictObject({
  maxStateTokens: decidePositiveInt,
  maxQuestions: decidePositiveInt.optional(),
  questionTypes: z
    .array(z.enum(DECIDE_QUESTION_TYPES))
    .min(1)
    .refine((types) => new Set(types).size === types.length, {
      message: "decisionLimits.questionTypes lists the same type twice",
    })
    .optional(),
  maxScoreLevels: decidePositiveInt.optional(),
  maxChoiceOptions: decidePositiveInt.optional(),
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
  media: z
    .strictObject({
      maxImages: decidePositiveInt,
      video: z.boolean(),
      maxRequestBytes: decidePositiveInt,
      audio: z.strictObject({ maxSeconds: decidePositiveInt }).optional(),
    })
    .optional(),
  advisory: z.boolean().optional(),
});

// decide.capableModel names another key of the catalog, never the default, and
// only question types the entry reads: anything else is refused before a model
// is chosen.
function checkCapableModel(
  entry: {
    models: { default: string };
    decisionLimits?: { questionTypes?: readonly string[] };
    decide: {
      capableModel?: { model: string; questionTypes: readonly string[] };
    };
  },
  modelKeys: ReadonlySet<string>,
  issue: (path: (string | number)[], message: string) => void,
): void {
  const capable = entry.decide.capableModel;
  if (capable === undefined) {
    return;
  }
  if (!modelKeys.has(capable.model)) {
    issue(
      ["decide", "capableModel", "model"],
      "decide.capableModel.model must be a key of models.catalog",
    );
  }
  if (capable.model === entry.models.default) {
    issue(
      ["decide", "capableModel", "model"],
      "decide.capableModel.model must differ from models.default: a request is sent to it instead of the default",
    );
  }
  const declared = entry.decisionLimits?.questionTypes ?? [
    "boolean",
    "choice",
    "score",
  ];
  capable.questionTypes.forEach((type, index) => {
    if (!declared.includes(type)) {
      issue(
        ["decide", "capableModel", "questionTypes", index],
        `decide.capableModel.questionTypes lists ${type}, which decisionLimits.questionTypes does not: such a question is refused before any model is chosen`,
      );
    }
  });
}

const decideCatalogJsonSchema = z
  .strictObject({
    ...catalogIdentityShape,
    inferenceKinds: z.tuple([z.literal("decide")]),
    tier: z.literal(2).optional(),
    wire: decideWireSchema,
    models: decideModelsSchema,
    timeouts: z
      .strictObject({
        decideMs: decidePositiveInt.optional(),
        decideMsPerKStateTokens: decidePositiveInt.optional(),
      })
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

    // Two rules collide only on the same status AND the same pattern: XOR
    // lists a pattern rule and a plain rule at one statusMin.
    const seenStatus = new Set<string>();
    const seenStatusMin = new Set<string>();
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
      const sameAs =
        rule.messagePattern === undefined
          ? ""
          : " with the same messagePattern";
      const keyOf = (value: number): string =>
        JSON.stringify([value, rule.messagePattern ?? null]);
      for (const status of statuses) {
        if (seenStatus.has(keyOf(status))) {
          issue(
            [...at, "status"],
            `errors.rules lists status ${status} more than once${sameAs}`,
          );
        }
        seenStatus.add(keyOf(status));
      }
      if (rule.statusMin !== undefined) {
        if (seenStatusMin.has(keyOf(rule.statusMin))) {
          issue(
            [...at, "statusMin"],
            `errors.rules lists statusMin ${rule.statusMin} more than once${sameAs}`,
          );
        }
        seenStatusMin.add(keyOf(rule.statusMin));
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

    checkCapableModel(entry, modelKeys, issue);

    for (const id of Object.keys(entry.decisionLimits?.models ?? {})) {
      if (!modelKeys.has(id)) {
        issue(
          ["decisionLimits", "models", id],
          "decisionLimits.models key must be a key of models.catalog",
        );
      }
    }

    const mediaKeys = decide.media;
    const mediaAllowance = entry.decisionLimits?.media;
    if (decide.dialect === "openai-decisions") {
      // This dialect writes images into the request input itself, so it has no
      // body keys to name, and the input has no video part. The allowance
      // alone is how many images a request may carry.
      if (mediaKeys !== undefined) {
        issue(
          ["decide", "media"],
          "decide.media is not valid with dialect openai-decisions: that dialect places images in the request input itself and has no body keys for them",
        );
      }
      if (mediaAllowance?.video === true) {
        issue(
          ["decisionLimits", "media", "video"],
          "decisionLimits.media.video must be false with dialect openai-decisions: its request input has no video part",
        );
      }
      if (placement !== "body") {
        issue(
          ["decide", "model", "placement"],
          "decide.model.placement must be body with dialect openai-decisions: the model is always a field of the request",
        );
      }
      if (mediaAllowance?.audio !== undefined) {
        issue(
          ["decisionLimits", "media", "audio"],
          "decisionLimits.media.audio is not valid with dialect openai-decisions: its request input has no audio part",
        );
      }
      (entry.decisionLimits?.questionTypes ?? []).forEach((type, index) => {
        if (!OPENAI_DECISIONS_QUESTION_TYPES.has(type)) {
          issue(
            ["decisionLimits", "questionTypes", index],
            `decisionLimits.questionTypes cannot list ${type} with dialect openai-decisions: that dialect writes boolean, choice and score questions only`,
          );
        }
      });
    } else {
      if (mediaKeys !== undefined && mediaAllowance === undefined) {
        issue(
          ["decide", "media"],
          "decide.media needs decisionLimits.media: without an allowance the base class refuses every image and video, so these keys would never be written",
        );
      }
      if (mediaKeys === undefined && mediaAllowance !== undefined) {
        issue(
          ["decisionLimits", "media"],
          "decisionLimits.media needs decide.media: without body keys the engine would prepare a request's media and then leave it out of the body",
        );
      }
      if (mediaKeys !== undefined && mediaAllowance !== undefined) {
        if (mediaAllowance.video && mediaKeys.videoKey === undefined) {
          issue(
            ["decide", "media", "videoKey"],
            "decide.media.videoKey is required when decisionLimits.media.video is true",
          );
        }
        if (!mediaAllowance.video && mediaKeys.videoKey !== undefined) {
          issue(
            ["decide", "media", "videoKey"],
            "decide.media.videoKey must be omitted when decisionLimits.media.video is false",
          );
        }
        if (
          mediaAllowance.audio !== undefined &&
          mediaKeys.audioKey === undefined
        ) {
          issue(
            ["decide", "media", "audioKey"],
            "decide.media.audioKey is required when decisionLimits.media.audio is set",
          );
        }
        if (
          mediaAllowance.audio === undefined &&
          mediaKeys.audioKey !== undefined
        ) {
          issue(
            ["decide", "media", "audioKey"],
            "decide.media.audioKey must be omitted when decisionLimits.media.audio is not set",
          );
        }
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

    const guard = decide.ambientKeyGuard;
    if (guard !== undefined) {
      const ownBaseURLVar =
        wire.envOverrides?.baseURL ??
        `${entry.id.toUpperCase().replace(/-/g, "_")}_BASE_URL`;
      const lists: ReadonlyArray<readonly [string, readonly string[], string]> =
        [
          ["baseURLEnvVars", guard.baseURLEnvVars, "variable"],
          ["trustedOrigins", guard.trustedOrigins, "origin"],
        ];
      for (const [field, values, noun] of lists) {
        if (new Set(values).size !== values.length) {
          issue(
            ["decide", "ambientKeyGuard", field],
            `lists the same ${noun} twice`,
          );
        }
      }
      const credentialFields = guard.credentialBaseURLs ?? [];
      if (
        new Set(credentialFields.map((c) => `${c.key}.${c.field}`)).size !==
        credentialFields.length
      ) {
        issue(
          ["decide", "ambientKeyGuard", "credentialBaseURLs"],
          "lists the same credentials field twice",
        );
      }
      if (guard.baseURLEnvVars.includes(ownBaseURLVar)) {
        issue(
          ["decide", "ambientKeyGuard", "baseURLEnvVars"],
          `must not list the provider's own base-URL variable ${ownBaseURLVar}: setting it already exempts the key`,
        );
      }
    }

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
