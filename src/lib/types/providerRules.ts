/**
 * The provider-rules JSON format: provider- and model-specific behaviour
 * written as data in `src/lib/providers/rules/<id>.json`, read by the shared
 * rule engines in `src/lib/providers/rules/`, instead of being hard-coded in
 * each provider class.
 *
 * The error-rule shape is a superset of the catalog's `CatalogErrorRuleJson`,
 * so catalog entries and rules files compile through the same engine.
 */

import type { ProviderErrorContext } from "./errors.js";
import type { CatalogErrorRuleClass } from "./providerCatalog.js";

/**
 * One error-classification rule. It matches when ANY of its triggers fires:
 * a status (`status`, `statusRange`), an error name or code (`errorName`,
 * `errorCode`), or its patterns (`pattern` / `allPatterns`, optionally
 * narrowed by `patternStatuses` or `patternWhenNoStatus`). Rules are tried in
 * order; the first match wins.
 */
export type ProviderRuleErrorJson = {
  /** HTTP status, or list of statuses, that triggers the rule. */
  status?: number | number[];
  /** Inclusive HTTP status range, e.g. [500, 599]. */
  statusRange?: [number, number];
  /** Status written in the message text as an HTTP status ("HTTP 429", "error 401"). */
  messageStatus?: number | number[];
  /** `error.name` values (e.g. "TimeoutError", "ThrottlingException"). */
  errorName?: string | string[];
  /** `error.code` values, searched through the cause chain (e.g. "ECONNREFUSED"). */
  errorCode?: string | string[];
  /** OpenAI-style error type, read from `error.type` or the JSON body's `error.type`. */
  bodyErrorType?: string | string[];
  /** Matches every error; for a catch-all last rule. */
  always?: boolean;
  /** Regular expression tested against the message. */
  pattern?: string;
  /** Regular expressions that must ALL match; an alternative to `pattern`. */
  allPatterns?: string[];
  /** When this matches, the pattern trigger does not fire. */
  notPattern?: string;
  /** Patterns are case-insensitive unless this is true. */
  caseSensitive?: boolean;
  /** Patterns also search the error's `responseBody`. */
  searchResponseBody?: boolean;
  /** Restrict the pattern trigger to these statuses; status matching stays independent. */
  patternStatuses?: number[];
  /** The pattern trigger fires only when the error carries no HTTP status. */
  patternWhenNoStatus?: boolean;
  class: CatalogErrorRuleClass;
  /**
   * Message for the classified error. Placeholders: `{model}`, `{message}`
   * (the raw message), `{provider}`, and any variable the provider supplies
   * (for example `{baseURL}`, already redacted). Required unless the rule
   * names a `messageHook`.
   */
  message?: string;
  /** Alternative messages, chosen by the first pattern that matches the error message. */
  messageWhen?: Array<{ pattern: string; message: string }>;
  /**
   * Named message builder for messages that need logic data cannot express
   * (for example a list of model suggestions). Used instead of `message`.
   */
  messageHook?: string;
};

/** How a rules file classifies errors. */
export type ProviderRuleErrors = {
  /** Where the HTTP status is read: anywhere in the cause chain (default) or the top-level error only. */
  statusFrom?: "cause-chain" | "top-level";
  /** Message tested by patterns: top-level plus deepest cause (default), or the top-level message only. */
  messageFrom?: "composed" | "top-level";
  /** Replaces the shared handling of `TimeoutError`; `{message}` is the timeout's own message. */
  timeout?: { class: CatalogErrorRuleClass; message: string };
  /** Append the shared default rules after these (default true). */
  useDefaults?: boolean;
  rules: ProviderRuleErrorJson[];
};

/** Values a provider passes into error-message placeholders. */
export type ProviderRuleTemplateVars = Record<string, string | undefined>;

