#!/usr/bin/env tsx
/**
 * Continuous Test Suite: a Codex policy refusal is not an authentication failure.
 *
 * A pre-stream 401/403 from the Codex backend can mean two different things:
 * the account's credential was rejected, or the REQUEST was refused (a
 * `cyber_policy` / `content_policy_violation` code in the body). Refreshing the
 * token cannot help the second kind, and trying it rotates the account's
 * refresh token, parks the account in a 60 s `auth` cooldown, and repeats on
 * every other healthy account. This suite proves the pool engine reads the body
 * first: a request-level refusal ends the request on the first account (no
 * refresh, no cooldown, no rotation) while a genuine credential failure keeps
 * its refresh-retry-cooldown-rotate behaviour exactly.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the built
 * CLI, `node dist/cli/index.js proxy start --dev`, in a temp HOME. The two
 * ChatGPT accounts are imported through the CLI itself (`auth login codex`, from
 * a throwaway `~/.codex/auth.json`), and the client is a plain HTTP POST to
 * `/backend-api/codex/responses`. Nothing leaves the machine: the proxy is
 * started with `HTTPS_PROXY` pointing at a loopback CONNECT proxy that tunnels
 * to a local TLS origin standing in for BOTH `chatgpt.com` (the Responses
 * endpoint) and `auth.openai.com` (the token endpoint). The origin's
 * throwaway certificate, generated with `openssl`, is trusted only by that child
 * through `NODE_EXTRA_CA_CERTS`, and every token is fake.
 *
 * What the origin records is the evidence: how many requests reached the
 * Responses endpoint and with which account, how many times the token endpoint
 * was called, and (read from the temp HOME afterwards) which accounts the proxy
 * parked in `account-cooldowns.json`.
 *
 * Every case starts a fresh proxy with a fresh working directory (a dev proxy
 * keeps its cooldown file under `<cwd>/.neurolink-dev`) and the token store as
 * the import left it. The cooldown cache lives in the proxy's memory, so
 * sharing one across cases would let the first case's cooldown decide the next
 * case's account order.
 *
 * Two preconditions are asserted in every case, so a zero is never read as a
 * result without proof the thing under test ran: the first Responses request
 * must arrive from the first imported account through the tunnel to
 * `chatgpt.com:443`, and the client must have received an answer.
 *
 * Point the suite at another build with NEUROLINK_PROXY_CODEX_POLICY_CLI to
 * prove the policy cases fail against one without the fix.
 *
 * Assertion messages deliberately never quote a payload: `defineSuite` can read
 * a provider-looking string in a message as a skip (see CLAUDE.md).
 *
 * Run: pnpm exec tsx test/continuous-test-suite-proxy-codex-policy-refusal.ts
 * Requires: built CLI (pnpm run build), openssl
 */
import {
  execFile,
  execFileSync,
  spawn,
  type ChildProcess,
} from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { createServer as createTcpServer } from "node:net";
import {
  createServer as createHttpsServer,
  type Server as HttpsServer,
} from "node:https";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

const CLI_OVERRIDE = process.env.NEUROLINK_PROXY_CODEX_POLICY_CLI;
if (!CLI_OVERRIDE) {
  assertDistFresh({ entrypoints: ["dist/cli/index.js"] });
}
const CLI = CLI_OVERRIDE ?? resolve("dist/cli/index.js");

const execFileAsync = promisify(execFile);
const { test, runSuite } = defineSuite("Proxy: Codex policy refusal", {
  offline: true,
  perTestTimeoutMs: 120_000,
});

// ---------------------------------------------------------------- scratch dir
const ROOT = mkdtempSync(join(tmpdir(), "neurolink-proxy-codex-policy-"));
const HOME = join(ROOT, "home");
const TOKEN_FILE = join(HOME, ".neurolink", "tokens.json");
mkdirSync(join(ROOT, "tmp"), { recursive: true });
mkdirSync(HOME, { recursive: true });

// ------------------------------------------------------------------- accounts
type Account = { label: string; accountId: string };
const ALPHA: Account = { label: "alpha", accountId: "acct-alpha-0001" };
const BETA: Account = { label: "beta", accountId: "acct-beta-0002" };
const ACCOUNTS = [ALPHA, BETA] as const;

