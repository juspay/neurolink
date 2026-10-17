#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Middleware defaults: NEUROLINK_MIDDLEWARE_PRESET, configureGlobalMiddleware(),
 * the NeuroLink constructor's `middleware` option, and the per-call
 * `middleware`, resolved lowest to highest in that order.
 *
 * Offline and end-to-end: a loopback OpenAI-style server answers "mock reply",
 * and the guardrails bad-word filter turns that into a replacement string that
 * names the layer it came from, so the output says which layer won. The preset
 * cases use a different signal: a call that supplies a word list but never
 * enables guardrails is only filtered when a lower layer's preset switched
 * guardrails on, which is how the environment layer (a preset name and nothing
 * else) is made visible. Runtime imports use only the built entry.
 *
 * Run: pnpm run build && pnpm run test:middleware-defaults
 */

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  GenerateOptions,
  MiddlewareFactoryOptions,
  NeuroLinkMiddleware,
  StreamOptions,
  StreamResult,
  TextGenerationOptions,
} from "../src/lib/types/index.js";
import { defineSuite, runCommand, tempDir } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  chatCompletion,
  mockOpenAICredentials,
  startMockChatServer,
  startScriptedChatServer,
  type MockChatServer,
} from "./helpers/mockChatServer.js";
import {
  NeuroLink,
  clearGlobalMiddleware,
  configureGlobalMiddleware,
  logger,
  type AIProviderName,
} from "../dist/index.js";

assertDistFresh();

process.env.NEUROLINK_SKIP_MCP = "true";

const ENV_VAR = "NEUROLINK_MIDDLEWARE_PRESET";
const BASELINE = "mock reply";

const { test, section, runSuite } = defineSuite("Middleware defaults", {
  offline: true,
});

const MODES = ["generate", "stream"] as const;
type Mode = (typeof MODES)[number];

/** Guardrails on, filtering "mock" into `replacementText`. */
const guard = (
  replacementText: string,
  list: string[] = ["mock"],
): MiddlewareFactoryOptions => ({
  middlewareConfig: {
    guardrails: {
      enabled: true,
      config: { badWords: { enabled: true, list, replacementText } },
    },
  },
});

/**
 * A word list with no `enabled: true` for guardrails. It filters only if some
 * preset beneath it switched guardrails on.
 */
const probe = (
  extra: MiddlewareFactoryOptions = {},
): MiddlewareFactoryOptions => ({
  middlewareConfig: {
    guardrails: {
      config: {
        badWords: { enabled: true, list: ["mock"], replacementText: "PROBE" },
      },
    },
  },
  ...extra,
});

const readText = async (result: StreamResult): Promise<string> => {
  let text = "";
  for await (const chunk of result.stream) {
    if ("content" in chunk && typeof chunk.content === "string") {
      text += chunk.content;
    }
  }
  return text;
};

const bounded = async <T>(promise: PromiseLike<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("call did not settle")),
          30_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

type Layers = {
  /** Value of NEUROLINK_MIDDLEWARE_PRESET while the instance is built. */
  env?: string;
  global?: MiddlewareFactoryOptions;
  ctor?: MiddlewareFactoryOptions;
  call?: MiddlewareFactoryOptions;
};

/** Run `body` with the environment layer set, then put the variable back. */
async function withEnvPreset<T>(
  value: string | undefined,
  body: () => Promise<T>,
): Promise<T> {
  const saved = process.env[ENV_VAR];
  if (value === undefined) {
    delete process.env[ENV_VAR];
  } else {
    process.env[ENV_VAR] = value;
  }
  try {
    return await body();
  } finally {
    if (saved === undefined) {
      delete process.env[ENV_VAR];
    } else {
      process.env[ENV_VAR] = saved;
    }
  }
}

const callOptions = (
  server: MockChatServer,
  call: MiddlewareFactoryOptions | undefined,
  extra: Partial<GenerateOptions> = {},
): GenerateOptions & StreamOptions => ({
  input: { text: "hello" },
  provider: "openai",
  model: "gpt-4o-mini",
  disableTools: true,
  disableInternalFallback: true,
  credentials: mockOpenAICredentials(server),
  ...(call ? { middleware: call } : {}),
  ...extra,
});

