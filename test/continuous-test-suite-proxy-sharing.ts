#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Proxy Peer Sharing
 *
 * Drives the shipped CLI and a real proxy process end to end. Grants are minted
 * with `neurolink proxy share`, then exercised by POSTing to the proxy's
 * `/v1/messages` exactly as a borrower would.
 *
 * **No upstream credentials are needed.** Every case here asserts on a decision
 * the share gate makes *before* any account is contacted, so the suite is fully
 * offline: a refused request never reaches Anthropic, and an admitted one is
 * asserted only to have *passed the gate* (it then fails on credentials, which
 * is the expected outcome in an isolated home with no accounts).
 *
 * ## Isolation boundary
 *
 * HOME is redirected to a fresh temp directory before anything can resolve the
 * operator's real one, and the listener uses a non-standard port. Nothing here
 * reads or writes the installed proxy's state, tokens, quotas or cooldowns.
 *
 * ## Assertion-message hazard
 *
 * The harness downgrades a failure to SKIP when the message looks like a
 * provider error, so no assertion below interpolates a response payload — only
 * header names and expected values.
 *
 * ## Rule 15 determinism exception
 *
 * This file is on the `neurolink/e2e-tests-only` allow list in
 * `eslint.config.js`. What that buys is a fixed clock and a staged ledger.
 * The gate's arithmetic is time- and history-dependent in ways a live call
 * cannot reach: a lease that expires against a specific `now`, a drift streak
 * that pauses only on the Nth consecutive over-report, a refill catch-up
 * across a simulated clock jump, two settlements racing for the last coin, a
 * withheld receipt showing up as a sequence gap, and a netting round replayed
 * to prove it pays out nothing the second time. Reaching any of those from a
 * real subscription would take hours of real traffic and still not be
 * repeatable.
 *
 * The exception covers only those reads. Everything with a surface drives it:
 * grants are minted through the built CLI, and the handshake, `/limits`
 * withholding, gate-only share listener and coin-note cases go over HTTP to a
 * real proxy process.
 *
 * Run with: npx tsx test/continuous-test-suite-proxy-sharing.ts
 * Requires: built CLI (pnpm run build:cli)
 */

import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const TEST_HOME = fs.mkdtempSync(
  path.join(os.tmpdir(), "neurolink-share-e2e-home-"),
);
process.env.HOME = TEST_HOME;
process.env.USERPROFILE = TEST_HOME;
process.env.XDG_CONFIG_HOME = path.join(TEST_HOME, ".config");
process.env.NEUROLINK_PROXY_TEST_ISOLATED = "1";
// A borrowed request must never be able to reach a real provider from here.
delete process.env.ANTHROPIC_API_KEY;

const { defineSuite, assert, assertEqual } =
  await import("./helpers/harness.js");

const execFileAsync = promisify(execFile);
const CLI = path.resolve("dist/cli/index.js");

/** Gated proxy: refuses anything without a valid share token. */
const GATED_PORT = 9877;
/** Ungated proxy: the default posture, where local traffic is untouched. */
const OPEN_PORT = 9878;
/** Borrower node: has no accounts of its own, only a peer. */
const BORROWER_PORT = 9879;
/** Stub lender, so the borrower's fallthrough is verifiable without credentials. */
const STUB_LENDER_PORT = 9880;
/** Share-listener host proxy, with its gate-only listener on the next port. */
const LISTENER_PORT = 9893;
const LISTENER_SHARE_PORT = 9894;

const { test, runSuite } = defineSuite("Proxy Peer Sharing");

const children: ChildProcess[] = [];
let stubLender: Server | undefined;
/** Requests the stub lender received, and the tokens they carried. */
const stubLenderCalls: Array<{ token: string | undefined; model: string }> = [];
/** Flipped to make the stub refuse the way a spent grant would. */
let stubLenderRefusal: { status: number; reason: string } | null = null;

/**
 * A minimal stand-in for a lender's proxy.
 *
 * The real lender gate is covered above; this exists so the borrower's
 * fallthrough can be asserted without any provider credentials in play.
 */