const base64Url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/** An unsigned JWT carrying the claims the proxy reads: account id and expiry. */
function accessToken(account: Account, nonce: string): string {
  return [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      jti: nonce,
      "https://api.openai.com/auth": {
        chatgpt_account_id: account.accountId,
        chatgpt_plan_type: "plus",
      },
    }),
    "fake-signature",
  ].join(".");
}

const refreshTokenOf = (account: Account, generation: number): string =>
  `rt-${account.label}-${generation}`;

// --------------------------------------------------------------- fake origin
type Seen = {
  host: string;
  method: string;
  path: string;
  accountId: string | undefined;
  bearer: string | undefined;
  refreshToken: string | undefined;
};
type Call = { accountId: string; bearer: string; fresh: boolean };
type Reply = { status: number; contentType: string; body: string };
type Responder = (call: Call) => Reply;

let seen: Seen[] = [];
let responder: Responder = () => ({
  status: 500,
  contentType: "text/plain",
  body: "no responder",
});
/** Bearers the token endpoint minted, so a retry can be told from a first try. */
const mintedBearers = new Set<string>();
let tokenGeneration = 0;
const connects: string[] = [];

const sse = (event: string, payload: Record<string, unknown>): string =>
  `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;

const COMPLETED = sse("response.completed", {
  response: {
    status: "completed",
    model: "gpt-5.5",
    output: [
      { type: "message", content: [{ type: "output_text", text: "ok" }] },
    ],
    usage: { input_tokens: 5, output_tokens: 2 },
  },
});

const completed = (): Reply => ({
  status: 200,
  contentType: "text/event-stream",
  body: COMPLETED,
});

const refusal = (status: number, code: string): Reply => ({
  status,
  contentType: "application/json",
  body: JSON.stringify({
    error: {
      message: "This request was refused by the provider's policy.",
      type: "invalid_request_error",
      code,
    },
  }),
});

const accountOf = (accountId: string | undefined): Account | undefined =>
  ACCOUNTS.find((account) => account.accountId === accountId);

function handleOrigin(
  host: string,
  method: string,
  path: string,
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  respond: (reply: Reply) => void,
): void {
  const one = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;
  const authorization = one(headers.authorization);
  const bearer = authorization?.replace(/^Bearer\s+/i, "");
  const accountId = one(headers["chatgpt-account-id"]);
  const form = new URLSearchParams(rawBody);
  seen.push({
    host,
    method,
    path,
    accountId,
    bearer,
    refreshToken:
      host === "auth.openai.com"
        ? (form.get("refresh_token") ?? "")
        : undefined,
  });

  if (
    host === "auth.openai.com" &&
    method === "POST" &&
    path === "/oauth/token"
  ) {
    const presented = form.get("refresh_token") ?? "";
    const owner = ACCOUNTS.find((account) =>
      presented.startsWith(`rt-${account.label}-`),
    );
    if (!owner) {
      respond({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant" }),
      });
      return;
    }
    tokenGeneration += 1;
    const minted = accessToken(owner, `minted-${tokenGeneration}`);
    mintedBearers.add(minted);
    respond({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: minted,
        refresh_token: refreshTokenOf(owner, tokenGeneration),
        token_type: "Bearer",
      }),
    });
    return;
  }

  if (
    host === "chatgpt.com" &&
    method === "POST" &&
    path === "/backend-api/codex/responses" &&
    accountId !== undefined &&
    bearer !== undefined
  ) {
    respond(responder({ accountId, bearer, fresh: mintedBearers.has(bearer) }));
    return;
  }

  respond({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({ error: { message: "origin: not found" } }),
  });
}

let origin: HttpsServer | undefined;
let tunnel: HttpServer | undefined;

const listen = (server: HttpServer): Promise<number> =>
  new Promise((resolvePort) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolvePort(typeof address === "object" && address ? address.port : 0);
    });
  });

async function freePort(): Promise<number> {
  const probe = createTcpServer();
  const port = await new Promise<number>((resolvePort) => {
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      resolvePort(typeof address === "object" && address ? address.port : 0);
    });
  });
  await new Promise<void>((done) => probe.close(() => done()));
  return port;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

/** Build the TLS origin and the CONNECT proxy in front of it. */
async function startOrigin(): Promise<{ proxyUrl: string; certFile: string }> {
  const dir = join(ROOT, "tls");
  mkdirSync(dir, { recursive: true });
  const key = join(dir, "origin.key");
  const certFile = join(dir, "origin.crt");
  const config = join(dir, "origin.cnf");
  writeFileSync(
    config,
    [
      "[req]",
      "distinguished_name = dn",
      "x509_extensions = v3",
      "prompt = no",
      "[dn]",
      "CN = chatgpt.com",
      "[v3]",
      "subjectAltName = DNS:chatgpt.com, DNS:auth.openai.com",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-config",
        config,
        "-keyout",
        key,
        "-out",
        certFile,
      ],
      { stdio: "ignore" },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "openssl is not installed, so the TLS origin cannot be built",
        { cause: error },
      );
    }
    throw error;
  }
  origin = createHttpsServer(
    { key: readFileSync(key), cert: readFileSync(certFile) },
    (req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const host = (req.headers.host ?? "").replace(/:\d+$/, "");
        handleOrigin(
          host,
          req.method ?? "",
          (req.url ?? "").split("?")[0],
          req.headers,
          Buffer.concat(chunks).toString("utf8"),
          (reply) => {
            res.writeHead(reply.status, { "content-type": reply.contentType });
            res.end(reply.body);
          },
        );
      });
    },
  );
  tunnel = createHttpServer();
  tunnel.on("connect", (req, socket, head) => {
    connects.push(req.url ?? "");
    socket.on("error", () => undefined);
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      socket.unshift(head);
    }
    origin?.emit("connection", socket);
  });
  const port = await listen(tunnel);
  return { proxyUrl: `http://127.0.0.1:${port}`, certFile };
}

