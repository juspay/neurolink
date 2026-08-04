#!/usr/bin/env tsx

/**
 * Continuous Test Suite — CLI Tool-Routing Flag Assembly
 *
 * Unit coverage for `buildToolRoutingConfigFromCli`: the enable/disable gate,
 * timeout validation, router-model fields, always-include ids, and the
 * server-descriptor flag (inline JSON, a path on disk, and the fail-open paths).
 *
 * Distinct from continuous-test-suite-tool-routing-cli.ts, which drives the CLI
 * as a subprocess and asserts on --help output; nothing here shells out.
 *
 * Migrated from test/toolRoutingCli.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-tool-routing-flags.ts
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildToolRoutingConfigFromCli } from "../src/cli/utils/toolRoutingFlags.js";
import type { CliToolRoutingFlags } from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("CLI Tool-Routing Flag Assembly");

/** Build a minimal flags bag, with all extra keys forwarded through. */
function flags(
  overrides: CliToolRoutingFlags & Record<string, unknown>,
): CliToolRoutingFlags & Record<string, unknown> {
  return overrides;
}

const eq = (actual: unknown, expected: unknown, msg: string): void =>
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), msg);

/**
 * Run `body` with logger.warn captured, returning the warning messages.
 *
 * The Vitest original mocked the whole logger module purely to keep output
 * clean, and its three "emits a warning" tests never checked that a warning was
 * emitted. Capturing instead of silencing lets those names be true.
 */
async function captureWarnings(body: () => void): Promise<string[]> {
  const messages: string[] = [];
  const warn = stub(logger, "warn", (...args: unknown[]) => {
    messages.push(String(args[0]));
  });
  await withStubs([warn], body);
  return messages;
}

await test("returns undefined when the --tool-routing flag is absent", () => {
  assertEqual(buildToolRoutingConfigFromCli(flags({})), undefined);
});

await test("returns undefined when toolRouting is explicitly false", () => {
  assertEqual(
    buildToolRoutingConfigFromCli(flags({ toolRouting: false })),
    undefined,
  );
});

await test("returns undefined when toolRouting is undefined", () => {
  assertEqual(
    buildToolRoutingConfigFromCli(flags({ toolRouting: undefined })),
    undefined,
  );
});

await test("returns { enabled: true } for the bare --tool-routing flag", () => {
  eq(
    buildToolRoutingConfigFromCli(flags({ toolRouting: true })),
    {
      enabled: true,
    },
    "a bare flag must not invent any other field",
  );
});

await test("maps toolRoutingTimeout to timeoutMs", () => {
  assertEqual(
    buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingTimeout: 9000 }),
    )?.timeoutMs,
    9000,
  );
});

await test("does not set timeoutMs when toolRoutingTimeout is absent", () => {
  const result = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
  assert(
    result !== undefined && !("timeoutMs" in result),
    "timeoutMs must be absent, not undefined-valued",
  );
});

for (const [label, value] of [
  ["NaN", Number.NaN],
  ["zero", 0],
  ["a negative value", -500],
] as const) {
  await test(`drops ${label} as a timeout AND emits a warning`, async () => {
    const warnings = await captureWarnings(() => {
      const result = buildToolRoutingConfigFromCli(
        flags({ toolRouting: true, toolRoutingTimeout: value }),
      );
      assert(
        result !== undefined && !("timeoutMs" in result),
        `${label} must not reach timeoutMs`,
      );
    });
    assert(
      warnings.length > 0,
      `${label} must be reported, not silently discarded`,
    );
  });
}

await test("maps the router provider, model and region fields", () => {
  const result = buildToolRoutingConfigFromCli(
    flags({
      toolRouting: true,
      toolRoutingRouterProvider: "vertex",
      toolRoutingRouterModel: "gemini-flash",
      toolRoutingRouterRegion: "us-central1",
    }),
  );
  eq(
    result?.routerModel,
    { provider: "vertex", model: "gemini-flash", region: "us-central1" },
    "all three router fields must be carried",
  );
});

await test("maps each router field independently", () => {
  assertEqual(
    buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingRouterProvider: "vertex" }),
    )?.routerModel?.provider,
    "vertex",
  );
  assertEqual(
    buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingRouterModel: "gemini-flash" }),
    )?.routerModel?.model,
    "gemini-flash",
  );
  assertEqual(
    buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingRouterRegion: "us-central1" }),
    )?.routerModel?.region,
    "us-central1",
  );
});

await test("does not set routerModel when no router field is provided", () => {
  const result = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
  assert(
    result !== undefined && !("routerModel" in result),
    "routerModel must be absent when nothing was asked for",
  );
});

