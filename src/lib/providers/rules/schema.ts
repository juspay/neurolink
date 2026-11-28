/**
 * zod validator for provider rules files (`src/lib/providers/rules/*.json`).
 * Mirrors `ProviderRulesFile` in src/lib/types/providerRules.ts with strict
 * objects (an unknown key is an authoring mistake) plus the cross-field
 * checks the plain types cannot express.
 */
import { z } from "zod";

const errorClass = z.enum([
  "authentication",
  "rate-limit",
  "invalid-model",
  "network",
  "provider",
]);

const oneOrMany = <T extends z.ZodTypeAny>(item: T) =>
  z.union([item, z.array(item).min(1)]);

const httpStatus = z.number().int().min(100).max(599);

function compiles(source: string): boolean {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

const regex = z
  .string()
  .min(1)
  .refine(compiles, "must compile as a regular expression");

const errorRuleSchema = z
  .strictObject({
    status: oneOrMany(httpStatus).optional(),
    statusRange: z.tuple([httpStatus, httpStatus]).optional(),
    messageStatus: oneOrMany(httpStatus).optional(),
    errorName: oneOrMany(z.string().min(1)).optional(),
    errorCode: oneOrMany(z.string().min(1)).optional(),
    bodyErrorType: oneOrMany(z.string().min(1)).optional(),
    always: z.literal(true).optional(),
    pattern: regex.optional(),
    allPatterns: z.array(regex).min(1).optional(),
    notPattern: regex.optional(),
    caseSensitive: z.boolean().optional(),
    searchResponseBody: z.boolean().optional(),
    patternStatuses: z.array(httpStatus).min(1).optional(),
    patternWhenNoStatus: z.boolean().optional(),
    class: errorClass,
    message: z.string().min(1).optional(),
    messageWhen: z
      .array(z.strictObject({ pattern: regex, message: z.string().min(1) }))
      .min(1)
      .optional(),
    messageHook: z.string().min(1).optional(),
  })
  .superRefine((rule, ctx) => {
    const triggers = [
      rule.status,
      rule.statusRange,
      rule.messageStatus,
      rule.errorName,
      rule.errorCode,
      rule.bodyErrorType,
      rule.always,
      rule.pattern,
      rule.allPatterns,
    ].filter((value) => value !== undefined);
    if (triggers.length === 0) {
      ctx.addIssue({ code: "custom", message: "rule has no trigger" });
    }
    if (rule.always && triggers.length > 1) {
      ctx.addIssue({
        code: "custom",
        message: "an `always` rule takes no other trigger",
      });
    }
    if (rule.message === undefined && rule.messageHook === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "rule needs `message` or `messageHook`",
      });
    }
    const hasPattern =
      rule.pattern !== undefined || rule.allPatterns !== undefined;
    for (const key of [
      "notPattern",
      "patternStatuses",
      "patternWhenNoStatus",
      "searchResponseBody",
      "caseSensitive",
    ] as const) {
      if (rule[key] !== undefined && !hasPattern) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `\`${key}\` needs \`pattern\` or \`allPatterns\``,
        });
      }
    }
    if (
      rule.statusRange !== undefined &&
      rule.statusRange[0] > rule.statusRange[1]
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["statusRange"],
        message: "statusRange must be [low, high]",
      });
    }
  });

const errorsSchema = z.strictObject({
  statusFrom: z.enum(["cause-chain", "top-level"]).optional(),
  messageFrom: z.enum(["composed", "top-level"]).optional(),
  timeout: z
    .strictObject({ class: errorClass, message: z.string().min(1) })
    .optional(),
  useDefaults: z.boolean().optional(),
  rules: z.array(errorRuleSchema).min(1),
});

const finishValue = z.string().min(1).nullable();

const finishReasonMapSchema = z
  .strictObject({
    map: z.record(z.string(), finishValue),
    default: finishValue,
    whenAbsent: finishValue.optional(),
    defaultAtToolCap: z.string().min(1).optional(),
    passthroughUnknown: z.boolean().optional(),
    lowercase: z.boolean().optional(),
  })
  .superRefine((table, ctx) => {
    if (table.lowercase) {
      for (const key of Object.keys(table.map)) {
        if (key !== key.toLowerCase()) {
          ctx.addIssue({
            code: "custom",
            path: ["map", key],
            message: "a `lowercase` table can only list lower-case reasons",
          });
        }
      }
    }
  });

