/**
 * Single source of truth for the "mocked-contract section" marker that
 * tools/verify-provider-onboarding.ts greps for in
 * test/continuous-test-suite-providers-mocked.ts.
 *
 * Both tools/scaffold-provider.ts (which tells a contributor what to
 * write) and tools/verify-provider-onboarding.ts (which checks what they
 * wrote) import the same builder from here, so the two can never drift
 * into checking for two different literals again — that drift is exactly
 * what made the CI gate fail for every scaffolded provider before this
 * module existed.
 *
 * A later regression showed that isn't enough on its own: the scaffold
 * used to spell out the marker literal inside a documentation comment
 * (telling the contributor what to write), and the verifier matched
 * against raw source — including comments — so an untouched placeholder
 * satisfied the gate. `isMockedSectionSatisfied` below is now the single
 * function both the verifier and any test of it call; it strips comments
 * before matching, so only executable syntax can satisfy the gate. The
 * scaffold, in turn, is responsible for never reproducing the literal
 * `<MOCKED_SECTION_FIELD>: "<name>"` shape in generated prose (see
 * mockedTestSectionSnippet in scaffold-provider.ts) — belt and braces,
 * since either safeguard alone is fragile.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The object-literal property name a mocked-contract section must set.
 * Exported on its own (rather than only inline inside the template
 * literals below) so generated documentation can name the field without
 * reproducing the full `field: "value"` shape that satisfies the gate.
 */
export const MOCKED_SECTION_FIELD = "provider";

/**
 * The literal text a mocked-contract section must contain. Every existing
 * section satisfies this already, whether via an `OpenAICompatSpec` entry
 * (`{ provider: "groq", ... }`) or a hand-written `nl.generate({ provider:
 * "openai", ... })` call — both forms are plain object-literal properties
 * with this exact shape.
 */
export function mockedSectionMarker(provider: string): string {
  return `${MOCKED_SECTION_FIELD}: "${provider}"`;
}

/** RegExp the verifier uses to detect the marker in the test-suite source. */
export function mockedSectionPattern(provider: string): RegExp {
  return new RegExp(`${MOCKED_SECTION_FIELD}:\\s*"${escapeRegExp(provider)}"`);
}

type StripMode =
  | "code"
  | "line-comment"
  | "block-comment"
  | "string-single"
  | "string-double"
  | "template";

/**
 * Strips line comments and block comments from TypeScript source, leaving
 * string and template-literal contents untouched — including a
 * double-slash inside a URL like `"https://example.com"`, which a naive
 * per-line "strip everything after two slashes" approach would mistake
 * for a comment and corrupt. Tracks quote/template state (with a
 * brace-depth stack for `${...}`
 * template interpolation, so a `}` that closes an interpolation returns
 * to template mode rather than leaking out of it) so only text actually
 * outside a string is removed.
 *
 * Not a full TS parser — it does not need to be. It only has to be
 * correct enough that a marker literal sitting inside a comment never
 * survives to match `mockedSectionPattern`, while a marker literal
 * sitting in real code (or inside a string/template) always does.
 */
export function stripComments(source: string): string {
  let out = "";
  let mode: StripMode = "code";
  // Depth of unmatched `{` seen since the most recent `${` while inside a
  // template literal, one entry per nested template-interpolation level.
  const templateInterpolationDepth: number[] = [];
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i];
    const next = i + 1 < n ? source[i + 1] : "";

    if (mode === "line-comment") {
      if (ch === "\n") {
        out += ch;
        mode = "code";
      }
      i += 1;
      continue;
    }

    if (mode === "block-comment") {
      if (ch === "*" && next === "/") {
        i += 2;
        mode = "code";
        continue;
      }
      if (ch === "\n") {
        out += ch; // preserve newlines so line numbers stay roughly aligned
      }
      i += 1;
      continue;
    }

    if (mode === "string-single" || mode === "string-double") {
      const quote = mode === "string-single" ? "'" : '"';
      if (ch === "\\" && i + 1 < n) {
        out += ch + source[i + 1];
        i += 2;
        continue;
      }
      out += ch;
      if (ch === quote) {
        mode = "code";
      }
      i += 1;
      continue;
    }

    if (mode === "template") {
      if (ch === "\\" && i + 1 < n) {
        out += ch + source[i + 1];
        i += 2;
        continue;
      }
      if (ch === "`") {
        out += ch;
        mode = "code";
        i += 1;
        continue;
      }
      if (ch === "$" && next === "{") {
        out += "${";
        templateInterpolationDepth.push(0);
        mode = "code";
        i += 2;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }

    // mode === "code"
    if (templateInterpolationDepth.length > 0) {
      const top = templateInterpolationDepth.length - 1;
      if (ch === "{") {
        templateInterpolationDepth[top] += 1;
      } else if (ch === "}") {
        if (templateInterpolationDepth[top] === 0) {
          templateInterpolationDepth.pop();
          out += ch;
          mode = "template";
          i += 1;
          continue;
        }
        templateInterpolationDepth[top] -= 1;
      }
    }
    if (ch === "/" && next === "/") {
      mode = "line-comment";
      i += 2;
      continue;
    }
    if (ch === "/" && next === "*") {
      mode = "block-comment";
      i += 2;
      continue;
    }
    if (ch === "'") {
      out += ch;
      mode = "string-single";
      i += 1;
      continue;
    }
    if (ch === '"') {
      out += ch;
      mode = "string-double";
      i += 1;
      continue;
    }
    if (ch === "`") {
      out += ch;
      mode = "template";
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * The one function both the verifier and any test of it should call: is
 * `provider`'s mocked-contract marker present in *executable* source
 * (comments stripped first)? This is what "matching function" means in
 * this repo's provider-onboarding docs/reviews — call this, not
 * `mockedSectionPattern(...).test(rawSource)`.
 */
export function isMockedSectionSatisfied(
  source: string,
  provider: string,
): boolean {
  return mockedSectionPattern(provider).test(stripComments(source));
}
