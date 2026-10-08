#!/usr/bin/env tsx
/**
 * Provider scaffolding tool (Tier 1-4 onboarding).
 *
 * Given {name, tier, baseURL, envVar, defaultModel, aliases}, generates
 * the tier-appropriate starting point plus a manual checklist. Never edits
 * repo source directly — everything lands under --out (default
 * .scaffold-output/<name>/) for review first.
 *
 * Tier 2 (zero-quirk OpenAI-compatible) emits exactly TWO files: a
 * pre-filled `<name>.json` catalog entry and MANUAL-CHECKLIST.md. That JSON
 * is the whole integration — `pnpm run codegen:catalog` writes the enum
 * member, the <Name>Models enum and the credentials key, and the provider
 * suites derive their rows and counts from it. Tier 3/4 still get the
 * source snippets, since real quirk hooks stay code.
 *
 * Usage:
 *   npx tsx tools/scaffold-provider.ts --name=cerebras --tier=2 \
 *     --baseURL=https://api.cerebras.ai/v1 --envVar=CEREBRAS_API_KEY \
 *     --defaultModel=gpt-oss-120b --aliases=cerebras-ai
 *
 * An offline draft may cite current vendor documentation for --defaultModel.
 * Before claiming current account/live availability, verify it against an
 * authenticated roster: the cerebras pilot's documented default was retired.
 *
 * pnpm script: pnpm run scaffold:provider -- --name=... --tier=... ...
 *
 * Decide providers (inferenceKinds ["decide"]) are scaffolded with
 * --kind=decide. It emits `<name>.json` (the catalog entry), `contract.json`
 * (the fixture the generic decide loop reads, to be filled with vendor bodies)
 * and MANUAL-CHECKLIST.md:
 *   npx tsx tools/scaffold-provider.ts --kind=decide --name=acme \
 *     --defaultModel=acme-1 [--baseURL=https://api.acme.test] [--envVar=ACME_TOKEN]
 *
 * See docs/provider-integration/tiers/README.md for what each tier means.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MOCKED_SECTION_FIELD } from "./provider-onboarding-marker.js";

type ScaffoldTier = 1 | 2 | 3 | 4;

// Documented format (see docs/provider-integration and the --name usage
// string below): lowercase kebab-case, e.g. "together-ai", "lm-studio".
// Enforced before anything is derived from `name` — the derived envVar
// becomes a TypeScript identifier fragment and `out` becomes a real
// filesystem path joined with it, so an unvalidated name (e.g. "../..")
// can escape the output directory or produce unsafe generated code.
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

type ScaffoldFields = {
  name: string;
  baseURL?: string;
  envVar: string;
  defaultModel: string;
  aliases: readonly string[];
  out: string;
};

// What the chat scaffold reads. A decide provider is described by the shared
// fields alone, so its input has no tier to invent.
type ScaffoldInput = ScaffoldFields & { tier: ScaffoldTier };
type DecideScaffoldInput = ScaffoldFields;

type ScaffoldRequest =
  | { kind: "provider"; input: ScaffoldInput }
  | { kind: "decide"; input: DecideScaffoldInput };

// Every CLI-derived value embedded in a generated TypeScript string literal
// goes through this: JSON.stringify yields a valid, correctly-escaped TS
// string literal even when the flag value contains quotes or backslashes.
// (`name` itself is NAME_PATTERN-validated and safe to embed raw.)
function tsString(value: string): string {
  return JSON.stringify(value);
}

function toConstantCase(name: string): string {
  return name.toUpperCase().replace(/-/g, "_");
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toCamelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_match, char: string) =>
    char.toUpperCase(),
  );
}

const DECIDE_USAGE =
  "npx tsx tools/scaffold-provider.ts --kind=decide --name=<kebab> --defaultModel=<id> [--baseURL=<url>] [--envVar=<ENV_NAME>] [--aliases=a,b,c] [--out=<dir>]";

function parseArgs(argv: readonly string[]): ScaffoldRequest {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-zA-Z]+)=(.*)$/.exec(arg);
    if (match) {
      flags.set(match[1], match[2]);
    }
  }
  const kind = flags.get("kind") ?? "provider";
  if (kind !== "provider" && kind !== "decide") {
    console.error(`--kind must be "provider" or "decide" (got "${kind}")`);
    process.exit(1);
  }
  if (kind === "decide" && flags.has("tier")) {
    console.error("--tier does not apply to --kind=decide");
    process.exit(1);
  }
  const name = flags.get("name");
  const tierRaw = flags.get("tier");
  const defaultModel = flags.get("defaultModel");
  if (!name || !defaultModel || (kind === "provider" && !tierRaw)) {
    console.error(
      kind === "decide"
        ? `Usage: ${DECIDE_USAGE}`
        : `Usage: npx tsx tools/scaffold-provider.ts --name=<kebab> --tier=<1|2|3|4> --defaultModel=<id> [--baseURL=<url>] [--envVar=<ENV_NAME>] [--aliases=a,b,c] [--out=<dir>]\n   or: ${DECIDE_USAGE}`,
    );
    process.exit(1);
  }
  if (!NAME_PATTERN.test(name)) {
    console.error(
      `--name must be lowercase kebab-case (e.g. "together-ai"): got "${name}"`,
    );
    process.exit(1);
  }
  const fields: ScaffoldFields = {
    name,
    baseURL: flags.get("baseURL"),
    envVar: flags.get("envVar") ?? `${toConstantCase(name)}_API_KEY`,
    defaultModel,
    aliases: (flags.get("aliases") ?? "").split(",").filter(Boolean),
    out: flags.get("out") ?? join(".scaffold-output", name),
  };
  if (kind === "decide") {
    return { kind, input: fields };
  }
  const tierNum = Number(tierRaw);
  if (![1, 2, 3, 4].includes(tierNum)) {
    console.error(`--tier must be 1, 2, 3, or 4 (got "${tierRaw}")`);
    process.exit(1);
  }
  return { kind, input: { ...fields, tier: tierNum as ScaffoldTier } };
}

function enumEntrySnippet(input: ScaffoldInput): string {
  return `  ${toConstantCase(input.name)} = "${input.name}",\n`;
}

// Model ids can contain characters that aren't identifier-safe
// ("gpt-oss-120b", "meta-llama/Llama-3.3"), so the derived enum member
// collapses every non-alphanumeric run to one underscore. Enum member
// names must be valid identifiers: a digit-leading result ("4o-mini" ->
// "4O_MINI") gets an M_ prefix, and an id that normalizes to nothing
// falls back to "MODEL".
function toModelConstant(modelId: string): string {
  const normalized = modelId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (normalized === "") {
    return "MODEL";
  }
  return /^[0-9]/.test(normalized) ? `M_${normalized}` : normalized;
}

function modelsEnumSnippet(input: ScaffoldInput): string {
  const pascal = toPascalCase(input.name);
  return `/**
 * ${pascal} models.
 * TODO: verify this roster against a live authenticated GET /v1/models
 * before merging — vendor docs list retired ids that 404 (the cerebras
 * pilot shipped one as its default). Record the probe date here.
 */
