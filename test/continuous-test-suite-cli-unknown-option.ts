#!/usr/bin/env tsx
/**
 * The CLI parser runs with `strictOptions()`, so a mistyped flag fails the
 * command. The error must name the closest flag of the command that failed,
 * and stay quiet when nothing is close.
 *
 * Offline: every case fails in argument parsing, before a provider is built.
 *
 * Run: pnpm run test:cli-unknown-option
 */
import {
  assert,
  assertEqual,
  assertIncludes,
  defineSuite,
  runCLI,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh({ entrypoints: ["dist/cli/index.js"] });
const { test, runSuite } = defineSuite("CLI unknown-option suggestions", {
  offline: true,
});

const countOf = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

await test("a one-letter typo of a generate flag names the real flag", async () => {
  const result = await runCLI(["generate", "hi", "--temprature", "0.2"]);
  assert(result.exitCode !== 0, "a mistyped flag did not fail the command");
  assertIncludes(
    result.stderr,
    "Did you mean --temperature instead of --temprature?",
    "no suggestion for --temprature",
  );
  assertIncludes(result.stderr, "Use --help to see available options.");
});

await test("each mistyped flag gets one suggestion, a kebab-case typo only once", async () => {
  const result = await runCLI([
    "generate",
    "hi",
    "--providr",
    "openai",
    "--max-tokenz",
    "5",
  ]);
  assertIncludes(
    result.stderr,
    "Did you mean --provider instead of --providr?",
    "no suggestion for --providr",
  );
  assertEqual(
    countOf(result.stderr, "Did you mean --maxTokens"),
    1,
    "--max-tokenz was not suggested exactly once",
  );
});

await test("suggestions come from the failing command's own flags", async () => {
  const typo = await runCLI(["models", "list", "--providr", "openai"]);
  assertIncludes(
    typo.stderr,
    "Did you mean --provider instead of --providr?",
    "models list did not suggest its own --provider",
  );
  const otherCommand = await runCLI(["models", "list", "--temprature", "1"]);
  assert(otherCommand.exitCode !== 0, "a generate-only flag was accepted");
  assert(
    !otherCommand.stderr.includes("Did you mean"),
    "models list suggested a flag it does not have",
  );
});

await test("a name far from every flag gets no suggestion", async () => {
  const result = await runCLI(["generate", "hi", "--zzzzzzzz"]);
  assert(result.exitCode !== 0, "an unknown flag did not fail the command");
  assert(
    !result.stderr.includes("Did you mean"),
    "a suggestion was made for a name near no flag",
  );
  assertIncludes(result.stderr, "Use --help to see available options.");
});

await runSuite();
