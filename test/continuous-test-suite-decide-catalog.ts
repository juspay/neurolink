#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Decide Catalog (PR C, part 2). Offline.
 *
 * Covers the catalog entries that describe a `decide` provider: the codegen
 * split and its checks, the loader accessors, the descriptor builder and
 * decide order, the registry loop, and the readers that must stay chat-only.
 * Determinism exception to CLAUDE.md rule 15 (listed in the `allow` array of
 * neurolink/e2e-tests-only in eslint.config.js): the descriptor table, the
 * loader accessors, the registry loop and the generated index are not exported
 * from dist/index.js, and "the 81 chat descriptors are unchanged" is an exact
 * data comparison no generate() or CLI call can produce. Everything is
 * imported from src (as test/continuous-test-suite-bugfixes.ts does), so it
 * needs no build.
 *
 * Run: pnpm run test:decide-catalog
 */
import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  assertEqual,
  assertNotNull,
  defineSuite,
  logSection,
  runCommand,
  tempDir,
} from "./helpers/harness.js";
import {
  CATALOG_JSON_ENTRIES,
  CATALOG_PROVIDER_IDS,
  DECIDE_CATALOG_JSON_ENTRIES,
} from "../src/lib/providers/catalog/index.generated.js";
import {
  snapshotChatDescriptors,
  toStableJson,
} from "./helpers/descriptorSnapshot.js";
import {
  LAYA_ENTRY,
  OPENAI_DECISIONS_ENTRY,
} from "./helpers/decideFixtures.js";
import type { DecideCatalogJson } from "../src/lib/types/index.js";
import { parseCatalogEntry } from "../src/lib/providers/catalog/schema.js";
import {
  credentialsKeyFor,
  handWrittenDecideOrders,
  renderCredentialLines,
  renderIndexSource,
  renderModelsEnumBlocks,
  renderProviderMemberLines,
  renderTypeUnionsSource,
  splitCatalogEntries,
  toCamelCase,
  toModelConstant,
} from "../tools/codegen-catalog-render.js";

const { test, runSuite } = defineSuite("Decide Catalog", { offline: true });