export enum ${pascal}Models {
  ${toModelConstant(input.defaultModel)} = ${tsString(input.defaultModel)},
}
`;
}

function providerConfigSnippet(input: ScaffoldInput): string {
  const pascal = toPascalCase(input.name);
  return `// Splice into src/lib/utils/providerConfig.ts (see createGroqConfig
// there for the currently-shipping pattern).
export function create${pascal}Config(): ProviderConfigOptions {
  return {
    providerName: "${pascal}",
    envVarName: ${tsString(input.envVar)},
    setupUrl: "TODO: vendor API-keys page",
    description: "API key",
    instructions: [
      "1. Visit: TODO vendor API-keys page",
      "2. Sign in / create an account (TODO: note whether the free tier requires a payment method — cerebras does)",
      "3. Create a new API key",
      ${tsString(`4. Set ${input.envVar} in your .env file`)},
    ],
  };
}
`;
}

function descriptorSnippet(input: ScaffoldInput): string {
  const constant = toConstantCase(input.name);
  const camelKey = toCamelCase(input.name);
  const aliasesLiteral = input.aliases.map(tsString).join(", ");
  return `  {
    name: AIProviderName.${constant},
    aliases: [${aliasesLiteral}] as const,
    credentialsKey: "${camelKey}",
    envVars: {
      apiKey: ${tsString(input.envVar)},
      baseURL: "${constant}_BASE_URL",
      model: "${constant}_MODEL",
    },
    defaultModel: ${tsString(input.defaultModel)}, // convention: swap for the ${toPascalCase(input.name)}Models enum member
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
  },
