/**
 * Compiles JSON error rules (`ProviderRuleErrorJson`) into the
 * `ProviderErrorRule` matchers that `classifyProviderError` runs. Catalog
 * entries and provider rules files both compile here, so every provider's
 * error classification is data read by one engine.
 */
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../../types/index.js";
import type {
  CatalogErrorRuleClass,
  CompileErrorRulesOptions,
  ProviderErrorContext,
  ProviderErrorRule,
  ProviderRuleErrorJson,
  ProviderRuleErrors,
  ProviderRuleTemplateVars,
  UnknownRecord,
} from "../../types/index.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
  messageNamesStatus,
} from "../../utils/errorClassifier.js";
import { readOpenAIBodyErrorType } from "../../utils/providerRetry.js";
import { TimeoutError } from "../../utils/timeout.js";

const ERROR_CLASS_MAP: Record<
  CatalogErrorRuleClass,
  new (message: string, provider?: string) => ProviderError
> = {
  authentication: AuthenticationError,
  "rate-limit": RateLimitError,
  "invalid-model": InvalidModelError,
  network: NetworkError,
  provider: ProviderError,
};

const asList = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * Replaces `{name}` placeholders; unknown names are left as written. A value
 * the provider supplies wins over the built-in one, so a provider can keep
 * its exact wording (for example `{model}` printed as `undefined`).
 */
export function fillErrorTemplate(
  template: string,
  ctx: ProviderErrorContext,
  vars: ProviderRuleTemplateVars,
): string {
  return template.replace(/\{([A-Za-z]+)\}/g, (whole, name: string) => {
    if (Object.hasOwn(vars, name)) {
      return vars[name] ?? whole;
    }
    if (name === "model") {
      return ctx.modelName ?? "";
    }
    if (name === "message") {
      return ctx.message;
    }
    if (name === "provider") {
      return ctx.provider;
    }
    return whole;
  });
}

/** OpenAI-style error type: `error.type`, or `error.type` inside a JSON `responseBody`. */
function bodyErrorTypes(error: unknown): string[] {
  if (typeof error !== "object" || error === null) {
    return [];
  }
  const record = error as UnknownRecord;
  const types: string[] = [];
  if (typeof record.type === "string") {
    types.push(record.type);
  }
  const fromBody = readOpenAIBodyErrorType(record.responseBody);
  if (fromBody !== undefined) {
    types.push(fromBody);
  }
  return types;
}

function responseBodyOf(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }
  const body = (error as UnknownRecord).responseBody;
  return typeof body === "string" ? body : "";
}

function compileMatcher(
  rule: ProviderRuleErrorJson,
): (ctx: ProviderErrorContext) => boolean {
  const flags = rule.caseSensitive ? "" : "i";
  const statuses = asList(rule.status);
  const messageStatuses = asList(rule.messageStatus);
  const names = asList(rule.errorName);
  const codes = asList(rule.errorCode);
  const bodyTypes = asList(rule.bodyErrorType);
  const single =
    rule.pattern !== undefined ? new RegExp(rule.pattern, flags) : undefined;
  const group = (rule.allPatterns ?? []).map(
    (source) => new RegExp(source, flags),
  );
  const veto =
    rule.notPattern !== undefined
      ? new RegExp(rule.notPattern, flags)
      : undefined;
  const hasPatterns = single !== undefined || group.length > 0;

  return (ctx) => {
    if (rule.always) {
      return true;
    }
    const status = ctx.statusCode;
    if (status !== undefined && statuses.includes(status)) {
      return true;
    }
    if (
      status !== undefined &&
      rule.statusRange !== undefined &&
      status >= rule.statusRange[0] &&
      status <= rule.statusRange[1]
    ) {
      return true;
    }
    if (messageStatuses.some((code) => messageNamesStatus(ctx.message, code))) {
      return true;
    }
    if (ctx.errorName !== undefined && names.includes(ctx.errorName)) {
      return true;
    }
    if (ctx.errorCode !== undefined && codes.includes(ctx.errorCode)) {
      return true;
    }
    if (
      bodyTypes.length > 0 &&
      bodyErrorTypes(ctx.error).some((type) => bodyTypes.includes(type))
    ) {
      return true;
    }
    if (!hasPatterns) {
      return false;
    }
    if (rule.patternWhenNoStatus && status !== undefined) {
      return false;
    }
    if (
      rule.patternStatuses !== undefined &&
      (status === undefined || !rule.patternStatuses.includes(status))
    ) {
      return false;
    }
    const text = rule.searchResponseBody
      ? `${ctx.message} ${responseBodyOf(ctx.error)}`
      : ctx.message;
    if (veto !== undefined && veto.test(text)) {
      return false;
    }
    return (
      (single !== undefined && single.test(text)) ||
      (group.length > 0 && group.every((regex) => regex.test(text)))
    );
  };
}