async function callOn(
  sdk: NeuroLink,
  mode: Mode,
  options: GenerateOptions & StreamOptions,
): Promise<string> {
  return mode === "generate"
    ? (await sdk.generate(options)).content
    : await bounded(readText(await sdk.stream(options)));
}

/** Build an instance from `layers`, make one call, and return its text. */
async function reply(
  server: MockChatServer,
  mode: Mode,
  layers: Layers,
  extra: Partial<GenerateOptions> = {},
): Promise<string> {
  const before = server.getAllRequestBodies().length;
  try {
    if (layers.global) {
      configureGlobalMiddleware(layers.global);
    }
    const sdk = await withEnvPreset(
      layers.env,
      async () =>
        new NeuroLink(layers.ctor ? { middleware: layers.ctor } : undefined),
    );
    try {
      const text = await callOn(
        sdk,
        mode,
        callOptions(server, layers.call, extra),
      );
      assert.equal(
        server.getAllRequestBodies().length,
        before + 1,
        "the call did not reach the fixture exactly once",
      );
      return text;
    } finally {
      await sdk.shutdown();
    }
  } finally {
    clearGlobalMiddleware();
  }
}

const CASES: Array<{ name: string; layers: Layers; expected: string }> = [
  { name: "no default and no call config", layers: {}, expected: BASELINE },
  {
    name: "global alone",
    layers: { global: guard("GLOBAL") },
    expected: "GLOBAL reply",
  },
  {
    name: "constructor alone",
    layers: { ctor: guard("CTOR") },
    expected: "CTOR reply",
  },
  {
    name: "per-call alone",
    layers: { call: guard("CALL") },
    expected: "CALL reply",
  },
  {
    name: "constructor over global",
    layers: { global: guard("GLOBAL"), ctor: guard("CTOR") },
    expected: "CTOR reply",
  },
  {
    name: "per-call over global",
    layers: { global: guard("GLOBAL"), call: guard("CALL") },
    expected: "CALL reply",
  },
  {
    name: "per-call over constructor",
    layers: { ctor: guard("CTOR"), call: guard("CALL") },
    expected: "CALL reply",
  },
  {
    name: "per-call over constructor over global",
    layers: {
      global: guard("GLOBAL"),
      ctor: guard("CTOR"),
      call: guard("CALL"),
    },
    expected: "CALL reply",
  },
];

section("Configuration precedence: global < constructor < per-call");

for (const mode of MODES) {
  for (const entry of CASES) {
    await test(`${mode}: ${entry.name}`, async () => {
      const server = await startMockChatServer();
      try {
        assert.equal(
          await reply(server, mode, entry.layers),
          entry.expected,
          `wrong layer won for ${entry.name}`,
        );
      } finally {
        await server.close();
      }
    });
  }
}

section("Preset precedence: environment < global < constructor < per-call");

const PRESET_CASES: Array<{ name: string; layers: Layers; filtered: boolean }> =
  [
    {
      name: "probe alone does not enable guardrails",
      layers: { call: probe() },
      filtered: false,
    },
    {
      name: "environment preset alone",
      layers: { env: "security", call: probe() },
      filtered: true,
    },
    {
      name: "global preset alone",
      layers: { global: { preset: "security" }, call: probe() },
      filtered: true,
    },
    {
      name: "constructor preset alone",
      layers: { ctor: { preset: "security" }, call: probe() },
      filtered: true,
    },
    {
      name: "global preset replaces the environment preset",
      layers: {
        env: "security",
        global: { preset: "default" },
        call: probe(),
      },
      filtered: false,
    },
    {
      name: "constructor preset replaces the environment preset",
      layers: { env: "security", ctor: { preset: "default" }, call: probe() },
      filtered: false,
    },
    {
      name: "constructor preset replaces the global preset",
      layers: {
        env: "default",
        global: { preset: "default" },
        ctor: { preset: "security" },
        call: probe(),
      },
      filtered: true,
    },
    {
      name: "per-call preset replaces every default",
      layers: {
        env: "security",
        global: { preset: "security" },
        ctor: { preset: "security" },
        call: probe({ preset: "default" }),
      },
      filtered: false,
    },
  ];