`;
}

// Field names below MUST match type OpenAICompatCatalogEntry in
// src/lib/types/providers.ts exactly — this template once drifted
// (provider/envBaseURLVar vs providerName/baseURLEnvVar) and, because
// tools/** is excluded from `pnpm run check`, nothing caught it until a
// human spliced the snippet (cerebras pilot, finding #1). If you change
// the type, change this template in the same commit.
// Tier 2's single deliverable: the catalog JSON that drives EVERYTHING
// (enum member, <Name>Models enum, credentials key, descriptor, config,
// context windows, pricing, vision map, model choices, mocked spec row,
// matrix row, count assertions). Emitted pre-filled from the flags with
// TODO markers where only a live probe can supply the truth. The author
// fills the TODOs and runs `pnpm run codegen:catalog` — nothing else.
//
// Deliberately hand-built as text rather than JSON.stringify'd from an
// object: the TODO comments-as-values and the field ORDER are the
// instructions. Every interpolated flag value goes through JSON.stringify
// (via tsString) so quotes/backslashes in a flag can't break the JSON.
function catalogJson(input: ScaffoldInput): string {
  const wireBlock = input.baseURL
    ? `    "baseURL": ${tsString(input.baseURL)}`
    : `    "baseURL": "https://api.TODO.com/v1"`;
  const envOverride =
    input.envVar === `${toConstantCase(input.name)}_API_KEY`
      ? ""
      : `,\n    "envOverrides": { "apiKey": ${tsString(input.envVar)} }`;
  return `{
  "$schema": "./provider-catalog.schema.json",
  "id": ${tsString(input.name)},
  "displayName": "TODO: human-readable vendor name",
  "aliases": [${input.aliases.map(tsString).join(", ")}],
  "tier": 2,
  "wire": {
${wireBlock}${envOverride}
  },
  "models": {
    "default": ${tsString(input.defaultModel)},
    "fallbacks": [${tsString(input.defaultModel)}],
    "defaultContextWindow": 0,
    "defaultMaxOutputTokens": 0,
    "catalog": {
      ${tsString(input.defaultModel)}: {
        "vision": false,
        "status": "production",
        "description": "TODO: one line shown in the CLI model picker"
      }
    }
  },
  "capabilities": {
    "text": true,
    "streaming": true,
    "tools": true,
    "toolsWithStreaming": true,
    "structuredOutput": true,
    "structuredOutputWithTools": false,
    "embeddings": false,
    "thinking": false
  },
  "errorRules": [
    {
      "status": 401,
      "pattern": "TODO|invalid_api_key",
      "class": "authentication",
      "message": "Invalid TODO API key. Check {apiKeyEnvVar}. Get one at TODO"
    }
  ],
  "setup": {
    "url": "TODO: console/API-keys URL",
    "apiKeyFormat": null,
    "billingPolicy": "TODO: free-tier | free-with-card | no-free-tier | promotional-credit",
    "instructions": [
      "1. Visit: TODO",
      "2. Sign in or create an account",
      "3. Create an API key",
      "4. Set {apiKeyEnvVar} in your .env file"
    ]
  },
  "evidence": {
    "rosterVerified": { "date": "TODO", "method": "authenticated GET /v1/models" },
    "liveMatrix": null,
    "addedInPR": "PENDING_PR"
  }
}
`;
}

// NOTE: tools/** is excluded from `pnpm run check` (see this plan's
// Global Constraints), so a wrong classifyProviderError call shape in
// this template would never surface as a type error in CI — it would
// only fail once a human copies the generated snippet into real src/
// code and runs `pnpm run check` against *that*. The call below MUST
// match the real signature exactly: classifyProviderError(error, rules,
// provider: string, modelName?: string) — positional, not an object
// third argument. The rules array below is typed as a plain (mutable)
// ProviderErrorRule[], not readonly — classifyProviderError's `rules`
// parameter and DEFAULT_ERROR_RULES are both declared as mutable
// ProviderErrorRule[] in src/lib/utils/errorClassifier.ts, and a
// `readonly ProviderErrorRule[]` is not assignable to that parameter
// type, so declaring it readonly here would hand every Tier 3/4 author
// a guaranteed compile error unrelated to their own TODOs.
function providerClassSnippet(input: ScaffoldInput): string {
  const className = `${toPascalCase(input.name)}Provider`;
  const constant = toConstantCase(input.name);
  const camelKey = toCamelCase(input.name);
  return `import { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { classifyProviderError, DEFAULT_ERROR_RULES } from "../utils/errorClassifier.js";
import type { NeurolinkCredentials, ProviderErrorRule } from "../types/index.js";
import type { NeuroLink } from "../neurolink.js";

const ${constant}_ERROR_RULES: ProviderErrorRule[] = [
  ...DEFAULT_ERROR_RULES,
  // Add provider-specific rules here.
];

export class ${className} extends BaseProvider {
  constructor(
    modelName?: string,
    sdk?: NeuroLink,
    _region?: string,
    credentials?: NeurolinkCredentials["${camelKey}"],
  ) {
    super(modelName ?? ${tsString(input.defaultModel)}, AIProviderName.${constant}, sdk);
    // TODO: resolve apiKey/baseURL from credentials -> env -> default,
    // build the wire client, implement executeStream()/doGenerate().
  }

  formatProviderError(error: unknown): Error {
    return classifyProviderError(error, ${constant}_ERROR_RULES, "${input.name}", this.modelName);
  }
}
`;
}

// Tier 3/4 only — Tier 2's mocked spec row derives from the catalog JSON.
function mockedTestSectionSnippet(input: ScaffoldInput): string {
  return `// --- ${toPascalCase(input.name)} (Tier ${input.tier}) ---
// TODO: this comment block is a placeholder, not a test — it must be
// replaced, not pasted in as-is. Copy the nearest existing section in
// test/continuous-test-suite-providers-mocked.ts (e.g. the deepseek
// section) and adapt it:
// 1. installMockFetch a route for POST <baseURL>/chat/completions
// 2. assert the Authorization header and request body shape
// 3. assert the happy-path response is parsed correctly
// 4. assert a 401 response maps to a friendly auth error
//
// REQUIRED: the copied section must keep its "${MOCKED_SECTION_FIELD}"
// field (an OpenAICompatSpec entry, or the option object passed to
// nl.generate()) set to this provider's name, as real executable code —
// not described in a comment. tools/verify-provider-onboarding.ts strips
// comments before checking, so this placeholder does not and cannot
// satisfy the gate on its own; only a finished section copied from an
// existing one does.
`;
}

function manifestJson(input: ScaffoldInput): string {
  const base: Record<string, unknown> = {
    provider: input.name,
    tier: input.tier,
    addedInPR: "",
    addedDate: new Date().toISOString().slice(0, 10),
    filesTouched: [],
    mockedContractSection: `LLM ${input.name}`,
    manualTestStatus: "not-tested",
  };
  if (input.tier === 4) {
    base.tier4Justification = "";
  }
  return `${JSON.stringify(base, null, 2)}\n`;
}

function tierDocFor(tier: ScaffoldTier): string {
  switch (tier) {
    case 1:
      return "tiers/tier-1-aggregator-passthrough.md";
    case 2:
      return "tiers/tier-2-catalog-entry.md";
    case 3:
      return "tiers/tier-3-adapter-native.md";
    case 4:
      return "tiers/tier-4-full-custom.md";
  }
}

function manualChecklist(input: ScaffoldInput): string {
  const doc = tierDocFor(input.tier);
  if (input.tier === 1) {
    return `# Manual checklist for "${input.name}" (Tier 1)

Full guide: docs/provider-integration/${doc}

Tier 1 is a usage change, not an integration change — no files are
generated under this directory for Tier 1.

- [ ] Confirm the aggregator (litellm/openrouter) actually serves the
      model
- [ ] No AIProviderName enum change, no PROVIDER_DESCRIPTORS change, no
      OPENAI_COMPAT_CATALOG change
- [ ] Optional: friendlier default alias in MODEL_ALIASES /
      DEFAULT_MODEL_ALIASES (src/lib/models/modelRegistry.ts)
- [ ] Optional: document a dedicated env var in
      docs/getting-started/environment-variables.md
- [ ] Manually smoke-test the model end-to-end
- [ ] No manifest file required — verify-provider-onboarding only gates
      new AIProviderName members
`;
  }
  if (input.tier === 2) {
    return `# Manual checklist for "${input.name}" (Tier 2)

Full guide: docs/provider-integration/${doc}

Tier 2 onboarding is ONE FILE. This directory holds a pre-filled
\`${input.name}.json\`; every other artifact is machine-generated from it.
Do not hand-write enum members, descriptors, config helpers, model
choices, credentials keys, test rows or count pins — codegen and the
derived suites produce all of them.

## Live probes FIRST (they supply the TODOs)

- [ ] Roster: authenticated \`GET ${input.baseURL ?? "<baseURL>"}/models\`.
      Pick \`models.default\`, \`fallbacks\` and every \`catalog\` key from
      what the API serves TODAY — vendor docs list retired ids that 404
      (the cerebras pilot shipped one as its default). Record the date in
      \`evidence.rosterVerified\`.
- [ ] Auth shape: curl with a deliberately bad key; put the real status +
      body pattern in \`errorRules\` and \`evidence.authProbe\`.
- [ ] Billing: how a working key is obtained (free tier? card required for
      "free" credits?) → \`setup.billingPolicy\`. A 402 probe goes in
      \`evidence.billingProbe\`.
- [ ] Capabilities: verify \`structuredOutputWithTools\` with a real
      tools+response_format call — do not assume it.
- [ ] Context window / max output / pricing: from the vendor's published
      numbers. Omit a field rather than invent a number.

## Fill in and generate

- This scaffold is an incomplete draft with zero provider/merge/release/live
  credit. Its zero model ceilings and TODO evidence intentionally do not
  validate. Replace unknown limits with source-supported positive safe
  integers; never invent a number to pass the gate. \`PENDING_PR\` is the exact
  local introduction-pending marker, not a guessed PR URL.
- [ ] Inspect it with \`pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage draft --catalog-file ${join(input.out, `${input.name}.json`)}\`.
- [ ] Move \`${input.name}.json\` to \`src/lib/providers/catalog/\` and
      replace every TODO (the file will not validate until you do).
- [ ] \`pnpm run codegen:catalog\` — writes the enum member, the
      \`${toPascalCase(input.name)}Models\` enum, the credentials key and
      the generated index. Re-run after any JSON edit; CI fails on stale
      output.
- [ ] \`pnpm run build\` — the derived test suites read the BUILT catalog,
      so an unbuilt change silently tests the old data.

## Gates (no count pins to bump — they derive)

- [ ] \`pnpm run check && pnpm run lint && pnpm run test:providers-mocked\`
- [ ] \`npx tsx test/continuous-test-suite-provider-wiring.ts\`
- [ ] \`npx tsx test/continuous-test-suite-provider-descriptors.ts\`
- [ ] \`pnpm run verify:provider-onboarding\` — requires the catalog JSON to
      parse. This is source completeness, not current roster/live or PR proof.
- [ ] \`pnpm exec tsx tools/verify-provider-onboarding.ts --catalog-stage source --provider ${input.name}\`
      — validates authoring and labels source versus introduction-pending state.
- [ ] After an actual PR exists, replace \`PENDING_PR\` with its real URL,
      regenerate and commit, then use \`--catalog-stage review --provider ${input.name}\`
      on that exact PR head. It queries real GitHub metadata and file association.
- [ ] After merge, \`--catalog-stage merged --provider ${input.name}\` proves
      introduction ancestry and exact-head required checks. Package/publication
      and live execution still need their separate receipts.

## Live verification (with a working key)

- [ ] \`npx tsx test/continuous-test-suite-provider-matrix.ts --provider=${input.name}\`
      — expect generate, stream, tool calling and structured output to pass.
- [ ] \`node dist/cli/index.js generate "..." --provider ${input.name}\`
      (no \`--model\` — proves the default resolves live).
- [ ] Record the result in \`evidence.liveMatrix\` and the PR URL in
      \`evidence.addedInPR\`.
- [ ] If the catalog default is retired/gated on your account, set
      \`models.testModel\` to a live-verified id — the matrix drives that
      instead, without changing the runtime default.
`;
  }
  const camelKey = toCamelCase(input.name);
  const registrationLine =
    "- [ ] Move provider-class.ts.snippet to src/lib/providers/<name>.ts, fill in the TODOs, and add one ProviderFactory.registerProvider() block in src/lib/factories/providerRegistry.ts (dynamic import — Critical Rule 1)";
  return `# Manual checklist for "${input.name}" (Tier ${input.tier})

Full guide: docs/provider-integration/${doc}

Generated files under this directory are STARTING POINTS, not finished
code — review every TODO before copy-pasting into src/.

## Live probes FIRST (before writing any code)

- [ ] Roster: authenticated GET <baseURL>/models (keyless first if no key
      yet, re-verify once you have one). Pick defaultModel/fallbacks from
      what the API actually serves TODAY — vendor docs list retired ids
      that 404 (cerebras pilot shipped one as its default).
- [ ] Billing policy: confirm how a working key is obtained (free tier?
      card required for "free" credits? — cerebras requires one).
- [ ] Auth shape: curl with a bad key, record the real 401 body in the
      catalog entry's auth errorRule comment.

## Source touchpoints (the original checklist listed 6 of these 12 — findings #3-#5)

- [ ] Splice enum-entry.ts.snippet into AIProviderName AND
      models-enum.ts.snippet as a <Name>Models enum (src/lib/constants/enums.ts)
${registrationLine}
- [ ] Splice provider-config.ts.snippet into src/lib/utils/providerConfig.ts
- [ ] Splice descriptor-entry.ts.snippet into PROVIDER_DESCRIPTORS (src/lib/factories/providerDescriptors.ts)
- [ ] Add a NeurolinkCredentials["${camelKey}"] slice in src/lib/types/providers.ts
- [ ] Add src/lib/models/manifests/${input.name}.ts (copy groq.ts's minimal
      _default pattern) and wire it in src/lib/models/manifestRegistry.ts
- [ ] Add entries in BOTH exhaustive Record<AIProviderName,...> tables in
      src/lib/utils/modelChoices.ts (+ the <Name>Models import) — the
      compiler forces this the moment the enum member exists
- [ ] Add ${camelKey}: create${toPascalCase(input.name)}Config() to
      EXTRA_PROVIDER_CONFIGS in src/cli/commands/setup.ts (+ import)

## Test touchpoints — including the five count/roster pins that WILL fire

- [ ] Move mocked-test-section.ts.snippet into
      test/continuous-test-suite-providers-mocked.ts and finish the TODOs
- [ ] Add a row to test/helpers/providerMatrix.ts — capability flags must
      be honest (verify structuredOutputWithTools with a live
      tools+response_format probe, don't assume)
- [ ] test/continuous-test-suite-provider-wiring.ts: add the key to
      KNOWN_CREDENTIAL_KEYS (compile-time pin) AND bump the
      EXTRA_PROVIDER_CONFIGS wizard-coverage count + test name AND the
      getAvailableProviders count in its test name
- [ ] test/continuous-test-suite-provider-descriptors.ts: bump the
      getAllDescriptors total AND the apiKeyFormatPattern-absent count
- [ ] pnpm run check:tools-tests — the CI types shard typechecks test/;
      plain \`pnpm run check\` does NOT, so these pins otherwise fail
      only in CI (cerebras pilot, finding #4)

## Docs + gates

- [ ] Fill in manifest.json (addedInPR, filesTouched) and move it to
      docs/provider-integration/manifests/${input.name}.json
- [ ] pnpm run check && pnpm run check:tools-tests && pnpm run lint &&
      pnpm run build && pnpm run test:providers-mocked &&
      pnpm run test:provider-structure && pnpm run verify:provider-onboarding
- [ ] Break-one-assertion ritual on any new suite section: flip one
      assertion, confirm ✗ + non-zero exit (not ⊘ skip), restore

## Live verification (with a working key)

- [ ] npx tsx test/continuous-test-suite-provider-matrix.ts --provider=${input.name}
      — 4/4: generate, stream, tool calling, structured output
- [ ] CLI: node dist/cli/index.js generate "..." --provider ${input.name}
      (no --model — proves the default resolves live)
- [ ] Flip the manifest's manualTestStatus to a dated live-verified note
`;
}