/** A provider's rules file. Each block is optional; a provider uses the ones it needs. */
export type ProviderRulesFile = {
  $schema?: string;
  /** Provider id, matching the AIProviderName value. */
  id: string;
  /** Error classification. */
  errors?: ProviderRuleErrors;
  /** Finish-reason translation tables, by name (one wire can have several). */
  finishReasons?: Record<string, ProviderFinishReasonMap>;
  /** Where this wire reports each token count. */
  usage?: ProviderWireUsage;
  /** Context window per provider and model; `_default` is the provider fallback. Key order matters (first prefix match wins). */
  contextWindows?: Record<string, Record<string, number>>;
  /** Why a context-window entry has its value, by provider and model. */
  contextWindowNotes?: Record<string, Record<string, string>>;
  /** Normalized provider spelling to the canonical `contextWindows` key. */
  providerAliases?: Record<string, string>;
  /** Named prompt/completion/total layouts, for wires with several (SageMaker). */
  usageDialects?: Record<string, ProviderUsageCountDialect>;
  /** Where each token count lives in a raw usage object, in priority order. */
  usageFields?: ProviderUsageFields;
  /** When a cache-inclusive input count is rebased onto the uncached part. */
  usageRebase?: ProviderUsageRebase;
  /** How this wire spells a tool choice, by name (one wire can have several). */
  toolChoices?: Record<string, ProviderToolChoiceMap>;
  /** Which tool names this wire accepts, and how others are rewritten. */
  toolNames?: ProviderToolNameRules;
  /** Named model-id families: case-insensitive regex sources, any match counts. */
  modelFamilies?: Record<string, string[]>;
  /** Why each model family holds the models it does. */
  modelFamilyNotes?: Record<string, string>;
  /** Images per request, by provider; an object gives a limit per model family. */
  imageLimits?: Record<string, number | Record<string, number>>;
  /** Images per request for a provider missing from `imageLimits`. */
  imageLimitDefault?: number;
  /** Why an image limit has its value, by provider. */
  imageLimitNotes?: Record<string, string>;
  /** Providers that route to arbitrary models, so an unknown model passes. */
  proxyProviders?: string[];
  /** Vision-capable model ids by provider (substring match); an empty list means no vision. */
  visionModels?: Record<string, string[]>;
  /** Notes on `visionModels`, by provider then model id ("*" for the provider). */
  visionModelNotes?: Record<string, Record<string, string>>;
  /** A `modelFamilies` name whose models count as vision-capable, by provider. */
  visionFamilies?: Record<string, string>;
  /** A label per model family: the first matching rule wins. */
  modelFamilyLabels?: {
    rules: ProviderModelRule<{ label: string }>[];
    default: string;
  };
  /** Named lists of exact model ids. */
  modelLists?: Record<string, string[]>;
  /** Why each model list holds the models it does. */
  modelListNotes?: Record<string, string>;
  /** Thinking (reasoning) defaults and per-model budgets. */
  reasoning?: ProviderReasoningRules;
  /** Why the reasoning values are what they are, by key. */
  reasoningNotes?: Record<string, string>;
  /** API key format (regex source) by provider. */
  apiKeyFormats?: Record<string, string>;
  /** API key lengths quoted in configuration hints, by name. */
  apiKeyLengths?: Record<string, number>;
  /** OAuth token format (regex source) by token kind. */
  oauthTokenFormats?: Record<string, string>;
  /** Notes on the key and token formats, by key. */
  credentialFormatNotes?: Record<string, string>;
  /** Extended-thinking budget limits (Anthropic Messages). */
  thinkingLimits?: ProviderThinkingLimits;
  /** Why each thinking limit is what it is, by key. */
  thinkingLimitNotes?: Record<string, string>;
  /** The model a provider uses when neither the call nor the environment names one. */
  defaultModel?: string;
  /** Why the default model is the one it is. */
  defaultModelNote?: string;
  /** The model a provider falls back to when none is configured. */
  fallbackModel?: string;
  /** Why the fallback model is the one it is. */
  fallbackModelNote?: string;
  /** Named error-text signals: case-insensitive regex sources, any match counts. */
  errorSignals?: Record<string, string[]>;
  /** Why each error signal holds the patterns it does. */
  errorSignalNotes?: Record<string, string>;
  /** Request defaults the provider fills in when the caller leaves them out. */
  requestDefaults?: ProviderRequestDefaults;
  /** Why each request default is what it is, by key. */
  requestDefaultNotes?: Record<string, string>;
  /** Wire names of request parameters, by neutral name. */
  requestFields?: ProviderRequestFields;
  /** Why the request field names read as they do. */
  requestFieldNotes?: Record<string, string>;
  /** How a failed tool call is reported back to the model. */
  toolResults?: ProviderToolResultRules;
  /** Fixed texts inserted into the conversation. */
  contextTexts?: ProviderContextTexts;
  /** The internal tool a model calls to return structured output. */
  finalResultTool?: ProviderFinalResultTool;
  /** Why the final-result tool and its instructions read as they do. */
  finalResultToolNotes?: Record<string, string>;
};