/**
 * Compiles JSON rules, in order. The caller appends the shared defaults
 * (`DEFAULT_ERROR_RULES`) when the provider used them before.
 */
export function compileErrorRules(
  rules: readonly ProviderRuleErrorJson[],
  options: CompileErrorRulesOptions = {},
): ProviderErrorRule[] {
  return rules.map((rule) => {
    const hook =
      rule.messageHook !== undefined
        ? options.hooks?.[rule.messageHook]
        : undefined;
    if (rule.messageHook !== undefined && hook === undefined) {
      throw new Error(
        `Error rule names messageHook "${rule.messageHook}", but no such hook was supplied`,
      );
    }
    const alternatives = (rule.messageWhen ?? []).map((choice) => ({
      regex: new RegExp(choice.pattern, rule.caseSensitive ? "" : "i"),
      message: choice.message,
    }));
    return {
      match: compileMatcher(rule),
      errorClass: ERROR_CLASS_MAP[rule.class],
      message: (ctx: ProviderErrorContext) => {
        if (hook) {
          return hook(ctx);
        }
        const chosen = alternatives.find((choice) =>
          choice.regex.test(ctx.message),
        );
        return fillErrorTemplate(
          chosen?.message ?? rule.message ?? "",
          ctx,
          options.vars?.() ?? {},
        );
      },
    };
  });
}

/** Top-level HTTP status, as `error.status` then `error.statusCode`. */
function topLevelStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const record = error as UnknownRecord;
  if (typeof record.status === "number") {
    return record.status;
  }
  return typeof record.statusCode === "number" ? record.statusCode : undefined;
}

function topLevelMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const message = (error as UnknownRecord).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Unknown error";
}

/**
 * Classifies an error with a provider's `errors` block: its timeout override,
 * its rules in order, then the shared defaults unless it opts out.
 */
export function classifyWithProviderRules(
  error: unknown,
  errors: ProviderRuleErrors,
  provider: string,
  modelName: string | undefined,
  options: CompileErrorRulesOptions = {},
): Error {
  if (errors.timeout !== undefined && error instanceof TimeoutError) {
    const ErrorClass = ERROR_CLASS_MAP[errors.timeout.class];
    const message = errors.timeout.message.replace(
      /\{message\}/g,
      error.message,
    );
    return new ErrorClass(message, provider);
  }
  const rules = compileErrorRules(errors.rules, options);
  const all =
    errors.useDefaults === false ? rules : [...rules, ...DEFAULT_ERROR_RULES];
  const adjust =
    errors.statusFrom === "top-level" || errors.messageFrom === "top-level"
      ? (ctx: ProviderErrorContext): ProviderErrorContext => ({
          ...ctx,
          ...(errors.statusFrom === "top-level"
            ? { statusCode: topLevelStatus(error) }
            : {}),
          ...(errors.messageFrom === "top-level"
            ? { message: topLevelMessage(error) }
            : {}),
        })
      : undefined;
  return classifyProviderError(error, all, provider, modelName, adjust);
}