// Decide providers: the catalog JSON is the whole integration (enum member,
// credentials key, descriptor, registry entry and the generic test loop all
// derive from it). Hand-built text, like catalogJson, so the field order and
// the TODO markers are the instructions; every flag value goes through tsString.
// The 0s, the date, the billing policy and the two window numbers keep the file
// from loading until the author replaces them (the windows hold TODO text that
// fails the number check and says what goes there); the other TODO strings and
// the endpoint path load but are wrong. The error rules and body shapes are a
// working starting point that the fixture below matches.
function decideCatalogJson(input: DecideScaffoldInput): string {
  const stem = toConstantCase(input.name);
  const wireLines = [
    ...(input.baseURL ? [`    "baseURL": ${tsString(input.baseURL)}`] : []),
    ...(input.envVar === `${stem}_API_KEY`
      ? []
      : [`    "envOverrides": { "apiKey": ${tsString(input.envVar)} }`]),
  ];
  const wire = wireLines.length > 0 ? `{\n${wireLines.join(",\n")}\n  }` : "{}";
  const baseURLRequired = input.baseURL ? "" : `    "baseURLRequired": true,\n`;
  return `{
  "$schema": "./provider-catalog.schema.json",
  "id": ${tsString(input.name)},
  "displayName": "TODO: human-readable vendor name",
  "aliases": [${input.aliases.map(tsString).join(", ")}],
  "inferenceKinds": ["decide"],
  "wire": ${wire},
  "models": {
    "default": ${tsString(input.defaultModel)},
    "catalog": {
      ${tsString(input.defaultModel)}: {
        "contextWindow": "TODO: the default model's context window in tokens, a number",
        "maxOutputTokens": "TODO: the default model's output limit in tokens, a number",
        "vision": false,
        "status": "production",
        "description": "TODO: one line shown in the CLI model picker"
      }
    }
  },
  "timeouts": { "decideMs": 5000 },
  "decisionLimits": { "maxStateTokens": 0 },
  "decide": {
    "dialect": "system-one",
    "order": 0,
${baseURLRequired}    "baseURLNormalize": ["strip-trailing-slash"],
    "endpoint": "{baseURL}/TODO-path",
    "model": { "placement": "body" },
    "errors": {
      "rules": [
        { "status": [401, 403], "kind": "authentication" },
        { "status": 413, "kind": "max_tokens_exceeded" },
        { "status": 429, "kind": "rate_limit" },
        { "status": 503, "kind": "overloaded" },
        { "statusMin": 500, "kind": "server" }
      ],
      "default": "invalid_request",
      "bodyShapes": [{ "path": "error.message" }, { "path": "detail" }]
    }
  },
  "setup": {
    "url": "TODO: console/API-keys URL",
    "apiKeyFormat": null,
    "billingPolicy": "TODO: one of the billingPolicy values in provider-catalog.schema.json",
    "instructions": [
      "1. Visit: TODO",
      "2. Create an API key",
      "3. Set {apiKeyEnvVar} in your .env file"
    ]
  },
  "evidence": {
    "rosterVerified": { "date": "TODO", "method": "TODO: how the model name was confirmed" },
    "liveMatrix": null,
    "addedInPR": "TODO: full PR URL"
  }
}
`;
}