for (const mode of MODES) {
  for (const entry of PRESET_CASES) {
    await test(`${mode}: ${entry.name}`, async () => {
      const server = await startMockChatServer();
      try {
        assert.equal(
          await reply(server, mode, entry.layers),
          entry.filtered ? "PROBE reply" : BASELINE,
          `preset layering wrong for ${entry.name}`,
        );
      } finally {
        await server.close();
      }
    });
  }
}

section("security preset ships no word list");

for (const mode of MODES) {
  await test(`${mode}: NEUROLINK_MIDDLEWARE_PRESET=security alone redacts nothing`, async () => {
    const server = await startMockChatServer();
    try {
      assert.equal(
        await reply(server, mode, { env: "security" }),
        BASELINE,
        "the security preset filtered text with no word list configured",
      );
    } finally {
      await server.close();
    }
  });

  await test(`${mode}: security from the environment plus a constructor word list redacts`, async () => {
    const server = await startMockChatServer();
    try {
      assert.equal(
        await reply(server, mode, {
          env: "security",
          ctor: {
            middlewareConfig: {
              guardrails: {
                config: {
                  badWords: {
                    enabled: true,
                    list: ["mock"],
                    replacementText: "CTOR",
                  },
                },
              },
            },
          },
        }),
        "CTOR reply",
        "environment preset plus a constructor word list did not filter",
      );
    } finally {
      await server.close();
    }
  });
}

section(
  "Unknown NEUROLINK_MIDDLEWARE_PRESET is reported on stderr and ignored",
);

await test("an unknown value is reported once, does not throw, and changes nothing", async () => {
  const server = await startMockChatServer();
  const warnings: string[] = [];
  const original = logger.alwaysStderr;
  logger.alwaysStderr = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  try {
    const bogus = "no-such-preset-e2e";
    for (const mode of MODES) {
      assert.equal(
        await reply(server, mode, { env: bogus, call: probe() }),
        BASELINE,
        `an unknown environment preset changed ${mode} output`,
      );
    }
    const mentions = warnings.filter(
      (warning) => warning.includes(ENV_VAR) && warning.includes(bogus),
    );
    assert.equal(
      mentions.length,
      1,
      "expected one message naming the variable and the bad value",
    );
  } finally {
    logger.alwaysStderr = original;
    await server.close();
  }
});

await test("a blank value is no layer and reports nothing", async () => {
  const server = await startMockChatServer();
  const warnings: string[] = [];
  const original = logger.alwaysStderr;
  logger.alwaysStderr = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  try {
    assert.equal(
      await reply(server, "generate", { env: "   ", call: probe() }),
      BASELINE,
    );
    assert.equal(
      warnings.filter((warning) => warning.includes(ENV_VAR)).length,
      0,
      "a blank value produced a message",
    );
  } finally {
    logger.alwaysStderr = original;
    await server.close();
  }
});