const usagePath = z
  .string()
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/,
    "must be a dotted field path",
  );

const wireUsageSchema = z.strictObject({
  input: usagePath,
  output: usagePath,
  total: usagePath.optional(),
  cacheRead: usagePath.optional(),
  reasoning: usagePath.optional(),
  reasoningInOutput: z.boolean(),
});

const usageCountDialectSchema = z.strictObject({
  input: z.array(usagePath).min(1),
  output: z.array(usagePath).min(1),
  total: z.array(usagePath).min(1),
  pick: z.enum(["truthy", "defined"]),
});

const usageFieldSchema = z.strictObject({
  paths: z.array(usagePath).min(1),
  positiveOnly: z.boolean().optional(),
});

const usageFieldsSchema = z.strictObject({
  input: usageFieldSchema,
  output: usageFieldSchema,
  total: usageFieldSchema,
  reasoning: usageFieldSchema,
  cacheCreation: usageFieldSchema,
  cacheRead: usageFieldSchema,
  cacheReadIncludedInInput: usageFieldSchema,
});

const usageRebaseSchema = z.strictObject({
  whenAnyPresent: z.array(usagePath).min(1),
  unlessAnyPresent: z.array(usagePath).min(1),
  uncachedInput: usagePath,
  cacheWrite: usagePath,
});

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

const toolChoiceMapSchema = z.strictObject({
  modes: z.strictObject({
    auto: jsonValue.optional(),
    none: jsonValue.optional(),
    required: jsonValue.optional(),
  }),
  acceptStrings: z.boolean(),
  acceptModeObjects: z.boolean(),
  tool: jsonValue,
  toolRequiresName: z.boolean(),
  passthroughStrings: z.boolean().optional(),
  fallback: jsonValue,
});

const charClass = z
  .string()
  .min(1)
  .refine((body) => {
    try {
      new RegExp(`[${body}]`);
      return !body.includes("]");
    } catch {
      return false;
    }
  }, "must be a regex character-class body");

const toolNameRulesSchema = z.strictObject({
  firstChars: charClass,
  allowedChars: charClass,
  maxLength: z.number().int().min(2),
});

const positiveInt = z.number().int().positive();
const budgetRange = z
  .strictObject({ min: z.number().int().nonnegative(), max: positiveInt })
  .refine((range) => range.min <= range.max, "min must not exceed max");

const reasoningSchema = z.strictObject({
  defaultLevel: z.string().min(1),
  defaultBudgetTokens: positiveInt,
  levelFractions: z.record(z.string().min(1), z.number().min(0).max(1)),
  maxBudgetTokens: z.strictObject({
    rules: z.array(z.strictObject({ match: regex, value: positiveInt })),
    default: positiveInt,
  }),
  budgetRanges: z.strictObject({
    rules: z.array(
      z.strictObject({
        match: regex,
        min: z.number().int().nonnegative(),
        max: positiveInt,
      }),
    ),
    fallback: budgetRange,
  }),
  restrictedOutputTokenLimit: positiveInt,
});