type DecideStandInError = {
  readonly label: string;
  readonly status: number;
  readonly body: unknown;
  readonly expect: {
    readonly kind: string;
    readonly retryable: boolean;
    readonly messageIncludes?: readonly string[];
    readonly messageExcludes?: readonly string[];
  };
};

const todoBody = (label: string) => ({
  error: {
    message: `TODO: replace with the "${label}" body the vendor returned`,
  },
});

// One body for every status the template's rules decide, so the generic loop's
// rule-coverage and default-kind cases pass as soon as the TODOs are filled:
// each status a rule lists (401 and 403, 413, 429, 503), the lowest status of
// the 500-and-up rule (500), one above it (502) and one just below it (499,
// which no rule matches). 400, 499 and 409 fall through to the default kind;
// 409 holds both envelopes at once, which guards the order of the body shapes.
// The first body also echoes the key, so the redaction case checks a server
// that does that.
const DECIDE_STAND_IN_ERRORS: readonly DecideStandInError[] = [
  {
    label: "bad key",
    status: 401,
    body: {
      error: {
        message:
          'TODO: replace with the "bad key" body the vendor returned. Received key {apiKey}',
      },
    },
    expect: {
      kind: "authentication",
      retryable: false,
      messageIncludes: ["bad key"],
      messageExcludes: ["{apiKey}"],
    },
  },
  {
    label: "forbidden",
    status: 403,
    body: todoBody("forbidden"),
    expect: { kind: "authentication", retryable: false },
  },
  {
    label: "state too large",
    status: 413,
    body: todoBody("state too large"),
    expect: { kind: "max_tokens_exceeded", retryable: false },
  },
  {
    label: "rate limited",
    status: 429,
    body: todoBody("rate limited"),
    expect: { kind: "rate_limit", retryable: true },
  },
  {
    label: "unavailable",
    status: 503,
    body: todoBody("unavailable"),
    expect: { kind: "overloaded", retryable: true },
  },
  {
    label: "server error",
    status: 500,
    body: todoBody("server error"),
    expect: { kind: "server", retryable: true },
  },
  {
    label: "bad gateway",
    status: 502,
    body: todoBody("bad gateway"),
    expect: { kind: "server", retryable: true },
  },
  {
    label: "bad request",
    status: 400,
    body: {
      detail: 'TODO: replace with the "bad request" body the vendor returned',
    },
    expect: {
      kind: "invalid_request",
      retryable: false,
      messageIncludes: ["bad request"],
    },
  },
  {
    label: "client closed request",
    status: 499,
    body: todoBody("client closed request"),
    expect: { kind: "invalid_request", retryable: false },
  },
  {
    label: "error message beside a detail",
    status: 409,
    body: {
      error: { message: "TODO: keep both fields; this text wins" },
      detail: "TODO: keep both fields; this text loses",
    },
    expect: {
      kind: "invalid_request",
      retryable: false,
      messageIncludes: ["this text wins"],
      messageExcludes: ["this text loses"],
    },
  },
];

