/**
 * Placeholder classification in the fallback secret scanner
 * (scripts/lib/secretPlaceholder.ts, used by scripts/security-check.ts when
 * gitleaks is not installed).
 *
 * Determinism exception to the e2e-only rule: this is a pure classifier over
 * scanner output lines, and the surface under test is the repository's own
 * pre-commit / CI gate rather than the published SDK — there is no
 * `generate()` that could exercise it. The scanner's fallback path has been
 * wrong twice (inspecting only the text before the first colon, then the
 * whole line); this suite pins the scope the gate is meant to judge from: the
 * matched secret and a trailing comment, nothing else on the line.
 *
 * Run: npx tsx test/continuous-test-suite-security-check-filter.ts
 */

import { defineSuite, assert } from "./helpers/harness.js";
import {
  isPlaceholderSecret,
  splitRgMatch,
} from "../scripts/lib/secretPlaceholder.js";

const AWS = "AKIA[0-9A-Z]{16}";
const OPENAI = "sk-[A-Za-z0-9\\-]{20,}";

// Real-shaped fixtures are assembled at runtime so the literal never sits in
// this file: the scanner under test walks test/ too, and would (correctly)
// flag them.
const REAL_AWS = "AKIA" + "ABCDEFGHIJKLMNOP";
const REAL_OPENAI = "sk-" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

const { test, runSuite } = defineSuite("security-check placeholder filter", {
  offline: true,
});

await test("a labelled placeholder on a key: value line is skipped (trailing comment)", async () => {
  const line =
    '  AWS_ACCESS_KEY_ID: "AKIALOCALENDPOINTONLY", // placeholder, not a real key';
  assert(
    isPlaceholderSecret(line, AWS),
    "a trailing comment naming the value a placeholder must skip the match",
  );
});

await test("a marker inside the secret itself is skipped", async () => {
  assert(
    isPlaceholderSecret('apiKey: "sk-your-key-here-abcdefghijklmnop"', OPENAI),
    "a secret whose own text carries a marker is a placeholder",
  );
  assert(
    isPlaceholderSecret('apiKey: "sk-testABCDEFGHIJKLMNOPQRSTUVWXYZ"', OPENAI),
    "a test-prefixed secret is a placeholder",
  );
});

await test("a real-shaped key on a line that merely contains a marker word in code is flagged", async () => {
  assert(
    !isPlaceholderSecret(`const k = { test: 1, key: "${REAL_AWS}" };`, AWS),
    "a marker word elsewhere on the line must not hide the key",
  );
  assert(
    !isPlaceholderSecret(
      `apiKey: "${REAL_OPENAI}", there: 1, x: y.replace()`,
      OPENAI,
    ),
    "code on the same line must not hide the key",
  );
});

await test("a real-shaped key with no marker anywhere is flagged", async () => {
  assert(
    !isPlaceholderSecret(`  AWS_ACCESS_KEY_ID: "${REAL_AWS}",`, AWS),
    "an unlabelled key must be a finding",
  );
});

await test("a URL earlier on the line is not a comment: the key after it is still flagged", async () => {
  // The `//` of `https://` used to be taken as the comment opener, so
  // `example` in the host hid a real key that followed it.
  assert(
    !isPlaceholderSecret(
      `fetch("https://api.example.com/v1", { headers: { Authorization: "Bearer ${REAL_OPENAI}" } })`,
      OPENAI,
    ),
    "a marker word inside a URL host must not hide the key that follows it",
  );
  assert(
    !isPlaceholderSecret(
      `const url = "https://x.test/a"; const k = "${REAL_AWS}"`,
      AWS,
    ),
    "a URL statement before the key must not hide it",
  );
  assert(
    !isPlaceholderSecret(
      `const url = "https://x.test/a#example"; const k = "${REAL_AWS}"`,
      AWS,
    ),
    "a # inside a URL fragment is not a comment opener",
  );
  assert(
    !isPlaceholderSecret(`const glob = "src/*"; const k = "${REAL_AWS}"`, AWS),
    "a /* glued to a path is not a block-comment opener",
  );
});

await test("a comment starts only at line start or after whitespace, and its marker still counts", async () => {
  assert(
    isPlaceholderSecret(
      `fetch("https://api.acme.test/v1", { key: "${REAL_OPENAI}" }) // example only`,
      OPENAI,
    ),
    "a real trailing // comment with a marker still skips the match",
  );
  assert(
    isPlaceholderSecret(`key = "${REAL_AWS}" # placeholder`, AWS),
    "a # comment after whitespace still skips the match",
  );
  assert(
    isPlaceholderSecret(`key = "${REAL_AWS}" /* sample */`, AWS),
    "a /* comment after whitespace still skips the match",
  );
  assert(
    isPlaceholderSecret(`// example config: key = "${REAL_AWS}"`, AWS),
    "a key inside a comment that carries a marker is a placeholder",
  );
  assert(
    !isPlaceholderSecret(`// TODO rotate: key = "${REAL_AWS}"`, AWS),
    "a key inside a comment with no marker is still a finding — commented out is not fake",
  );
  assert(
    !isPlaceholderSecret(`key = "${REAL_AWS}" <!-- example -->`, AWS),
    "an HTML comment is not recognised as a comment",
  );
});

await test("a filler run in the secret's position is skipped", async () => {
  assert(
    isPlaceholderSecret('token: "sk-xxxxxxxxxxxxxxxxxxxxxxxx"', OPENAI),
    "a run of x characters is filler, not a key",
  );
});

await test("splitRgMatch keeps colons inside the content", async () => {
  const parsed = splitRgMatch('src/a.ts:12:  KEY: "value:with:colons"');
  assert(parsed !== null, "a well-formed rg line must parse");
  assert(parsed!.path === "src/a.ts", "path is the first segment");
  assert(parsed!.line === "12", "line is the second segment");
  assert(
    parsed!.content === '  KEY: "value:with:colons"',
    "content is everything after the second colon",
  );
  assert(splitRgMatch("no-colons-here") === null, "a bare line does not parse");
});

await runSuite();