export const providerRulesFileSchema = z.strictObject({
  $schema: z.string().optional(),
  id: z
    .string()
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "id must be kebab-case"),
  errors: errorsSchema.optional(),
  finishReasons: z.record(z.string().min(1), finishReasonMapSchema).optional(),
  usage: wireUsageSchema.optional(),
  usageDialects: z
    .record(z.string().min(1), usageCountDialectSchema)
    .optional(),
  usageFields: usageFieldsSchema.optional(),
  contextWindows: z
    .record(
      z.string().min(1),
      z.record(z.string().min(1), z.number().int().positive()),
    )
    .optional(),
  contextWindowNotes: z
    .record(z.string().min(1), z.record(z.string().min(1), z.string().min(1)))
    .optional(),
  providerAliases: z
    .record(z.string().regex(/^[a-z]+$/), z.string().min(1))
    .optional(),
  usageRebase: usageRebaseSchema.optional(),
  toolChoices: z.record(z.string().min(1), toolChoiceMapSchema).optional(),
  toolNames: toolNameRulesSchema.optional(),
  modelFamilies: z.record(z.string().min(1), z.array(regex).min(1)).optional(),
  modelFamilyNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  imageLimits: z
    .record(
      z.string().min(1),
      z.union([
        z.number().int().positive(),
        z.record(z.string().min(1), z.number().int().positive()),
      ]),
    )
    .optional(),
  imageLimitDefault: z.number().int().positive().optional(),
  imageLimitNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  proxyProviders: z.array(z.string().min(1)).optional(),
  visionModels: z
    .record(z.string().min(1), z.array(z.string().min(1)))
    .optional(),
  visionModelNotes: z
    .record(z.string().min(1), z.record(z.string().min(1), z.string().min(1)))
    .optional(),
  visionFamilies: z.record(z.string().min(1), z.string().min(1)).optional(),
  modelFamilyLabels: z
    .strictObject({
      rules: z.array(
        z.strictObject({ match: regex, label: z.string().min(1) }),
      ),
      default: z.string().min(1),
    })
    .optional(),
  modelLists: z
    .record(z.string().min(1), z.array(z.string().min(1)).min(1))
    .optional(),
  modelListNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  reasoning: reasoningSchema.optional(),
  reasoningNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  apiKeyFormats: z.record(z.string().min(1), regex).optional(),
  apiKeyLengths: z
    .record(z.string().min(1), z.number().int().positive())
    .optional(),
  oauthTokenFormats: z.record(z.string().min(1), regex).optional(),
  credentialFormatNotes: z
    .record(z.string().min(1), z.string().min(1))
    .optional(),
  thinkingLimits: z
    .strictObject({
      minBudgetTokens: positiveInt,
      answerReserveTokens: z.number().int().nonnegative(),
    })
    .optional(),
  thinkingLimitNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  defaultModel: z.string().min(1).optional(),
  defaultModelNote: z.string().min(1).optional(),
  fallbackModel: z.string().min(1).optional(),
  fallbackModelNote: z.string().min(1).optional(),
  errorSignals: z.record(z.string().min(1), z.array(regex).min(1)).optional(),
  errorSignalNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  requestDefaults: z
    .strictObject({
      temperature: z.number().min(0).max(2).optional(),
      largeOutputThresholdTokens: positiveInt.optional(),
      largeOutputTimeoutFloorMs: positiveInt.optional(),
      clientTimeoutMs: positiveInt.optional(),
      finalizationMinTokens: positiveInt.optional(),
      finalizationHeadroomTokens: positiveInt.optional(),
    })
    .optional(),
  requestDefaultNotes: z
    .record(z.string().min(1), z.string().min(1))
    .optional(),
  requestFields: z
    .strictObject({
      maxTokens: z.string().min(1),
      temperature: z.string().min(1),
      topP: z.string().min(1),
      stopSequences: z.string().min(1),
    })
    .optional(),
  requestFieldRules: z
    .strictObject({
      omitWhileThinking: z
        .array(z.enum(["maxTokens", "temperature", "topP", "stopSequences"]))
        .optional(),
    })
    .optional(),
  requestFieldNotes: z.record(z.string().min(1), z.string().min(1)).optional(),
  toolResults: z
    .strictObject({
      errorTemplate: z.string().includes("{error}"),
      errorFlag: z.string().min(1),
    })
    .optional(),
  contextTexts: z.strictObject({ elisionNote: z.string().min(1) }).optional(),
  finalResultTool: z
    .strictObject({
      name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/),
      description: z.string().min(1),
      instructions: z.strictObject({
        mustCall: z.string().includes("{tool}"),
        callWhenReady: z.string().includes("{tool}"),
        noLongerAvailable: z.string().includes("{tool}"),
      }),
    })
    .optional(),
  finalResultToolNotes: z
    .record(z.string().min(1), z.string().min(1))
    .optional(),
});
