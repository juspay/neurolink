/**
 * Unit tests for buildToolRoutingConfigFromCli
 * (src/cli/utils/toolRoutingFlags.ts).
 *
 * Run:
 *   pnpm exec vitest run test/toolRoutingCli.test.ts
 *
 * All tests are deterministic — no API calls, no filesystem side effects
 * beyond a single temp file created and cleaned up within each relevant test.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildToolRoutingConfigFromCli } from "../src/cli/utils/toolRoutingFlags.js";
import type { CliToolRoutingFlags } from "../src/lib/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal flags bag, with all extra keys forwarded through. */
function flags(
  overrides: CliToolRoutingFlags & Record<string, unknown>,
): CliToolRoutingFlags & Record<string, unknown> {
  return overrides;
}

// ---------------------------------------------------------------------------
// Suppress logger.warn output during error-path tests to keep output clean.
// ---------------------------------------------------------------------------

vi.mock("../src/lib/utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    shouldLog: vi.fn().mockReturnValue(false),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Core enable/disable
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — absent / disabled", () => {
  it("returns undefined when --tool-routing flag is absent", () => {
    expect(buildToolRoutingConfigFromCli(flags({}))).toBeUndefined();
  });

  it("returns undefined when toolRouting is explicitly false", () => {
    expect(
      buildToolRoutingConfigFromCli(flags({ toolRouting: false })),
    ).toBeUndefined();
  });

  it("returns undefined when toolRouting is undefined", () => {
    expect(
      buildToolRoutingConfigFromCli(flags({ toolRouting: undefined })),
    ).toBeUndefined();
  });
});

describe("buildToolRoutingConfigFromCli — enabled baseline", () => {
  it("returns { enabled: true } for bare --tool-routing flag", () => {
    const result = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
    expect(result).toEqual({ enabled: true });
  });
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — timeout", () => {
  it("maps toolRoutingTimeout to timeoutMs", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingTimeout: 8000 }),
    );
    expect(result?.timeoutMs).toBe(8000);
  });

  it("does not set timeoutMs when toolRoutingTimeout is absent", () => {
    const result = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
    expect(result).not.toHaveProperty("timeoutMs");
  });

  it("drops NaN and emits a warning instead of forwarding it", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingTimeout: NaN }),
    );
    expect(result).not.toHaveProperty("timeoutMs");
  });

  it("drops 0 and emits a warning instead of forwarding it", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingTimeout: 0 }),
    );
    expect(result).not.toHaveProperty("timeoutMs");
  });

  it("drops negative values and emits a warning instead of forwarding them", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingTimeout: -500 }),
    );
    expect(result).not.toHaveProperty("timeoutMs");
  });
});

// ---------------------------------------------------------------------------
// Router model: provider / model / region
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — routerModel", () => {
  it("maps toolRoutingRouterProvider to routerModel.provider", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingRouterProvider: "vertex" }),
    );
    expect(result?.routerModel?.provider).toBe("vertex");
  });

  it("maps toolRoutingRouterModel to routerModel.model", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingRouterModel: "gemini-3-flash" }),
    );
    expect(result?.routerModel?.model).toBe("gemini-3-flash");
  });

  it("maps toolRoutingRouterRegion to routerModel.region", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingRouterRegion: "us-central1" }),
    );
    expect(result?.routerModel?.region).toBe("us-central1");
  });

  it("maps all three router fields together", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingRouterProvider: "anthropic",
        toolRoutingRouterModel: "claude-haiku-4-5",
        toolRoutingRouterRegion: "us-east-1",
      }),
    );
    expect(result?.routerModel).toEqual({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      region: "us-east-1",
    });
  });

  it("does not set routerModel when none of the three fields are provided", () => {
    const result = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
    expect(result).not.toHaveProperty("routerModel");
  });
});