await runSuite(async () => {
  logSection("Descriptor snapshot control");

  await test("toStableJson sorts keys at every level and writes a RegExp as data", () => {
    const text = toStableJson({
      b: 1,
      a: { d: /x+/i, c: [2, { z: 1, y: 2 }] },
    });
    deepStrictEqual(JSON.parse(text), {
      a: { c: [2, { y: 2, z: 1 }], d: { $regex: "x+", $flags: "i" } },
      b: 1,
    });
    assert(
      text.indexOf('"a"') < text.indexOf('"b"'),
      "top-level keys must be sorted",
    );
    assert(
      text.indexOf('"y"') < text.indexOf('"z"'),
      "nested keys must be sorted",
    );
  });

  await test("the snapshot holds one descriptor per chat catalog id, in catalog order", () => {
    const parsed = JSON.parse(snapshotChatDescriptors()) as { name: string }[];
    assert(
      parsed.length > 0,
      "a snapshot of zero descriptors measures nothing",
    );
    deepStrictEqual(
      parsed.map((d) => d.name),
      [...CATALOG_PROVIDER_IDS],
    );
  });

  await test("a wrong expected count is an error, not a pass", () => {
    let message = "";
    try {
      snapshotChatDescriptors(CATALOG_PROVIDER_IDS.length + 1);
    } catch (error) {
      message = String(error);
    }
    assert(
      message.includes("expected"),
      `expected a count error, got: ${message}`,
    );
  });

  logSection("Codegen: chat and decide entries are emitted apart");
  const CHAT = CATALOG_JSON_ENTRIES.slice(0, 2);
  const MIXED = [...CHAT, LAYA_ENTRY];

  await test("splitCatalogEntries separates the two kinds and keeps order", () => {
    const { chat, decide } = splitCatalogEntries(MIXED);
    deepStrictEqual(
      chat.map((e) => e.id),
      CHAT.map((e) => e.id),
    );
    deepStrictEqual(
      decide.map((e) => e.id),
      ["laya"],
    );
  });

  await test("the index puts a decide entry in the DECIDE exports and never in the chat ones", () => {
    const source = renderIndexSource(MIXED);
    const decideAt = source.indexOf("export const DECIDE_CATALOG_JSON_ENTRIES");
    const chatPart = source.slice(
      source.indexOf("export const CATALOG_JSON_ENTRIES"),
      decideAt,
    );
    assert(!chatPart.includes("laya"), "laya leaked into the chat exports");
    assert(
      chatPart.includes(
        `${toCamelCase(CHAT[0].id)}Json as ProviderCatalogJson,`,
      ),
      "chat entries keep their cast",
    );
    assert(
      source.includes(
        `import layaJson from "./laya.json" with { type: "json" };`,
      ),
      "the decide file must be imported",
    );
    const decidePart = source.slice(decideAt);
    assert(
      decidePart.includes("  layaJson,") && decidePart.includes(`  "laya",`),
      "laya must land in both DECIDE exports",
    );
  });

  await test("with no decide entry the DECIDE exports still exist, empty", () => {
    const source = renderIndexSource(CHAT);
    const ids = source.slice(
      source.indexOf("export const DECIDE_CATALOG_PROVIDER_IDS"),
    );
    assertEqual(
      ids.replace(/\s/g, ""),
      "exportconstDECIDE_CATALOG_PROVIDER_IDS=[]asconst;",
    );
    assert(
      !source.includes("layaJson"),
      "no decide import without a decide entry",
    );
  });

  await test("both type unions include a decide id, and a credentialsKey override wins", () => {
    const [names, keys] = renderTypeUnionsSource(MIXED).split(
      "export type CatalogCredentialKey",
    );
    assert(
      names.includes('"laya"') && keys.includes('"laya"'),
      "laya must join both unions",
    );
    assertEqual(
      credentialsKeyFor({
        ...LAYA_ENTRY,
        id: "my-decider",
        credentialsKey: "custom",
      }),
      "custom",
    );
    assertEqual(
      credentialsKeyFor({
        ...LAYA_ENTRY,
        id: "clef-2",
        credentialsKey: undefined,
      }),
      "clef2",
    );
  });

  await test("the Laya credentials slice is { apiKey?; baseURL? } and an extra credential is appended", () => {
    assertEqual(
      renderCredentialLines([LAYA_ENTRY]),
      "  laya?: { apiKey?: string; baseURL?: string; };",
    );
    const withExtra = {
      ...LAYA_ENTRY,
      wire: { ...LAYA_ENTRY.wire, extraCredentials: ["accountId"] },
    };
    assert(
      renderCredentialLines([withExtra]).includes(
        "baseURL?: string; accountId?: string; }",
      ),
      "extra credential missing",
    );
  });

  await test("a decide entry gets the same enum member and model enum as a chat entry", () => {
    assertEqual(renderProviderMemberLines([LAYA_ENTRY]), '  LAYA = "laya",');
    const block = renderModelsEnumBlocks([LAYA_ENTRY]);
    assert(block.startsWith("export enum LayaModels {"), "enum name");
    for (const member of [
      "TYPED_DECISIONS",
      "ENGLISH",
      "MULTILINGUAL",
      "AUTO",
    ]) {
      assert(
        block.includes(`  ${member} = `),
        `LayaModels must keep ${member}`,
      );
    }
  });

  await test("id and model-id helpers cope with digits, separators and nothing", () => {
    assertEqual(toModelConstant("3b-instruct"), "M_3B_INSTRUCT");
    assertEqual(toModelConstant("--"), "MODEL");
    assertEqual(toCamelCase("provider-2"), "provider2");
  });

  logSection("Codegen: validating a catalog directory");
  const REPO = fileURLToPath(new URL("..", import.meta.url));
  const CATALOG = join(REPO, "src/lib/providers/catalog");
  const groq = JSON.parse(
    readFileSync(join(CATALOG, "groq.json"), "utf8"),
  ) as Record<string, unknown>;
  type CatalogFile = [name: string, body: unknown];
  const chatFile = (
    id: string,
    over: Record<string, unknown> = {},
  ): CatalogFile => [
    `${id}.json`,
    {
      ...groq,
      id,
      displayName: id,
      aliases: [],
      credentialsKey: undefined,
      enumTypeName: undefined,
      ...over,
    },
  ];
  // order 90 stays clear of the hand-written decideOrder rows (1 to 8).
  const decideFile = (
    id: string,
    order: number,
    over: Record<string, unknown> = {},
  ): CatalogFile => [
    `${id}.json`,
    {
      ...LAYA_ENTRY,
      id,
      displayName: id,
      aliases: [],
      credentialsKey: undefined,
      enumTypeName: undefined,
      decide: { ...LAYA_ENTRY.decide, order },
      // LAYA_ENTRY repeats each catalog id as a key of decisionLimits.models. The
      // duplicate-key check reads only models.catalog, so that is legal, but most
      // of these files do not need the map: they drop it, and the duplicate-key
      // tests below put it back.
      decisionLimits: { ...LAYA_ENTRY.decisionLimits, models: undefined },
      ...over,
    },
  ];
  const catalogDir = (...files: CatalogFile[]): string => {
    const dir = tempDir("decide-catalog-");
    for (const [name, body] of files) {
      writeFileSync(
        join(dir, name),
        typeof body === "string" ? body : JSON.stringify(body, null, 2),
      );
    }
    return dir;
  };
  const codegen = (...args: string[]) =>
    runCommand("pnpm", ["exec", "tsx", "tools/codegen-catalog.ts", ...args], {
      cwd: REPO,
      timeoutMs: 180_000,
    });
  const validate = (dir: string) => codegen("--validate-only", "--dir", dir);
  const failure = (
    result: { exitCode: number; stderr: string },
    ...needles: string[]
  ): void => {
    assert(result.exitCode !== 0, "the codegen must exit non-zero");
    for (const needle of needles) {
      assert(
        result.stderr.includes(needle),
        `stderr must mention "${needle}", got: ${result.stderr.slice(0, 500)}`,
      );
    }
  };

  // Every file the codegen would rewrite for the real catalog. A validate-only
  // run over another directory must leave all four byte-identical.
  const GENERATED_FILES = [
    "src/lib/constants/enums.ts",
    "src/lib/types/providers.ts",
    "src/lib/types/providerCatalog.generated.ts",
    "src/lib/providers/catalog/index.generated.ts",
  ].map((file) => join(REPO, file));
  const readGenerated = (): string[] =>
    GENERATED_FILES.map((file) => readFileSync(file, "utf8"));

  await test("a directory holding one chat and one decide entry validates and writes nothing", async () => {
    const before = readGenerated();
    const result = await validate(
      catalogDir(chatFile("alpha-chat"), decideFile("alpha-decider", 90)),
    );
    assertEqual(
      result.exitCode,
      0,
      `exit ${result.exitCode}: ${result.stderr.slice(0, 600)}`,
    );
    assert(
      result.stdout.includes("validate-only passed — 2 providers"),
      result.stdout,
    );
    const after = readGenerated();
    GENERATED_FILES.forEach((file, index) => {
      assert(after[index] === before[index], `${file} changed`);
    });
  });

  await test("--dir without --validate-only is refused and the generated files stay untouched", async () => {
    const index = join(CATALOG, "index.generated.ts");
    const before = readFileSync(index, "utf8");
    failure(
      await codegen("--dir", catalogDir(chatFile("alpha-chat"))),
      "--validate-only",
    );
    assertEqual(
      readFileSync(index, "utf8"),
      before,
      "index.generated.ts changed",
    );
  });

  await test("--dir with no value is refused", async () => {
    failure(await codegen("--validate-only", "--dir"), "needs a directory");
  });

  await test("--dir=<path> and --directory are refused, not read as the real catalog", async () => {
    const dir = catalogDir(chatFile("alpha-chat"));
    failure(
      await codegen("--validate-only", `--dir=${dir}`),
      "use --dir <path>, not --dir=<path>",
    );
    failure(
      await codegen("--validate-only", "--directory", dir),
      "use --dir <path>, not --dir=<path>",
    );
  });

  await test("an empty directory is an error, not zero providers", async () => {
    failure(await validate(catalogDir()), "no catalog files found");
  });

  await test("a file that is not JSON is named in the error", async () => {
    failure(
      await validate(catalogDir(["broken.json", "{ not json"])),
      "broken.json",
      "not valid JSON",
    );
  });

  await test("a key the editor mirror does not declare is rejected and the file is named", async () => {
    failure(
      await validate(
        catalogDir(decideFile("alpha-decider", 90, { surprise: true })),
      ),
      "alpha-decider.json",
      "surprise",
      "does not declare",
    );
  });

  await test("a chat-only key on a decide file is rejected by the strict schema", async () => {
    failure(
      await validate(
        catalogDir(decideFile("alpha-decider", 90, { errorRules: [] })),
      ),
      "alpha-decider.json",
      "errorRules",
    );
  });

  await test("a wire key the decide engine does not read is rejected and the file is named", async () => {
    failure(
      await validate(
        catalogDir(
          decideFile("alpha-decider", 90, {
            wire: { apiKeyFallbackEnvVars: ["AI_GATEWAY_API_KEY"] },
          }),
        ),
      ),
      "alpha-decider.json",
      "wire.apiKeyFallbackEnvVars is not supported on decide entries yet",
    );
  });

  await test("a file whose name differs from its id is rejected", async () => {
    failure(
      await validate(
        catalogDir(["wrong-name.json", decideFile("alpha-decider", 90)[1]]),
      ),
      "must match its id",
    );
  });

  logSection("Codegen: consistency checks across the catalog");

  await test("two decide entries with the same order are refused", async () => {
    failure(
      await validate(
        catalogDir(
          decideFile("alpha-decider", 90),
          decideFile("beta-decider", 90),
        ),
      ),
      "decide order collision",
      "alpha-decider",
      "beta-decider",
    );
  });

  await test("a decide order already used by a hand-written descriptor row is refused", async () => {
    const source = readFileSync(
      join(REPO, "src/lib/factories/providerDescriptors.ts"),
      "utf8",
    );
    const handOrder = Number(/^\s*decideOrder:\s*(\d+),/m.exec(source)?.[1]);
    assert(
      Number.isInteger(handOrder),
      "positive control: the descriptors file must hold a hand-written decideOrder",
    );
    failure(
      await validate(catalogDir(decideFile("alpha-decider", handOrder))),
      "decide order collision",
      "providerDescriptors.ts",
    );
  });

  await test("distinct decide orders and distinct aliases pass", async () => {
    const result = await validate(
      catalogDir(
        chatFile("alpha-chat", { aliases: ["one"] }),
        decideFile("alpha-decider", 90, { aliases: ["two"] }),
        decideFile("beta-decider", 91),
      ),
    );
    assertEqual(result.exitCode, 0, result.stderr.slice(0, 600));
  });

  const aliasCases: {
    name: string;
    files: CatalogFile[];
    needles: string[];
  }[] = [
    {
      name: "the same alias on a chat and a decide entry",
      files: [
        chatFile("alpha-chat", { aliases: ["shared"] }),
        decideFile("alpha-decider", 90, { aliases: ["shared"] }),
      ],
      needles: ["alias collision", "shared"],
    },
    {
      name: "aliases that differ only by case",
      files: [
        chatFile("alpha-chat", { aliases: ["Shared"] }),
        decideFile("alpha-decider", 90, { aliases: ["shared"] }),
      ],
      needles: ["alias collision"],
    },
    {
      name: "an alias equal to another entry's id",
      files: [
        chatFile("alpha-chat"),
        decideFile("alpha-decider", 90, { aliases: ["alpha-chat"] }),
      ],
      needles: ["alias collision", "alpha-chat"],
    },
    {
      name: "a whitespace-only alias",
      files: [decideFile("alpha-decider", 90, { aliases: [" "] })],
      needles: ["blank alias", "alpha-decider"],
    },
    {
      name: "an empty alias",
      files: [chatFile("alpha-chat", { aliases: [""] })],
      needles: ["blank alias", "alpha-chat"],
    },
  ];
  for (const c of aliasCases) {
    await test(`the codegen refuses ${c.name}`, async () => {
      failure(await validate(catalogDir(...c.files)), ...c.needles);
    });
  }

  const enumCases: { name: string; file: CatalogFile; needle: string }[] = [
    {
      name: "a decide enumTypeName that a hand-written enum already holds",
      file: decideFile("alpha-decider", 90, { enumTypeName: "OpenAIModels" }),
      needle: "OpenAIModels",
    },
    {
      name: "a chat enumTypeName equal to AIProviderName",
      file: chatFile("alpha-chat", { enumTypeName: "AIProviderName" }),
      needle: "AIProviderName",
    },
  ];
  for (const c of enumCases) {
    await test(`the codegen refuses ${c.name}`, async () => {
      failure(
        await validate(catalogDir(c.file)),
        "enum type name collision",
        c.needle,
      );
    });
  }

  await test("an enumTypeName no hand-written enum holds passes, even one the generated region holds", async () => {
    const result = await validate(
      catalogDir(
        chatFile("alpha-chat", { enumTypeName: "GroqModels" }),
        decideFile("alpha-decider", 90, { enumTypeName: "AlphaCustomModels" }),
      ),
    );
    assertEqual(result.exitCode, 0, result.stderr.slice(0, 600));
  });

  logSection(
    "Codegen: the duplicate model key check reads only models.catalog",
  );

  const withDuplicateCatalogKey = (
    file: CatalogFile,
    id: string,
  ): CatalogFile => [
    file[0],
    JSON.stringify(file[1], null, 2).replace(
      '"catalog": {',
      (open) => `${open}\n      ${JSON.stringify(id)}: { "vision": false },`,
    ),
  ];
  const countKey = (body: unknown, id: string): number =>
    JSON.stringify(body).split(`${JSON.stringify(id)}:`).length - 1;
  // Unlike decideFile's default, this one keeps decisionLimits.models. It is also
  // awkward on purpose: four model ids are named after the structure around them
  // ("models", "catalog", a limit field, a spec field), and one description holds
  // a lone escaped quote, a backslash and brackets. Position decides what is a
  // key, not the name or the quote count.
  const awkwardSpec = {
    vision: false,
    status: "production" as const,
    description: "An id named after its surroundings",
  };
  const realisticDecide = decideFile("alpha-decider", 90, {
    models: {
      ...LAYA_ENTRY.models,
      catalog: {
        ...LAYA_ENTRY.models.catalog,
        "typed-decisions": {
          ...LAYA_ENTRY.models.catalog["typed-decisions"],
          description:
            'A "lone quote, a \\ backslash, a } and a ] and a { here',
        },
        models: awkwardSpec,
        catalog: awkwardSpec,
        maxStateTokens: awkwardSpec,
        description: awkwardSpec,
      },
    },
    decisionLimits: {
      ...LAYA_ENTRY.decisionLimits,
      models: {
        ...LAYA_ENTRY.decisionLimits?.models,
        models: { maxStateTokens: 50 },
        catalog: { maxStateTokens: 100 },
      },
    },
  });
  const groqModels = groq.models as { catalog: Record<string, unknown> };
  const [firstChatModel = ""] = Object.keys(groqModels.catalog);

  await test("a decide file may repeat its catalog ids as keys of decisionLimits.models", async () => {
    assertEqual(
      countKey(realisticDecide[1], "typed-decisions"),
      2,
      "positive control: the file must hold the id twice",
    );
    const result = await validate(catalogDir(realisticDecide));
    assertEqual(
      result.exitCode,
      0,
      `exit ${result.exitCode}: ${result.stderr.slice(0, 600)}`,
    );
    assert(result.stdout.includes("1 providers"), result.stdout);
  });

  await test("a model key typed twice in a decide file's models.catalog is still refused", async () => {
    failure(
      await validate(
        catalogDir(withDuplicateCatalogKey(realisticDecide, "multilingual")),
      ),
      "alpha-decider.json",
      'defines the model key "multilingual" 2 times',
    );
  });

  await test("a model key typed twice in a chat file's models.catalog is refused with the same message", async () => {
    assert(
      firstChatModel !== "",
      "positive control: groq.json must list a model",
    );
    failure(
      await validate(
        catalogDir(
          withDuplicateCatalogKey(chatFile("alpha-chat"), firstChatModel),
        ),
      ),
      "alpha-chat.json",
      `defines the model key ${JSON.stringify(firstChatModel)} 2 times`,
      "JSON.parse would silently keep only the last one",
    );
    // Only keys of the root models.catalog count. A string that is a value (in an
    // object or an array) is never a key, and neither is a repeated key of another
    // object that happens to be named "catalog". The schema refuses these files
    // for its own reasons.
    const elsewhere: CatalogFile = [
      "alpha-chat.json",
      // The root is a serialized object. Prepend the fixed malformed property
      // and keep its remaining bytes; this is fixture composition, not filtering.
      '{\n  "elsewhere": { "catalog": { "x": 1, "x": 2 } },' +
        JSON.stringify(chatFile("alpha-chat")[1], null, 2).slice(1),
    ];
    for (const file of [
      chatFile("alpha-chat", {
        models: { ...groqModels, catalog: { x: "x" } },
      }),
      chatFile("alpha-chat", {
        models: { ...groqModels, catalog: ["x", "x", "x"] },
      }),
      elsewhere,
    ]) {
      const result = await validate(catalogDir(file));
      failure(result, "alpha-chat.json");
      assert(
        !result.stderr.includes("defines the model key"),
        `a non-key was read as a model key: ${result.stderr.slice(0, 300)}`,
      );
    }
  });

  logSection("Liveness gate: decide entries are skipped, not probed");
  // The gate reads vendor API keys from the environment and from a .env file, and the
  // worktree's .env holds real ones, so these runs must reach no vendor. The child gets an
  // allowlist, never a filtered copy of this process's environment (which holds the keys
  // dotenv loaded above): a filter by name lets through any variable it did not think of.
  // PATH is what `pnpm exec tsx` needs to start; the rest only say where pnpm and corepack
  // keep their caches. DOTENV_CONFIG_PATH names a file that does not exist, so the child's
  // own dotenv/config import loads nothing.
  const CHILD_ENV_NAMES = ["PATH", "HOME", "TMPDIR", "COREPACK_HOME"];
  const keylessEnv = (dir: string): Record<string, string> => ({
    ...Object.fromEntries(
      CHILD_ENV_NAMES.flatMap((name) => {
        const value = process.env[name];
        return value === undefined ? [] : [[name, value] as const];
      }),
    ),
    DOTENV_CONFIG_PATH: join(dir, "absent.env"),
    DOTENV_CONFIG_QUIET: "true",
  });
  // Every variable the gate reads for the REAL catalog: apiKeyEnvVar and extraEnvVar in
  // tools/check-model-liveness.ts (restated here, as that file runs its main on import),
  // plus every name a catalog entry declares for itself.
  const envNamesOfEntry = (
    entry: ReturnType<typeof parseCatalogEntry>,
  ): string[] => {
    const prefix = entry.id.toUpperCase().replace(/-/g, "_");
    const [extra] = entry.wire.extraCredentials ?? [];
    return [
      entry.wire.envOverrides?.apiKey ?? `${prefix}_API_KEY`,
      ...(extra === undefined
        ? []
        : [`${prefix}_${extra.replace(/([A-Z])/g, "_$1").toUpperCase()}`]),
      ...Object.values(entry.wire.envOverrides ?? {}).flatMap((name) =>
        name === undefined ? [] : [name],
      ),
      ...(entry.wire.apiKeyFallbackEnvVars ?? []),
    ];
  };
  const realCatalogEnvNames = new Set(
    readdirSync(CATALOG)
      .filter(
        (file) => file.endsWith(".json") && !file.endsWith(".schema.json"),
      )
      .flatMap((file) =>
        envNamesOfEntry(
          parseCatalogEntry(
            JSON.parse(readFileSync(join(CATALOG, file), "utf8")),
            file,
          ),
        ),
      ),
  );
  const presentIn = (env: Record<string, string>): string[] =>
    [...realCatalogEnvNames].filter((name) => name in env);
  // A precondition of every run below, not a case of its own: a child that could reach a
  // vendor is never started, whatever directory the gate is pointed at.
  const assertKeyless = (env: Record<string, string>): void => {
    for (const known of [
      "GROQ_API_KEY",
      "CLOUDFLARE_ACCOUNT_ID",
      "OVH_AI_ENDPOINTS_ACCESS_TOKEN",
    ]) {
      assert(
        realCatalogEnvNames.has(known),
        `positive control: the real catalog must make the gate read ${known}`,
      );
    }
    const present = presentIn(env);
    assert(
      present.length === 0,
      `the child environment holds variables the gate reads: ${present.join(", ")}`,
    );
    // Control for the check above, built apart from env so that a leaking env
    // reaches the message above first.
    deepStrictEqual(presentIn({ GROQ_API_KEY: "control" }), ["GROQ_API_KEY"]);
    assert(
      env.DOTENV_CONFIG_PATH.endsWith("absent.env") &&
        !existsSync(env.DOTENV_CONFIG_PATH),
      "the child's dotenv file must not exist",
    );
    assert(
      Object.keys(env).every(
        (name) =>
          name.startsWith("DOTENV_CONFIG_") || CHILD_ENV_NAMES.includes(name),
      ),
      "the child environment must hold only the allowlist",
    );
  };
  const gate = (dir: string, args: string[]) => {
    const env = keylessEnv(dir);
    assertKeyless(env);
    return runCommand(
      "pnpm",
      ["exec", "tsx", "tools/check-model-liveness.ts", ...args],
      {
        cwd: REPO,
        env,
        timeoutMs: 180_000,
      },
    );
  };
  const liveness = (dir: string) => gate(dir, ["--json", "--dir", dir]);
  const reported = (stdout: string): string[] => {
    const start = stdout.indexOf('{\n  "reports"');
    assert(start !== -1, `no JSON report in stdout: ${stdout.slice(0, 300)}`);
    return (
      JSON.parse(stdout.slice(start)) as { reports: { provider: string }[] }
    ).reports.map((r) => r.provider);
  };

  await test("check:models lists the chat entries of a directory and skips its decide entries", async () => {
    const dir = catalogDir(
      chatFile("liveness-chat"),
      decideFile("liveness-decider", 90),
    );
    const result = await liveness(dir);
    deepStrictEqual(reported(result.stdout), ["liveness-chat"]);
    assert(
      result.stderr.includes("all 1 providers were skipped"),
      `the chat entry must be counted and skipped for want of a key, got: ${result.stderr.slice(0, 400)}`,
    );
    // Neither a --dir with no value nor the spelling --dir=<path> may fall back
    // to the real catalog: both are refused before any directory is read.
    const noValue = await gate(dir, ["--json", "--dir"]);
    assert(
      noValue.exitCode !== 0 &&
        noValue.stderr.includes("--dir needs a directory argument"),
      `--dir with no value must be refused, got exit ${noValue.exitCode}: ${noValue.stderr.slice(0, 300)}`,
    );
    const withEquals = await gate(dir, ["--json", `--dir=${dir}`]);
    assert(
      withEquals.exitCode !== 0 &&
        withEquals.stderr.includes('unknown flag "--dir=') &&
        !withEquals.stdout.includes('{\n  "reports"'),
      `--dir=<path> must be refused with no report, got exit ${withEquals.exitCode}: ${withEquals.stderr.slice(0, 300)}`,
    );
  });

  await test("check:models over a directory of only decide entries checks nothing and exits 0", async () => {
    const result = await liveness(
      catalogDir(decideFile("liveness-decider", 90)),
    );
    deepStrictEqual(reported(result.stdout), []);
    assertEqual(result.exitCode, 0, result.stderr.slice(0, 400));
  });

  logSection("Loader: chat and decide accessors");
  const loadLoader = () => import("../src/lib/providers/catalog/loader.js");
  const loadGenerated = () =>
    import("../src/lib/providers/catalog/index.generated.js");

  await test("getDecideCatalogEntries returns a frozen copy, never the generated array", async () => {
    const { getDecideCatalogEntries } = await loadLoader();
    const { DECIDE_CATALOG_JSON_ENTRIES } = await loadGenerated();
    const copy = getDecideCatalogEntries();
    assert(
      copy !== DECIDE_CATALOG_JSON_ENTRIES,
      "must not hand out the module singleton",
    );
    assert(Object.isFrozen(copy), "the list itself must be frozen");
    deepStrictEqual(copy, DECIDE_CATALOG_JSON_ENTRIES);
    // Positive control: with no decide entry the checks above and below judge
    // an empty list and pass for any copy.
    assert(
      copy.some((entry) => entry.id === "laya"),
      "the decide catalog holds no laya entry, so this test checks nothing",
    );
    // Every object and array reachable from an entry, not a sample of levels.
    const unfrozen = (
      value: unknown,
      path: string,
      seen: Set<unknown> = new Set(),
    ): string[] => {
      if (value === null || typeof value !== "object" || seen.has(value)) {
        return [];
      }
      seen.add(value);
      return [
        ...(Object.isFrozen(value) ? [] : [path]),
        ...Object.entries(value).flatMap(([key, child]) =>
          unfrozen(child, `${path}.${key}`, seen),
        ),
      ];
    };
    deepStrictEqual(
      unfrozen({ a: { b: [1, { c: 2 }] } }, "x"),
      ["x", "x.a", "x.a.b", "x.a.b.1"],
      "positive control: the walk descends into objects and arrays",
    );
    for (const entry of copy) {
      const mutable = unfrozen(entry, entry.id);
      deepStrictEqual(
        mutable,
        [],
        `${entry.id}: still mutable: ${mutable.join(", ")}`,
      );
    }
  });

  await test("freezeCatalogCopy freezes every level of a decide entry and leaves the original alone", async () => {
    const { freezeCatalogCopy } = await loadLoader();
    const copy = freezeCatalogCopy(LAYA_ENTRY);
    assert(
      copy !== LAYA_ENTRY && copy.decide !== LAYA_ENTRY.decide,
      "must be a deep copy",
    );
    for (const level of [
      copy,
      copy.decide,
      copy.decide.errors.rules,
      copy.aliases,
      copy.models.catalog,
    ]) {
      assert(Object.isFrozen(level), "a level of the copy is still mutable");
    }
    throws(() => {
      (copy.decide.errors.rules as unknown[]).push({});
    }, TypeError);
    assert(
      !Object.isFrozen(LAYA_ENTRY) && !Object.isFrozen(LAYA_ENTRY.decide),
      "the fixture must stay mutable",
    );
  });

  await test("the generated chat and decide catalogs share no provider", async () => {
    const { buildCatalogEntries, getCatalogJsonEntries } = await loadLoader();
    const { DECIDE_CATALOG_PROVIDER_IDS } = await loadGenerated();
    const decideIds = new Set<string>(DECIDE_CATALOG_PROVIDER_IDS);
    assert(
      CATALOG_PROVIDER_IDS.length > 0,
      "positive control: the chat catalog is not empty",
    );
    assert(
      decideIds.size > 0 && decideIds.has("laya"),
      "positive control: the decide catalog holds laya, or the disjoint check below proves nothing",
    );
    assert(
      CATALOG_PROVIDER_IDS.every((id) => !decideIds.has(id)),
      "an id is in both catalogs",
    );
    assertEqual(
      getCatalogJsonEntries().length,
      CATALOG_PROVIDER_IDS.length,
      "chat accessor length",
    );
    assertEqual(
      buildCatalogEntries().length,
      CATALOG_PROVIDER_IDS.length,
      "runtime chat entries length",
    );
    assert(
      buildCatalogEntries().every((e) => !decideIds.has(e.providerName)),
      "a decide id reached the OpenAI-compat catalog",
    );
  });

  await test("env var names derive from the id, and an override wins", async () => {
    const { catalogEnvVar } = await loadLoader();
    assertEqual(catalogEnvVar(LAYA_ENTRY, "apiKey"), "LAYA_API_KEY");
    assertEqual(catalogEnvVar(LAYA_ENTRY, "baseURL"), "LAYA_BASE_URL");
    assertEqual(catalogEnvVar(LAYA_ENTRY, "model"), "LAYA_MODEL");
    const clef = {
      ...LAYA_ENTRY,
      id: "cloudflare-clef",
      wire: {
        ...LAYA_ENTRY.wire,
        envOverrides: { apiKey: "CLOUDFLARE_API_KEY" },
      },
    };
    assertEqual(catalogEnvVar(clef, "apiKey"), "CLOUDFLARE_API_KEY");
    assertEqual(catalogEnvVar(clef, "baseURL"), "CLOUDFLARE_CLEF_BASE_URL");
    assertEqual(
      catalogEnvVar({ ...LAYA_ENTRY, id: "clef-2" }, "model"),
      "CLEF_2_MODEL",
    );
  });

  await test("the credentials key follows an override, else the codegen's own derivation", async () => {
    const { catalogCredentialsKey } = await loadLoader();
    assertEqual(
      catalogCredentialsKey({ ...LAYA_ENTRY, credentialsKey: "custom" }),
      "custom",
    );
    for (const id of [
      "laya",
      "perplexity-decider",
      "clef-2",
      "a-1b",
      "x-9-y",
    ]) {
      const entry = { ...LAYA_ENTRY, id, credentialsKey: undefined };
      assertEqual(
        catalogCredentialsKey(entry),
        credentialsKeyFor(entry),
        `credentials key drift for ${id}`,
      );
    }
  });

  await test("the setup card of a decide entry is built from its JSON, like a chat entry's", async () => {
    const { buildCatalogConfigOptions } = await loadLoader();
    deepStrictEqual(buildCatalogConfigOptions(LAYA_ENTRY), {
      providerName: "Laya",
      envVarName: "LAYA_API_KEY",
      setupUrl: "https://github.com/NandhaKishorM/laya",
      description: "API key for your Laya endpoint",
      instructions: [
        "1. Run a Laya server, or use a LiteLLM proxy with a pass-through route to one",
        "2. Set LAYA_BASE_URL to its base URL (NeuroLink calls <LAYA_BASE_URL>/predict)",
        "3. Set LAYA_API_KEY to the key it accepts (on LiteLLM, a virtual key with that route in its Allowed Routes)",
      ],
    });
  });

  await test("the key, env var and setup helpers need only the fields they read", async () => {
    const { buildCatalogConfigOptions, catalogCredentialsKey, catalogEnvVar } =
      await loadLoader();
    assertEqual(catalogCredentialsKey({ id: "bare-one" }), "bareOne");
    assertEqual(
      catalogEnvVar({ id: "bare-one", wire: {} }, "model"),
      "BARE_ONE_MODEL",
    );
    const card = buildCatalogConfigOptions({
      id: "bare-one",
      displayName: "Bare One",
      wire: {},
      setup: LAYA_ENTRY.setup,
    });
    assertEqual(card.providerName, "Bare One");
    assertEqual(card.envVarName, "BARE_ONE_API_KEY");
  });

  logSection("Descriptors: decide order and the decide builder");
  const loadDescriptors = () =>
    import("../src/lib/factories/providerDescriptors.js");

  await test("DECISION_PROVIDERS keeps today's precedence, now read from decideOrder", async () => {
    const { DECISION_PROVIDERS } = await loadDescriptors();
    deepStrictEqual(
      DECISION_PROVIDERS.map((d) => d.name),
      [
        "typesafe",
        "laya",
        "xor",
        "subq",
        "perplexity-decider",
        "cloudflare-clef",
        "openai-decisions",
        "scaledown",
      ],
    );
    deepStrictEqual(
      DECISION_PROVIDERS.map((d) => d.decideOrder),
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
  });

  await test("only decide providers carry a decideOrder", async () => {
    const { PROVIDER_DESCRIPTORS, DECISION_PROVIDERS } =
      await loadDescriptors();
    const decideNames = new Set<string>(DECISION_PROVIDERS.map((d) => d.name));
    const rest = PROVIDER_DESCRIPTORS.filter((d) => !decideNames.has(d.name));
    assert(
      rest.length > 80,
      "positive control: the text descriptors are present",
    );
    assert(
      rest.every((d) => d.decideOrder === undefined),
      "a non-decide descriptor has a decideOrder",
    );
  });

  await test("the orders the codegen reads from the descriptors file are the hand-written decide descriptors' own", async () => {
    const { PROVIDER_DESCRIPTORS } = await loadDescriptors();
    const { DECIDE_CATALOG_PROVIDER_IDS } = await loadGenerated();
    // The builder line `decideOrder: entry.decide.order,` and a row written as
    // `decideOrder: 5 as const,` are not lines the codegen reads; the second
    // would make a collision with a catalog file go unnoticed.
    deepStrictEqual(
      handWrittenDecideOrders(
        "  decideOrder: 7,\n    decideOrder: 8 as const,\n    decideOrder: entry.decide.order,\n// decideOrder: 9,\n",
      ),
      [7],
    );
    const fromCatalog = new Set<string>(DECIDE_CATALOG_PROVIDER_IDS);
    const handDecideOrders = PROVIDER_DESCRIPTORS.filter(
      (d) =>
        (d.inferenceKinds ?? []).includes("decide") && !fromCatalog.has(d.name),
    ).map((d) => d.decideOrder);
    assert(
      handDecideOrders.length > 0,
      "positive control: a hand-written decide descriptor exists",
    );
    const source = readFileSync(
      join(REPO, "src/lib/factories/providerDescriptors.ts"),
      "utf8",
    );
    deepStrictEqual(
      [...handWrittenDecideOrders(source)].sort((a, b) => a - b),
      [...handDecideOrders].sort((a, b) => (a ?? 0) - (b ?? 0)),
    );
  });

  // The cases above call the exported functions with their own input. These two
  // read the module's source, because the five hand rows are already in order
  // and the module's own statements would otherwise go unpinned.
  const descriptorsSource = (): string =>
    readFileSync(
      join(REPO, "src/lib/factories/providerDescriptors.ts"),
      "utf8",
    );

  await test("providerDescriptors.ts checks every decide order when it loads", () => {
    assert(
      /^assertUniqueDecideOrder\(PROVIDER_DESCRIPTORS\);$/m.test(
        descriptorsSource(),
      ),
      "providerDescriptors.ts no longer runs assertUniqueDecideOrder(PROVIDER_DESCRIPTORS); on its own line, so loading the module would not throw on a missing or repeated decideOrder",
    );
  });

  await test("providerDescriptors.ts builds DECISION_PROVIDERS through orderDecisionProviders", () => {
    assert(
      /^export const DECISION_PROVIDERS\b[^=]*=\s*orderDecisionProviders\(PROVIDER_DESCRIPTORS\);$/m.test(
        descriptorsSource(),
      ),
      "providerDescriptors.ts no longer assigns DECISION_PROVIDERS from orderDecisionProviders(PROVIDER_DESCRIPTORS), so the decision provider list would not be sorted by decideOrder",
    );
  });

  await test("assertUniqueDecideOrder names both providers of a repeated order", async () => {
    const { DECISION_PROVIDERS, assertUniqueDecideOrder } =
      await loadDescriptors();
    const [first, second] = DECISION_PROVIDERS;
    throws(
      () =>
        assertUniqueDecideOrder([
          first,
          { ...second, decideOrder: first.decideOrder },
        ]),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes(first.name) &&
        error.message.includes(second.name),
    );
    assertUniqueDecideOrder(DECISION_PROVIDERS);
  });

  await test("a decide descriptor without a usable decideOrder is refused, a text one is not", async () => {
    const {
      DECISION_PROVIDERS,
      PROVIDER_DESCRIPTORS,
      assertUniqueDecideOrder,
    } = await loadDescriptors();
    const [first] = DECISION_PROVIDERS;
    for (const bad of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      throws(
        () => assertUniqueDecideOrder([{ ...first, decideOrder: bad }]),
        /no usable decideOrder/,
      );
    }
    const groqDescriptor = PROVIDER_DESCRIPTORS.find(
      (d) => String(d.name) === "groq",
    );
    if (!groqDescriptor) {
      throw new Error("positive control: the groq descriptor is missing");
    }
    assertUniqueDecideOrder([groqDescriptor]);
  });

  await test("orderDecisionProviders sorts by decideOrder whatever the input order and drops text providers", async () => {
    const {
      DECISION_PROVIDERS,
      PROVIDER_DESCRIPTORS,
      buildDecideDescriptor,
      orderDecisionProviders,
    } = await loadDescriptors();
    const early = buildDecideDescriptor({
      ...LAYA_ENTRY,
      id: "alpha-decider",
      decide: { ...LAYA_ENTRY.decide, order: 0 },
    });
    const input = [
      ...PROVIDER_DESCRIPTORS.slice(0, 5),
      ...[...DECISION_PROVIDERS].reverse(),
      early,
    ];
    deepStrictEqual(
      orderDecisionProviders(input).map((d) => d.name),
      [
        "alpha-decider",
        "typesafe",
        "laya",
        "xor",
        "subq",
        "perplexity-decider",
        "cloudflare-clef",
        "openai-decisions",
        "scaledown",
      ],
    );
  });

  await test("buildDecideDescriptor reproduces the Laya descriptor row", async () => {
    const { PROVIDER_DESCRIPTORS, buildDecideDescriptor } =
      await loadDescriptors();
    const registered = PROVIDER_DESCRIPTORS.find(
      (d) => String(d.name) === "laya",
    );
    // LAYA_ENTRY must carry the same keys, limits, timeout and setup URL as that row.
    deepStrictEqual(buildDecideDescriptor(LAYA_ENTRY), registered);
  });

  await test("buildDecideDescriptor carries decisionLimits.media to the descriptor, and a reader sees what it sees on the registered XOR row", async () => {
    const { PROVIDER_DESCRIPTORS, buildDecideDescriptor } =
      await loadDescriptors();
    const { resolveDecisionLimitsReading } =
      await import("../src/lib/utils/decisionLimits.js");
    const media = {
      maxImages: 1,
      video: false,
      maxRequestBytes: 25_000_000,
      audio: { maxSeconds: 30 },
    };
    const limits = {
      maxStateTokens: 28_000,
      maxQuestions: 128,
      questionTypes: [
        "boolean",
        "choice",
        "score",
        "value",
        "choice-unknown",
      ] as const,
      maxScoreLevels: 10,
      maxChoiceOptions: 64,
      nonAsciiTokensPerChar: 1,
      models: {
        "xor-latest": { maxStateTokens: 120_000 },
        "xor-omni": { maxStateTokens: 28_000 },
      },
      media,
    };
    const entry: DecideCatalogJson = {
      ...LAYA_ENTRY,
      id: "xor",
      decisionLimits: limits,
      decide: {
        ...LAYA_ENTRY.decide,
        media: { imagesKey: "images", audioKey: "audio" },
      },
    };
    const built = buildDecideDescriptor(entry);
    deepStrictEqual(built.decisionLimits, limits);
    deepStrictEqual(built.decisionLimits?.media, {
      maxImages: 1,
      video: false,
      maxRequestBytes: 25_000_000,
      audio: { maxSeconds: 30 },
    });

    // The same facts as the XOR row registered, which xor.json now builds.
    const xorRow = PROVIDER_DESCRIPTORS.find((d) => String(d.name) === "xor");
    assertNotNull(xorRow, "the XOR descriptor is missing");
    deepStrictEqual(built.decisionLimits?.media, xorRow.decisionLimits?.media);
    for (const model of ["xor-latest", "xor-omni"]) {
      deepStrictEqual(
        resolveDecisionLimitsReading(built, model),
        resolveDecisionLimitsReading(xorRow, model),
      );
    }

    // Positive controls: a changed figure is told apart, and an entry without
    // a media allowance yields a descriptor without one.
    throws(() =>
      deepStrictEqual(
        buildDecideDescriptor({
          ...entry,
          decisionLimits: { ...limits, media: { ...media, maxImages: 2 } },
        }).decisionLimits?.media,
        built.decisionLimits?.media,
      ),
    );
    assert(
      !("media" in (buildDecideDescriptor(LAYA_ENTRY).decisionLimits ?? {})),
      "Laya's descriptor gained a media allowance",
    );
  });

  await test("the shipped xor.json builds the descriptor the hand-written XOR row was, media limits included", async () => {
    const { PROVIDER_DESCRIPTORS, buildDecideDescriptor } =
      await loadDescriptors();
    const { resolveDecisionLimitsReading } =
      await import("../src/lib/utils/decisionLimits.js");
    const shipped = DECIDE_CATALOG_JSON_ENTRIES.find(
      (entry) => entry.id === "xor",
    );
    assertNotNull(shipped, "the decide catalog holds no xor entry");
    const built = buildDecideDescriptor(shipped);
    // Written out by hand, key for key, as the deleted row had it: the only
    // guard on the media allowance and the rest of the limits now that no
    // hand-written row is left to compare against. A key that is absent here
    // (maxQuestions, advisory) must be absent from the build, not undefined.
    deepStrictEqual(built, {
      name: "xor",
      aliases: [],
      credentialsKey: "xor",
      envVars: {
        apiKey: "XOR_API_KEY",
        baseURL: "XOR_BASE_URL",
        extraRequired: ["XOR_BASE_URL"],
        model: "XOR_MODEL",
      },
      defaultModel: "xor-latest",
      inferenceKinds: ["decide"],
      decideOrder: 3,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://huggingface.co/juspay/xor",
      timeouts: { decideMs: 5000, decideMsPerKStateTokens: 150 },
      decisionLimits: {
        maxStateTokens: 28000,
        maxQuestions: 128,
        questionTypes: [
          "boolean",
          "choice",
          "score",
          "value",
          "choice-unknown",
        ],
        maxScoreLevels: 10,
        maxChoiceOptions: 64,
        nonAsciiTokensPerChar: 1,
        models: {
          "xor-latest": { maxStateTokens: 120000 },
          "xor-omni": { maxStateTokens: 28000 },
        },
        media: {
          maxImages: 1,
          video: false,
          maxRequestBytes: 25000000,
          audio: { maxSeconds: 30 },
        },
      },
    });
    deepStrictEqual(built.decisionLimits?.media, {
      maxImages: 1,
      video: false,
      maxRequestBytes: 25000000,
      audio: { maxSeconds: 30 },
    });
    assert(
      !("advisory" in (built.decisionLimits ?? {})),
      "XOR's limits are enforced locally: advisory must be absent",
    );
    const registered = PROVIDER_DESCRIPTORS.find(
      (d) => String(d.name) === "xor",
    );
    deepStrictEqual(registered, built);
    deepStrictEqual(shipped.decide.media, {
      imagesKey: "images",
      audioKey: "audio",
    });
    // Each alias reads its own measured window (131,072 and 32,768 tokens, with
    // headroom for the questions and media); any other name, the retired one
    // included, reads the tighter of the two.
    for (const [model, maxStateTokens] of [
      ["xor-latest", 120000],
      ["xor-omni", 28000],
      ["xor-1.1", 28000],
    ] as const) {
      deepStrictEqual(resolveDecisionLimitsReading(built, model), {
        provider: "xor",
        model,
        maxStateTokens,
        maxQuestions: 128,
        questionTypes: [
          "boolean",
          "choice",
          "score",
          "value",
          "choice-unknown",
        ],
        maxScoreLevels: 10,
        maxChoiceOptions: 64,
        nonAsciiTokensPerChar: 1,
        media: {
          maxImages: 1,
          video: false,
          maxRequestBytes: 25000000,
          audio: { maxSeconds: 30 },
        },
        enforcedLocally: true,
      });
    }
    strictEqual(shipped.models.catalog["xor-latest"]?.contextWindow, 131072);
    strictEqual(shipped.models.catalog["xor-omni"]?.contextWindow, 32768);
    // The route and the two models the endpoint serves: the old route and the
    // old model name are no longer the entry's.
    strictEqual(shipped.decide.endpoint, "{baseURL}/v1/decisions");
    deepStrictEqual(Object.keys(shipped.models.catalog), [
      "xor-latest",
      "xor-omni",
      "xor-1.1",
    ]);
    strictEqual(shipped.models.catalog["xor-1.1"]?.status, "retired");
    deepStrictEqual(shipped.models.topModels, ["xor-latest", "xor-omni"]);
    strictEqual(shipped.models.default, "xor-latest");
    strictEqual(shipped.models.catalog["xor-latest"]?.vision, false);
    strictEqual(shipped.models.catalog["xor-omni"]?.vision, true);
    // Positive control: the comparison tells a changed figure apart.
    throws(() =>
      deepStrictEqual(
        buildDecideDescriptor({
          ...shipped,
          decisionLimits: {
            ...shipped.decisionLimits,
            maxStateTokens: 28000,
            media: {
              maxImages: 2,
              video: false,
              maxRequestBytes: 25000000,
              audio: { maxSeconds: 30 },
            },
          },
        }).decisionLimits?.media,
        built.decisionLimits?.media,
      ),
    );
  });

  await test("buildDecideDescriptor carries ambientKeyGuard to the descriptor as a copy, and an entry without one gets none", async () => {
    const { buildDecideDescriptor } = await loadDescriptors();
    const guarded = buildDecideDescriptor(OPENAI_DECISIONS_ENTRY);
    deepStrictEqual(guarded.ambientKeyGuard, {
      baseURLEnvVars: ["OPENAI_BASE_URL", "OPENAI_API_BASE"],
      trustedOrigins: ["https://api.openai.com"],
      credentialBaseURLs: [{ key: "openai", field: "baseURL" }],
    });
    const entryGuard = OPENAI_DECISIONS_ENTRY.decide.ambientKeyGuard;
    assertNotNull(entryGuard, "positive control: the fixture declares a guard");
    assert(
      guarded.ambientKeyGuard !== entryGuard &&
        guarded.ambientKeyGuard?.baseURLEnvVars !== entryGuard.baseURLEnvVars &&
        guarded.ambientKeyGuard?.trustedOrigins !== entryGuard.trustedOrigins &&
        guarded.ambientKeyGuard?.credentialBaseURLs !==
          entryGuard.credentialBaseURLs &&
        guarded.ambientKeyGuard?.credentialBaseURLs?.[0] !==
          entryGuard.credentialBaseURLs?.[0],
      "the descriptor must hold its own copy of the guard, lists and items included, not the entry's objects",
    );
    // A guard with no credential fields gives a descriptor with no such key.
    const withoutCredentials = buildDecideDescriptor({
      ...OPENAI_DECISIONS_ENTRY,
      decide: {
        ...OPENAI_DECISIONS_ENTRY.decide,
        ambientKeyGuard: {
          baseURLEnvVars: ["OPENAI_BASE_URL"],
          trustedOrigins: ["https://api.openai.com"],
        },
      },
    });
    assert(
      withoutCredentials.ambientKeyGuard !== undefined &&
        !("credentialBaseURLs" in withoutCredentials.ambientKeyGuard),
      "an entry without credentialBaseURLs must give a guard with no such key at all",
    );
    const plain = buildDecideDescriptor(LAYA_ENTRY);
    assert(
      !("ambientKeyGuard" in plain),
      "an entry with no guard must give a descriptor with no key at all",
    );
    // Positive control: the build tells a changed guard apart.
    throws(() =>
      deepStrictEqual(
        buildDecideDescriptor({
          ...OPENAI_DECISIONS_ENTRY,
          decide: {
            ...OPENAI_DECISIONS_ENTRY.decide,
            ambientKeyGuard: {
              baseURLEnvVars: ["OPENAI_BASE_URL"],
              trustedOrigins: ["https://api.openai.com"],
            },
          },
        }).ambientKeyGuard,
        guarded.ambientKeyGuard,
      ),
    );
  });

  await test("only the shipped openai-decisions descriptor carries a guard, and it guards OPENAI_BASE_URL, OPENAI_API_BASE and credentials.openai.baseURL", async () => {
    const { PROVIDER_DESCRIPTORS } = await loadDescriptors();
    const guarded = PROVIDER_DESCRIPTORS.filter(
      (d) => d.ambientKeyGuard !== undefined,
    ).map((d) => String(d.name));
    deepStrictEqual(guarded, ["openai-decisions"]);
    const shipped = DECIDE_CATALOG_JSON_ENTRIES.find(
      (entry) => entry.id === "openai-decisions",
    );
    assertNotNull(
      shipped,
      "the decide catalog holds no openai-decisions entry",
    );
    deepStrictEqual(shipped.decide.ambientKeyGuard, {
      baseURLEnvVars: ["OPENAI_BASE_URL", "OPENAI_API_BASE"],
      trustedOrigins: ["https://api.openai.com"],
      credentialBaseURLs: [{ key: "openai", field: "baseURL" }],
    });
    // The guard never lists the provider's own base-URL variable, which
    // exempts the key instead.
    const row = PROVIDER_DESCRIPTORS.find(
      (d) => String(d.name) === "openai-decisions",
    );
    assertNotNull(row, "no openai-decisions descriptor");
    assert(
      !(row.ambientKeyGuard?.baseURLEnvVars ?? []).includes(
        row.envVars.baseURL ?? "",
      ),
      "the guard lists the provider's own base-URL variable",
    );
  });

  await test("the shipped openai-decisions setup text names every channel the guard reads and does not offer naming the provider as the way around a gateway", async () => {
    const shipped = DECIDE_CATALOG_JSON_ENTRIES.find(
      (entry) => entry.id === "openai-decisions",
    );
    assertNotNull(
      shipped,
      "the decide catalog holds no openai-decisions entry",
    );
    const guard = shipped.decide.ambientKeyGuard;
    assertNotNull(guard, "the shipped entry declares no guard");
    const step = shipped.setup.instructions.find((line) =>
      line.startsWith("3."),
    );
    assertNotNull(step, "the setup text has no step 3");
    for (const name of guard.baseURLEnvVars) {
      assert(step.includes(name), `step 3 does not name ${name}`);
    }
    for (const { key, field } of guard.credentialBaseURLs ?? []) {
      assert(
        step.includes(`credentials.${key}.${field}`),
        `step 3 does not name credentials.${key}.${field}`,
      );
    }
    // The way out of a skipped key is to route the provider on purpose; naming
    // it sends the environment key to api.openai.com, which the text says.
    assert(
      step.includes("OPENAI_DECISIONS_BASE_URL") &&
        step.includes("credentials.openaiDecisions"),
      "step 3 does not offer routing the provider on purpose",
    );
    assert(
      step.includes("only if the key is OpenAI's") &&
        step.includes("sends the environment key to api.openai.com"),
      "step 3 offers naming the provider without saying what it sends",
    );
    assert(
      !step.includes("or behind a gateway"),
      "step 3 offers naming the provider as the way to use it behind a gateway",
    );
  });

  await test("buildDecideDescriptor maps baseURLRequired, fallbacks and overrides, and stays out of the generation chains", async () => {
    const { buildDecideDescriptor } = await loadDescriptors();
    const optional = buildDecideDescriptor({
      ...LAYA_ENTRY,
      decide: { ...LAYA_ENTRY.decide, baseURLRequired: false },
    });
    assert(
      !("extraRequired" in optional.envVars),
      "an optional base URL must not be required",
    );
    const gateway = buildDecideDescriptor({
      ...LAYA_ENTRY,
      wire: {
        ...LAYA_ENTRY.wire,
        apiKeyFallbackEnvVars: ["AI_GATEWAY_API_KEY"],
      },
    });
    deepStrictEqual(gateway.envVars.fallbacks, ["AI_GATEWAY_API_KEY"]);
    const empty = buildDecideDescriptor({
      ...LAYA_ENTRY,
      wire: { ...LAYA_ENTRY.wire, apiKeyFallbackEnvVars: [] },
    });
    assert(
      !("fallbacks" in empty.envVars),
      "an empty fallback list must not create the key",
    );
    const clef = buildDecideDescriptor({
      ...LAYA_ENTRY,
      id: "cloudflare-clef",
      wire: {
        ...LAYA_ENTRY.wire,
        envOverrides: { apiKey: "CLOUDFLARE_API_KEY" },
      },
    });
    assertEqual(clef.envVars.apiKey, "CLOUDFLARE_API_KEY");
    assertEqual(clef.credentialsKey, "cloudflareClef");
    const laya = buildDecideDescriptor(LAYA_ENTRY);
    deepStrictEqual(laya.inferenceKinds, ["decide"]);
    assertEqual(laya.toolSupport, "none");
    for (const key of [
      "autoSelectPriority",
      "autoSelectPreference",
      "defaultHealthSweepPriority",
    ]) {
      assert(!(key in laya), `a decide descriptor must not set ${key}`);
    }
  });

  logSection("Registry: decide entries");
  const loadRegistry = () => import("../src/lib/factories/providerRegistry.js");
  const loadFactory = () => import("../src/lib/factories/providerFactory.js");
  const withEnv = (
    name: string,
    value: string | undefined,
    run: () => void,
  ): void => {
    const previous = process.env[name];
    const set = (next: string | undefined): void => {
      if (next === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = next;
      }
    };
    try {
      set(value);
      run();
    } finally {
      set(previous);
    }
  };

  await test("a decide entry registers under its id and aliases, carries its descriptor and builds its provider from the credentials slice", async () => {
    const { registerDecideCatalogProviders } = await loadRegistry();
    const { ProviderFactory } = await loadFactory();
    const { freezeCatalogCopy } =
      await import("../src/lib/providers/catalog/loader.js");
    const { PROVIDER_DESCRIPTORS } =
      await import("../src/lib/factories/providerDescriptors.js");
    const probe = freezeCatalogCopy({
      ...LAYA_ENTRY,
      id: "probe-decider",
      aliases: ["Probe-Alias"],
    });
    try {
      ProviderFactory.clearRegistrations();
      registerDecideCatalogProviders([LAYA_ENTRY, probe]);
      assert(
        ProviderFactory.hasProvider("laya") &&
          ProviderFactory.hasProvider("probe-decider"),
        "ids must register",
      );
      assert(
        ProviderFactory.hasProvider("probe-alias"),
        "an alias registers lower-cased, from a frozen entry",
      );
      const registeredAliases =
        ProviderFactory.getProviderInfo("probe-decider")?.aliases;
      deepStrictEqual(registeredAliases, ["Probe-Alias"]);
      assert(
        registeredAliases !== undefined &&
          registeredAliases !== probe.aliases &&
          !Object.isFrozen(registeredAliases),
        "the registration owns a plain copy of the frozen entry's aliases",
      );
      assertEqual(
        ProviderFactory.getProviderInfo("laya")?.descriptor,
        PROVIDER_DESCRIPTORS.find((d) => String(d.name) === "laya"),
        "the registration must carry the built-in descriptor",
      );
      assertEqual(
        ProviderFactory.getProviderInfo("probe-decider")?.descriptor,
        undefined,
      );

      // createProvider() cuts the credentials down to the descriptor's
      // credentialsKey slice before it calls the registered constructor, so the
      // loop has to hand that slice on as it is. Construction reads no network.
      const { ConfiguredDecisionProvider } =
        await import("../src/lib/providers/configuredDecision.js");
      // The factory hands the constructor the sdk and the region in separate
      // slots; a branded stub and a region make a dropped sdk or a region in the
      // sdk slot visible on the built provider.
      const sdkStub = { [Symbol.for("@juspay/neurolink/sdk-brand")]: true };
      const built = await ProviderFactory.createProvider(
        "laya",
        "multilingual",
        sdkStub as unknown as Parameters<
          typeof ProviderFactory.createProvider
        >[2],
        "eu-west-1",
        {
          laya: {
            apiKey: "slice-key",
            baseURL: "http://decide.invalid/base/",
          },
        },
      );
      assert(
        built instanceof ConfiguredDecisionProvider,
        "the registered constructor builds a ConfiguredDecisionProvider",
      );
      const seen = built as unknown as {
        decisionApiKey(): string;
        decisionEndpoint(): string;
        modelName: string;
        providerName: string;
        neurolink: unknown;
      };
      assertEqual(seen.decisionApiKey(), "slice-key", "the slice's key");
      assertEqual(
        seen.decisionEndpoint(),
        "http://decide.invalid/base/predict",
        "the slice's base URL",
      );
      assertEqual(seen.modelName, "multilingual", "the requested model");
      assertEqual(seen.neurolink, sdkStub, "the sdk reaches the provider");
      assertEqual(
        seen.providerName,
        "laya",
        "the provider is built from the entry it was registered for",
      );
    } finally {
      ProviderFactory.clearRegistrations();
    }
  });

  await test("the registry default model is the model env var when non-empty (a whitespace-only value as it stands, like the hand-written block), else the entry default", async () => {
    const { registerDecideCatalogProviders } = await loadRegistry();
    const { ProviderFactory } = await loadFactory();
    const cases = [
      [undefined, LAYA_ENTRY.models.default],
      ["multilingual", "multilingual"],
      ["", LAYA_ENTRY.models.default],
      ["   ", "   "],
    ] as const;
    try {
      for (const [value, expected] of cases) {
        withEnv("LAYA_MODEL", value, () => {
          ProviderFactory.clearRegistrations();
          registerDecideCatalogProviders([LAYA_ENTRY]);
          assertEqual(
            ProviderFactory.getProviderInfo("laya")?.defaultModel,
            expected,
            `LAYA_MODEL=${JSON.stringify(value)}`,
          );
        });
      }
      withEnv("PROBE_DECIDER_MODEL", "custom-model", () => {
        ProviderFactory.clearRegistrations();
        registerDecideCatalogProviders([
          { ...LAYA_ENTRY, id: "probe-decider" },
        ]);
        assertEqual(
          ProviderFactory.getProviderInfo("probe-decider")?.defaultModel,
          "custom-model",
          "the env var name follows the id",
        );
      });
      withEnv("PROBE_DECIDER_MODEL", undefined, () => {
        ProviderFactory.clearRegistrations();
        registerDecideCatalogProviders([
          {
            ...LAYA_ENTRY,
            id: "probe-decider",
            models: { ...LAYA_ENTRY.models, default: "probe-default" },
          },
        ]);
        assertEqual(
          ProviderFactory.getProviderInfo("probe-decider")?.defaultModel,
          "probe-default",
          "the fallback is the entry's own default",
        );
      });
    } finally {
      ProviderFactory.clearRegistrations();
    }
  });

  await test("registering no decide entries registers nothing", async () => {
    const { registerDecideCatalogProviders } = await loadRegistry();
    const { ProviderFactory } = await loadFactory();
    try {
      ProviderFactory.clearRegistrations();
      registerDecideCatalogProviders([]);
      assertEqual(ProviderFactory.hasProvider("laya"), false);
    } finally {
      ProviderFactory.clearRegistrations();
    }
  });

  logSection("Readers: chat-only and decide-aware");
  const sourceOf = (path: string): string =>
    readFileSync(join(REPO, path), "utf8");
  const CHAT_ONLY_READERS = [
    "src/lib/constants/contextWindows.ts",
    "src/lib/adapters/providerImageAdapter.ts",
    "src/lib/utils/pricing.ts",
    "src/lib/utils/providerConfig.ts",
    "src/cli/commands/models.ts",
  ];
  const DECIDE_AWARE_READERS = [
    "src/lib/utils/modelChoices.ts",
    "src/cli/commands/setup.ts",
    "src/lib/models/manifestRegistry.ts",
  ];

  await test("readers of text-generation tables read the chat catalog only", () => {
    for (const path of CHAT_ONLY_READERS) {
      const text = sourceOf(path);
      assert(
        text.includes("getCatalogJsonEntries"),
        `positive control: ${path} must read the chat catalog`,
      );
      assert(
        !/getDecideCatalogEntries|DECIDE_CATALOG/.test(text),
        `${path} must not read decide entries`,
      );
    }
  });

  await test("the readers that also serve decide providers read both catalogs", () => {
    for (const path of DECIDE_AWARE_READERS) {
      const text = sourceOf(path);
      assert(
        text.includes("getCatalogJsonEntries") &&
          text.includes("getDecideCatalogEntries"),
        `${path} must read both catalogs`,
      );
    }
  });

  await test("the chat accessor never yields a decide entry", async () => {
    const { getCatalogJsonEntries } =
      await import("../src/lib/providers/catalog/loader.js");
    const { isDecideCatalogEntry } =
      await import("../src/lib/providers/catalog/schema.js");
    const entries = getCatalogJsonEntries();
    assert(
      entries.length > 0,
      "positive control: the chat catalog is not empty",
    );
    assert(
      entries.every((e) => !isDecideCatalogEntry(e)),
      "a decide entry reached the chat accessor",
    );
  });

  await test("model choices for Laya are what they are today (the gate for deleting its hand-written rows)", async () => {
    const choices = await import("../src/lib/utils/modelChoices.js");
    const { AIProviderName } = await import("../src/lib/constants/enums.js");
    const top = choices.getTopModelChoices(AIProviderName.LAYA, 10);
    deepStrictEqual(
      top.map((c) => c.value),
      ["typed-decisions", "multilingual", "english", "auto", "custom"],
    );
    assert(
      top[0]?.description?.startsWith("Recommended") === true,
      "typed-decisions stays the recommended Laya model",
    );
    assertEqual(
      choices.getDefaultModel(AIProviderName.LAYA),
      "typed-decisions",
    );
    deepStrictEqual([...choices.getAllModels(AIProviderName.LAYA)].sort(), [
      "auto",
      "english",
      "multilingual",
      "typed-decisions",
    ]);
    assert(
      choices.isValidModel(AIProviderName.LAYA, "english"),
      "english is a Laya model",
    );
    assert(
      !choices.isValidModel(AIProviderName.LAYA, "gpt-4o"),
      "gpt-4o is not",
    );
    const popular = choices
      .getPopularModelsAcrossProviders()
      .filter((p) => p.provider === AIProviderName.LAYA);
    deepStrictEqual(
      popular.map((p) => p.model),
      ["typed-decisions", "multilingual"],
    );
  });

  await test("a decide entry in the catalog reaches model choices and setup cards, and the chat catalog wins an id both hold", async () => {
    const generated =
      await import("../src/lib/providers/catalog/index.generated.js");
    const loader = await import("../src/lib/providers/catalog/loader.js");
    const choices = await import("../src/lib/utils/modelChoices.js");
    type Provider = Parameters<typeof choices.getTopModelChoices>[0];
    const chatGroq = loader
      .getCatalogJsonEntries()
      .find((e) => e.id === "groq");
    assertNotNull(chatGroq, "positive control: groq is a chat catalog entry");
    const spec = (description: string) => ({
      vision: false,
      status: "production" as const,
      description,
    });
    const probe = {
      ...structuredClone(LAYA_ENTRY),
      id: "probe-decider",
      displayName: "Probe Decider",
      // Orders of their own: the clone would keep Laya's order 2, which the
      // hand-written Laya descriptor holds, and the first load of
      // providerDescriptors.js would refuse the pair.
      decide: { ...LAYA_ENTRY.decide, order: 91 },
      models: {
        default: "probe-fast",
        catalog: {
          "probe-fast": spec("Probe fast"),
          "probe-deep": spec("Probe deep"),
        },
        topModels: ["probe-deep", "probe-fast"],
      },
    };
    // Shares groq's id on purpose: codegen refuses this, so only a probe can
    // show which catalog a reader trusts first.
    const clash = {
      ...structuredClone(LAYA_ENTRY),
      id: "groq",
      displayName: "Decide Clash",
      decide: { ...LAYA_ENTRY.decide, order: 92 },
      models: {
        default: "clash-model",
        catalog: { "clash-model": spec("Clash model") },
      },
    };
    const decideEntries = generated.DECIDE_CATALOG_JSON_ENTRIES;
    const before = [...decideEntries];
    try {
      decideEntries.push(probe, clash);
      assert(
        loader.getDecideCatalogEntries().some((e) => e.id === probe.id),
        "positive control: the probe is in the decide catalog",
      );
      const probeId = probe.id as Provider;
      const groqId = "groq" as Provider;

      deepStrictEqual(
        choices.getTopModelChoices(probeId, 10).map((c) => c.value),
        ["probe-deep", "probe-fast", "custom"],
      );
      assertEqual(choices.getDefaultModel(probeId), "probe-fast");
      deepStrictEqual(choices.getAllModels(probeId).sort(), [
        "probe-deep",
        "probe-fast",
      ]);
      assert(choices.isValidModel(probeId, "probe-deep"), "a probe model");
      assert(!choices.isValidModel(probeId, "gpt-4o"), "not a probe model");
      const popular = choices.getPopularModelsAcrossProviders();
      deepStrictEqual(
        popular.filter((p) => p.provider === probeId).map((p) => p.model),
        ["probe-deep", "probe-fast"],
      );
      const isDecideRow = (row: { provider: string; model: string }): boolean =>
        row.provider === probeId || row.model === "clash-model";
      const firstDecideAt = popular.findIndex(isDecideRow);
      const lastChatAt = popular.map(isDecideRow).lastIndexOf(false);
      assert(
        firstDecideAt !== -1 && lastChatAt !== -1,
        "positive control: the list holds decide rows and chat rows",
      );
      assert(
        firstDecideAt > lastChatAt,
        "chat rows come before decide rows in the popular list",
      );

      assertEqual(choices.getDefaultModel(groqId), chatGroq.models.default);
      assert(
        choices.getTopModelChoices(groqId, 10).length > 1 &&
          !choices
            .getTopModelChoices(groqId, 10)
            .some((c) => c.value === "clash-model"),
        "the chat entry's models are offered for an id both catalogs hold",
      );
      assert(
        !choices.getAllModels(groqId).includes("clash-model") &&
          !choices.isValidModel(groqId, "clash-model"),
        "the chat entry's models are the valid ones",
      );
      // EXTRA_PROVIDER_CONFIGS is built when setup.ts loads, so this has to be
      // the first import of that module. The cached module keeps the probe
      // cards, so this test must stay last in the file.
      const setup = await import("../src/cli/commands/setup.js");
      deepStrictEqual(
        setup.EXTRA_PROVIDER_CONFIGS[probe.id],
        loader.buildCatalogConfigOptions(probe),
      );
      deepStrictEqual(
        setup.EXTRA_PROVIDER_CONFIGS.groq,
        loader.buildCatalogConfigOptions(chatGroq),
      );
    } finally {
      decideEntries.splice(0, decideEntries.length, ...before);
    }
  });
});