// The shape test/helpers/decideContractFixture.ts reads. Every body is a
// stand-in until the author replaces it with what the vendor returned.
function decideContractJson(input: DecideScaffoldInput): string {
  const choice = {
    choice: "billing",
    probabilities: { billing: 0.6, technical: 0.4 },
    confidence: 0.6,
  };
  const score = {
    score: 1,
    legend: { "0": "calm", "1": "annoyed" },
    probabilities: { "0": 0.5, "1": 0.5 },
    confidence: 0.5,
  };
  const fixture = {
    version: 1,
    id: input.name,
    success: {
      headers: {},
      body: {
        model: input.defaultModel,
        answers: {
          urgent: { type: "noul", noul: 0.5 },
          team: { type: "choice", ...choice },
          mood: { type: "score", ...score },
        },
        usage: { input_tokens: 1, output_tokens: 0 },
      },
      expected: {
        model: input.defaultModel,
        inputTokens: 1,
        answers: {
          urgent: { type: "boolean", probability: 0.5 },
          team: { type: "choice", ...choice },
          mood: { type: "score", ...score },
        },
      },
    },
    errors: DECIDE_STAND_IN_ERRORS.map((e) => ({
      label: e.label,
      provenance: "stand-in",
      status: e.status,
      body: e.body,
      expect: e.expect,
    })),
  };
  return `${JSON.stringify(fixture, null, 2)}\n`;
}

