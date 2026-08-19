#!/usr/bin/env tsx
/**
 * Provider scaffolding tool (Tier 1-4 onboarding).
 *
 * Given {name, tier, baseURL, envVar, defaultModel, aliases}, generates
 * the boilerplate snippets an engineer splices into the real source
 * files, plus a manifest stub and the tier-specific manual checklist.
 * Never edits repo source directly — everything lands under --out
 * (default .scaffold-output/<name>/) for review before copy-paste.
 *
 * Usage:
 *   npx tsx tools/scaffold-provider.ts --name=cerebras --tier=2 \
 *     --baseURL=https://api.cerebras.ai/v1 --envVar=CEREBRAS_API_KEY \
 *     --defaultModel=llama3.1-70b --aliases=cerebras-ai
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

function descriptorSnippet(input: ScaffoldInput): string {
  const constant = toConstantCase(input.name);
  const camelKey = toCamelCase(input.name);
  const aliasesLiteral = input.aliases.map((a) => `"${a}"`).join(", ");
  return `  {
    name: AIProviderName.${constant},
    aliases: [${aliasesLiteral}] as const,
    credentialsKey: "${camelKey}",
    envVars: {
      apiKey: "${input.envVar}",
      baseURL: "${constant}_BASE_URL",
      model: "${constant}_MODEL",
    },
    defaultModel: "${input.defaultModel}",
    toolSupport: "native",
    localRuntime: false,
    healthCheck: "env-only",
  },
`;
}

function catalogEntrySnippet(input: ScaffoldInput): string {
  const constant = toConstantCase(input.name);
  const baseURLLiteral = input.baseURL ? `"${input.baseURL}"` : "undefined";
  return `  {
    provider: AIProviderName.${constant},
    defaultBaseURL: ${baseURLLiteral},
    envBaseURLVar: "${constant}_BASE_URL",
    defaultModel: "${input.defaultModel}",
    fallbackModels: ["${input.defaultModel}"],
  },
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
    super(modelName ?? "${input.defaultModel}", AIProviderName.${constant}, sdk);
    // TODO: resolve apiKey/baseURL from credentials -> env -> default,
    // build the wire client, implement executeStream()/doGenerate().
  }

  formatProviderError(error: unknown): Error {
    return classifyProviderError(error, ${constant}_ERROR_RULES, "${input.name}", this.modelName);
  }
}
`;
}

function mockedTestSectionSnippet(input: ScaffoldInput): string {
  return `// --- ${toPascalCase(input.name)} (Tier ${input.tier}) ---
// TODO: this comment block is a placeholder, not a test — it must be
// replaced, not pasted in as-is. Copy the nearest existing section in
// test/continuous-test-suite-providers-mocked.ts (e.g. the groq or xai
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
  const camelKey = toCamelCase(input.name);
  const catalogOrClassLine =
    input.tier === 2
      ? "- [ ] Splice catalog-entry.ts.snippet into OPENAI_COMPAT_CATALOG (src/lib/providers/openaiCompatCatalog.ts)"
      : "- [ ] Move provider-class.ts.snippet to src/lib/providers/<name>.ts and fill in the TODOs";
  return `# Manual checklist for "${input.name}" (Tier ${input.tier})

Full guide: docs/provider-integration/${doc}

Generated files under this directory are STARTING POINTS, not finished
code — review every TODO before copy-pasting into src/.

- [ ] Splice enum-entry.ts.snippet into src/lib/constants/enums.ts
${catalogOrClassLine}
- [ ] Splice descriptor-entry.ts.snippet into PROVIDER_DESCRIPTORS (src/lib/factories/providerDescriptors.ts)
- [ ] Add a NeurolinkCredentials["${camelKey}"] slice in src/lib/types/providers.ts
- [ ] Add one ProviderFactory.registerProvider() block in src/lib/factories/providerRegistry.ts (dynamic import — Critical Rule 1)
- [ ] Move mocked-test-section.ts.snippet into test/continuous-test-suite-providers-mocked.ts and finish the TODOs
- [ ] Fill in manifest.json (addedInPR, filesTouched) and move it to docs/provider-integration/manifests/${input.name}.json
- [ ] pnpm run check && pnpm run lint && pnpm run test:providers-mocked && pnpm run verify:provider-onboarding
`;
}

function main(): void {
  const input = parseArgs(process.argv.slice(2));
  mkdirSync(input.out, { recursive: true });

  if (input.tier !== 1) {
    writeFileSync(
      join(input.out, "enum-entry.ts.snippet"),
      enumEntrySnippet(input),
    );
    writeFileSync(
      join(input.out, "descriptor-entry.ts.snippet"),
      descriptorSnippet(input),
    );
  }
  if (input.tier === 2) {
    writeFileSync(
      join(input.out, "catalog-entry.ts.snippet"),
      catalogEntrySnippet(input),
    );
  }
  if (input.tier === 3 || input.tier === 4) {
    writeFileSync(
      join(input.out, "provider-class.ts.snippet"),
      providerClassSnippet(input),
    );
  }
  if (input.tier !== 1) {
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