await test("maps toolRoutingAlwaysInclude to alwaysIncludeServerIds", () => {
  eq(
    buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingAlwaysInclude: ["utility"] }),
    )?.alwaysIncludeServerIds,
    ["utility"],
    "always-include ids must be carried through",
  );
});

await test("does not set alwaysIncludeServerIds for an empty array or an absent flag", () => {
  const empty = buildToolRoutingConfigFromCli(
    flags({ toolRouting: true, toolRoutingAlwaysInclude: [] }),
  );
  assert(
    empty !== undefined && !("alwaysIncludeServerIds" in empty),
    "an empty array must not produce an empty always-include list",
  );
  const absent = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
  assert(
    absent !== undefined && !("alwaysIncludeServerIds" in absent),
    "an absent flag must not produce the field",
  );
});

await test("parses a valid inline JSON array of server descriptors", () => {
  const descriptors = [
    { id: "analytics", description: "Sales analytics" },
    { id: "shipping", description: "Shipment tracking" },
  ];
  eq(
    buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingServers: JSON.stringify(descriptors),
      }),
    )?.servers,
    descriptors,
    "inline JSON must be parsed verbatim",
  );
});

await test("fails open on malformed JSON — no servers, still enabled", async () => {
  await captureWarnings(() => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingServers: "not-valid-json{{" }),
    );
    assertEqual(result?.servers, undefined, "servers must be dropped");
    assertEqual(
      result?.enabled,
      true,
      "a bad --servers value must not disable routing outright",
    );
  });
});

await test("omits servers for a JSON object, an empty array, or all-invalid entries", async () => {
  await captureWarnings(() => {
    assertEqual(
      buildToolRoutingConfigFromCli(
        flags({
          toolRouting: true,
          toolRoutingServers: JSON.stringify({ id: "analytics" }),
        }),
      )?.servers,
      undefined,
      "a plain object is not a descriptor array",
    );
    assertEqual(
      buildToolRoutingConfigFromCli(
        flags({ toolRouting: true, toolRoutingServers: "[]" }),
      )?.servers,
      undefined,
      "an empty array yields no servers",
    );
  });
});

await test("filters out descriptors missing or mistyping id/description", async () => {
  await captureWarnings(() => {
    const json = JSON.stringify([
      { id: "ok", description: "Has both" },
      { id: "no-desc" },
      { description: "no-id" },
      { id: 42, description: "numeric id" },
    ]);
    eq(
      buildToolRoutingConfigFromCli(
        flags({ toolRouting: true, toolRoutingServers: json }),
      )?.servers,
      [{ id: "ok", description: "Has both" }],
      "only fully-formed string-typed descriptors survive",
    );
  });
});

await test("reads a JSON file from disk when the path exists", () => {
  const tmpFile = path.join(
    os.tmpdir(),
    `nl-test-servers-${process.pid}-${process.hrtime.bigint()}.json`,
  );
  const descriptors = [{ id: "file-server", description: "From a file" }];
  fs.writeFileSync(tmpFile, JSON.stringify(descriptors), "utf8");
  try {
    eq(
      buildToolRoutingConfigFromCli(
        flags({ toolRouting: true, toolRoutingServers: tmpFile }),
      )?.servers,
      descriptors,
      "an existing path must be read as a file",
    );
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

await test("falls back to inline JSON when the value is not a path on disk", () => {
  eq(
    buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingServers: JSON.stringify([{ id: "x", description: "y" }]),
      }),
    )?.servers,
    [{ id: "x", description: "y" }],
    "a non-path value must be tried as inline JSON",
  );
});

await test("fails open when the value is neither a real path nor valid JSON", async () => {
  await captureWarnings(() => {
    const result = buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingServers: "/nonexistent/path/to/servers.json",
      }),
    );
    assertEqual(result?.servers, undefined, "servers must be dropped");
    assertEqual(result?.enabled, true, "routing must stay enabled");
  });
});

await test("assembles a complete config from all flags together", () => {
  eq(
    buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingTimeout: 12000,
        toolRoutingRouterProvider: "vertex",
        toolRoutingRouterModel: "gemini-flash",
        toolRoutingRouterRegion: "us-central1",
        toolRoutingAlwaysInclude: ["utility"],
        toolRoutingServers: JSON.stringify([
          { id: "analytics", description: "Analytics" },
        ]),
      }),
    ),
    {
      enabled: true,
      timeoutMs: 12000,
      routerModel: {
        provider: "vertex",
        model: "gemini-flash",
        region: "us-central1",
      },
      alwaysIncludeServerIds: ["utility"],
      servers: [{ id: "analytics", description: "Analytics" }],
    },
    "every flag must land in its own field with nothing extra",
  );
});

await runSuite();
