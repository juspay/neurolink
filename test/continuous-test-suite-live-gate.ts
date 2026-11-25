#!/usr/bin/env tsx
/**
 * The live gate, shown failing and passing against an endpoint this suite owns.
 *
 * `continuous-test-suite-provider-matrix.ts` is the nightly sweep. Run live, its
 * verdicts depend on what the real vendors answer that night, so nothing about
 * the gate itself (a keyed provider answering 401 must FAIL, not skip) could be
 * shown by running it. Here the vendor is a local HTTP server that answers 200,
 * 401, 402, 429 or 503 on demand, the matrix suite is started as a child process
 * exactly as the workflow starts it, and the assertions read its exit code and
 * its output. Only the built package is involved (`dist/`, through the matrix
 * suite and the shared provider table); nothing is imported from `src/lib`.
 *
 * Determinism is what the owned server buys: a live call cannot be made to
 * return a 401 for a key that works, a 429 on cue, or the same 200 eight times.
 * No credential is used: the "key" is a fixture string, and the suite's own
 * environment is scrubbed by credentialFreeEnv before any child starts.
 *
 * What it proves, each as a separate case:
 *   - a provider that has its secret and answers 401, 402 or 429 FAILS every
 *     cell, and the failure line carries the HTTP status and the vendor code
 *   - the same 401 for a provider on the allowlist is excused and printed
 *   - the same 401 once that allowlist entry has expired FAILS again
 *   - a provider with no secret is skipped in one quiet line, with no SDK call
 *     and no ERROR log
 *   - a retired provider is not called even with its secret and a server that
 *     would answer 401, and is counted in its own row; before its retired day
 *     it is run as usual
 *   - a transient 503 stays a skip, and does not count as passed
 *   - 200 passes, and the coverage table counts it
 *   - the coverage floor fails a run with too few passing providers, passes one
 *     with enough, and is not enforced when the workflow does not ask
 *
 * "Today" is pinned with NEUROLINK_LIVE_GATE_TODAY so the allowlist cases mean
 * the same thing after the real entries expire.
 *
 * Run: pnpm run test:live-gate
 */
import "./helpers/credentialFreeEnv.js";
import { createServer, type IncomingMessage } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  defineSuite,
  runCommand,
  scaleTimeoutMs,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { CATALOG_BASE_URL_ROWS, PROVIDERS } from "./helpers/providerMatrix.js";
import {
  ENFORCE_FLOOR_ENV,
  MIN_PASSED_PROVIDERS,
  TODAY_ENV,
} from "./helpers/liveGate.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Live gate controls", {
  offline: true,
  perTestTimeoutMs: 600_000,
});

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSX_CLI = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const MATRIX_SUITES = {
  sdk: join(REPO_ROOT, "test", "continuous-test-suite-provider-matrix.ts"),
  cli: join(REPO_ROOT, "test", "continuous-test-suite-provider-matrix-cli.ts"),
} as const;
const FIXTURE_KEY = "live-gate-owned-fixture-key";
// Allowlist entries expire 2026-11-01; these two days sit either side of it.
const BEFORE_EXPIRY = "2026-10-20";
const AFTER_EXPIRY = "2026-11-02";
// The day the five dead accounts were retired; both days above come before it.
const RETIRED_DAY = "2026-11-25";

type Mode = "ok" | "401" | "402" | "429" | "503";
const MODES: ReadonlySet<string> = new Set(["ok", "401", "402", "429", "503"]);

const chatHits = new Map<string, number>();
const totalHits = (): number =>
  [...chatHits.values()].reduce((sum, count) => sum + count, 0);

const bodyOf = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString();
};

const ERRORS: Record<Exclude<Mode, "ok">, { status: number; body: unknown }> = {
  // The masked key is the shape a vendor echoes back; the gate must not print it.
  "401": {
    status: 401,
    body: {
      error: {
        message: "Incorrect API key provided: owned*****fake.",
        code: "invalid_api_key",
        type: "invalid_request_error",
      },
    },
  },
  "402": {
    status: 402,
    body: { error: { message: "Payment required", code: "payment_required" } },
  },
  "429": {
    status: 429,
    body: {
      error: { message: "Rate limit reached", code: "rate_limit_exceeded" },
    },
  },
  "503": {
    status: 503,
    body: { error: { message: "Service Unavailable" } },
  },
};

const answerFor = (request: string): string => {
  if (/response_format|json_schema|"schema"/i.test(request)) {
    return '{"greeting":"hi","count":42}';
  }
  if (/image_url|"image"/i.test(request)) {
    return "blue";
  }
  return "HELLO";
};

