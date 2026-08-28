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
 * Pick --defaultModel from a LIVE roster probe (authenticated GET
 * /v1/models), never from vendor docs — the cerebras pilot shipped a
 * documented-but-retired default that 404'd on first live call.
 *
 * pnpm script: pnpm run scaffold:provider -- --name=... --tier=... ...
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

type ScaffoldInput = {
  name: string;
  tier: ScaffoldTier;
  baseURL?: string;
  envVar: string;
  defaultModel: string;
  aliases: readonly string[];
  out: string;
};

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

function parseArgs(argv: readonly string[]): ScaffoldInput {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-zA-Z]+)=(.*)$/.exec(arg);
    if (match) {
      flags.set(match[1], match[2]);
    }
  }
  const name = flags.get("name");
  const tierRaw = flags.get("tier");
  const defaultModel = flags.get("defaultModel");
  if (!name || !tierRaw || !defaultModel) {
    console.error(
      "Usage: npx tsx tools/scaffold-provider.ts --name=<kebab> --tier=<1|2|3|4> --defaultModel=<id> [--baseURL=<url>] [--envVar=<ENV_NAME>] [--aliases=a,b,c] [--out=<dir>]",
    );
    process.exit(1);
  }
  if (!NAME_PATTERN.test(name)) {
    console.error(
      `--name must be lowercase kebab-case (e.g. "together-ai"): got "${name}"`,
    );
    process.exit(1);
  }
  const tierNum = Number(tierRaw);
  if (![1, 2, 3, 4].includes(tierNum)) {
    console.error(`--tier must be 1, 2, 3, or 4 (got "${tierRaw}")`);
    process.exit(1);
  }
  const tier = tierNum as ScaffoldTier;
  return {
    name,
    tier,
    baseURL: flags.get("baseURL"),
    envVar: flags.get("envVar") ?? `${toConstantCase(name)}_API_KEY`,
    defaultModel,
    aliases: (flags.get("aliases") ?? "").split(",").filter(Boolean),
    out: flags.get("out") ?? join(".scaffold-output", name),
  };
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
    "billingPolicy": "TODO: free-tier | free-with-card | no-free-tier",
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
    "addedInPR": "TODO: full PR URL"
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
      parse AND carry \`evidence.rosterVerified\` + \`evidence.addedInPR\`.

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

function main(): void {
  const input = parseArgs(process.argv.slice(2));
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