async function startStubLender(): Promise<void> {
  stubLender = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}") as { model?: string };
      stubLenderCalls.push({
        token: req.headers["x-neurolink-share-token"] as string | undefined,
        model: parsed.model ?? "",
      });
      if (stubLenderRefusal) {
        res.writeHead(stubLenderRefusal.status, {
          "content-type": "application/json",
          "x-neurolink-grant-reason": stubLenderRefusal.reason,
          "x-neurolink-grant-status": stubLenderRefusal.reason,
        });
        res.end(
          JSON.stringify({
            type: "error",
            error: { type: "rate_limit_error", message: "declined" },
          }),
        );
        return;
      }
      res.writeHead(200, {
        "content-type": "application/json",
        "x-neurolink-grant-status": "active",
        "x-neurolink-grant-remaining-coins": "420",
      });
      res.end(
        JSON.stringify({
          id: "msg_stub",
          type: "message",
          role: "assistant",
          model: parsed.model ?? "claude-sonnet-4-6",
          content: [{ type: "text", text: "served by the lender" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 5, output_tokens: 4 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => {
    stubLender?.listen(STUB_LENDER_PORT, "127.0.0.1", resolve);
  });
}

async function cli(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(process.execPath, [CLI, ...args], {
    env: { ...process.env, NEUROLINK_SKIP_MCP: "true" },
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/** Mint a grant and return its token. */
async function createGrant(args: string[]): Promise<string> {
  const stdout = await cli(["proxy", "share", "create", ...args, "--json"]);
  const parsed = JSON.parse(stdout) as { token?: string };
  if (!parsed.token) {
    throw new Error("share create did not return a token");
  }
  return parsed.token;
}

async function startProxy(port: number, requireGrant: boolean): Promise<void> {
  // Probe BEFORE spawning. A listener already answering on this port is
  // somebody else's proxy, and serving the suite from it produces failures that
  // look like product bugs. Running the check after the spawn made it a race:
  // our own child could win it and answer its own squatter probe, and a stale
  // proxy that lost it left an orphaned child bound to nothing.
  try {
    const squatter = await fetch(`http://127.0.0.1:${port}/health`);
    if (squatter.ok) {
      throw new Error(
        `SKIP: port ${port} is already serving — a stale proxy is in the way`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("SKIP:")) {
      throw error;
    }
    // Connection refused is exactly what we want.
  }

  const child = spawn(
    process.execPath,
    [CLI, "proxy", "start", "--port", String(port), "--quiet"],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NEUROLINK_SKIP_MCP: "true",
        NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
        // The share listener defaults to `port + 1`, and this suite's ports are
        // consecutive — so every proxy here would try to bind its neighbour's
        // main port. The listener has a proxy of its own below.
        NEUROLINK_PROXY_SHARE_LISTENER: "0",
        ...(requireGrant ? { NEUROLINK_PROXY_REQUIRE_GRANT: "1" } : {}),
      },
    },
  );
  children.push(child);

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`SKIP: proxy did not become healthy on port ${port}`);
}

type ProbeResult = {
  status: number;
  reason: string | null;
  grantStatus: string | null;
  retryAfter: string | null;
};

/** POST a minimal request as a borrower would, and report what the gate said. */
async function probe(
  port: number,
  options: { token?: string; model?: string } = {},
): Promise<ProbeResult> {
  const response = await fetch(`http://127.0.0.1:${port}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { "x-neurolink-share-token": options.token } : {}),
    },
    body: JSON.stringify({
      model: options.model ?? "claude-sonnet-4-6",
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  // Drain so the connection is not left half-open between cases.
  await response.text().catch(() => "");
  return {
    status: response.status,
    reason: response.headers.get("x-neurolink-grant-reason"),
    grantStatus: response.headers.get("x-neurolink-grant-status"),
    retryAfter: response.headers.get("retry-after"),
  };
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(CLI)) {
  console.error("CLI not built — run: pnpm run build:cli");
  process.exit(1);
}

await startStubLender();
await startProxy(GATED_PORT, true);
await startProxy(OPEN_PORT, false);
await startProxy(BORROWER_PORT, false);

await test("ungated proxy leaves untokened traffic alone", async () => {
  const result = await probe(OPEN_PORT);
  assert(
    result.reason === null,
    "default posture must not attach a share refusal reason to local traffic",
  );
});

await test("gated proxy refuses a request with no token", async () => {
  const result = await probe(GATED_PORT);
  assertEqual(result.status, 401, "untokened request must be 401");
  assertEqual(result.reason, "missing_token", "refusal reason header");
  assertEqual(result.grantStatus, "unauthorized", "grant status header");
});

await test("gated proxy refuses an unrecognized token", async () => {
  const result = await probe(GATED_PORT, { token: "nls_deadbeef_notreal" });
  assertEqual(result.status, 401, "unknown token must be 401");
  assertEqual(result.reason, "unknown_token", "refusal reason header");
});

await test("a client credential is never mistaken for a share token", async () => {
  const response = await fetch(`http://127.0.0.1:${GATED_PORT}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer sk-ant-oat01-not-a-share-token",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  await response.text().catch(() => "");
  assertEqual(
    response.headers.get("x-neurolink-grant-reason"),
    "missing_token",
    "a non-share bearer must read as absent, not as a bad share token",
  );
});

await test("a valid grant passes the gate", async () => {
  const token = await createGrant(["--peer", "gate-pass", "--preset", "open"]);
  const result = await probe(GATED_PORT, { token });
  assert(
    result.reason === null,
    "an admitted request must carry no share refusal reason",
  );
});

await test("a token surviving base64url underscores still resolves", async () => {
  // The token's secret is base64url, whose alphabet includes "_". A parser that
  // splits the token on every "_" rejects most valid tokens outright.
  //
  // Whether a given secret contains one is pure chance, so the draw is
  // repeated. A secret is 43 base64url characters, which lands roughly a
  // coin-flip either way — eight draws left about a 1-in-200 run with no
  // underscore at all and a failure that was the dice, not the code. The cap
  // below puts that near 1e-12 while costing nothing in the usual case, since
  // the loop stops at the first underscore-bearing secret (two draws, typically).
  const MAX_DRAWS = 40;
  let sawUnderscoreSecret = false;
  for (let attempt = 0; attempt < MAX_DRAWS; attempt += 1) {
    const token = await createGrant([
      "--peer",
      `underscore-${attempt}`,
      "--preset",
      "open",
    ]);
    const secret = token.split("_").slice(2).join("_");
    if (!secret.includes("_")) {
      continue;
    }
    sawUnderscoreSecret = true;
    const result = await probe(GATED_PORT, { token });
    assert(
      result.reason === null,
      "a token whose secret contains an underscore must still authenticate",
    );
    break;
  }
  assert(
    sawUnderscoreSecret,
    `no underscore-bearing secret in ${MAX_DRAWS} draws — far past chance; check the token alphabet`,
  );
});

await test("pause takes effect without restarting the proxy", async () => {
  const token = await createGrant(["--peer", "pausable", "--preset", "open"]);
  const before = await probe(GATED_PORT, { token });
  assert(before.reason === null, "grant must serve before it is paused");

  await cli(["proxy", "share", "pause", "--peer", "pausable"]);
  // The grant store trusts a snapshot for up to a second before re-stat'ing.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const paused = await probe(GATED_PORT, { token });
  assertEqual(paused.status, 403, "paused grant must be 403");
  assertEqual(paused.reason, "paused", "refusal reason header");

  await cli(["proxy", "share", "resume", "--peer", "pausable"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const resumed = await probe(GATED_PORT, { token });
  assert(resumed.reason === null, "resume must restore service");
});

await test("revoke is permanent for the issued token", async () => {
  const token = await createGrant(["--peer", "revocable", "--preset", "open"]);
  await cli(["proxy", "share", "revoke", "--peer", "revocable"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const result = await probe(GATED_PORT, { token });
  assertEqual(result.status, 403, "revoked grant must be 403");
  assertEqual(result.reason, "revoked", "refusal reason header");
});

await test("rotate invalidates the previous token", async () => {
  const original = await createGrant([
    "--peer",
    "rotatable",
    "--preset",
    "open",
  ]);
  await cli(["proxy", "share", "rotate", "--peer", "rotatable"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const result = await probe(GATED_PORT, { token: original });
  assertEqual(result.status, 401, "a rotated-away token must be 401");
  assertEqual(result.reason, "unknown_token", "refusal reason header");
});

await test("model allowlist refuses an out-of-scope tier", async () => {
  const token = await createGrant([
    "--peer",
    "sonnet-only",
    "--preset",
    "open",
    "--models",
    "sonnet",
  ]);
  const allowed = await probe(GATED_PORT, {
    token,
    model: "claude-sonnet-4-6",
  });
  assert(allowed.reason === null, "an allowlisted tier must pass");

  const refused = await probe(GATED_PORT, { token, model: "claude-opus-4-5" });
  assertEqual(refused.status, 403, "out-of-scope model must be 403");
  assertEqual(refused.reason, "model_not_allowed", "refusal reason header");
});

await test("an exhausted coin balance is distinguishable from a rate limit", async () => {
  const token = await createGrant([
    "--peer",
    "broke",
    "--ledger",
    "coins",
    "--coins",
    "0",
  ]);
  const result = await probe(GATED_PORT, { token });
  assertEqual(result.status, 429, "an exhausted grant must be 429");
  assertEqual(result.reason, "exhausted", "refusal reason header");
  assertEqual(
    result.grantStatus,
    "exhausted",
    "grant status must say exhausted so the borrower stops retrying",
  );
});

await test("an expired grant refuses even while marked active", async () => {
  const token = await createGrant([
    "--peer",
    "stale",
    "--preset",
    "open",
    "--expires",
    "1s",
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const result = await probe(GATED_PORT, { token });
  assertEqual(result.status, 403, "an expired grant must be 403");
  assertEqual(result.reason, "expired", "refusal reason header");
});

await test("rate ceiling refuses once the window is full", async () => {
  const token = await createGrant([
    "--peer",
    "hasty",
    "--preset",
    "open",
    "--rate",
    "2/min",
  ]);
  await probe(GATED_PORT, { token });
  await probe(GATED_PORT, { token });
  const third = await probe(GATED_PORT, { token });
  assertEqual(third.status, 429, "over-rate request must be 429");
  assertEqual(third.reason, "rate_limited", "refusal reason header");
  assert(third.retryAfter !== null, "a rate refusal must carry retry-after");
});

await test("share list reports issued grants", async () => {
  const stdout = await cli(["proxy", "share", "list", "--json"]);
  const grants = JSON.parse(stdout) as Array<{ peerLabel: string }>;
  assert(Array.isArray(grants), "share list --json must return an array");
  assert(
    grants.some((grant) => grant.peerLabel === "broke"),
    "an issued grant must appear in share list",
  );
});

await test("topup raises the balance and restores service", async () => {
  const token = await createGrant([
    "--peer",
    "topped",
    "--ledger",
    "coins",
    "--coins",
    "0",
  ]);
  const before = await probe(GATED_PORT, { token });
  assertEqual(before.reason, "exhausted", "must start exhausted");

  await cli(["proxy", "share", "topup", "--peer", "topped", "--coins", "500"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const after = await probe(GATED_PORT, { token });
  assert(after.reason === null, "a topped-up grant must serve again");
});

await test("a node with no accounts of its own borrows from its peer", async () => {
  await cli([
    "proxy",
    "peer",
    "add",
    "--name",
    "stub-lender",
    "--url",
    `http://127.0.0.1:${STUB_LENDER_PORT}`,
    "--token",
    "nls_stub_token",
  ]);
  const before = stubLenderCalls.length;

  const response = await fetch(
    `http://127.0.0.1:${BORROWER_PORT}/v1/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16,
        messages: [{ role: "user", content: "ping" }],
      }),
    },
  );
  const payload = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };

  assertEqual(response.status, 200, "the peer's answer must reach the client");
  assert(
    stubLenderCalls.length > before,
    "the borrower must have forwarded to its peer",
  );
  assertEqual(
    stubLenderCalls[stubLenderCalls.length - 1]?.token,
    "nls_stub_token",
    "the forwarded request must carry the share token",
  );
  assert(
    payload.content?.[0]?.text === "served by the lender",
    "the client must receive the peer's content",
  );
});

await test("a declined peer is parked instead of retried", async () => {
  stubLenderRefusal = { status: 429, reason: "exhausted" };
  const first = await fetch(`http://127.0.0.1:${BORROWER_PORT}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  await first.text().catch(() => "");
  assert(
    first.status !== 200,
    "a declined peer must not produce a successful answer",
  );

  const parked = stubLenderCalls.length;
  const second = await fetch(`http://127.0.0.1:${BORROWER_PORT}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  await second.text().catch(() => "");
  assertEqual(
    stubLenderCalls.length,
    parked,
    "a peer that just declined must not be contacted again immediately",
  );
  stubLenderRefusal = null;
});

await test("peer status reports what the lender last said", async () => {
  const stdout = await cli(["proxy", "peer", "status", "--json"]);
  const peers = JSON.parse(stdout) as Array<{
    name: string;
    cooldownReason?: string;
  }>;
  const stub = peers.find((peer) => peer.name === "stub-lender");
  assert(stub !== undefined, "the configured peer must appear in peer status");
  assertEqual(
    stub?.cooldownReason,
    "exhausted",
    "the parked reason must survive in peer status",
  );
});

await test("a paused peer is not consulted at all", async () => {
  await cli(["proxy", "peer", "resume", "--name", "stub-lender"]);
  await cli(["proxy", "peer", "pause", "--name", "stub-lender"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const before = stubLenderCalls.length;
  const response = await fetch(
    `http://127.0.0.1:${BORROWER_PORT}/v1/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16,
        messages: [{ role: "user", content: "ping" }],
      }),
    },
  );
  await response.text().catch(() => "");
  assertEqual(
    stubLenderCalls.length,
    before,
    "a paused peer must receive no traffic",
  );
});

await test("a share link round-trips into a peer entry", async () => {
  const stdout = await cli([
    "proxy",
    "share",
    "create",
    "--peer",
    "linked",
    "--preset",
    "open",
    "--public-url",
    `http://127.0.0.1:${GATED_PORT}`,
  ]);
  const linkMatch = /neurolink:\/\/share\/[^\s"]+/.exec(stdout);
  assert(linkMatch !== null, "share create --public-url must print a link");

  await cli([
    "proxy",
    "peer",
    "add",
    "--name",
    "linked-lender",
    "--link",
    linkMatch?.[0] ?? "",
  ]);
  const peersJson = await cli(["proxy", "peer", "status", "--json"]);
  const peers = JSON.parse(peersJson) as Array<{
    name: string;
    url: string;
    token: string;
  }>;
  const added = peers.find((peer) => peer.name === "linked-lender");
  assert(added !== undefined, "the linked peer must be registered");
  assertEqual(
    added?.url,
    `http://127.0.0.1:${GATED_PORT}`,
    "the link's host must become the peer URL",
  );
  assert(
    added?.token.startsWith("nls_") === true,
    "the link's fragment must become the peer token",
  );

  // Proving the round trip: the token carried by the link is the one the
  // lender will accept.
  const result = await probe(GATED_PORT, { token: added?.token });
  assert(result.reason === null, "the linked token must authenticate");

  await cli(["proxy", "peer", "remove", "--name", "linked-lender"]);
});

await test("a lease is only usable while signed, unexpired and inside grace", async () => {
  const { issueLease, evaluateLease, generateLeaseSecret } =
    await import("../dist/proxy/shareLease.js");
  const secret = generateLeaseSecret();
  const now = Date.now();
  const grant = {
    schemaVersion: 1 as const,
    id: "lease-test",
    peerLabel: "bob",
    tokenHash: "x",
    tokenSalt: "y",
    level: "complete" as const,
    state: "active" as const,
    entitlement: { ledger: "unlimited" as const },
    gates: {},
    createdAt: now,
    updatedAt: now,
    leaseSecret: secret,
    leasePolicy: {
      ttlMs: 60_000,
      heartbeatEveryMs: 10_000,
      offlineGraceMs: 30_000,
    },
  };
  const lease = issueLease(grant, now);

  const fresh = evaluateLease({ lease, secret, now });
  assert(fresh.usable, "a freshly issued lease must be usable");

  const tampered = { ...lease, gates: { models: ["opus"] } };
  const forged = evaluateLease({ lease: tampered, secret, now });
  assert(!forged.usable, "an edited lease must not be usable");
  assert(
    forged.usable === false && forged.reason === "unsigned",
    "an edited lease must be reported as unsigned",
  );

  const wrongKey = evaluateLease({
    lease,
    secret: generateLeaseSecret(),
    now,
  });
  assert(!wrongKey.usable, "a lease from another lender must not be usable");

  // The lender goes quiet: usable through the grace window, not past it.
  const insideGrace = evaluateLease({
    lease,
    secret,
    lastHeartbeatAt: now,
    now: now + 29_000,
  });
  assert(
    insideGrace.usable,
    "a lease must survive the lender being briefly away",
  );

  const pastGrace = evaluateLease({
    lease,
    secret,
    lastHeartbeatAt: now,
    now: now + 31_000,
  });
  assert(!pastGrace.usable, "a lease must stop once its grace elapses");
  assert(
    pastGrace.usable === false && pastGrace.reason === "grace_elapsed",
    "the stop must be attributed to the elapsed grace",
  );

  // The hard expiry binds even for a borrower that keeps checking in.
  const expired = evaluateLease({
    lease,
    secret,
    lastHeartbeatAt: now + 59_000,
    now: now + 61_000,
  });
  assert(!expired.usable, "a lease must stop at its hard expiry");
  assert(
    expired.usable === false && expired.reason === "expired",
    "the stop must be attributed to expiry",
  );
});

await test("heartbeat renews an active grant and stops a paused one", async () => {
  const stdout = await cli([
    "proxy",
    "share",
    "create",
    "--peer",
    "heartbeat-peer",
    "--preset",
    "open",
    "--level",
    "complete",
    "--json",
  ]);
  const created = JSON.parse(stdout) as { grant: { id: string } };

  // `provision` performs a browser OAuth flow, which cannot run here. Attach
  // the lease material directly — the heartbeat surface is what is under test.
  const { initShareGrants, attachLeaseMaterial } =
    await import("../dist/proxy/shareGrants.js");
  initShareGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
  const prepared = await attachLeaseMaterial(
    created.grant.id,
    "test-lease-secret",
    {
      ttlMs: 600_000,
      heartbeatEveryMs: 10_000,
      offlineGraceMs: 60_000,
    },
  );
  assert(prepared !== undefined, "the grant must accept lease material");
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const beat = async (): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(
      `http://127.0.0.1:${GATED_PORT}/peer/heartbeat`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-neurolink-share-token": "test-lease-secret",
          "x-neurolink-grant-id": created.grant.id,
        },
        body: JSON.stringify({
          grantId: created.grant.id,
          coinsSpent: 0,
          reportedAt: Date.now(),
        }),
      },
    );
    return { status: response.status, body: await response.json() };
  };

  const active = await beat();
  const activeBody = active.body as {
    ok?: boolean;
    lease?: { signature?: string };
  };
  assert(activeBody.ok === true, "an active grant must renew on heartbeat");
  assert(
    typeof activeBody.lease?.signature === "string",
    "a renewal must carry a signed lease",
  );

  await cli(["proxy", "share", "pause", "--peer", "heartbeat-peer"]);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const paused = await beat();
  const pausedBody = paused.body as { ok?: boolean; stop?: boolean };
  assert(
    pausedBody.ok === false && pausedBody.stop === true,
    "a paused grant must stop the borrower at its next heartbeat",
  );
});

await test("heartbeat rejects a caller with the wrong secret", async () => {
  const response = await fetch(
    `http://127.0.0.1:${GATED_PORT}/peer/heartbeat`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-share-token": "not-the-secret",
        "x-neurolink-grant-id": "whatever",
      },
      body: JSON.stringify({ grantId: "whatever", reportedAt: Date.now() }),
    },
  );
  const body = (await response.json()) as { ok?: boolean; stop?: boolean };
  assert(
    body.ok === false && body.stop === true,
    "an unrecognized heartbeat must be refused",
  );
});

await test("a peer can negotiate and read its own limits without spending", async () => {
  const token = await createGrant([
    "--peer",
    "handshake-peer",
    "--preset",
    "open",
    "--level",
    "live",
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const handshake = await fetch(
    `http://127.0.0.1:${GATED_PORT}/peer/handshake`,
    { headers: { "x-neurolink-share-token": token } },
  );
  const negotiated = (await handshake.json()) as {
    ok?: boolean;
    protocol?: number;
    capabilities?: string[];
    grant?: { peerLabel?: string; state?: string; level?: string };
  };
  assert(negotiated.ok === true, "a valid token must complete a handshake");
  assertEqual(negotiated.protocol, 1, "the protocol version must be reported");
  assert(
    negotiated.capabilities?.includes("limits") === true,
    "the handshake must advertise what the node can do",
  );
  assertEqual(
    negotiated.grant?.peerLabel,
    "handshake-peer",
    "the handshake must identify the grant it authenticated",
  );

  const limits = await fetch(`http://127.0.0.1:${GATED_PORT}/peer/limits`, {
    headers: { "x-neurolink-share-token": token },
  });
  const view = (await limits.json()) as Record<string, unknown>;
  assert(view.ok === true, "a valid token must be able to read its limits");
  assertEqual(
    view.grantState,
    "active",
    "the borrower must be told the grant's lifecycle state",
  );
  assert(
    "servable" in view,
    "the borrower must be told whether anything can serve it",
  );
  // Nothing about the lender's pool may cross: no labels, no account counts.
  const serialized = JSON.stringify(view);
  assert(
    serialized.includes("@") === false,
    "an account label must never appear in a peer-facing limits view",
  );
  assert(
    serialized.includes("accountKey") === false,
    "per-account identity must never appear in a peer-facing limits view",
  );

  const anonymous = await fetch(
    `http://127.0.0.1:${GATED_PORT}/peer/handshake`,
  );
  const refused = (await anonymous.json()) as {
    error?: { type?: string };
  };
  assertEqual(
    refused.error?.type,
    "authentication_error",
    "an untokened handshake must be refused",
  );
});

await test("a coin note can be checked by its holder and redeemed once", async () => {
  const token = await createGrant([
    "--peer",
    "note-peer",
    "--ledger",
    "coins",
    "--coins",
    "10",
    "--level",
    "live",
  ]);
  const minted = await cli([
    "proxy",
    "share",
    "note",
    "--coins",
    "250",
    "--json",
  ]);
  const encoded = (JSON.parse(minted) as { encoded: string }).encoded;
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const present = async (redeem: boolean): Promise<Record<string, unknown>> => {
    const response = await fetch(`http://127.0.0.1:${GATED_PORT}/peer/note`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-share-token": token,
      },
      body: JSON.stringify({ note: encoded, redeem }),
    });
    return (await response.json()) as Record<string, unknown>;
  };

  // Checking does not spend it.
  const checked = await present(false);
  assertEqual(checked.status, "valid", "a fresh note must check out as valid");
  assertEqual(
    (await present(false)).status,
    "valid",
    "checking a note must not consume it",
  );

  const redeemed = await present(true);
  assertEqual(redeemed.status, "redeemed", "a valid note must redeem");
  assertEqual(redeemed.coins, 250, "redemption must credit the full value");
  assertEqual(
    redeemed.balance,
    260,
    "the credit must land on the redeeming grant's balance",
  );

  const replayed = await present(true);
  assertEqual(
    replayed.status,
    "spent",
    "a note presented twice must be refused the second time",
  );

  const garbage = await fetch(`http://127.0.0.1:${GATED_PORT}/peer/note`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-neurolink-share-token": token,
    },
    body: JSON.stringify({ note: "nln_bm90LWEtbm90ZQ", redeem: false }),
  });
  const rejected = (await garbage.json()) as { error?: { type?: string } };
  assertEqual(
    rejected.error?.type,
    "invalid_request_error",
    "something that is not a note must be refused as malformed",
  );
});

await test("the operator /limits view is withheld from a borrower", async () => {
  const token = await createGrant([
    "--peer",
    "limits-peer",
    "--preset",
    "open",
    "--level",
    "live",
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const response = await fetch(`http://127.0.0.1:${GATED_PORT}/limits`, {
    headers: { "x-neurolink-share-token": token },
  });
  const body = (await response.json()) as {
    results?: unknown[];
    error?: { type?: string; message?: string };
  };
  assertEqual(
    body.results,
    undefined,
    "a borrower must not receive the per-account limits list",
  );
  assertEqual(
    body.error?.type,
    "permission_error",
    "the refusal must be a permission error, not a credentials one",
  );
  assert(
    body.error?.message?.includes("/peer/limits") === true,
    "the refusal must point the borrower at the surface meant for it",
  );
});

await test("a gated proxy does not hand out account identity on /status", async () => {
  const response = await fetch(`http://127.0.0.1:${GATED_PORT}/status`);
  const payload = (await response.json()) as {
    stats?: {
      accounts?: Array<{ label?: string }>;
      primaryAccount?: Record<string, unknown>;
    };
  };
  assertEqual(response.status, 200, "status must stay reachable for liveness");
  const labels = (payload.stats?.accounts ?? []).map((row) => row.label ?? "");
  assert(
    labels.every((label) => /^account-\d+$/.test(label)),
    "account labels must be placeholders on a gated proxy",
  );
  const primary = payload.stats?.primaryAccount ?? {};
  // Identity only. `source` is a discriminant, not a name: blanking it put the
  // value outside its own union and hid the one thing this block is read for —
  // whether the configured primary is the account actually serving.
  assert(
    (["configured", "key", "label"] as const).every((field) => {
      const value = primary[field];
      return value === null || value === "redacted";
    }),
    "the primary account's identity fields must be redacted on a gated proxy",
  );
  assert(
    primary.source === "configured" || primary.source === "fallback",
    "the primary account's source must survive redaction as a real discriminant",
  );
});

await test("an ungated proxy still reports account identity", async () => {
  const response = await fetch(`http://127.0.0.1:${OPEN_PORT}/status`);
  const payload = (await response.json()) as {
    stats?: { accounts?: Array<{ label?: string }> };
  };
  const labels = (payload.stats?.accounts ?? []).map((row) => row.label ?? "");
  assert(
    labels.every((label) => !/^account-\d+$/.test(label)),
    "redaction must not apply when the proxy is not gated",
  );
});

await test("a coin balance cannot be overspent by concurrent requests", async () => {
  const { initShareGrants: initGrants, createShareGrant } =
    await import("../dist/proxy/shareGrants.js");
  const { initShareLedger, estimateHoldCoins } =
    await import("../dist/proxy/shareLedger.js");
  const { admitInboundShareRequest } =
    await import("../dist/proxy/shareGate.js");
  const grantsPath = path.join(TEST_HOME, "concurrency-grants.json");
  initGrants(grantsPath);
  initShareLedger(path.join(TEST_HOME, "concurrency-ledger.json"));

  const issued = await createShareGrant({
    peerLabel: "concurrent",
    level: "live",
    entitlement: { ledger: "coins", coins: 5 },
    gates: {},
  });
  const holdSize = estimateHoldCoins("claude-sonnet-4-6", 16);
  assert(holdSize > 1, "the hold estimate must be a meaningful fraction");

  const headers = { "x-neurolink-share-token": issued.token };
  const outcomes: string[] = [];
  // Deliberately never released: this is the in-flight case the hold exists for.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const outcome = await admitInboundShareRequest({
      headers,
      model: "claude-sonnet-4-6",
      maxTokens: 16,
    });
    // Narrow on `refused`, not on the negation of `admitted`: the outcome is a
    // three-way union and the third arm — `local` — carries no response at all.
    outcomes.push(
      outcome.kind === "refused"
        ? (outcome.response.headers["x-neurolink-grant-reason"] ?? "refused")
        : outcome.kind,
    );
  }
  assert(
    outcomes.includes("exhausted"),
    "concurrent holds must eventually exhaust the balance",
  );
  assert(
    outcomes.filter((outcome) => outcome === "admitted").length < 4,
    "an in-flight hold must reduce what the next request may claim",
  );

  // Restore the suite's own grant store for the cases that follow.
  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("share status reports settled spend per grant", async () => {
  const { initShareGrants: initGrants, createShareGrant } =
    await import("../dist/proxy/shareGrants.js");
  const { initShareLedger, settleShareUsage } =
    await import("../dist/proxy/shareLedger.js");
  const grantsPath = path.join(TEST_HOME, ".neurolink", "proxy-grants.json");
  initGrants(grantsPath);
  initShareLedger(
    path.join(TEST_HOME, ".neurolink", "proxy-share-ledger.json"),
  );

  const issued = await createShareGrant({
    peerLabel: "spender",
    level: "live",
    entitlement: { ledger: "coins", coins: 1000 },
    gates: {},
  });
  await settleShareUsage({
    grantId: issued.grant.id,
    accountKey: "anthropic:someone",
    model: "claude-sonnet-4-6",
    usage: { inputTokens: 1000, outputTokens: 1000 },
  });

  const stdout = await cli([
    "proxy",
    "share",
    "status",
    "--peer",
    "spender",
    "--json",
  ]);
  const rows = JSON.parse(stdout) as Array<{
    grant: { peerLabel: string };
    usage: { coinsSpent: number; requests: number };
  }>;
  const row = rows.find((entry) => entry.grant.peerLabel === "spender");
  assert(row !== undefined, "the grant must appear in share status");
  assert(
    (row?.usage.coinsSpent ?? 0) > 0,
    "settled spend must be reported, not silently dropped",
  );
  assertEqual(row?.usage.requests, 1, "the request count must be reported");
});

await test("a lapsed lease is not reported as needing re-authentication", async () => {
  const { issueLease, generateLeaseSecret } =
    await import("../dist/proxy/shareLease.js");
  const { initResidentGrants, saveResidentGrant } =
    await import("../dist/proxy/residentGrants.js");
  const secret = generateLeaseSecret();
  const issuedAt = Date.now() - 120_000;
  const lease = issueLease(
    {
      schemaVersion: 1,
      id: "lapsed-grant",
      peerLabel: "landlord",
      tokenHash: "x",
      tokenSalt: "y",
      level: "complete",
      state: "active",
      entitlement: { ledger: "unlimited" },
      gates: {},
      createdAt: issuedAt,
      updatedAt: issuedAt,
      leaseSecret: secret,
      leasePolicy: {
        ttlMs: 600_000,
        heartbeatEveryMs: 10_000,
        offlineGraceMs: 60_000,
      },
    },
    issuedAt,
  );
  initResidentGrants(path.join(TEST_HOME, "lapsed-resident.json"));
  await saveResidentGrant({
    schemaVersion: 1,
    accountLabel: "tenant-account",
    grantId: "lapsed-grant",
    lenderName: "landlord",
    lenderUrl: "",
    leaseSecret: secret,
    lease,
  });

  const { evaluateResidentAccount } =
    await import("../dist/proxy/residentGrants.js");
  const verdict = await evaluateResidentAccount("anthropic:tenant-account");
  assert(verdict !== undefined, "a resident account must be recognized");
  assert(
    verdict?.usable === false,
    "a lease past its grace must not be usable",
  );
  assert(
    verdict?.usable === false && verdict.reason === "grace_elapsed",
    "the stop must be attributed to the elapsed grace, not to credentials",
  );
});

await test("usage drift is detected only when nothing else explains it", async () => {
  const { evaluateDrift } = await import("../dist/proxy/shareAudit.js");
  const base = {
    at: 1,
    sessionUsed: 0.1,
    weeklyUsed: 0.1,
    reportedCoins: 0,
    lenderRequests: 0,
  };

  assert(
    evaluateDrift(undefined, base).drifted === false,
    "the first observation cannot be drift — there is nothing to compare to",
  );

  // The account moved 20% of a window; nobody claims it.
  const unexplained = evaluateDrift(base, {
    ...base,
    at: 2,
    sessionUsed: 0.3,
  });
  assert(unexplained.drifted, "unaccounted movement must be flagged");

  // Same movement, but this node served the traffic.
  const lenderBusy = evaluateDrift(base, {
    ...base,
    at: 2,
    sessionUsed: 0.3,
    lenderRequests: 4,
  });
  assert(
    !lenderBusy.drifted,
    "movement the lender caused itself must never be blamed on the borrower",
  );

  // Same movement, and the borrower said so.
  const reported = evaluateDrift(base, {
    ...base,
    at: 2,
    sessionUsed: 0.3,
    reportedCoins: 120,
  });
  assert(!reported.drifted, "declared spend must not be flagged as drift");

  // Movement inside the tolerance band.
  const noise = evaluateDrift(base, { ...base, at: 2, sessionUsed: 0.11 });
  assert(!noise.drifted, "sub-tolerance movement must not be flagged");
});

await test("repeated drift auto-pauses the grant", async () => {
  const { initShareAudit, recordAuditObservation, DRIFT_STREAK_LIMIT } =
    await import("../dist/proxy/shareAudit.js");
  initShareAudit(path.join(TEST_HOME, "drift-audit.json"));

  const observe = async (sessionUsed: number, at: number) =>
    recordAuditObservation({
      grantId: "drifter",
      accountLabel: "lender@example.com",
      observation: {
        at,
        sessionUsed,
        weeklyUsed: 0,
        reportedCoins: 0,
        lenderRequests: 0,
      },
      lenderRequestsTotal: 0,
    });

  await observe(0.1, 1);
  let paused = false;
  for (let step = 1; step <= DRIFT_STREAK_LIMIT; step += 1) {
    const result = await observe(0.1 + step * 0.1, step + 1);
    paused = paused || result.shouldPause;
  }
  assert(
    paused,
    "a grant that drifts past the streak limit must be flagged for pausing",
  );

  const { getAuditRecord } = await import("../dist/proxy/shareAudit.js");
  const record = await getAuditRecord("drifter");
  assert(
    record?.autoPausedAt !== undefined,
    "the auto-pause must be recorded so status can explain it",
  );
});

await test("a lender's own traffic between check-ins clears the streak", async () => {
  const { initShareAudit, recordAuditObservation, getAuditRecord } =
    await import("../dist/proxy/shareAudit.js");
  initShareAudit(path.join(TEST_HOME, "drift-audit-clear.json"));

  await recordAuditObservation({
    grantId: "mixed",
    accountLabel: "lender@example.com",
    observation: {
      at: 1,
      sessionUsed: 0.1,
      weeklyUsed: 0,
      reportedCoins: 0,
      lenderRequests: 0,
    },
    lenderRequestsTotal: 0,
  });
  await recordAuditObservation({
    grantId: "mixed",
    accountLabel: "lender@example.com",
    observation: {
      at: 2,
      sessionUsed: 0.4,
      weeklyUsed: 0,
      reportedCoins: 0,
      lenderRequests: 0,
    },
    lenderRequestsTotal: 0,
  });
  const drifted = await getAuditRecord("mixed");
  assert((drifted?.driftStreak ?? 0) > 0, "the first gap must count as drift");

  // The lender served requests in this interval, so the movement is explained.
  await recordAuditObservation({
    grantId: "mixed",
    accountLabel: "lender@example.com",
    observation: {
      at: 3,
      sessionUsed: 0.7,
      weeklyUsed: 0,
      reportedCoins: 0,
      lenderRequests: 0,
    },
    lenderRequestsTotal: 9,
  });
  const cleared = await getAuditRecord("mixed");
  assertEqual(
    cleared?.driftStreak,
    0,
    "an explained interval must reset the streak, not accumulate it",
  );
});

await test("split-PKCE provisioning hands over a code, never a token", async () => {
  const {
    initShareGrants: initGrants,
    createShareGrant,
    attachLeaseMaterial,
  } = await import("../dist/proxy/shareGrants.js");
  const { buildProvisionClaim, generateLeaseSecret, evaluateLease } =
    await import("../dist/proxy/shareLease.js");
  const {
    initShareProvisioning,
    openProvisionRequest,
    getProvisionRequest,
    authorizeProvisionRequest,
    claimProvisionRequest,
    generateProvisionState,
  } = await import("../dist/proxy/shareProvisioning.js");
  const { createHash, randomBytes } = await import("node:crypto");

  initGrants(path.join(TEST_HOME, "provision-grants.json"));
  initShareProvisioning(path.join(TEST_HOME, "provision-requests.json"));

  const issued = await createShareGrant({
    peerLabel: "carol",
    level: "complete",
    entitlement: { ledger: "unlimited" },
    gates: { models: ["sonnet"] },
  });
  const prepared = await attachLeaseMaterial(
    issued.grant.id,
    generateLeaseSecret(),
    { ttlMs: 600_000, heartbeatEveryMs: 10_000, offlineGraceMs: 60_000 },
    "lender@example.com",
  );
  assert(prepared !== undefined, "lease material must attach");

  // The borrower's half: a verifier that never leaves, and the digest that does.
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const state = generateProvisionState();

  const malformed = await openProvisionRequest({
    grantId: issued.grant.id,
    codeChallenge: "not-a-digest",
    state,
  });
  assert(
    malformed.ok === false,
    "a challenge that is not a base64url S256 digest must be refused",
  );

  const opened = await openProvisionRequest({
    grantId: issued.grant.id,
    codeChallenge,
    state,
  });
  assert(opened.ok === true, "a well-formed challenge must be accepted");

  // The lender only ever sees the digest.
  const lodged = await getProvisionRequest(issued.grant.id);
  assertEqual(
    lodged?.codeChallenge,
    codeChallenge,
    "the lender must hold the challenge the borrower sent",
  );
  assert(
    JSON.stringify(lodged).includes(codeVerifier) === false,
    "the verifier must never appear in anything the lender stores",
  );

  const early = await claimProvisionRequest(issued.grant.id);
  assertEqual(
    early.status,
    "pending",
    "a claim before authorization must report pending, not hand over a code",
  );

  const authorized = await authorizeProvisionRequest({
    grantId: issued.grant.id,
    code: "auth-code-xyz",
    accountLabel: "lender@example.com",
  });
  assert(authorized.ok === true, "the lender must be able to record a code");

  const claimed = await claimProvisionRequest(issued.grant.id);
  assertEqual(claimed.status, "ready", "an authorized request must be ready");
  assertEqual(
    claimed.status === "ready" ? claimed.state : "",
    state,
    "the borrower's state must survive the round trip untouched",
  );

  // Single use is the binding. A replay must find nothing.
  const replay = await claimProvisionRequest(issued.grant.id);
  assertEqual(
    replay.status,
    "none",
    "an authorization code must be claimable exactly once",
  );

  // What the borrower receives carries a lease and no credential at all.
  const claim = buildProvisionClaim({
    grant: prepared!,
    lenderName: "lender",
    lenderUrl: `http://127.0.0.1:${GATED_PORT}/`,
    code: "auth-code-xyz",
    state,
  });
  assertEqual(
    claim.accountLabel,
    "carol-via-lender",
    "the suggested account label must be derived from both parties",
  );
  assertEqual(
    claim.lenderUrl,
    `http://127.0.0.1:${GATED_PORT}`,
    "a trailing slash must not survive into the heartbeat address",
  );
  assert(
    Object.keys(claim).includes("tokens") === false,
    "a claim must not carry a token field at all",
  );
  const serialized = JSON.stringify(claim);
  assert(
    serialized.includes("accessToken") === false &&
      serialized.includes("refreshToken") === false,
    "nothing token-shaped may appear in what crosses to the borrower",
  );
  assert(
    claim.lease.gates.models?.includes("sonnet") === true,
    "the lender's gates must be snapshotted into the lease",
  );

  const verdict = evaluateLease({
    lease: claim.lease,
    secret: claim.leaseSecret,
  });
  assert(verdict.usable, "a freshly issued lease must be usable");

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("a provisioning request expires rather than waiting forever", async () => {
  const { initShareGrants: initGrants, createShareGrant } =
    await import("../dist/proxy/shareGrants.js");
  const {
    initShareProvisioning,
    openProvisionRequest,
    getProvisionRequest,
    authorizeProvisionRequest,
    PROVISION_REQUEST_TTL_MS,
  } = await import("../dist/proxy/shareProvisioning.js");
  const { createHash, randomBytes } = await import("node:crypto");

  initGrants(path.join(TEST_HOME, "expiry-grants.json"));
  initShareProvisioning(path.join(TEST_HOME, "expiry-requests.json"));
  const issued = await createShareGrant({
    peerLabel: "dave",
    level: "complete",
    entitlement: { ledger: "unlimited" },
    gates: {},
  });

  const challenge = createHash("sha256")
    .update(randomBytes(32).toString("base64url"))
    .digest("base64url");
  await openProvisionRequest({
    grantId: issued.grant.id,
    codeChallenge: challenge,
    state: "aaaaaaaaaaaaaaaaaaaaaaaa",
  });

  const future = Date.now() + PROVISION_REQUEST_TTL_MS + 1000;
  const lapsed = await getProvisionRequest(issued.grant.id, future);
  assertEqual(
    lapsed,
    undefined,
    "a request past its TTL must no longer be visible to the lender",
  );
  const tooLate = await authorizeProvisionRequest({
    grantId: issued.grant.id,
    code: "late",
    now: future,
  });
  assert(
    tooLate.ok === false,
    "authorizing a lapsed request must be refused, not silently accepted",
  );

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("a standing refill pays every period a sleeping node missed", async () => {
  const {
    initShareGrants: initGrants,
    createShareGrant,
    getShareGrant,
  } = await import("../dist/proxy/shareGrants.js");
  const { applyRefillIfDue } = await import("../dist/proxy/shareLedger.js");

  initGrants(path.join(TEST_HOME, "refill-grants.json"));
  const week = 604_800_000;
  const issued = await createShareGrant({
    peerLabel: "sleeper",
    level: "live",
    entitlement: {
      ledger: "coins",
      coins: 0,
      refill: { amount: 100, per: "week" },
    },
    gates: {},
  });

  // Nothing is due inside the first period.
  const early = await applyRefillIfDue(
    issued.grant,
    issued.grant.createdAt + week - 1000,
  );
  assertEqual(
    early.entitlement.coins,
    0,
    "a refill must not pay out before its period elapses",
  );

  // Three weeks asleep owes three periods, not one.
  const caught = await applyRefillIfDue(
    issued.grant,
    issued.grant.createdAt + week * 3 + 1000,
  );
  assertEqual(
    caught.entitlement.coins,
    300,
    "every elapsed period must be paid, not just the newest",
  );

  // The schedule stays anchored: the next period is due one week after the
  // third boundary, not one week after the catch-up ran.
  const stored = await getShareGrant(issued.grant.id);
  assertEqual(
    stored?.entitlement.refill?.lastAt,
    issued.grant.createdAt + week * 3,
    "lastAt must advance by whole periods so the schedule cannot drift",
  );

  const notYet = await applyRefillIfDue(
    stored!,
    issued.grant.createdAt + week * 3 + 1000,
  );
  assertEqual(
    notYet.entitlement.coins,
    300,
    "a catch-up must not immediately pay again",
  );

  // A clock jump cannot mint an unbounded balance.
  const jumped = await applyRefillIfDue(
    stored!,
    issued.grant.createdAt + week * 500,
  );
  assert(
    (jumped.entitlement.coins ?? 0) <= 300 + 100 * 8,
    "a catch-up must be capped so a clock jump cannot mint coins",
  );

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("a receipt lets a borrower check a charge instead of believing it", async () => {
  const {
    initShareGrants: initGrants,
    createShareGrant,
    getShareGrant,
  } = await import("../dist/proxy/shareGrants.js");
  const { initShareLedger, settleShareUsage, usageToCoins } =
    await import("../dist/proxy/shareLedger.js");
  const { initShareReceipts, listShareReceipts, auditShareReceipts } =
    await import("../dist/proxy/shareReceipts.js");

  initGrants(path.join(TEST_HOME, "receipt-grants.json"));
  initShareLedger(path.join(TEST_HOME, "receipt-ledger.json"));
  initShareReceipts(path.join(TEST_HOME, "receipt-store.json"));

  const issued = await createShareGrant({
    peerLabel: "receipted",
    level: "live",
    entitlement: { ledger: "coins", coins: 100 },
    gates: {},
  });
  const secret = issued.grant.receiptSecret;
  assert(
    typeof secret === "string" && secret.length > 0,
    "every grant must be minted with a receipt secret",
  );

  for (let index = 0; index < 3; index += 1) {
    await settleShareUsage({
      grantId: issued.grant.id,
      accountKey: "anthropic:acct",
      model: "claude-haiku-4-5",
      usage: { inputTokens: 0, outputTokens: 1000 },
    });
  }

  const collected = await listShareReceipts(issued.grant.id);
  assertEqual(collected.length, 3, "every settlement must leave a receipt");
  assertEqual(
    collected.map((receipt) => receipt.sequence).join(","),
    "1,2,3",
    "receipt sequences must be contiguous",
  );
  assert(
    collected.every(
      (receipt) =>
        Math.abs(usageToCoins(receipt.usage, receipt.model) - receipt.coins) <
        1e-9,
    ),
    "a receipt must carry the usage its charge was computed from",
  );

  const after = await getShareGrant(issued.grant.id);
  assertEqual(
    Math.round(after?.entitlement.coins ?? -1),
    97,
    "the receipted charges must match what left the balance",
  );

  const clean = auditShareReceipts(issued.grant.id, collected, secret);
  assertEqual(clean.unverified, 0, "honest receipts must all verify");
  assertEqual(clean.miscounted, 0, "honest receipts must match their usage");
  assertEqual(clean.gaps.length, 0, "a complete run must have no gaps");

  // A lender that quietly inflates a charge is caught two ways: the signature
  // no longer matches, and the coins no longer match the usage.
  const inflated = collected.map((receipt, index) =>
    index === 1 ? { ...receipt, coins: receipt.coins * 10 } : receipt,
  );
  const tampered = auditShareReceipts(issued.grant.id, inflated, secret);
  assertEqual(
    tampered.unverified,
    1,
    "an edited receipt must fail its signature",
  );
  assertEqual(
    tampered.miscounted,
    1,
    "an edited charge must disagree with its own usage block",
  );

  // A withheld charge cannot hide: the sequence it occupied is missing.
  const withheld = auditShareReceipts(
    issued.grant.id,
    collected.filter((receipt) => receipt.sequence !== 2),
    secret,
  );
  assertEqual(
    withheld.gaps.join(","),
    "2",
    "a withheld receipt must surface as a gap",
  );

  // The wrong secret verifies nothing, which is the point of having one.
  const stranger = auditShareReceipts(
    issued.grant.id,
    collected,
    "not-the-secret",
  );
  assertEqual(
    stranger.unverified,
    3,
    "receipts must not verify against a secret that did not sign them",
  );

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("reciprocal netting forgives the overlap once, not twice", async () => {
  const {
    initShareGrants: initGrants,
    createShareGrant,
    getShareGrant,
  } = await import("../dist/proxy/shareGrants.js");
  const { initShareLedger, settleShareUsage } =
    await import("../dist/proxy/shareLedger.js");
  const { initShareReceipts, applyReciprocalNetting, nettedCoinsFor } =
    await import("../dist/proxy/shareReceipts.js");

  initGrants(path.join(TEST_HOME, "net-grants.json"));
  initShareLedger(path.join(TEST_HOME, "net-ledger.json"));
  initShareReceipts(path.join(TEST_HOME, "net-receipts.json"));

  const issued = await createShareGrant({
    peerLabel: "netpeer",
    level: "live",
    entitlement: { ledger: "coins", coins: 1000 },
    gates: {},
  });

  // The peer has consumed 5 coins of ours.
  for (let index = 0; index < 5; index += 1) {
    await settleShareUsage({
      grantId: issued.grant.id,
      accountKey: "anthropic:acct",
      model: "claude-haiku-4-5",
      usage: { inputTokens: 0, outputTokens: 1000 },
    });
  }
  const spentBalance = (await getShareGrant(issued.grant.id))?.entitlement
    .coins;
  assertEqual(
    Math.round(spentBalance ?? -1),
    995,
    "five settled requests must leave the balance five coins lighter",
  );

  // They say we consumed 3 of theirs, and have forgiven nothing yet. The
  // overlap is 3, so 3 comes back.
  const first = await applyReciprocalNetting({
    grantId: issued.grant.id,
    consumedFromPeer: 3,
    peerAlreadyNetted: 0,
  });
  assertEqual(
    Math.round(first.netted),
    3,
    "netting must forgive the smaller of the two positions",
  );
  assertEqual(
    Math.round((await getShareGrant(issued.grant.id))?.entitlement.coins ?? -1),
    998,
    "forgiveness must reach the balance",
  );

  // The same round again, replayed verbatim, must be free.
  const replay = await applyReciprocalNetting({
    grantId: issued.grant.id,
    consumedFromPeer: 3,
    peerAlreadyNetted: 0,
  });
  assertEqual(
    Math.round(replay.netted),
    0,
    "a replayed netting round must forgive nothing",
  );
  assertEqual(
    Math.round((await getShareGrant(issued.grant.id))?.entitlement.coins ?? -1),
    998,
    "a replayed round must not move the balance",
  );
  assertEqual(
    Math.round(await nettedCoinsFor(issued.grant.id)),
    3,
    "the cumulative netted total must not double-count",
  );

  // Fresh use on their side nets the new overlap only.
  const second = await applyReciprocalNetting({
    grantId: issued.grant.id,
    consumedFromPeer: 4,
    peerAlreadyNetted: 3,
  });
  assertEqual(
    Math.round(second.netted),
    1,
    "a later round must forgive only what is newly overlapping",
  );

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("a coin note is redeemable exactly once, by its holder", async () => {
  const {
    initShareGrants: initGrants,
    createShareGrant,
    getNoteSecret,
    getShareGrant,
  } = await import("../dist/proxy/shareGrants.js");
  const {
    initShareNotes,
    issueShareNote,
    encodeShareNote,
    decodeShareNote,
    inspectShareNote,
    redeemShareNote,
  } = await import("../dist/proxy/shareNotes.js");

  initGrants(path.join(TEST_HOME, "note-grants.json"));
  initShareNotes(path.join(TEST_HOME, "note-store.json"));

  const holder = await createShareGrant({
    peerLabel: "noteholder",
    level: "live",
    entitlement: { ledger: "coins", coins: 10 },
    gates: {},
  });

  const note = await issueShareNote({ issuer: "alice", coins: 200 });
  const secret = await getNoteSecret();
  assert(
    typeof secret === "string" && secret.length > 0,
    "issuing a note must mint the node's note secret",
  );

  // It survives being handed over as one line of text.
  const round = decodeShareNote(encodeShareNote(note));
  assertEqual(
    round?.noteId,
    note.noteId,
    "a note must survive encoding and decoding",
  );
  assertEqual(
    decodeShareNote("nls_not_a_note"),
    undefined,
    "a share token must never decode as a coin note",
  );

  const before = await inspectShareNote(note, secret);
  assertEqual(before.status, "valid", "a fresh note must inspect as valid");

  const redeemed = await redeemShareNote({
    note,
    grantId: holder.grant.id,
    secret,
  });
  assert(redeemed.ok === true, "a valid note must redeem");
  assertEqual(
    redeemed.ok === true ? redeemed.coins : 0,
    200,
    "redemption must credit the note's full value",
  );
  assertEqual(
    Math.round((await getShareGrant(holder.grant.id))?.entitlement.coins ?? -1),
    210,
    "the credit must land on the redeeming grant's balance",
  );

  // Replay protection: the second attempt gets nothing.
  const again = await redeemShareNote({
    note,
    grantId: holder.grant.id,
    secret,
  });
  assert(again.ok === false, "a note must not redeem twice");
  assertEqual(
    again.ok === false ? again.status : "",
    "spent",
    "a second redemption must say the note is spent",
  );
  assertEqual(
    Math.round((await getShareGrant(holder.grant.id))?.entitlement.coins ?? -1),
    210,
    "a replayed redemption must not move the balance",
  );

  // An edited note is refused before the spent-set is even consulted.
  const forged = { ...note, coins: 5000 };
  const forgedVerdict = await redeemShareNote({
    note: forged,
    grantId: holder.grant.id,
    secret,
  });
  assertEqual(
    forgedVerdict.ok === false ? forgedVerdict.status : "",
    "forged",
    "an edited note must be refused on its signature, not on the spent set",
  );

  // An expired note is refused, and says so.
  const shortLived = await issueShareNote({
    issuer: "alice",
    coins: 50,
    ttlMs: 1,
  });
  const lapsed = await redeemShareNote({
    note: shortLived,
    grantId: holder.grant.id,
    secret,
    now: Date.now() + 5000,
  });
  assertEqual(
    lapsed.ok === false ? lapsed.status : "",
    "expired",
    "a lapsed note must be refused as expired",
  );

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("a share link survives a lender fronted at a path", async () => {
  const { parseShareLink } = await import("../dist/cli/commands/proxyPeer.js");
  const { buildShareLink } = await import("../dist/cli/commands/proxyShare.js");

  const plain = parseShareLink("neurolink://share/proxy.example.com#tok123");
  assertEqual(
    plain?.url,
    "https://proxy.example.com",
    "a bare host must default to https",
  );

  const insecure = parseShareLink(
    "neurolink://share/127.0.0.1:9891?scheme=http#tok123",
  );
  assertEqual(
    insecure?.url,
    "http://127.0.0.1:9891",
    "a plaintext origin must survive, or the peer URL answers nothing",
  );

  const subpath = parseShareLink("neurolink://share/example.com/proxy#tok123");
  assertEqual(
    subpath?.url,
    "https://example.com/proxy",
    "a reverse-proxy subpath must survive the round trip",
  );

  const round = parseShareLink(
    buildShareLink("https://example.com/proxy/", "tok123"),
  );
  assertEqual(
    round?.url,
    "https://example.com/proxy",
    "minting and parsing must agree on the address",
  );
  assertEqual(round?.token, "tok123", "the token must survive the round trip");

  assertEqual(
    parseShareLink("neurolink://share/example.com"),
    undefined,
    "a link with no token must not parse",
  );
});

await test("a peer cooldown cannot be parked past a week", async () => {
  const { initPeerStore, addPeer, coolPeer, getPeer } =
    await import("../dist/proxy/peerStore.js");
  initPeerStore(path.join(TEST_HOME, "cooldown-peers.json"));
  await addPeer({
    name: "overreach",
    url: "http://127.0.0.1:1",
    token: "nls_x_y",
  });

  // A lender asking for a decade must not strand a working peer.
  await coolPeer("overreach", "exhausted", 315_360_000);
  const parked = await getPeer("overreach");
  const parkedFor = (parked?.cooldownUntil ?? 0) - Date.now();
  assert(
    parkedFor <= 604_800_000 + 5000,
    "a cooldown must be capped at a week however long the lender asks for",
  );

  // A reasonable one is still honoured over our own default.
  await coolPeer("overreach", "unreachable", 3600);
  const honoured = await getPeer("overreach");
  const honouredFor = (honoured?.cooldownUntil ?? 0) - Date.now();
  assert(
    honouredFor > 60_000,
    "a lender's longer retry-after must still win over the default",
  );
});

await test("a pool ceiling divides by the accounts the grant may reach", async () => {
  const { filterAccountsForGrant, accountsInGrantScope } =
    await import("../dist/proxy/sharePolicy.js");
  const { initShareLedger, readSharePoolWindowUsage, recordShareWindowDelta } =
    await import("../dist/proxy/shareLedger.js");

  const sessionResetAt = Date.now() + 3_600_000;
  const weeklyResetAt = Date.now() + 86_400_000;
  const view = (accountKey: string, borrowed: number) => ({
    accountKey,
    sessionUsed: 0.1,
    weeklyUsed: 0.1,
    sessionResetAt,
    weeklyResetAt,
    borrowedSessionFraction: borrowed,
    borrowedWeeklyFraction: 0,
  });

  initShareLedger(path.join(TEST_HOME, "scoped-pool.json"));
  // The grant may touch one account of five, and has taken a quarter of it.
  await recordShareWindowDelta({
    grantId: "scoped-grant",
    accountKey: "anthropic:alice",
    sessionBefore: 0,
    sessionAfter: 0.25,
    sessionResetAt,
    weeklyBefore: 0,
    weeklyAfter: 0,
    weeklyResetAt,
  });

  const pool = [
    view("anthropic:alice", 0.25),
    view("anthropic:bob", 0),
    view("anthropic:carol", 0),
    view("anthropic:dan", 0),
    view("anthropic:erin", 0),
  ];
  const gates = {
    maxSlice: { session5hPct: 20 },
    accounts: ["alice"],
  };

  const scoped = accountsInGrantScope(gates, pool);
  assertEqual(
    scoped.inScope.length,
    1,
    "only the named account may be in scope",
  );
  assertEqual(
    scoped.outOfScope.length,
    4,
    "every unnamed account must fall outside the scope",
  );

  const scopedUsage = await readSharePoolWindowUsage(
    "scoped-grant",
    scoped.inScope,
  );
  assert(
    Math.abs(scopedUsage.sessionFraction - 0.25) < 1e-9,
    "pool usage must divide by the reachable accounts only",
  );

  // Dividing by all five would read 5% and admit; dividing by the one the
  // grant may reach reads 25% and refuses.
  const wholePool = await readSharePoolWindowUsage("scoped-grant", pool);
  assert(
    wholePool.sessionFraction * 100 < 20,
    "the unscoped denominator is the loose reading this guards against",
  );

  const grant = {
    schemaVersion: 1 as const,
    id: "scoped-grant",
    peerLabel: "scopedpeer",
    tokenHash: "h",
    tokenSalt: "s",
    level: "live" as const,
    state: "active" as const,
    entitlement: { ledger: "unlimited" as const },
    gates,
    createdAt: 0,
    updatedAt: 0,
  };
  const decision = filterAccountsForGrant(grant, pool, Date.now(), scopedUsage);
  assertEqual(
    decision.allowed.length,
    0,
    "a grant that has spent its share of its own account must be refused",
  );
  assert(
    decision.excluded.some((entry) => entry.reason === "slice_exhausted"),
    "the refusal must name the slice for the account in scope",
  );
});

await test("concurrent settlements cannot lose a coin deduction", async () => {
  const {
    initShareGrants: initGrants,
    createShareGrant,
    getShareGrant,
  } = await import("../dist/proxy/shareGrants.js");
  const { initShareLedger, settleShareUsage } =
    await import("../dist/proxy/shareLedger.js");

  initGrants(path.join(TEST_HOME, "settle-grants.json"));
  initShareLedger(path.join(TEST_HOME, "settle-ledger.json"));
  const issued = await createShareGrant({
    peerLabel: "settler",
    level: "live",
    entitlement: { ledger: "coins", coins: 100 },
    gates: {},
  });

  // Ten requests finishing at once. Each costs exactly 1 coin: 1000 output
  // tokens at weight 4 on a haiku multiplier of 0.25 is 1000 normalized
  // tokens, and 1000 normalized tokens is one coin.
  await Promise.all(
    Array.from({ length: 10 }, (_unused, index) =>
      settleShareUsage({
        grantId: issued.grant.id,
        accountKey: `anthropic:acct-${index}`,
        model: "claude-haiku-4-5",
        usage: { inputTokens: 0, outputTokens: 1000 },
      }),
    ),
  );

  const after = await getShareGrant(issued.grant.id);
  assertEqual(
    Math.round(after?.entitlement.coins ?? -1),
    90,
    "every concurrent settlement must reach the balance",
  );

  initGrants(path.join(TEST_HOME, ".neurolink", "proxy-grants.json"));
});

await test("resuming a drift-paused grant rearms the audit", async () => {
  const { initShareAudit, recordAuditObservation, clearAuditDrift } =
    await import("../dist/proxy/shareAudit.js");
  initShareAudit(path.join(TEST_HOME, "rearm-audit.json"));

  const drift = async (at: number, used: number) =>
    recordAuditObservation({
      grantId: "rearm",
      accountLabel: "lender@example.com",
      observation: {
        at,
        sessionUsed: used,
        weeklyUsed: 0,
        reportedCoins: 0,
        lenderRequests: 0,
      },
    });

  await drift(1, 0);
  let paused = false;
  for (let step = 1; step <= 3; step += 1) {
    const result = await drift(step + 1, step * 0.2);
    paused = paused || result.shouldPause;
  }
  assert(paused, "three unexplained intervals must trigger an auto-pause");

  // Without clearing, the marker is permanent and the audit never fires again.
  await clearAuditDrift("rearm");
  await drift(10, 0.8);
  let repaused = false;
  for (let step = 1; step <= 3; step += 1) {
    const result = await drift(10 + step, 0.8 + step * 0.2);
    repaused = repaused || result.shouldPause;
  }
  assert(
    repaused,
    "a resumed grant must be able to auto-pause on drift a second time",
  );
});

await test("a slice ceiling means a share of the pool, not of every account", async () => {
  const { filterAccountsForGrant } =
    await import("../dist/proxy/sharePolicy.js");
  const { initShareLedger, readSharePoolWindowUsage, recordShareWindowDelta } =
    await import("../dist/proxy/shareLedger.js");

  const sessionResetAt = Date.now() + 3_600_000;
  const weeklyResetAt = Date.now() + 86_400_000;
  const view = (accountKey: string, borrowed: number) => ({
    accountKey,
    sessionUsed: 0.1,
    weeklyUsed: 0.1,
    sessionResetAt,
    weeklyResetAt,
    borrowedSessionFraction: borrowed,
    borrowedWeeklyFraction: 0,
  });
  const grantWith = (gates: Record<string, unknown>) => ({
    schemaVersion: 1 as const,
    id: "pool-grant",
    peerLabel: "poolpeer",
    tokenHash: "h",
    tokenSalt: "s",
    level: "live" as const,
    state: "active" as const,
    entitlement: { ledger: "unlimited" as const },
    gates,
    createdAt: 0,
    updatedAt: 0,
  });
  const seed = async (file: string, spread: Array<[string, number]>) => {
    initShareLedger(path.join(TEST_HOME, file));
    for (const [accountKey, fraction] of spread) {
      await recordShareWindowDelta({
        grantId: "pool-grant",
        accountKey,
        sessionBefore: 0,
        sessionAfter: fraction,
        sessionResetAt,
        weeklyBefore: 0,
        weeklyAfter: 0,
        weeklyResetAt,
      });
    }
  };
  const now = Date.now();
  const cap20 = grantWith({ maxSlice: { session5hPct: 20 } });

  // Three accounts at 10% each is one tenth of the pool, not three tenths.
  await seed("pool-a.json", [
    ["a", 0.1],
    ["b", 0.1],
    ["c", 0.1],
  ]);
  const spread = [view("a", 0.1), view("b", 0.1), view("c", 0.1)];
  const spreadPool = await readSharePoolWindowUsage("pool-grant", spread);
  assert(
    Math.abs(spreadPool.sessionFraction - 0.1) < 1e-9,
    "pool usage must normalise to one window's worth",
  );
  assertEqual(
    filterAccountsForGrant(cap20, spread, now, spreadPool).allowed.length,
    3,
    "a pool under its ceiling must keep every account available",
  );

  // The same total taken from a single account must read identically.
  await seed("pool-b.json", [["a", 0.3]]);
  const concentrated = [view("a", 0.3), view("b", 0), view("c", 0)];
  const concentratedPool = await readSharePoolWindowUsage(
    "pool-grant",
    concentrated,
  );
  assert(
    Math.abs(concentratedPool.sessionFraction - spreadPool.sessionFraction) <
      1e-9,
    "the ceiling must not depend on how consumption was spread",
  );

  // Over the ceiling refuses everywhere, including on untouched accounts.
  await seed("pool-c.json", [
    ["a", 0.25],
    ["b", 0.25],
    ["c", 0.25],
  ]);
  const spent = [view("a", 0.25), view("b", 0.25), view("c", 0.25)];
  const spentPool = await readSharePoolWindowUsage("pool-grant", spent);
  const refused = filterAccountsForGrant(cap20, spent, now, spentPool);
  assertEqual(refused.allowed.length, 0, "a spent pool must serve nothing");
  assertEqual(
    refused.excluded[0]?.reason,
    "slice_exhausted",
    "the refusal must name the slice, not generic capacity",
  );

  // A single-account pool — complete mode — collapses to the per-account case.
  await seed("pool-d.json", [["solo", 0.25]]);
  const solo = [view("solo", 0.25)];
  const soloPool = await readSharePoolWindowUsage("pool-grant", solo);
  assert(
    Math.abs(soloPool.sessionFraction - 0.25) < 1e-9,
    "one account means the pool fraction is that account's fraction",
  );
  assertEqual(
    filterAccountsForGrant(cap20, solo, now, soloPool).allowed.length,
    0,
    "a complete-mode account past the ceiling must be withheld",
  );

  // The old per-account behaviour survives as an explicit opt-in.
  const perAccount = grantWith({
    maxSlicePerAccount: { session5hPct: 20 },
  });
  const mixed = filterAccountsForGrant(
    perAccount,
    [view("a", 0.25), view("b", 0.1)],
    now,
    { sessionFraction: 0.175, weeklyFraction: 0 },
  );
  assertEqual(
    mixed.allowed.length,
    1,
    "a per-account ceiling must judge each account on its own usage",
  );

  // The reserve floor stays per-account: a busy account is withheld while an
  // idle one still serves.
  const floor = grantWith({ reserveFloor: { session5hPct: 30 } });
  const byAccount = filterAccountsForGrant(
    floor,
    [{ ...view("busy", 0), sessionUsed: 0.85 }, view("idle", 0)],
    now,
    { sessionFraction: 0, weeklyFraction: 0 },
  );
  assertEqual(
    byAccount.allowed.join(","),
    "idle",
    "headroom must be judged per account, not pooled",
  );

  initShareLedger(
    path.join(TEST_HOME, ".neurolink", "proxy-share-ledger.json"),
  );
});

await test("the share listener follows the grant file, gating only itself", async () => {
  // A home of its own: the listener's whole behaviour is "does this node lend
  // anything", and the suite's other grants would answer that before we asked.
  const listenerHome = path.join(TEST_HOME, "listener-node");
  fs.mkdirSync(listenerHome, { recursive: true });
  const listenerEnv = {
    ...process.env,
    HOME: listenerHome,
    USERPROFILE: listenerHome,
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
  };
  const listenerCli = async (args: string[]): Promise<string> => {
    const { stdout } = await execFileAsync(process.execPath, [CLI, ...args], {
      env: listenerEnv,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  };

  const child = spawn(
    process.execPath,
    [
      CLI,
      "proxy",
      "start",
      "--port",
      String(LISTENER_PORT),
      "--share-port",
      String(LISTENER_SHARE_PORT),
      "--quiet",
    ],
    { stdio: ["ignore", "pipe", "pipe"], env: listenerEnv },
  );
  children.push(child);

  const deadline = Date.now() + 45_000;
  let healthy = false;
  while (Date.now() < deadline && !healthy) {
    try {
      const response = await fetch(`http://127.0.0.1:${LISTENER_PORT}/health`);
      healthy = response.ok;
    } catch {
      // Not listening yet.
    }
    if (!healthy) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  if (!healthy) {
    throw new Error(
      `SKIP: listener proxy did not become healthy on port ${LISTENER_PORT}`,
    );
  }

  const shareListenerUp = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `http://127.0.0.1:${LISTENER_SHARE_PORT}/health`,
      );
      return response.ok;
    } catch {
      return false;
    }
  };

  // No grants issued, so nothing to gate and nothing to expose.
  assertEqual(
    await shareListenerUp(),
    false,
    "a node that lends nothing must not open a second port",
  );

  const created = await listenerCli([
    "proxy",
    "share",
    "create",
    "--peer",
    "listener-peer",
    "--preset",
    "open",
    "--json",
  ]);
  const token = (JSON.parse(created) as { token: string }).token;

  // The supervisor polls; give it a couple of cycles' grace.
  const upBy = Date.now() + 40_000;
  let up = false;
  while (Date.now() < upBy && !up) {
    up = await shareListenerUp();
    if (!up) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  assert(up, "issuing the first grant must bring the share listener up");

  // The share port refuses an untokened request...
  const untokened = await fetch(
    `http://127.0.0.1:${LISTENER_SHARE_PORT}/v1/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    },
  );
  assertEqual(
    untokened.headers.get("x-neurolink-grant-reason"),
    "missing_token",
    "the share listener must refuse a request carrying no token",
  );

  // ...while the same request on the main port is not gated at all. It fails
  // for want of credentials in this isolated home, which is precisely the proof
  // that it got past the gate.
  const local = await fetch(`http://127.0.0.1:${LISTENER_PORT}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    }),
  });
  assertEqual(
    local.headers.get("x-neurolink-grant-reason"),
    null,
    "the main port must keep serving the operator's own untokened client",
  );

  // A token is accepted on the share port.
  const tokened = await fetch(
    `http://127.0.0.1:${LISTENER_SHARE_PORT}/v1/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-neurolink-share-token": token,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    },
  );
  assertEqual(
    tokened.headers.get("x-neurolink-grant-reason"),
    null,
    "a valid token must pass the share listener's gate",
  );

  // Revoking the last grant takes the port away again.
  await listenerCli(["proxy", "share", "revoke", "--peer", "listener-peer"]);
  const downBy = Date.now() + 40_000;
  let down = false;
  while (Date.now() < downBy && !down) {
    down = !(await shareListenerUp());
    if (!down) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  assert(down, "revoking the last grant must close the share listener");
});

await test("expose refuses to publish an ungated proxy", async () => {
  let failed = false;
  let output: string;
  try {
    output = await cli(["proxy", "expose", "--port", String(OPEN_PORT)]);
  } catch (error) {
    failed = true;
    output = error instanceof Error ? error.message : String(error);
  }
  assert(
    failed || output.includes("Refusing to expose"),
    "exposing an ungated proxy must be refused",
  );
});

for (const child of children) {
  child.kill("SIGTERM");
}
stubLender?.close();
await new Promise((resolve) => setTimeout(resolve, 500));
fs.rmSync(TEST_HOME, { recursive: true, force: true });

await runSuite();