const server = createServer(async (req, res) => {
  const url = req.url ?? "";
  if (req.method === "HEAD" && url === "/health") {
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "GET" && url === "/api/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        version: "live-gate-owned-empty-registry-v1",
        lastUpdated: "2026-10-18T00:00:00.000Z",
        models: {},
        defaults: {},
        aliases: {},
      }),
    );
    return;
  }
  const mode = url.split("/")[1] ?? "";
  const request = await bodyOf(req);
  if (!MODES.has(mode) || !url.endsWith("/chat/completions")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "owned route not found" } }));
    return;
  }
  chatHits.set(mode, (chatHits.get(mode) ?? 0) + 1);
  if (mode !== "ok") {
    const failure = ERRORS[mode as Exclude<Mode, "ok">];
    res.writeHead(failure.status, {
      "Content-Type": "application/json",
      "Retry-After": "0",
    });
    res.end(JSON.stringify(failure.body));
    return;
  }
  const answer = answerFor(request);
  const streaming = /"stream"\s*:\s*true/.test(request);
  if (streaming) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: answer.slice(0, 2) }, null],
      [{ content: answer.slice(2) }, null],
      [{ content: " one two three" }, null],
      [{ content: " four five six" }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({
          id: "live-gate-owned-stream",
          object: "chat.completion.chunk",
          created: 0,
          model: "owned",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      id: "live-gate-owned-generate",
      object: "chat.completion",
      created: 0,
      model: "owned",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: answer },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  );
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
if (address === null || typeof address !== "object") {
  throw new Error("the owned listener has no address");
}
const ORIGIN = `http://127.0.0.1:${address.port}`;

const rowFor = (id: string): (typeof CATALOG_BASE_URL_ROWS)[number] => {
  const row = CATALOG_BASE_URL_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) {
    throw new Error("a provider this control needs is not a redirectable row");
  }
  return row;
};

type MatrixRun = { exitCode: number; out: string };

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** Starts the matrix suite as the workflow does, with the named providers keyed and pointed at the owned server. */
const runMatrix = async (options: {
  keyed: readonly { id: string; mode: Mode }[];
  forced?: readonly string[];
  today: string;
  enforceFloor?: boolean;
  suite?: keyof typeof MATRIX_SUITES;
}): Promise<MatrixRun> => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: tempDir("live-gate-home-"),
    DOTENV_CONFIG_PATH: "/dev/null",
    NEUROLINK_SKIP_MCP: "true",
    NO_PROXY: "127.0.0.1,localhost",
    no_proxy: "127.0.0.1,localhost",
    MODEL_CONFIG_URL: `${ORIGIN}/api/v1/models`,
    [TODAY_ENV]: options.today,
    ...(options.enforceFloor ? { [ENFORCE_FLOOR_ENV]: "1" } : {}),
  };
  for (const { id, mode } of options.keyed) {
    const row = rowFor(id);
    env[row.apiKeyEnvVar] = FIXTURE_KEY;
    env[row.baseURLEnvVar] = `${ORIGIN}/${mode}`;
  }
  const providers = options.forced ?? options.keyed.map(({ id }) => id);
  const result = await runCommand(
    process.execPath,
    [
      TSX_CLI,
      MATRIX_SUITES[options.suite ?? "sdk"],
      `--provider=${providers.join(",")}`,
    ],
    { cwd: REPO_ROOT, env, timeoutMs: scaleTimeoutMs(540_000) },
  );
  return {
    exitCode: result.exitCode,
    out: `${result.stdout}\n${result.stderr}`.replace(ANSI, ""),
  };
};

/** Asserts about a run, and shows the tail of its output first when the assertion fails. */
const expectThat = (run: MatrixRun, ok: boolean, message: string): void => {
  if (!ok) {
    for (const line of run.out.trim().split("\n").slice(-40)) {
      console.error(`    | ${line}`);
    }
  }
  assert(ok, message);
};

const lineMatching = (out: string, pattern: RegExp): string | undefined =>
  out.split("\n").find((line) => pattern.test(line));

const hasLine = (out: string, pattern: RegExp): boolean =>
  lineMatching(out, pattern) !== undefined;

// A provider no other case in this suite configures, so each case is the only
// thing that decides its verdict. It has no live-matrix evidence, which the
// "no secret" case relies on.
const SUBJECT = "baseten";