await test("the CLI reads the variable too", async () => {
  const server = await startScriptedChatServer([
    chatCompletion({ content: BASELINE }),
  ]);
  try {
    const home = tempDir("neurolink-middleware-defaults-");
    // No NEUROLINK_DEBUG: the message must reach the process output on its
    // own, because the logger drops ordinary warnings unless debugging.
    const run = (value: string) =>
      runCommand(
        "node",
        [
          resolve("dist/cli/index.js"),
          "generate",
          "hello",
          "--provider",
          "openai-compatible",
          "--model",
          "fixture-model",
          "--quiet",
          "--disableTools",
        ],
        {
          cwd: home,
          env: {
            ...process.env,
            HOME: home,
            OPENAI_COMPATIBLE_BASE_URL: server.baseURL.replace(/\/v1$/, ""),
            OPENAI_COMPATIBLE_API_KEY: "test-key",
            NEUROLINK_SKIP_MCP: "true",
            NEUROLINK_DISABLE_BUILTIN_TOOLS: "true",
            [ENV_VAR]: value,
          } as NodeJS.ProcessEnv,
          timeoutMs: 60_000,
        },
      );
    const ignoring = `Ignoring ${ENV_VAR}`;
    const bad = await run("no-such-preset-cli-e2e");
    const good = await run("security");
    assert.equal(
      server.requestCount(),
      2,
      "both CLI runs must reach the fixture",
    );
    assert.equal(bad.exitCode, 0, "the CLI failed on an unknown preset");
    assert.equal(good.exitCode, 0, "the CLI failed on a known preset");
    assert.ok(
      (bad.stdout + bad.stderr).includes(ignoring),
      "the CLI did not report an unknown preset without --debug",
    );
    assert.ok(
      !(good.stdout + good.stderr).includes(ignoring),
      "the CLI reported a known preset",
    );
  } finally {
    await server.close();
  }
});

section("enabled and disabled across layers");

await test("a call that enables guardrails beats a disabled list inherited from a lower layer", async () => {
  const server = await startMockChatServer();
  try {
    const layers: Layers = {
      global: guard("GLOBAL"),
      ctor: { disabledMiddleware: ["guardrails"] },
    };
    const enables: Array<[string, MiddlewareFactoryOptions]> = [
      [
        "middlewareConfig.guardrails.enabled",
        { middlewareConfig: { guardrails: { enabled: true } } },
      ],
      ["enabledMiddleware", { enabledMiddleware: ["guardrails"] }],
    ];
    for (const mode of MODES) {
      assert.equal(
        await reply(server, mode, layers),
        BASELINE,
        `precondition: the constructor's disabled list must switch guardrails off in ${mode}`,
      );
      for (const [route, call] of enables) {
        assert.equal(
          await reply(server, mode, { ...layers, call }),
          "GLOBAL reply",
          `a per-call enable through ${route} lost to an inherited disabled list in ${mode}`,
        );
      }
    }
  } finally {
    await server.close();
  }
});

await test("a call can switch off middleware a default enabled", async () => {
  const server = await startMockChatServer();
  try {
    const globalOn: Layers = { global: guard("GLOBAL") };
    const ctorListed: Layers = {
      ctor: {
        enabledMiddleware: ["guardrails"],
        middlewareConfig: guard("CTOR").middlewareConfig,
      },
    };
    for (const mode of MODES) {
      assert.equal(
        await reply(server, mode, globalOn),
        "GLOBAL reply",
        `precondition: the global must filter when the call says nothing in ${mode}`,
      );
      assert.equal(
        await reply(server, mode, {
          ...globalOn,
          call: { disabledMiddleware: ["guardrails"] },
        }),
        BASELINE,
        `disabledMiddleware on the call did not switch off the global in ${mode}`,
      );
      assert.equal(
        await reply(server, mode, ctorListed),
        "CTOR reply",
        `precondition: the constructor must filter when the call says nothing in ${mode}`,
      );
      assert.equal(
        await reply(server, mode, {
          ...ctorListed,
          call: { middlewareConfig: { guardrails: { enabled: false } } },
        }),
        BASELINE,
        `enabled: false on the call lost to an inherited enabled list in ${mode}`,
      );
    }
  } finally {
    await server.close();
  }
});

await test("an explicit empty list on a call clears the list it would inherit", async () => {
  const server = await startMockChatServer();
  try {
    const layers: Layers = {
      global: guard("GLOBAL"),
      ctor: { disabledMiddleware: ["guardrails"] },
    };
    for (const mode of MODES) {
      assert.equal(
        await reply(server, mode, layers),
        BASELINE,
        `precondition: the inherited disabled list must switch guardrails off in ${mode}`,
      );
      assert.equal(
        await reply(server, mode, {
          ...layers,
          call: { disabledMiddleware: [] },
        }),
        "GLOBAL reply",
        `an empty disabledMiddleware on the call did not clear the inherited list in ${mode}`,
      );
    }
  } finally {
    await server.close();
  }
});

