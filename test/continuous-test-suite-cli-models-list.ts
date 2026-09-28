#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — `neurolink models list`'s live-discovery filter
 *
 * `models list --provider <catalog-provider>` falls back to asking the
 * provider's own `GET /models` endpoint when the static registry has no
 * rows for it (every JSON-catalog Tier-2 provider — fireworks, groq, xai,
 * together-ai, ... — has zero rows there; see
 * src/cli/commands/models.ts::executeList). That live endpoint often keeps
 * listing an id long after it stops working (fireworks.json's own
 * `evidence.liveMatrix`: kimi-k2p6 stayed on `GET /models` after its chat
 * endpoint started 404ing), so an unfiltered live listing prints a retired
 * id as a usable "live" result. This suite proves the CLI projects a
 * catalog-backed live listing against the catalog's non-retired ids before
 * printing it, the same way `getAllModels()` already projects the static
 * listing (see test:provider-structure's retired-id test).
 *
 * Offline and end-to-end: the built CLI is spawned against a local,
 * loopback-only stand-in for the vendor's `/models` endpoint (FIREWORKS_
 * BASE_URL overridden to `http://127.0.0.1:<port>`), from an isolated HOME
 * so a developer's real `.env`/`~/.neurolink` never reaches the process —
 * same isolation pattern as continuous-test-suite-cli-json-output.ts. No
 * network call leaves the machine. FIREWORKS_API_KEY is set to a fixed
 * placeholder string, never a real credential, purely to get past provider
 * construction's presence check.
 *
 * Run: npx tsx test/continuous-test-suite-cli-models-list.ts
 *      pnpm run test:cli-models-list
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import {
  assert,
  defineSuite,
  runCommand,
  tempDir,
  type ProcessResult,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh({ entrypoints: ["dist/cli/index.js"] });

const { test, runSuite } = defineSuite("CLI models list — retired-id filter", {
  offline: true,
});

const CLI_PATH = resolve("dist/cli/index.js");

// The real ids this suite pins, verified against the real catalog fixture
// (not invented) in the precondition below.
const RETIRED_MODEL = "accounts/fireworks/models/kimi-k2p6";
const LIVE_MODEL = "accounts/fireworks/models/kimi-k3";

/**
 * A local, loopback-only stand-in for a vendor's OpenAI-compatible
 * `GET /models` endpoint. Answers every request with a fixed id list,
 * regardless of path or method — this suite only needs the CLI's live
 * discovery to reach *a* `/models`-shaped JSON body, not to exercise
 * routing.
 */
function startModelsListServer(
  ids: readonly string[],
): Promise<{ baseURL: string; close(): Promise<void> }> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ data: ids.map((id) => ({ id })) }));
  });
  return new Promise((resolvePromise) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolvePromise({
        baseURL: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

await test("models list --provider fireworks --format json drops a retired id from a live listing", async () => {
  // Precondition: the ids this test pins actually match the real catalog
  // fixture's statuses today, so the assertions below test the CLI's
  // filter, not a stale literal that no longer describes the data.
  const catalogPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "providers",
    "catalog",
    "fireworks.json",
  );
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as {
    models: { catalog: Record<string, { status?: string }> };
  };
  assert(
    catalog.models.catalog[RETIRED_MODEL]?.status === "retired",
    "fixture drift: fireworks.json catalog no longer marks kimi-k2p6 as retired",
  );
  assert(
    catalog.models.catalog[LIVE_MODEL]?.status === "production",
    "fixture drift: fireworks.json catalog no longer marks kimi-k3 as production",
  );

  const server = await startModelsListServer([RETIRED_MODEL, LIVE_MODEL]);
  const home = tempDir("neurolink-cli-models-list-");
  try {
    const result: ProcessResult = await runCommand(
      "node",
      [
        CLI_PATH,
        "models",
        "list",
        "--provider",
        "fireworks",
        "--format",
        "json",
        "--quiet",
      ],
      {
        cwd: home,
        env: {
          ...process.env,
          HOME: home,
          FIREWORKS_API_KEY: "test-placeholder-not-a-real-key",
          FIREWORKS_BASE_URL: server.baseURL,
          // Defensive: an ambient proxy setting must never redirect this
          // loopback-only request off the local stand-in server.
          HTTP_PROXY: "",
          HTTPS_PROXY: "",
          ALL_PROXY: "",
          NO_PROXY: "127.0.0.1,localhost",
        } as NodeJS.ProcessEnv,
        timeoutMs: 30_000,
      },
    );

    // Precondition: the CLI actually reached the live-discovery path and
    // exited cleanly, so a failure below means the filter is wrong — not
    // that the process crashed before ever printing anything.
    assert(
      result.exitCode === 0,
      `CLI exited non-zero (${result.exitCode}) — did not reach the live listing to filter`,
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      parsed = undefined;
    }
    assert(
      Array.isArray(parsed),
      "stdout is not a JSON array — CLI output shape changed or the live path was not taken",
    );
    const ids = (parsed as Array<{ id?: unknown }>).map((row) => row.id);

    assert(
      ids.includes(LIVE_MODEL),
      "live listing must still include the non-retired id the stand-in endpoint reported",
    );
    assert(
      !ids.includes(RETIRED_MODEL),
      "live listing must not include a catalog id whose status is retired",
    );
  } finally {
    await server.close();
  }
});

await runSuite();