await runSuite(async () => {
  assert(
    SUBJECT in PROVIDERS,
    "the subject provider is not in the provider table",
  );

  for (const [mode, label] of [
    ["401", "a credential error (401)"],
    ["402", "an account error (402)"],
    ["429", "a rate limit (429)"],
  ] as const) {
    await test(`a keyed provider answering ${mode} fails its cells, and the failure keeps the status`, async () => {
      const run = await runMatrix({
        keyed: [{ id: SUBJECT, mode }],
        today: BEFORE_EXPIRY,
      });
      expectThat(run, run.exitCode === 1, `${label} did not fail the run`);
      expectThat(
        run,
        hasLine(run.out, /✗ \[baseten\] generate basic text/),
        `${label} did not fail the generate cell`,
      );
      expectThat(
        run,
        !hasLine(run.out, /⊘ \[baseten\] generate basic text/),
        `${label} was reported as a skip`,
      );
      const failure = lineMatching(
        run.out,
        new RegExp(`\\[live-gate\\] baseten .*HTTP ${mode}`),
      );
      expectThat(
        run,
        failure !== undefined,
        `${label} failure line lost the HTTP status`,
      );
      // The gate's own lines (the failure, the allowlist note, the table) must
      // not echo the key the vendor masked into its error. The SDK's logger
      // prints that error itself, upstream of the gate, and is not asserted on.
      const gateLines = run.out
        .split("\n")
        .filter((line) =>
          /live-gate|ALLOWLISTED|providers with a secret/.test(line),
        );
      expectThat(
        run,
        gateLines.length > 0 &&
          gateLines.every((line) => !/owned\*+fake/.test(line)),
        "a masked key reached a line the gate printed",
      );
      expectThat(
        run,
        !run.out.includes(FIXTURE_KEY),
        "the key itself reached the output",
      );
      expectThat(
        run,
        hasLine(run.out, /failed\s+1\s+baseten/),
        `${label} was not counted as a failed provider`,
      );
    });
  }

  await test("the CLI mirror fails a keyed provider answering 401 as well", async () => {
    const run = await runMatrix({
      keyed: [{ id: SUBJECT, mode: "401" }],
      today: BEFORE_EXPIRY,
      suite: "cli",
    });
    expectThat(run, run.exitCode === 1, "the CLI matrix skipped a keyed 401");
    expectThat(
      run,
      hasLine(run.out, /✗ \[baseten\] CLI generate/) &&
        !hasLine(run.out, /⊘ \[baseten\] CLI generate/),
      "the CLI generate cell was not a failure",
    );
    expectThat(
      run,
      hasLine(run.out, /\[live-gate\] baseten credential/),
      "the CLI failure line lost its reading",
    );
    expectThat(
      run,
      hasLine(run.out, /failed\s+1\s+baseten/),
      "the CLI matrix did not count the failed provider",
    );
  });

  await test("a 401 for a provider on the allowlist is excused, printed, and exits 0", async () => {
    const run = await runMatrix({
      keyed: [{ id: "sambanova", mode: "401" }],
      today: BEFORE_EXPIRY,
    });
    expectThat(run, run.exitCode === 0, "an allowlisted 401 failed the run");
    expectThat(
      run,
      hasLine(run.out, /ALLOWLISTED \[sambanova\] until 2026-11-01/),
      "the excused provider was not printed with its deadline",
    );
    expectThat(
      run,
      hasLine(run.out, /⊘ \[sambanova\] generate basic text .*HTTP 401/),
      "the excused cell lost its status or was not a skip",
    );
    expectThat(
      run,
      hasLine(run.out, /allowlisted \(known broken\)\s+1\s+sambanova/),
      "the excused provider was not counted as allowlisted",
    );
    expectThat(
      run,
      !hasLine(run.out, /✗ /),
      "an allowlisted provider still produced a failed cell",
    );
  });

  await test("the same 401 fails again once the allowlist entry has expired", async () => {
    const run = await runMatrix({
      keyed: [{ id: "sambanova", mode: "401" }],
      today: AFTER_EXPIRY,
    });
    expectThat(
      run,
      run.exitCode === 1,
      "an expired allowlist entry still excused 401",
    );
    expectThat(
      run,
      hasLine(run.out, /✗ \[sambanova\] generate basic text/),
      "the expired entry's cell did not fail",
    );
    expectThat(
      run,
      !hasLine(run.out, /ALLOWLISTED/),
      "an expired entry was still announced as an excuse",
    );
    expectThat(
      run,
      hasLine(run.out, /expired allowlist entries\s+5\s/),
      "the table did not count the five expired entries",
    );
  });

  await test("a provider with no secret is skipped in one quiet line, with no call to the server", async () => {
    const before = totalHits();
    const run = await runMatrix({
      keyed: [],
      forced: [SUBJECT],
      today: BEFORE_EXPIRY,
    });
    const after = totalHits();
    expectThat(
      run,
      run.exitCode === 0,
      "a provider with no secret failed the run",
    );
    expectThat(
      run,
      hasLine(run.out, /⊘ \[baseten\] not run: no secret and no live evidence/),
      "the missing secret was not reported as one skip line",
    );
    expectThat(
      run,
      !run.out.includes("[NEUROLINK:ERROR]"),
      "a provider with no secret logged an ERROR",
    );
    expectThat(
      run,
      after === before,
      "a provider with no secret reached the server",
    );
  });

  for (const suite of ["sdk", "cli"] as const) {
    await test(`a retired provider is not called, even keyed and answering 401 (${suite})`, async () => {
      const before = chatHits.get("401") ?? 0;
      const run = await runMatrix({
        keyed: [{ id: "cerebras", mode: "401" }],
        today: RETIRED_DAY,
        suite,
      });
      const after = chatHits.get("401") ?? 0;
      expectThat(run, run.exitCode === 0, "a retired provider failed the run");
      expectThat(
        run,
        hasLine(
          run.out,
          /⊘ \[cerebras\] not run: retired from the nightly on 2026-11-25/,
        ),
        "the retired provider was not reported as one skip line",
      );
      expectThat(
        run,
        hasLine(run.out, /retired from the nightly \(not run\)\s+1\s+cerebras/),
        "the retired provider was not counted in its own row",
      );
      expectThat(
        run,
        after === before,
        "a retired provider reached the server",
      );
    });
  }

  await test("before its retired day a retired provider is run, and its 401 fails", async () => {
    const run = await runMatrix({
      keyed: [{ id: "cerebras", mode: "401" }],
      today: AFTER_EXPIRY,
    });
    expectThat(
      run,
      run.exitCode === 1,
      "a 401 before the retired day did not fail the run",
    );
    expectThat(
      run,
      hasLine(run.out, /✗ \[cerebras\] generate basic text/),
      "the provider was not run before its retired day",
    );
  });

  await test("a transient 503 stays a skip and does not count as a pass", async () => {
    const run = await runMatrix({
      keyed: [{ id: SUBJECT, mode: "503" }],
      today: BEFORE_EXPIRY,
    });
    expectThat(run, run.exitCode === 0, "a transient 503 failed the run");
    expectThat(
      run,
      hasLine(run.out, /⊘ \[baseten\] generate basic text .*HTTP 503/),
      "the transient skip lost its status",
    );
    expectThat(
      run,
      hasLine(run.out, /passed\s+0\s/) &&
        hasLine(run.out, /skipped \(gap or transient error\)\s+1\s+baseten/),
      "a provider whose cells all skipped was counted as passed",
    );
  });

  await test("a provider that answers 200 passes every cell and is counted as passed", async () => {
    const run = await runMatrix({
      keyed: [{ id: SUBJECT, mode: "ok" }],
      today: BEFORE_EXPIRY,
    });
    expectThat(run, run.exitCode === 0, "a healthy provider failed the run");
    expectThat(
      run,
      hasLine(run.out, /✓ \[baseten\] generate basic text/) &&
        hasLine(run.out, /✓ \[baseten\] stream tokens/),
      "a healthy provider's cells did not pass",
    );
    expectThat(
      run,
      hasLine(run.out, /passed\s+1\s+baseten/),
      "a healthy provider was not counted as passed",
    );
    expectThat(
      run,
      hasLine(
        run.out,
        /floor \(not enforced; set LIVE_MATRIX_ENFORCE_FLOOR=1\)/,
      ),
      "the floor was enforced without being asked",
    );
  });

  await test("the floor fails a run with too few passing providers when it is enforced", async () => {
    const run = await runMatrix({
      keyed: [{ id: SUBJECT, mode: "ok" }],
      today: BEFORE_EXPIRY,
      enforceFloor: true,
    });
    expectThat(
      run,
      run.exitCode === 1,
      "an enforced floor did not fail a 1-provider run",
    );
    expectThat(
      run,
      hasLine(run.out, /✗ live gate: enough providers passed/),
      "the floor failure was not reported as a failed test",
    );
  });

  await test(`the floor holds for ${MIN_PASSED_PROVIDERS} passing providers`, async () => {
    const ids = Object.values(PROVIDERS)
      .filter(
        (entry) =>
          entry.text &&
          entry.streaming &&
          !entry.embeddings &&
          CATALOG_BASE_URL_ROWS.some((row) => row.id === entry.name),
      )
      .map((entry) => entry.name)
      .sort()
      .slice(0, MIN_PASSED_PROVIDERS);
    assert(
      ids.length === MIN_PASSED_PROVIDERS,
      "too few redirectable providers to reach the floor",
    );
    const run = await runMatrix({
      keyed: ids.map((id) => ({ id, mode: "ok" as const })),
      today: BEFORE_EXPIRY,
      enforceFloor: true,
    });
    expectThat(run, run.exitCode === 0, "a run at the floor failed");
    expectThat(
      run,
      hasLine(
        run.out,
        new RegExp(`floor \\(enforced\\)\\s+${MIN_PASSED_PROVIDERS} passed`),
      ),
      "the table did not show the floor met",
    );
  });
});