await test("without replacementText a match becomes [REDACTED]", async () => {
  const server = await startMockChatServer();
  try {
    const plain: MiddlewareFactoryOptions = {
      middlewareConfig: {
        guardrails: {
          enabled: true,
          config: { badWords: { enabled: true, list: ["mock"] } },
        },
      },
    };
    for (const mode of MODES) {
      assert.equal(
        await reply(server, mode, { ctor: plain }),
        "[REDACTED] reply",
        `the default replacement text is not [REDACTED] in ${mode}`,
      );
    }
  } finally {
    await server.close();
  }
});

section("config keys merge per id; arrays are replaced");

await test("a higher layer replaces badWords as a whole, list included", async () => {
  const server = await startMockChatServer();
  try {
    for (const mode of MODES) {
      // Global filters "mock"; the constructor sets its own badWords for
      // "reply" and does not restate `enabled`. A concatenated list would also
      // filter "mock"; a replaced one leaves it alone.
      assert.equal(
        await reply(server, mode, {
          global: guard("GLOBAL"),
          ctor: guard("CTOR", ["reply"]),
        }),
        "mock CTOR",
        `the constructor's badWords did not replace the global's in ${mode}`,
      );
    }
  } finally {
    await server.close();
  }
});

await test("a higher layer that sets a different key leaves the lower layer's keys alone", async () => {
  const server = await startMockChatServer();
  try {
    for (const mode of MODES) {
      assert.equal(
        await reply(server, mode, {
          global: guard("GLOBAL"),
          ctor: {
            middlewareConfig: {
              guardrails: { config: { modelFilter: { enabled: false } } },
            },
          },
        }),
        "GLOBAL reply",
        `a constructor entry for another key dropped the global badWords in ${mode}`,
      );
    }
  } finally {
    await server.close();
  }
});

section("clearGlobalMiddleware restores the previous behaviour");

await test("an instance built before configureGlobalMiddleware picks it up, and clear removes it", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  try {
    for (const mode of MODES) {
      assert.equal(
        await callOn(sdk, mode, callOptions(server, undefined)),
        BASELINE,
        `precondition: ${mode} must be unfiltered before the global is set`,
      );
      configureGlobalMiddleware(guard("GLOBAL"));
      assert.equal(
        await callOn(sdk, mode, callOptions(server, undefined)),
        "GLOBAL reply",
        `an existing instance ignored the global in ${mode}`,
      );
      clearGlobalMiddleware();
      assert.equal(
        await callOn(sdk, mode, callOptions(server, undefined)),
        BASELINE,
        `clearGlobalMiddleware did not restore ${mode}`,
      );
    }
  } finally {
    clearGlobalMiddleware();
    await sdk.shutdown();
    await server.close();
  }
});

await test("configureGlobalMiddleware replaces the earlier global", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink();
  try {
    configureGlobalMiddleware(guard("FIRST"));
    configureGlobalMiddleware(guard("SECOND", ["reply"]));
    assert.equal(
      await callOn(sdk, "generate", callOptions(server, undefined)),
      "mock SECOND",
      "the second configureGlobalMiddleware did not replace the first",
    );
  } finally {
    clearGlobalMiddleware();
    await sdk.shutdown();
    await server.close();
  }
});

section("Entry points");

await test("generateText applies the same defaults as generate", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink({ middleware: guard("CTOR") });
  try {
    const options = (
      call?: MiddlewareFactoryOptions,
    ): TextGenerationOptions => ({
      prompt: "hello",
      provider: "openai" as AIProviderName,
      model: "gpt-4o-mini",
      disableTools: true,
      credentials: mockOpenAICredentials(server),
      ...(call ? { middleware: call } : {}),
    });
    assert.equal(
      (await sdk.generateText(options())).content,
      "CTOR reply",
      "generateText ignored the constructor default",
    );
    assert.equal(
      (await sdk.generateText(options(guard("CALL")))).content,
      "CALL reply",
      "a per-call middleware did not override the default on generateText",
    );
    configureGlobalMiddleware(guard("GLOBAL", ["reply"]));
    assert.equal(
      (await sdk.generateText(options())).content,
      "CTOR reply",
      "the constructor default must beat the global on generateText",
    );
  } finally {
    clearGlobalMiddleware();
    await sdk.shutdown();
    await server.close();
  }
});