// ---------------------------------------------------------------------------
// alwaysInclude → alwaysIncludeServerIds
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — alwaysInclude", () => {
  it("maps toolRoutingAlwaysInclude array to alwaysIncludeServerIds", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingAlwaysInclude: ["utility", "auth"],
      }),
    );
    expect(result?.alwaysIncludeServerIds).toEqual(["utility", "auth"]);
  });

  it("does not set alwaysIncludeServerIds for an empty array", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingAlwaysInclude: [] }),
    );
    expect(result).not.toHaveProperty("alwaysIncludeServerIds");
  });

  it("does not set alwaysIncludeServerIds when field is absent", () => {
    const result = buildToolRoutingConfigFromCli(flags({ toolRouting: true }));
    expect(result).not.toHaveProperty("alwaysIncludeServerIds");
  });
});

// ---------------------------------------------------------------------------
// --tool-routing-servers: inline JSON
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — servers (inline JSON)", () => {
  it("parses a valid inline JSON array of server descriptors", () => {
    const json = JSON.stringify([
      { id: "analytics", description: "Sales analytics" },
      { id: "shipping", description: "Shipment tracking" },
    ]);
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingServers: json }),
    );
    expect(result?.servers).toEqual([
      { id: "analytics", description: "Sales analytics" },
      { id: "shipping", description: "Shipment tracking" },
    ]);
  });

  it("omits servers (fail open) for malformed JSON string", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingServers: "not-valid-json{{" }),
    );
    // parseServersFlag returns undefined on error → servers is undefined (fail open)
    expect(result?.servers).toBeUndefined();
    // config still returns enabled:true (fail open)
    expect(result?.enabled).toBe(true);
  });

  it("omits servers when JSON is a plain object instead of an array", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingServers: JSON.stringify({ id: "analytics" }),
      }),
    );
    expect(result?.servers).toBeUndefined();
  });

  it("omits servers when JSON array is empty", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingServers: "[]" }),
    );
    // valid parse but zero valid entries → returns undefined
    expect(result?.servers).toBeUndefined();
  });

  it("filters out descriptors that are missing required id/description fields", () => {
    const json = JSON.stringify([
      { id: "ok", description: "Has both" },
      { id: "no-desc" }, // missing description
      { description: "no-id" }, // missing id
      { id: 42, description: "numeric id" }, // wrong type
    ]);
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingServers: json }),
    );
    expect(result?.servers).toEqual([{ id: "ok", description: "Has both" }]);
  });
});

// ---------------------------------------------------------------------------
// --tool-routing-servers: file path
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — servers (file path)", () => {
  it("reads a JSON file from disk when the path exists", () => {
    // Write a real temp file so fs.existsSync + fs.readFileSync work.
    const tmpFile = path.join(
      os.tmpdir(),
      `nl-test-servers-${Date.now()}.json`,
    );
    const descriptors = [{ id: "file-server", description: "From a file" }];
    fs.writeFileSync(tmpFile, JSON.stringify(descriptors), "utf8");

    try {
      const result = buildToolRoutingConfigFromCli(
        flags({ toolRouting: true, toolRoutingServers: tmpFile }),
      );
      expect(result?.servers).toEqual(descriptors);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("falls back to inline JSON parse when path does not exist on disk", () => {
    // Non-existent path that is also valid JSON → treated as inline JSON.
    const json = JSON.stringify([{ id: "x", description: "y" }]);
    const result = buildToolRoutingConfigFromCli(
      flags({ toolRouting: true, toolRoutingServers: json }),
    );
    expect(result?.servers).toEqual([{ id: "x", description: "y" }]);
  });

  it("omits servers (fail open) when path does not exist AND value is not valid JSON", () => {
    const result = buildToolRoutingConfigFromCli(
      flags({
        toolRouting: true,
        toolRoutingServers: "/nonexistent/path/to/servers.json",
      }),
    );
    // Not a real file, not parseable JSON → fail open → servers is undefined
    expect(result?.servers).toBeUndefined();
    expect(result?.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Compound: all flags together
// ---------------------------------------------------------------------------

describe("buildToolRoutingConfigFromCli — full flag set", () => {
  it("assembles a complete ToolRoutingConfig from all flags", () => {
    const result = buildToolRoutingConfigFromCli(
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
    );
    expect(result).toEqual({
      enabled: true,
      timeoutMs: 12000,
      routerModel: {
        provider: "vertex",
        model: "gemini-flash",
        region: "us-central1",
      },
      alwaysIncludeServerIds: ["utility"],
      servers: [{ id: "analytics", description: "Analytics" }],
    });
  });
});
