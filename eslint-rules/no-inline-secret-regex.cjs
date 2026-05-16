/**
 * Bans inline regex literals used for secret REDACTION outside
 * `src/lib/utils/logSanitize.ts`.
 *
 * Background: a hand-written secret-redaction regex appeared in 9 places
 * across 5 files in PR #1019, each subtly different from the canonical one
 * in `logSanitize.ts` (e.g. missing `\s+` after `Bearer`, missing `Token`
 * for Replicate auth). Centralising via `sanitizeForLog` / `sanitizeRecord`
 * is the documented contract.
 *
 * Heuristic — to avoid false positives on validation (`/^sk-[A-Za-z0-9]{48,}$/`)
 * and parsing (`/^Bearer\s+(.+)$/`) patterns, we only flag a regex when:
 *
 *   1. The pattern source contains a known token marker (Bearer/Token/Basic
 *      or one of the known token prefixes like sk-/pk-/r8_), AND
 *   2. The regex literal is being used as the first argument to a `.replace()`
 *      MemberExpression call.
 *
 * That combination is exactly the H04 anti-pattern shape ("strip secrets
 * out of a logged string"). Validation regexes and capture-group parsers
 * for auth headers don't match.
 *
 * Fix: `import { sanitizeForLog } from "../utils/logSanitize.js"` and call
 * `sanitizeForLog(raw, maxLen)` instead.
 */

"use strict";

const REDACTION_TOKENS = [
  /\bBearer\b/i,
  /\bToken\b/i,
  /\bBasic\b/i,
  /\bsk[-_]/,
  /\bpk[-_]/,
  /\br8[-_]/,
  /\bgsk[-_]/,
  /\bxai[-_]/,
  /\btgp[-_]/,
  /\bfw[-_]/,
  /\bpplx[-_]/,
  /\bpa[-_]/,
  /\bjina[-_]/,
  /\bfish[-_]/,
];

const EXEMPT_FILES = ["logSanitize"];

/**
 * Is `node` being used as the first argument to a `.replace(...)` call?
 * (i.e. `someString.replace(<this regex>, ...)`)
 */
function isInsideReplaceCall(node) {
  let parent = node.parent;
  while (parent) {
    if (
      parent.type === "CallExpression" &&
      parent.callee.type === "MemberExpression" &&
      parent.callee.property.type === "Identifier" &&
      parent.callee.property.name === "replace" &&
      parent.arguments[0] === node
    ) {
      return true;
    }
    // Don't walk past the immediate call site.
    if (
      parent.type === "CallExpression" ||
      parent.type === "MethodDefinition"
    ) {
      return false;
    }
    parent = parent.parent;
  }
  return false;
}

function isRedactionPattern(source) {
  return REDACTION_TOKENS.some((re) => re.test(source));
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline regex literals used for secret REDACTION (.replace) outside src/lib/utils/logSanitize.ts. Use sanitizeForLog instead.",
    },
    schema: [],
    messages: {
      inlineSecretRegex:
        "Inline secret-redaction regex `{{source}}` is forbidden — use `sanitizeForLog` from src/lib/utils/logSanitize.js so all callers stay consistent and any pattern improvements propagate. See review finding H04.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";
    if (EXEMPT_FILES.some((name) => filename.includes(name))) {
      return {};
    }

    return {
      Literal(node) {
        if (!node.regex) {
          return;
        }
        if (!isRedactionPattern(node.regex.pattern)) {
          return;
        }
        if (!isInsideReplaceCall(node)) {
          return;
        }
        context.report({
          node,
          messageId: "inlineSecretRegex",
          data: { source: `/${node.regex.pattern}/${node.regex.flags}` },
        });
      },
    };
  },
};