section("Instances are independent");

await test("a constructor default reaches only its own instance", async () => {
  const server = await startMockChatServer();
  const guarded = new NeuroLink({ middleware: guard("CTOR") });
  const plain = new NeuroLink();
  try {
    for (const mode of MODES) {
      assert.equal(
        await callOn(guarded, mode, callOptions(server, undefined)),
        "CTOR reply",
        `the guarded instance was not filtered in ${mode}`,
      );
      assert.equal(
        await callOn(plain, mode, callOptions(server, undefined)),
        BASELINE,
        `a constructor default leaked to another instance in ${mode}`,
      );
    }
  } finally {
    await guarded.shutdown();
    await plain.shutdown();
    await server.close();
  }
});

await test("editing the config object after construction changes nothing", async () => {
  const server = await startMockChatServer();
  const middleware = guard("CTOR");
  const sdk = new NeuroLink({ middleware });
  try {
    const badWords = middleware.middlewareConfig?.guardrails?.config
      ?.badWords as { replacementText?: string; list?: string[] };
    badWords.replacementText = "MUTATED";
    badWords.list = ["reply"];
    for (const mode of MODES) {
      assert.equal(
        await callOn(sdk, mode, callOptions(server, undefined)),
        "CTOR reply",
        `a later edit to the caller's object changed the default in ${mode}`,
      );
    }
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("a call does not write the merged config back into the caller's objects", async () => {
  const server = await startMockChatServer();
  const ctor = guard("CTOR");
  const call = guard("CALL");
  const ctorBefore = JSON.stringify(ctor);
  const callBefore = JSON.stringify(call);
  const sdk = new NeuroLink({ middleware: ctor });
  try {
    for (const mode of MODES) {
      await callOn(sdk, mode, callOptions(server, call));
    }
    assert.equal(
      JSON.stringify(ctor),
      ctorBefore,
      "the constructor object changed",
    );
    assert.equal(
      JSON.stringify(call),
      callBefore,
      "the per-call object changed",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

section("Lifecycle callbacks and custom middleware");

await test("onFinish still fires, and the constructor default still applies", async () => {
  const server = await startMockChatServer();
  const sdk = new NeuroLink({ middleware: guard("CTOR") });
  try {
    for (const mode of MODES) {
      let finished = 0;
      const text = await callOn(
        sdk,
        mode,
        callOptions(server, undefined, {
          onFinish: () => {
            finished += 1;
          },
        }),
      );
      for (let waited = 0; finished === 0 && waited < 50; waited += 1) {
        await new Promise((r) => setTimeout(r, 40));
      }
      assert.equal(
        text,
        "CTOR reply",
        `the default was lost when onFinish was set in ${mode}`,
      );
      assert.equal(
        finished,
        1,
        `onFinish did not fire exactly once in ${mode}`,
      );
    }
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

await test("a custom middleware in a default runs once per call", async () => {
  const server = await startMockChatServer();
  const counts = { generate: 0, stream: 0 };
  const middleware: NeuroLinkMiddleware = {
    specificationVersion: "v3",
    metadata: { id: "defaults-probe", name: "Defaults probe" },
    wrapGenerate: async ({ doGenerate }) => {
      counts.generate += 1;
      return doGenerate();
    },
    wrapStream: async ({ doStream }) => {
      counts.stream += 1;
      return doStream();
    },
  };
  const probed = new NeuroLink({
    middleware: {
      middleware: [middleware],
      enabledMiddleware: ["defaults-probe"],
    },
  });
  const plain = new NeuroLink();
  try {
    await callOn(plain, "generate", callOptions(server, undefined));
    assert.deepEqual(
      counts,
      { generate: 0, stream: 0 },
      "precondition: the probe ran on an instance without it",
    );
    await callOn(probed, "generate", callOptions(server, undefined));
    assert.deepEqual(
      counts,
      { generate: 1, stream: 0 },
      "the probe did not run exactly once on generate",
    );
    await callOn(probed, "stream", callOptions(server, undefined));
    assert.deepEqual(
      counts,
      { generate: 1, stream: 1 },
      "the probe did not run exactly once on stream",
    );
  } finally {
    await probed.shutdown();
    await plain.shutdown();
    await server.close();
  }
});

section("Invalid defaults");

await test("a non-object default is rejected rather than ignored", () => {
  assert.throws(
    () =>
      new NeuroLink({
        middleware: "security" as unknown as MiddlewareFactoryOptions,
      }),
    TypeError,
    "the constructor accepted a non-object middleware",
  );
  assert.throws(
    () =>
      configureGlobalMiddleware(null as unknown as MiddlewareFactoryOptions),
    TypeError,
    "configureGlobalMiddleware accepted null",
  );
  assert.throws(
    () => configureGlobalMiddleware([] as unknown as MiddlewareFactoryOptions),
    TypeError,
    "configureGlobalMiddleware accepted an array",
  );
  clearGlobalMiddleware();
});

await test("an unknown preset in a default is rejected, so a typo cannot mask a valid one", async () => {
  assert.throws(
    () => new NeuroLink({ middleware: { preset: "securty" } }),
    (error: unknown) =>
      error instanceof TypeError &&
      error.message.includes("securty") &&
      error.message.includes("security"),
    "the constructor accepted an unknown preset",
  );
  const server = await startMockChatServer();
  try {
    configureGlobalMiddleware(guard("GLOBAL"));
    assert.throws(
      () => configureGlobalMiddleware({ preset: "securty-global" }),
      (error: unknown) =>
        error instanceof TypeError && error.message.includes("securty-global"),
      "configureGlobalMiddleware accepted an unknown preset",
    );
    const sdk = new NeuroLink();
    try {
      assert.equal(
        await callOn(sdk, "generate", callOptions(server, undefined)),
        "GLOBAL reply",
        "a rejected configureGlobalMiddleware call replaced the earlier global",
      );
    } finally {
      await sdk.shutdown();
    }
  } finally {
    clearGlobalMiddleware();
    await server.close();
  }
});

await test("a rejected default starts no telemetry", async () => {
  const probe = [
    `import { NeuroLink, isOpenTelemetryInitialized } from ${JSON.stringify(
      pathToFileURL(resolve("dist/index.js")).href,
    )};`,
    "const out = { before: isOpenTelemetryInitialized() };",
    "try {",
    '  new NeuroLink({ observability: {}, middleware: "security" });',
    '  out.rejected = "constructed";',
    "} catch (error) {",
    "  out.rejected = error instanceof TypeError ? 'TypeError' : String(error);",
    "}",
    "out.afterRejected = isOpenTelemetryInitialized();",
    "new NeuroLink({ observability: {} });",
    "out.afterValid = isOpenTelemetryInitialized();",
    "console.log(JSON.stringify(out));",
    "process.exit(0);",
  ].join("\n");
  const result = await runCommand(
    "node",
    ["--input-type=module", "-e", probe],
    {
      cwd: resolve("."),
      env: {
        ...process.env,
        NEUROLINK_SKIP_MCP: "true",
        // Loopback and unused: setting it only makes telemetry start.
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:9",
      } as NodeJS.ProcessEnv,
      timeoutMs: 60_000,
    },
  );
  assert.equal(result.exitCode, 0, `the probe failed: ${result.stderr}`);
  const line = result.stdout.trim().split("\n").pop() ?? "";
  assert.deepEqual(
    JSON.parse(line),
    {
      before: false,
      rejected: "TypeError",
      afterRejected: false,
      afterValid: true,
    },
    "an invalid middleware default must throw before telemetry starts, and a valid construction must start it",
  );
});

await runSuite();