// ------------------------------------------------------------------ proxy child
function childEnv(
  home: string,
  extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  // Built from nothing rather than from process.env, so no ambient credential
  // or proxy setting can reach the child.
  return {
    PATH: process.env.PATH,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    TMPDIR: join(ROOT, "tmp"),
    OTEL_SDK_DISABLED: "true",
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
    NO_PROXY: "127.0.0.1,localhost",
    ...extra,
  };
}

async function cli(
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd: string,
): Promise<string> {
  const { stdout } = await execFileAsync(process.execPath, [CLI, ...args], {
    cwd,
    env,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/** Import both accounts through the shipped login command, alpha first. */
async function importAccounts(
  home: string,
  env: NodeJS.ProcessEnv,
  cwd: string,
): Promise<void> {
  mkdirSync(join(home, ".codex"), { recursive: true });
  for (const account of ACCOUNTS) {
    writeFileSync(
      join(home, ".codex", "auth.json"),
      JSON.stringify({
        auth_mode: "chatgpt",
        tokens: {
          access_token: accessToken(account, `seed-${account.label}`),
          refresh_token: refreshTokenOf(account, 0),
          account_id: account.accountId,
        },
      }),
      { mode: 0o600 },
    );
    await cli(["auth", "login", "codex", "--label", account.label], env, cwd);
  }
}

async function launchProxy(
  env: NodeJS.ProcessEnv,
  cwd: string,
  port: number,
  log: string[],
): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    [
      CLI,
      "proxy",
      "start",
      "--dev",
      "--quiet",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout?.on("data", (chunk: Buffer) => log.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => log.push(chunk.toString()));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`proxy exited early with code ${child.exitCode}`);
    }
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) {
        return child;
      }
    } catch {
      /* not listening yet */
    }
    await sleep(300);
  }
  child.kill("SIGKILL");
  throw new Error("the proxy never became healthy");
}

