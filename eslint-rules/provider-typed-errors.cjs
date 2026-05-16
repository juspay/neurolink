/**
 * Bans `return new Error(...)` from `formatProviderError` (and similar
 * provider error-formatting paths) inside `src/lib/providers/*.ts`.
 *
 * Background: PR #1019 review found a mix of three error conventions across
 * the codebase (plain `Error`, typed `AuthenticationError` etc., and
 * `NeuroLinkError`). Only typed errors / `NeuroLinkError` flow through
 * `baseProvider.handleProviderError`'s `instanceof` classification — plain
 * `Error` always falls through to the default `"provider_error"` telemetry
 * tag, eroding observability.
 *
 * Fix: return one of `AuthenticationError`, `RateLimitError`,
 * `InvalidModelError`, `NetworkError`, `ProviderError` (or `NeuroLinkError`
 * with `code`/`category`/`severity`/`retriable`) from `formatProviderError`.
 * Imports come from `../types/index.js` and `../utils/errorHandling.js`.
 *
 * See docs/provider-integration/15-adding-llm-provider.md for the canonical
 * `formatProviderError` shape.
 */

"use strict";

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow returning plain `new Error(...)` from `formatProviderError` inside src/lib/providers/. Use typed errors from src/lib/types/errors.ts or NeuroLinkError instead.",
    },
    schema: [],
    messages: {
      plainErrorReturn:
        "Provider `formatProviderError` must return a typed error (AuthenticationError, RateLimitError, InvalidModelError, NetworkError, ProviderError) or NeuroLinkError, not plain `new Error(...)`. See review finding M08 + docs/provider-integration/15-adding-llm-provider.md.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";
    // Only enforce inside the providers directory.
    if (!/[\\/]src[\\/]lib[\\/]providers[\\/][^\\/]+\.ts$/.test(filename)) {
      return {};
    }

    /**
     * Walk up ancestors to find the enclosing `formatProviderError` method.
     * Returns truthy when the node is inside one.
     */
    function isInsideFormatProviderError(node) {
      let parent = node.parent;
      while (parent) {
        if (
          (parent.type === "MethodDefinition" ||
            parent.type === "FunctionDeclaration" ||
            parent.type === "FunctionExpression") &&
          parent.key &&
          parent.key.type === "Identifier" &&
          parent.key.name === "formatProviderError"
        ) {
          return true;
        }
        if (
          parent.type === "Property" &&
          parent.key &&
          parent.key.type === "Identifier" &&
          parent.key.name === "formatProviderError"
        ) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    return {
      ReturnStatement(node) {
        const arg = node.argument;
        if (!arg || arg.type !== "NewExpression") {
          return;
        }
        if (arg.callee.type !== "Identifier" || arg.callee.name !== "Error") {
          return;
        }
        if (!isInsideFormatProviderError(node)) {
          return;
        }
        context.report({ node, messageId: "plainErrorReturn" });
      },
    };
  },
};
