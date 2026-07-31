/**
 * Enforces that all provider classes inside `src/lib/providers/` extend
 * `BaseProvider` (directly or transitively via `OpenAIChatCompletionsProvider`
 * or another valid provider base class).
 *
 * Pattern Analysis Issue #1177: Provider classes must inherit from BaseProvider
 * or an abstract provider base class that extends BaseProvider.
 */

"use strict";

const ALLOWED_SUPER_CLASSES = new Set([
  "BaseProvider",
  "OpenAIChatCompletionsProvider",
  "AnthropicBaseProvider",
]);

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce that AI provider classes inside src/lib/providers/ extend BaseProvider or a recognized provider base class.",
    },
    schema: [],
    messages: {
      invalidProviderBaseClass:
        "Provider class '{{className}}' must extend BaseProvider or OpenAIChatCompletionsProvider (found: '{{superClass}}'). See Pattern Analysis #1177.",
      missingProviderBaseClass:
        "Provider class '{{className}}' must extend BaseProvider or OpenAIChatCompletionsProvider. See Pattern Analysis #1177.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";

    // Only enforce inside src/lib/providers/ (including subdirectories)
    if (!/[\\/]src[\\/]lib[\\/]providers[\\/]/.test(filename)) {
      return {};
    }

    return {
      ClassDeclaration(node) {
        const className = node.id ? node.id.name : "";
        const isProviderClass = className.endsWith("Provider");

        // Only check provider classes (classes ending with "Provider")
        if (!isProviderClass) {
          return;
        }

        if (!node.superClass) {
          context.report({
            node,
            messageId: "missingProviderBaseClass",
            data: { className: className || "<anonymous>" },
          });
          return;
        }

        let superClassName = "";
        if (node.superClass.type === "Identifier") {
          superClassName = node.superClass.name;
        }

        const isAllowed =
          ALLOWED_SUPER_CLASSES.has(superClassName) ||
          superClassName.endsWith("BaseProvider");

        if (!isAllowed) {
          context.report({
            node,
            messageId: "invalidProviderBaseClass",
            data: {
              className: className || "<anonymous>",
              superClass: superClassName || "unknown",
            },
          });
        }
      },
    };
  },
};