async function stopChild(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  for (let i = 0; i < 40 && child.exitCode === null; i++) {
    await sleep(250);
  }
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

let activeProxy: ChildProcess | undefined;

// The runner calls process.exit, so a child must not outlive it.
process.on("exit", () => {
  activeProxy?.kill("SIGKILL");
  rmSync(ROOT, { recursive: true, force: true });
});

// ------------------------------------------------------------------ scenarios
type Cooldown = { coolingUntil: number; updatedAt: number; reason: string };
type Outcome = {
  status: number;
  text: string;
  responses: Seen[];
  refreshes: Seen[];
  cooldowns: Record<string, Cooldown>;
};

let tunnelInfo: { proxyUrl: string; certFile: string } | undefined;
let homeCounter = 0;
let seededTokens: Buffer | undefined;

/** `proxy start --dev` keeps its writable state under `<cwd>/.neurolink-dev`. */
function readCooldowns(cwd: string): Record<string, Cooldown> {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(
        join(cwd, ".neurolink-dev", "account-cooldowns.json"),
        "utf8",
      ),
    );
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, Cooldown>)
      : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

/** One client request against a fresh proxy holding both accounts. */
async function runScenario(next: Responder): Promise<Outcome> {
  const egress = tunnelInfo;
  if (egress === undefined) {
    throw new Error("the TLS origin was not started");
  }
  seen = [];
  connects.length = 0;
  mintedBearers.clear();
  tokenGeneration = 0;
  responder = next;

  homeCounter += 1;
  const cwd = join(ROOT, `cwd-${homeCounter}`);
  mkdirSync(cwd, { recursive: true });
  const env = childEnv(HOME, {
    HTTPS_PROXY: egress.proxyUrl,
    NODE_EXTRA_CA_CERTS: egress.certFile,
  });
  if (seededTokens === undefined) {
    await importAccounts(HOME, env, cwd);
    // Importing must not have touched the network: any traffic from here on is
    // the proxy's own.
    assertEqual(seen.length, 0, "account import must not reach the network");
    seededTokens = readFileSync(TOKEN_FILE);
  }
  // A refresh rewrites the rotating refresh token in the store, so every case
  // starts from the bytes the import produced. The store's obfuscation key is
  // derived from the home directory, which is why the home is shared and the
  // file is put back rather than the home being copied.
  writeFileSync(TOKEN_FILE, seededTokens, { mode: 0o600 });

  const port = await freePort();
  const log: string[] = [];
  activeProxy = await launchProxy(env, cwd, port, log);
  try {
    seen = [];
    const reply = await fetch(
      `http://127.0.0.1:${port}/backend-api/codex/responses`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "gpt-5.5",
          instructions: "test",
          stream: true,
          store: false,
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: "hello" }],
            },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    const text = await reply.text();
    // The cooldown is written before the failing attempt returns, so it is on
    // disk by now; the pause covers the atomic rename on a slow runner.
    await sleep(400);
    if (process.env.NEUROLINK_TEST_VERBOSE === "1") {
      console.log(log.join(""));
    }
    return {
      status: reply.status,
      text,
      responses: seen.filter(
        (entry) =>
          entry.host === "chatgpt.com" &&
          entry.method === "POST" &&
          entry.path === "/backend-api/codex/responses",
      ),
      refreshes: seen.filter(
        (entry) =>
          entry.host === "auth.openai.com" && entry.path === "/oauth/token",
      ),
      cooldowns: readCooldowns(cwd),
    };
  } finally {
    const child = activeProxy;
    activeProxy = undefined;
    await stopChild(child);
  }
}

/** The preconditions every case shares; see the header. */
function assertRan(outcome: Outcome): void {
  assert(
    outcome.responses.length >= 1,
    "no request reached the Responses endpoint",
  );
  assertEqual(
    outcome.responses[0]?.accountId,
    ALPHA.accountId,
    "the first request must come from the first imported account",
  );
  assert(
    connects.some((target) => target === "chatgpt.com:443"),
    "the request must travel through the tunnel to chatgpt.com",
  );
}

/**
 * Check every expectation before failing, so one run names all the ways a case
 * went wrong instead of stopping at the first. Messages describe the
 * discrepancy and never quote a payload.
 */
function expectAll(checks: ReadonlyArray<readonly [boolean, string]>): void {
  const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);
  assert(failed.length === 0, failed.join("; "));
}

