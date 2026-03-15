/**
 * NL-004: Model alias/deprecation resolver.
 *
 * Resolves model names against an alias configuration map and applies the
 * configured action (warn, redirect, or block).
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import type { ModelAliasConfig } from "../types/generateTypes.js";
import { NeuroLinkError } from "./errorHandling.js";
import { logger } from "./logger.js";

/**
 * Resolve model aliases/deprecations.
 * Checks the model name against the alias map and applies the configured action.
 *
 * @param model - The requested model name (may be undefined).
 * @param config - The alias configuration containing model mappings.
 * @returns The resolved model name (original or redirected).
 * @throws {NeuroLinkError} When the alias action is "block".
 */
export function resolveModel(
  model: string | undefined,
  config: ModelAliasConfig | undefined,
): string | undefined {
  if (!model || !config?.aliases) {
    return model;
  }

  const alias = config.aliases[model];
  if (!alias) {
    return model;
  }

  switch (alias.action) {
    case "block":
      throw new NeuroLinkError({
        code: "MODEL_DEPRECATED",
        message: `Model '${model}' is blocked. ${alias.reason || `Use '${alias.target}' instead.`}`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: {
          requestedModel: model,
          suggestedModel: alias.target,
          reason: alias.reason,
        },
      });

    case "warn":
      logger.warn(
        `[ModelAlias] Model '${model}' is deprecated. ${alias.reason || `Redirecting to '${alias.target}'.`}`,
        {
          requestedModel: model,
          targetModel: alias.target,
          reason: alias.reason,
        },
      );
      return alias.target;

    case "redirect":
      logger.debug(
        `[ModelAlias] Redirecting model '${model}' to '${alias.target}'`,
      );
      return alias.target;

    default:
      return model;
  }
}