function decideChecklist(input: DecideScaffoldInput): string {
  const stem = toConstantCase(input.name);
  const baseURLEnv = input.baseURL
    ? `${stem}_BASE_URL (optional: overrides the built-in ${input.baseURL})`
    : `${stem}_BASE_URL (required: this vendor has no built-in endpoint)`;
  return `# Manual checklist for "${input.name}" (decide provider)

One catalog file drives everything: the enum member, the credentials key, the
descriptor, the registry entry and the generic test loop. Do not hand-write any
of them.

## Fill in

- [ ] Move ${input.name}.json to src/lib/providers/catalog/ and replace every
      TODO (the endpoint path too; the default model's contextWindow and
      maxOutputTokens hold TODO text where a number goes) and every 0
      (decisionLimits.maxStateTokens, decide.order). The default model needs
      both numbers: the model manifest is derived from them and codegen refuses
      the file without them. The error rules and body shapes are a starting
      point: set them to what the vendor does.
- [ ] decide.order is a whole number from 1 up that no other decide provider
      uses; lower runs first and sets which provider is the default. List the
      taken ones (pnpm run codegen:catalog refuses a repeat or a 0):
      grep -hE '"order": [0-9]+|decideOrder: [0-9]+' src/lib/providers/catalog/*.json src/lib/factories/providerDescriptors.ts
- [ ] Move contract.json to test/fixtures/decide/${input.name}/contract.json.
      Replace each stand-in body with the one the vendor returned; change
      "provenance" to "seen-live" only for a body you captured yourself. Write
      {apiKey} where the vendor echoes the key.
- [ ] Keep a body at every status the rules decide: each status a rule lists
      (401, 403, 413, 429, 503), the lowest status of the 500-and-up rule (500),
      one above it (502) and one just below it (499), plus bodies no rule
      matches that declare the default kind (400, 499, 409). The 409 body holds
      error.message and detail together, so the order the shapes are read in is
      pinned. The loop names a missing status, so add a body whenever you add
      or move a rule.
- [ ] pnpm run codegen:catalog && pnpm run build

## Live canary env names

- ${input.envVar} (required)
- ${baseURLEnv}
- ${stem}_MODEL (optional: names the default model)

A live canary skips when the key, or a required base URL, is absent. Never
commit the values.

## Gates

- [ ] pnpm run test:decide-contract
- [ ] pnpm run test:providers-mocked
- [ ] pnpm run test:provider-wiring && pnpm run test:provider-descriptors
- [ ] pnpm run verify:provider-onboarding
`;
}