/** Wire names of request parameters, keyed by NeuroLink's neutral name. */
export type ProviderRequestFields = {
  maxTokens: string;
  temperature: string;
  topP: string;
  stopSequences: string;
};

/** Neutral request parameter values for `toWireParams`. */
export type ProviderWireParamValues = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
};

/** How a failed tool call is reported back to the model. */
export type ProviderToolResultRules = {
  /** `{name}` and `{error}` are replaced. */
  errorTemplate: string;
  /** The boolean field set on an errored tool result. */
  errorFlag: string;
};

/** Fixed texts inserted into the conversation. */
export type ProviderContextTexts = {
  /** Replaces tool exchanges removed to fit the context window. */
  elisionNote: string;
};

/** The internal structured-output tool and the prompt texts that steer a model to it. */
export type ProviderFinalResultTool = {
  name: string;
  description: string;
  /** System-prompt texts; `{tool}` is replaced with the tool name. */
  instructions: {
    mustCall: string;
    callWhenReady: string;
    noLongerAvailable: string;
  };
};

/** Request values a provider fills in when the caller leaves them out. */
export type ProviderRequestDefaults = {
  /** Sampling temperature sent when the caller gives none. */
  temperature?: number;
  /** Above this many output tokens, a generate call gets a longer timeout. */
  largeOutputThresholdTokens?: number;
  /** The shortest timeout, in ms, for a generate call above that threshold. */
  largeOutputTimeoutFloorMs?: number;
  /** Explicit SDK client timeout, in ms. */
  clientTimeoutMs?: number;
  /** Output-token floor of a forced finalization call. */
  finalizationMinTokens?: number;
  /** Context-window headroom kept when sizing that call. */
  finalizationHeadroomTokens?: number;
};

/** Extended-thinking budget limits for a Messages-style wire. */
export type ProviderThinkingLimits = {
  /** The smallest budget_tokens the API accepts. */
  minBudgetTokens: number;
  /** Tokens kept free inside max_tokens for the answer after thinking. */
  answerReserveTokens: number;
};

/** A rule matched against a model id (`match` is a case-insensitive regex source). */
export type ProviderModelRule<T> = { match: string } & T;

/** Thinking defaults and per-model budgets (Gemini). */
export type ProviderReasoningRules = {
  defaultLevel: string;
  defaultBudgetTokens: number;
  /** Fraction of the budget range per thinking level. */
  levelFractions: Record<string, number>;
  maxBudgetTokens: {
    rules: ProviderModelRule<{ value: number }>[];
    default: number;
  };
  /** thinkingBudget bounds a model accepts; the first matching rule wins. */
  budgetRanges: {
    rules: ProviderModelRule<{ min: number; max: number }>[];
    fallback: { min: number; max: number };
  };
  restrictedOutputTokenLimit: number;
};

/** A JSON value as stored in a rules file. */
export type ProviderRuleJsonValue =
  | string
  | number
  | boolean
  | null
  | ProviderRuleJsonValue[]
  | { [key: string]: ProviderRuleJsonValue };

/**
 * How one wire spells a NeuroLink tool choice. The input is a string
 * ("auto" / "none" / "required"), a `{ type: mode }` object or
 * `{ type: "tool", toolName }`. A `null` output sends nothing, so the
 * provider default applies.
 */
export type ProviderToolChoiceMap = {
  /** Output per mode. A mode left out counts as unknown. */
  modes: Partial<Record<"auto" | "none" | "required", ProviderRuleJsonValue>>;
  /** Whether the bare strings "auto" / "none" / "required" are read as modes. */
  acceptStrings: boolean;
  /** Whether `{ type: "auto" | "none" | "required" }` objects are read as modes. */
  acceptModeObjects: boolean;
  /** Output for `{ type: "tool", toolName }`; the string "{toolName}" becomes the wire tool name. */
  tool: ProviderRuleJsonValue;
  /** A tool choice with an empty or missing toolName counts as unknown. */
  toolRequiresName: boolean;
  /** Strings that are not read as modes are sent unchanged. */
  passthroughStrings?: boolean;
  /** Output for anything else. */
  fallback: ProviderRuleJsonValue;
};