const accountIdsTried = (outcome: Outcome): string[] =>
  outcome.responses.map((entry) => entry.accountId ?? "");

function errorBody(text: string): { code?: unknown; retryable?: unknown } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "error" in parsed) {
      const error = (parsed as { error: unknown }).error;
      if (error && typeof error === "object") {
        return error as { code?: unknown; retryable?: unknown };
      }
    }
  } catch {
    /* not JSON */
  }
  return {};
}

const parkedKeys = (outcome: Outcome): string[] =>
  Object.keys(outcome.cooldowns).filter((key) => key.startsWith("codex:"));

// ----------------------------------------------------------------------- cases
await runSuite(async () => {
  try {
    tunnelInfo = await startOrigin();

    // ---------------------------------------------------- request-level refusal
    // The account is healthy and the refresh cannot help. The request must end
    // on the first account: no refresh, no cooldown, no rotation to the second.
    // [upstream status, code, status the client must see]: a policy code is a
    // 403 whatever the upstream said; an invalid-request code keeps it.
    const refusals: ReadonlyArray<readonly [number, string, number]> = [
      [403, "cyber_policy", 403],
      [403, "content_policy_violation", 403],
      [401, "cyber_policy", 403],
      [401, "invalid_request_error", 401],
      [403, "context_length_exceeded", 403],
    ];
    for (const [upstreamStatus, code, clientStatus] of refusals) {
      await test(`an upstream ${upstreamStatus} ${code} ends the request without a refresh, a cooldown or a rotation`, async () => {
        const outcome = await runScenario(() => refusal(upstreamStatus, code));
        assertRan(outcome);
        const error = errorBody(outcome.text);
        expectAll([
          [
            outcome.status === clientStatus,
            "the client must see the refusal with its classified status",
          ],
          [error.code === code, "the client must see the refusal's code"],
          [error.retryable === false, "the refusal must be marked final"],
          [
            outcome.refreshes.length === 0,
            "the token endpoint must not be called for a request refusal",
          ],
          [
            outcome.responses.length === 1,
            "the refused request must be sent exactly once",
          ],
          [
            accountIdsTried(outcome).join(",") === ALPHA.accountId,
            "the second account must never be tried",
          ],
          [
            parkedKeys(outcome).length === 0,
            "no account may be parked in a cooldown",
          ],
        ]);
      });
    }

    // ------------------------------------------------ genuine credential failure
    // Pins the behaviour that must not change: refresh once, retry, park the
    // account on the second failure, rotate to the next one.
    await test("a genuine 401 refreshes the token once and the retry on the same account succeeds", async () => {
      const outcome = await runScenario((call) =>
        call.fresh
          ? completed()
          : {
              status: 401,
              contentType: "application/json",
              body: JSON.stringify({
                error: { message: "Token expired.", code: "token_expired" },
              }),
            },
      );
      assertRan(outcome);
      assertEqual(outcome.status, 200, "the retried request must succeed");
      assert(
        outcome.text.includes("response.completed"),
        "the client must receive the completed stream",
      );
      assertEqual(outcome.refreshes.length, 1, "exactly one refresh");
      assertEqual(
        outcome.refreshes[0]?.refreshToken,
        refreshTokenOf(ALPHA, 0),
        "the refresh must present the failing account's refresh token",
      );
      assertEqual(
        accountIdsTried(outcome).join(","),
        `${ALPHA.accountId},${ALPHA.accountId}`,
        "the retry must stay on the same account",
      );
      assert(
        outcome.responses[0]?.bearer !== outcome.responses[1]?.bearer,
        "the retry must carry the refreshed token",
      );
      assertEqual(
        mintedBearers.has(outcome.responses[1]?.bearer ?? ""),
        true,
        "the retry's token must be the one the token endpoint minted",
      );
      assertEqual(
        parkedKeys(outcome).length,
        0,
        "no cooldown after a recovery",
      );
    });

    // A stale token and a refused request can arrive together: the first
    // rejection is a real credential failure and earns its one refresh, but the
    // retry is then judged on its own body. A refusal there still ends the
    // request, and the account that was just healed is not parked for it.
    await test("a policy refusal on the retry after a refresh ends the request without a cooldown or a rotation", async () => {
      const outcome = await runScenario((call) =>
        call.fresh
          ? refusal(403, "cyber_policy")
          : {
              status: 401,
              contentType: "application/json",
              body: JSON.stringify({
                error: { message: "Token expired.", code: "token_expired" },
              }),
            },
      );
      assertRan(outcome);
      const error = errorBody(outcome.text);
      expectAll([
        [outcome.status === 403, "the client must see the refusal as a 403"],
        [
          error.code === "cyber_policy",
          "the client must see the refusal's code",
        ],
        [error.retryable === false, "the refusal must be marked final"],
        [
          outcome.refreshes.length === 1,
          "the credential failure must earn exactly one refresh",
        ],
        [
          accountIdsTried(outcome).join(",") ===
            `${ALPHA.accountId},${ALPHA.accountId}`,
          "the refusal must end the request on the refreshed account",
        ],
        [
          parkedKeys(outcome).length === 0,
          "no account may be parked in a cooldown",
        ],
      ]);
    });

    const stubborn: ReadonlyArray<readonly [number, string | undefined]> = [
      [401, "token_expired"],
      [403, undefined],
    ];
    for (const [upstreamStatus, code] of stubborn) {
      await test(`a persistent ${upstreamStatus}${code ? ` ${code}` : " with no code"} refreshes once, parks the account for 60 s and rotates`, async () => {
        const outcome = await runScenario((call) =>
          call.accountId === BETA.accountId
            ? completed()
            : code
              ? {
                  status: upstreamStatus,
                  contentType: "application/json",
                  body: JSON.stringify({
                    error: { message: "Rejected.", code },
                  }),
                }
              : {
                  status: upstreamStatus,
                  contentType: "text/plain",
                  body: "Forbidden",
                },
        );
        assertRan(outcome);
        assertEqual(outcome.status, 200, "the second account must serve it");
        assertEqual(outcome.refreshes.length, 1, "exactly one refresh");
        assertEqual(
          outcome.refreshes[0]?.refreshToken,
          refreshTokenOf(ALPHA, 0),
          "only the failing account may be refreshed",
        );
        assertEqual(
          accountIdsTried(outcome).join(","),
          [ALPHA.accountId, ALPHA.accountId, BETA.accountId].join(","),
          "first account, its retry, then the second account",
        );
        assertEqual(
          parkedKeys(outcome).join(","),
          `codex:${ALPHA.label}`,
          "only the failing account may be parked",
        );
        const parked = outcome.cooldowns[`codex:${ALPHA.label}`];
        assertEqual(parked?.reason, "auth", "the cooldown must be an auth one");
        const parkedFor =
          (parked?.coolingUntil ?? 0) - (parked?.updatedAt ?? 0);
        assert(
          parkedFor > 55_000 && parkedFor <= 60_000,
          "the cooldown must last about 60 s",
        );
      });
    }

    // ------------------------------------------------- policy failure mid-stream
    // The 200 `response.failed` path: the status was already committed, so the
    // stream is relayed as is. Pinned so the pre-stream change cannot move it.
    await test("a policy failure delivered inside a 200 stream is relayed without a refresh, a cooldown or a rotation", async () => {
      const outcome = await runScenario(() => ({
        status: 200,
        contentType: "text/event-stream",
        body: sse("response.failed", {
          response: {
            status: "failed",
            model: "gpt-5.5",
            error: {
              code: "cyber_policy",
              message: "This request was refused by the provider's policy.",
            },
          },
        }),
      }));
      assertRan(outcome);
      assertEqual(
        outcome.status,
        200,
        "the stream status is already committed",
      );
      assert(
        outcome.text.includes("response.failed") &&
          outcome.text.includes("cyber_policy"),
        "the client must receive the failure event",
      );
      assertEqual(outcome.refreshes.length, 0, "no refresh");
      assertEqual(outcome.responses.length, 1, "no replay");
      assertEqual(parkedKeys(outcome).length, 0, "no cooldown");
    });
  } finally {
    await stopChild(activeProxy);
    tunnel?.close();
    origin?.closeAllConnections();
    origin?.close();
  }
});