function scaffoldDecide(input: DecideScaffoldInput): void {
  mkdirSync(input.out, { recursive: true });
  const checklist = decideChecklist(input);
  writeFileSync(
    join(input.out, `${input.name}.json`),
    decideCatalogJson(input),
  );
  writeFileSync(join(input.out, "contract.json"), decideContractJson(input));
  writeFileSync(join(input.out, "MANUAL-CHECKLIST.md"), checklist);
  console.log(`Scaffolded decide provider "${input.name}" -> ${input.out}`);
  console.log(checklist);
}

function main(): void {
  const request = parseArgs(process.argv.slice(2));
  if (request.kind === "decide") {
    scaffoldDecide(request.input);
    return;
  }
  const input = request.input;
  mkdirSync(input.out, { recursive: true });

  // Tier 2 emits exactly two artifacts: the catalog JSON and its checklist.
  // Every snippet the older scaffold produced for Tier 2 is now generated
  // from that JSON by `pnpm run codegen:catalog` or derived by the suites.
  if (input.tier === 2) {
    writeFileSync(join(input.out, `${input.name}.json`), catalogJson(input));
  }
  if (input.tier === 3 || input.tier === 4) {
    writeFileSync(
      join(input.out, "enum-entry.ts.snippet"),
      enumEntrySnippet(input),
    );
    writeFileSync(
      join(input.out, "models-enum.ts.snippet"),
      modelsEnumSnippet(input),
    );
    writeFileSync(
      join(input.out, "descriptor-entry.ts.snippet"),
      descriptorSnippet(input),
    );
    writeFileSync(
      join(input.out, "provider-config.ts.snippet"),
      providerConfigSnippet(input),
    );
    writeFileSync(
      join(input.out, "provider-class.ts.snippet"),
      providerClassSnippet(input),
    );
    writeFileSync(
      join(input.out, "mocked-test-section.ts.snippet"),
      mockedTestSectionSnippet(input),
    );
    writeFileSync(join(input.out, "manifest.json"), manifestJson(input));
  }
  const checklist = manualChecklist(input);
  writeFileSync(join(input.out, "MANUAL-CHECKLIST.md"), checklist);

  console.log(
    `Scaffolded "${input.name}" (Tier ${input.tier}) -> ${input.out}`,
  );
  console.log(checklist);
}

main();