/**
 * The tool names a wire accepts: `firstChars` then `allowedChars`, at most
 * `maxLength` characters. Character sets are regex class bodies. Another
 * name has each disallowed character replaced by "_", gains a leading "_"
 * when its first character is not allowed first, and is cut to `maxLength`.
 */
export type ProviderToolNameRules = {
  firstChars: string;
  allowedChars: string;
  maxLength: number;
};

/**
 * Dotted paths to one wire's token counts. `cacheRead` is reported INSIDE
 * `input`; whether `reasoning` is inside `output` differs by wire.
 */
export type ProviderWireUsage = {
  input: string;
  output: string;
  total?: string;
  cacheRead?: string;
  reasoning?: string;
  /** True when `output` already counts the reasoning tokens (OpenAI); false when they come on top (Gemini). */
  reasoningInOutput: boolean;
};

/**
 * Where an endpoint puts prompt, completion and total counts. Each list is
 * tried in order: `pick: "truthy"` takes the first truthy value (`a || b`),
 * `pick: "defined"` the first non-null one (`a ?? b`); with neither found,
 * the last value is used. A missing or zero total becomes prompt + completion.
 */
export type ProviderUsageCountDialect = {
  input: string[];
  output: string[];
  total: string[];
  pick: "truthy" | "defined";
};

/** The counts a wire reported, as reported (undefined when absent). */
export type ProviderWireUsageCounts = {
  input: number | undefined;
  output: number | undefined;
  total: number | undefined;
  cacheRead: number | undefined;
  reasoning: number | undefined;
};

/** Dotted paths tried in order; the first that holds a number wins. */
export type ProviderUsageField = {
  paths: string[];
  /** Skip a zero (treat it as "not reported"). */
  positiveOnly?: boolean;
};

/** Every token count the shared usage normalizer reads. */
export type ProviderUsageFields = {
  input: ProviderUsageField;
  output: ProviderUsageField;
  total: ProviderUsageField;
  reasoning: ProviderUsageField;
  cacheCreation: ProviderUsageField;
  cacheRead: ProviderUsageField;
  /** Cache reads already counted inside the input (OpenAI-style). */
  cacheReadIncludedInInput: ProviderUsageField;
};

/**
 * The input count is cache-inclusive (and must be rebased) when any
 * `whenAnyPresent` path is set and no `unlessAnyPresent` path is.
 */
export type ProviderUsageRebase = {
  whenAnyPresent: string[];
  unlessAnyPresent: string[];
  /** Path of an explicit uncached input count, used when present. */
  uncachedInput: string;
  /** Path of the cache-write count subtracted otherwise. */
  cacheWrite: string;
};

/**
 * Translates one wire's finish (stop) reason into another vocabulary.
 * Lookup order: `map`, then `whenAbsent` for a null or undefined reason,
 * then `defaultAtToolCap` when the loop stopped with tool calls pending,
 * then the reason itself under `passthroughUnknown`, then `default`.
 */
export type ProviderFinishReasonMap = {
  /** Exact wire value to translated value; `null` means "no reason". */
  map: Record<string, string | null>;
  /** Value for any reason the map does not list. */
  default: string | null;
  /** Value for a null or undefined reason; omitted means it falls through. */
  whenAbsent?: string | null;
  /** Value for an unlisted reason when the step cap cut off pending tool calls. */
  defaultAtToolCap?: string;
  /** Return an unlisted reason unchanged instead of `default`. */
  passthroughUnknown?: boolean;
  /** Lower-case the reason before the lookup. */
  lowercase?: boolean;
};

/** Builds a message for a rule whose wording needs logic, named by `messageHook`. */
export type ProviderErrorMessageHook = (ctx: ProviderErrorContext) => string;

/** What a provider passes when its error rules are compiled. */
export type CompileErrorRulesOptions = {
  /** Placeholder values such as `{baseURL}`; looked up when a rule fires. */
  vars?: () => ProviderRuleTemplateVars;
  /** Message builders referenced by `messageHook`. */
  hooks?: Record<string, ProviderErrorMessageHook>;
};

/** Compiled tool-name rules: a validity check, a sanitizer and a de-duplicator. */
export type ProviderCompiledToolNameRules = {
  isValid: (name: string) => boolean;
  sanitize: (name: string) => string;
  /** `base`, or `base` cut short with `_2`, `_3`, … until `isTaken` says no. */
  unique: (base: string, isTaken: (name: string) => boolean) => string;
};
