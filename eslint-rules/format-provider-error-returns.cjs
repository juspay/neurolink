/**
 * Rule 6: `formatProviderError` must RETURN an error, never throw one.
 *
 * The method's job is to turn a provider's raw failure into a typed Error that
 * the caller then decides what to do with — usually `throw this.formatProviderError(e)`
 * at the call site, sometimes recording it as data instead. A formatter that
 * throws takes that decision away and, worse, throws from inside a catch block,
 * which replaces the original failure with whatever the formatter produced.
 *
 * The consequence is specific rather than stylistic: `baseProvider` calls
 * `this.formatProviderError(error)` and then inspects the returned value before
 * deciding how to surface it. If the formatter throws, that inspection never
 * runs and the surrounding error-handling path is skipped entirely.
 *
 * Detects a `throw` anywhere in the body of a `formatProviderError`
 * implementation, including nested blocks — a throw inside an `if` or a `catch`
 * inside the formatter escapes just as readily as one at the top.
 *
 * Exempts nothing. A formatter that genuinely cannot produce an Error should
 * return a generic one, which is what every existing implementation does.
 *
 * The abstract declarations in `baseProvider` and `openaiChatCompletionsBase`
 * have no body and are not matched.
 *
 * Status when added: 24 implementations across src/lib/providers, zero
 * violations. This rule is a ratchet to keep it that way — CLAUDE.md listed
 * Rule 6 as unenforced while every other critical rule had a lint.
 */

"use strict";

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "`formatProviderError` must return the error, never throw it (Critical Rule 6).",
    },
    schema: [],
    messages: {
      mustReturn:
        "`formatProviderError` must RETURN the error, not throw it. The caller decides whether to throw — a formatter that throws skips the caller's handling entirely. See CLAUDE.md Critical Rule 6.",
    },
  },

  create(context) {
    /** Depth of formatProviderError bodies we are currently inside. */
    let depth = 0;

    const isFormatter = (node) => {
      // method shorthand: `formatProviderError(error) { ... }`
      if (node.parent && node.parent.type === "MethodDefinition") {
        return (
          node.parent.key && node.parent.key.name === "formatProviderError"
        );
      }
      // property assignment: `formatProviderError = (error) => { ... }`
      if (node.parent && node.parent.type === "PropertyDefinition") {
        return (
          node.parent.key && node.parent.key.name === "formatProviderError"
        );
      }
      // plain function declaration
      if (node.type === "FunctionDeclaration" && node.id) {
        return node.id.name === "formatProviderError";
      }
      // `const formatProviderError = function/arrow`
      if (node.parent && node.parent.type === "VariableDeclarator") {
        return node.parent.id && node.parent.id.name === "formatProviderError";
      }
      return false;
    };

    const enter = (node) => {
      if (isFormatter(node)) {
        depth += 1;
      }
    };
    const exit = (node) => {
      if (isFormatter(node)) {
        depth -= 1;
      }
    };

    return {
      FunctionDeclaration: enter,
      "FunctionDeclaration:exit": exit,
      FunctionExpression: enter,
      "FunctionExpression:exit": exit,
      ArrowFunctionExpression: enter,
      "ArrowFunctionExpression:exit": exit,

      ThrowStatement(node) {
        if (depth > 0) {
          context.report({ node, messageId: "mustReturn" });
        }
      },
    };
  },
};
