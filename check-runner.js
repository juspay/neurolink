import http from "node:http";
import https from "node:https";
import { exec, execFile as execFileCb } from "node:child_process";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { pullSnapshot } from "./pullSnapshot.js";

const execFile = promisify(execFileCb);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.CHECK_RUNNER_JWT_SECRET || "";
const JOB_TTL_MS = Number(process.env.CHECK_RUNNER_JOB_TTL_MS || 3_600_000);
const CLEANUP_INTERVAL_MS = Number(process.env.CHECK_RUNNER_JOB_CLEANUP_INTERVAL_MS || 60_000);
const MAX_JOBS = Number(process.env.CHECK_RUNNER_MAX_JOBS || 500);
const DEFAULT_TIMEOUT_MS = Number(process.env.CHECK_RUNNER_COMMAND_TIMEOUT_MS || 600_000);
const GIT_CLONE_TIMEOUT_MS = Number(process.env.CHECK_RUNNER_GIT_CLONE_TIMEOUT_MS || 300_000); // 5 min
// e.g. https://bitbucket.juspay.net/scm/bz/lighthouse.git — used to derive the base URL for any repo
const GIT_REPO_URL      = process.env.GIT_REPO_URL      || "";
const GIT_READ_USERNAME = process.env.GIT_READ_USERNAME  || "";
const GIT_READ_TOKEN    = process.env.GIT_READ_TOKEN     || "";

// Proxy config — the pod sets HTTP_PROXY_HOST + HTTP_PROXY_PORT for outbound traffic.
// We turn that into a proper proxy URL that git/curl understand.
const HTTP_PROXY_HOST   = process.env.HTTP_PROXY_HOST    || "";
const HTTP_PROXY_PORT   = process.env.HTTP_PROXY_PORT    || "";
const PROXY_URL = HTTP_PROXY_HOST && HTTP_PROXY_PORT
  ? `http://${HTTP_PROXY_HOST}:${HTTP_PROXY_PORT}`
  : "";
const MAX_BODY_BYTES = 1 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 100 * 1024;

// Env vars that commands are allowed to see.
// JWT secret, git credentials, and cloud credentials never reach subprocesses.
// NODE_OPTIONS is forced to cap memory — lighthouse scripts request 8GB but the pod only has 4GB.
// HTTP(S)_PROXY + NO_PROXY are forwarded so pnpm install (and any user command
// that needs outbound network) can reach the npm registry through the pod's
// outbound proxy on AWS.
const COMMAND_ENV = {
  ...Object.fromEntries(
    [
      "PATH", "HOME", "USER", "SHELL", "LANG", "TERM", "TMPDIR",
      "NODE_VERSION", "HOSTNAME", "npm_config_cache", "PNPM_HOME", "COREPACK_HOME",
      "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD",
      "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY",
      "http_proxy", "https_proxy", "no_proxy",
    ]
      .filter((k) => process.env[k] !== undefined)
      .map((k) => [k, process.env[k]]),
  ),
  NODE_OPTIONS: `--max-old-space-size=${process.env.CHECK_RUNNER_NODE_MAX_MEM_MB || "2048"}`,
};

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------
const E = {
  UNAUTHORIZED:    "UNAUTHORIZED",
  BAD_REQUEST:     "BAD_REQUEST",
  BAD_JSON:        "BAD_JSON",
  PULL_FAILED:     "PULL_FAILED",
  DIFF_FAILED:     "DIFF_FAILED",
  INSTALL_FAILED:  "INSTALL_FAILED",
  COMMAND_FAILED:  "COMMAND_FAILED",
  COMMAND_TIMEOUT: "COMMAND_TIMEOUT",
  INTERNAL:        "INTERNAL",
};

// ---------------------------------------------------------------------------
// Job store
// ---------------------------------------------------------------------------
/** @type {Map<string, Record<string, unknown>>} */
const jobs = new Map();
/** @type {string[]} */
const queue = [];
let workerBusy = false;

// ---------------------------------------------------------------------------
// JWT Auth (HS256 — uses Node built-in crypto, no external deps)
// ---------------------------------------------------------------------------

function base64UrlDecode(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Verify a HS256 JWT. Returns the payload on success, null on any failure.
 * @param {string} token
 * @returns {{ sub?: string; iat?: number; exp?: number } | null}
 */
function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  try {
    const header = JSON.parse(base64UrlDecode(headerB64).toString());
    if (header.alg !== "HS256") return null;
  } catch { return null; }

  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actual = base64UrlDecode(sigB64);
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;

  let payload;
  try { payload = JSON.parse(base64UrlDecode(payloadB64).toString()); } catch { return null; }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now > payload.exp) return null;

  return payload;
}

/** @param {http.IncomingMessage} req */
function isAuthorized(req) {
  if (!JWT_SECRET) return true;
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  return verifyJwt(token) !== null;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) { req.destroy(); reject(new Error("Request body too large")); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function parseJson(raw) {
  if (!raw || raw.trim() === "") return {};
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Body must be a JSON object");
  return obj;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   repoName: string;
 *   branchRef: string;
 *   commands: string[];
 *   commandTimeoutMs: number;
 * }} JobInput
 */

/** @returns {{ ok: true; input: JobInput } | { ok: false; reason: string }} */
function validateAndNormalize(raw) {
  if ("commands" in raw && !Array.isArray(raw.commands)) {
    return { ok: false, reason: "commands must be an array" };
  }
  if (
    "commandTimeoutMs" in raw &&
    (typeof raw.commandTimeoutMs !== "number" || !Number.isFinite(raw.commandTimeoutMs) || raw.commandTimeoutMs <= 0)
  ) {
    return { ok: false, reason: "commandTimeoutMs must be a positive number" };
  }

  const str = (v) => typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

  const repoName = str(raw.repoName);
  const branchRef = str(raw.branchRef);

  const commands = Array.isArray(raw.commands)
    ? raw.commands.filter((c) => typeof c === "string" && c.trim()).map((c) => c.trim())
    : [];

  const commandTimeoutMs =
    typeof raw.commandTimeoutMs === "number" && Number.isFinite(raw.commandTimeoutMs) && raw.commandTimeoutMs > 0
      ? Math.floor(raw.commandTimeoutMs)
      : DEFAULT_TIMEOUT_MS;

  if (!repoName) return { ok: false, reason: "repoName is required" };
  if (!branchRef) return { ok: false, reason: "branchRef is required" };
  if (commands.length === 0) return { ok: false, reason: "commands must be a non-empty array" };

  return { ok: true, input: { repoName, branchRef, commands, commandTimeoutMs } };
}

// ---------------------------------------------------------------------------
// Git helpers — build authenticated repo URL from pod env vars
// ---------------------------------------------------------------------------

/**
 * Build an authenticated HTTPS clone URL for a given repo.
 * Derives the base from GIT_REPO_URL, injects GIT_READ_USERNAME:GIT_READ_TOKEN.
 * @param {string} repoName
 * @returns {string}
 */
function buildRepoUrl(repoName) {
  if (!GIT_REPO_URL || !GIT_READ_USERNAME || !GIT_READ_TOKEN) {
    throw new Error("GIT_REPO_URL, GIT_READ_USERNAME, and GIT_READ_TOKEN must be configured");
  }
  // Manually encode credentials — new URL() does not encode `+` in the password
  // component, which Bitbucket interprets as a space and rejects with 403.
  const parsed = new URL(GIT_REPO_URL);
  const encodedUser = encodeURIComponent(GIT_READ_USERNAME);
  const encodedToken = encodeURIComponent(GIT_READ_TOKEN);
  const basePath = parsed.pathname.replace(/\/[^/]+$/, "");
  return `${parsed.protocol}//${encodedUser}:${encodedToken}@${parsed.host}${basePath}/${repoName}.git`;
}

// ---------------------------------------------------------------------------
// Branch diff via git — clone branch, replace snapshot files to match branch exactly
// ---------------------------------------------------------------------------

/**
 * Recursively collect all file paths (relative) under a directory.
 * @param {string} baseDir
 * @param {string} relDir
 * @param {Set<string>} fileSet
 * @param {Set<string>} skipDirs - directory names to skip (e.g. ".git", "node_modules")
 */
async function walkFiles(baseDir, relDir, fileSet, skipDirs) {
  const fullDir = relDir ? path.join(baseDir, relDir) : baseDir;
  const entries = await fs.readdir(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const relPath = relDir ? path.join(relDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await walkFiles(baseDir, relPath, fileSet, skipDirs);
    } else {
      fileSet.add(relPath);
    }
  }
}

/**
 * Clone the branch (depth=1) and make the snapshot workDir an exact replica.
 * No merge-base, no diff filters — just replace files, add new ones, delete stale ones.
 * This gives us the exact state of the user's local branch.
 *
 * @param {string} repoName
 * @param {string} branchRef
 * @param {string} workDir - snapshot directory to overlay onto
 * @returns {Promise<{ copiedCount: number; deletedCount: number; branchDir: string }>}
 */
/**
 * Run a shell command and capture full output for diagnostics. Never throws.
 */
async function diagRun(cmd, timeoutMs = 15_000, extraEnv = {}) {
  return new Promise((resolve) => {
    exec(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, ...extraEnv },
    }, (err, stdout, stderr) => {
      resolve({
        exitCode: err && typeof err.code === "number" ? err.code : (err ? 1 : 0),
        stdout: (stdout || "").slice(-1500),
        stderr: (stderr || "").slice(-1500),
      });
    });
  });
}

/**
 * Run a series of network/auth probes from inside the pod so we can see
 * exactly why git clone is failing. Output is embedded in the job error.
 */
/**
 * Issue a single HTTPS GET using Node's built-in modules (no curl dependency).
 * If `viaProxy` is true and PROXY_URL is set, tunnels via the HTTP proxy's CONNECT.
 * Returns { status, error } — status is the HTTP response code, or null on failure.
 */
function nodeProbe(targetUrl, { viaProxy = false, withAuth = true } = {}) {
  return new Promise((resolve) => {
    const url = new URL(targetUrl);
    const headers = { Host: url.host, "User-Agent": "check-runner-diag/1.0" };
    if (withAuth && GIT_READ_USERNAME && GIT_READ_TOKEN) {
      headers.Authorization = "Basic " + Buffer.from(`${GIT_READ_USERNAME}:${GIT_READ_TOKEN}`).toString("base64");
    }

    const timeoutMs = 10_000;
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };

    if (viaProxy && PROXY_URL) {
      // CONNECT tunnel through the HTTP proxy, then issue HTTPS over the tunnel.
      const proxy = new URL(PROXY_URL);
      const req = http.request({
        host: proxy.hostname,
        port: Number(proxy.port),
        method: "CONNECT",
        path: `${url.hostname}:${url.port || 443}`,
        timeout: timeoutMs,
        headers: { Host: `${url.hostname}:${url.port || 443}` },
      });
      req.on("connect", (res, socket) => {
        if (res.statusCode !== 200) { done({ status: null, error: `proxy CONNECT → ${res.statusCode}` }); return; }
        const tlsReq = https.request({
          host: url.hostname,
          port: Number(url.port || 443),
          method: "GET",
          path: url.pathname + url.search,
          headers,
          socket,
          agent: false,
          timeout: timeoutMs,
        }, (r) => { done({ status: r.statusCode, error: null }); r.resume(); });
        tlsReq.on("error", (e) => done({ status: null, error: `tls: ${e.message}` }));
        tlsReq.on("timeout", () => { tlsReq.destroy(); done({ status: null, error: "tls timeout" }); });
        tlsReq.end();
      });
      req.on("error", (e) => done({ status: null, error: `proxy: ${e.message}` }));
      req.on("timeout", () => { req.destroy(); done({ status: null, error: "proxy connect timeout" }); });
      req.end();
    } else {
      const req = https.request({
        host: url.hostname,
        port: Number(url.port || 443),
        method: "GET",
        path: url.pathname + url.search,
        headers,
        timeout: timeoutMs,
      }, (r) => { done({ status: r.statusCode, error: null }); r.resume(); });
      req.on("error", (e) => done({ status: null, error: e.message }));
      req.on("timeout", () => { req.destroy(); done({ status: null, error: "timeout" }); });
      req.end();
    }
  });
}

/**
 * Run a series of network probes from inside the pod when git clone fails,
 * so we can see exactly where the request is being blocked. All probes use
 * Node's built-in https/http modules — curl is not installed in the image.
 */
async function collectDiffDiagnostics(repoUrl) {
  const redactedUrl = repoUrl.replace(/:[^:@]+@/, ":[REDACTED]@");
  const lines = [];
  lines.push("=== DIAGNOSTICS ===");
  lines.push(`Redacted URL:          ${redactedUrl}`);
  lines.push(`HTTP_PROXY_HOST:       ${HTTP_PROXY_HOST || "(unset)"}`);
  lines.push(`HTTP_PROXY_PORT:       ${HTTP_PROXY_PORT || "(unset)"}`);
  lines.push(`PROXY_URL (derived):   ${PROXY_URL || "(none)"}`);
  lines.push(`env HTTPS_PROXY:       ${process.env.HTTPS_PROXY || "(unset)"}`);
  lines.push(`env HTTP_PROXY:        ${process.env.HTTP_PROXY || "(unset)"}`);
  lines.push(`env NO_PROXY:          ${process.env.NO_PROXY || "(unset)"}`);

  // DNS + TCP reachability
  const dns = await diagRun("getent hosts bitbucket.juspay.net");
  lines.push(`\n[DNS] exit=${dns.exitCode} ${dns.stdout.trim()}`);
  const tcp = await diagRun("timeout 5 bash -c '</dev/tcp/bitbucket.juspay.net/443' && echo OPEN || echo CLOSED");
  lines.push(`[TCP 443] exit=${tcp.exitCode} ${tcp.stdout.trim()}`);

  // HTTPS probes to the git protocol endpoint
  const gitEndpoint = "https://bitbucket.juspay.net/scm/bz/lighthouse.git/info/refs?service=git-upload-pack";
  const directNoAuth = await nodeProbe(gitEndpoint, { withAuth: false });
  lines.push(`\n[HTTPS direct noauth] status=${directNoAuth.status ?? "ERR"} ${directNoAuth.error || ""}`);
  const directAuth = await nodeProbe(gitEndpoint, { withAuth: true });
  lines.push(`[HTTPS direct auth]   status=${directAuth.status ?? "ERR"} ${directAuth.error || ""}`);

  if (PROXY_URL) {
    const proxyAuth = await nodeProbe(gitEndpoint, { withAuth: true, viaProxy: true });
    lines.push(`[HTTPS via proxy]     status=${proxyAuth.status ?? "ERR"} ${proxyAuth.error || ""}`);

    // git ls-remote via the proxy
    const gitProxy = await diagRun(`git ls-remote '${repoUrl}' HEAD`, 15_000, {
      HTTPS_PROXY: PROXY_URL,
      HTTP_PROXY: PROXY_URL,
    });
    lines.push(`\n[git ls-remote via proxy] exit=${gitProxy.exitCode} stderr=${gitProxy.stderr.trim().slice(0, 300)}`);
  }

  // git ls-remote direct (no proxy) — baseline
  const gitDirect = await diagRun(`git -c http.proxy= ls-remote '${repoUrl}' HEAD`, 15_000, {
    HTTPS_PROXY: "",
    HTTP_PROXY: "",
  });
  lines.push(`[git ls-remote direct]    exit=${gitDirect.exitCode} stderr=${gitDirect.stderr.trim().slice(0, 300)}`);

  return lines.join("\n");
}

async function applyBranchDiff(repoName, branchRef, workDir) {
  const repoUrl = buildRepoUrl(repoName);
  const branchDir = await fs.mkdtemp(path.join(os.tmpdir(), `cr-branch-${repoName}-`));

  // If a proxy is configured, pass it to git via HTTPS_PROXY/HTTP_PROXY.
  // Git respects these env vars (and NO_PROXY) natively.
  const gitEnv = PROXY_URL
    ? { ...process.env, HTTPS_PROXY: PROXY_URL, HTTP_PROXY: PROXY_URL }
    : process.env;

  if (PROXY_URL) {
    console.log(`[DIFF] using proxy: ${PROXY_URL}`);
  }

  try {
    // Clone just the latest commit — we only need the current file state.
    await execFile(
      "git", ["clone", "--depth=1", "--branch", branchRef, "--single-branch", repoUrl, branchDir],
      { timeout: GIT_CLONE_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024, env: gitEnv },
    );

    const SKIP = new Set([".git", "node_modules"]);

    // Collect all files from the branch clone.
    const branchFiles = new Set();
    await walkFiles(branchDir, "", branchFiles, SKIP);

    // Copy every branch file into workDir (overwrite existing, create new).
    let copiedCount = 0;
    for (const relPath of branchFiles) {
      const src = path.join(branchDir, relPath);
      const dest = path.join(workDir, relPath);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      try { await fs.unlink(dest); } catch { /* may not exist */ }
      await fs.copyFile(src, dest);
      copiedCount++;
    }

    // Delete files in workDir that don't exist in the branch (stale beta files).
    const workFiles = new Set();
    await walkFiles(workDir, "", workFiles, SKIP);

    let deletedCount = 0;
    for (const relPath of workFiles) {
      if (!branchFiles.has(relPath)) {
        await fs.rm(path.join(workDir, relPath), { force: true });
        deletedCount++;
      }
    }

    console.log(`[DIFF] ${copiedCount} copied, ${deletedCount} deleted`);
    return { copiedCount, deletedCount, branchDir };

  } catch (err) {
    // Collect diagnostics so we can see exactly why the clone failed from inside the pod.
    let diag = "";
    try { diag = await collectDiffDiagnostics(repoUrl); }
    catch (e) { diag = `(diagnostics failed: ${e && e.message})`; }

    console.log(`[DIFF] clone failed, diagnostics:\n${diag}`);

    await fs.rm(branchDir, { recursive: true, force: true });

    // Re-throw with diagnostics appended to the message so it surfaces in the job error.
    const origMsg = err && err.message ? err.message : String(err);
    const wrapped = new Error(`${origMsg}\n\n${diag}`);
    throw wrapped;
  }
}

// ---------------------------------------------------------------------------
// pnpm install
// ---------------------------------------------------------------------------

async function runPnpmInstall(workDir, timeoutMs) {
  return new Promise((resolve, reject) => {
    exec(
      "pnpm install --frozen-lockfile",
      {
        cwd: workDir,
        timeout: timeoutMs,
        killSignal: "SIGKILL",
        maxBuffer: 10 * 1024 * 1024,
        env: { ...COMMAND_ENV, NODE_ENV: "test", CI: "true" },
      },
      (error, stdout, stderr) => {
        if (error) reject(Object.assign(error, { stdout, stderr }));
        else resolve({ stdout, stderr });
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

function truncate(str, limit = MAX_OUTPUT_BYTES) {
  if (typeof str !== "string") return "";
  if (Buffer.byteLength(str) <= limit) return str;
  return Buffer.from(str).subarray(0, limit).toString("utf8") + "\n…[truncated]";
}

/** Run commands sequentially. Stops on first failure. */
async function runCommands(workDir, commands, timeoutMs) {
  const results = [];
  for (const command of commands) {
    const start = Date.now();
    const result = await new Promise((resolve) => {
      exec(
        command,
        {
          cwd: workDir,
          timeout: timeoutMs,
          killSignal: "SIGKILL",
          maxBuffer: 10 * 1024 * 1024,
          env: { ...COMMAND_ENV, NODE_ENV: "test", CI: "true" },
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - start;
          const timedOut = !!(error && error.killed);
          resolve({
            command,
            success: !error,
            exitCode: error && typeof error.code === "number" ? error.code : 0,
            durationMs,
            stdout: truncate(stdout),
            stderr: truncate(stderr),
            timedOut,
          });
        },
      );
    });
    results.push(result);
    if (!result.success) break;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Job lifecycle
// ---------------------------------------------------------------------------

function stamp(job, patch) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function toResponse(job) {
  return {
    jobId:          job.jobId,
    status:         job.status,
    stage:          job.stage,
    createdAt:      job.createdAt,
    updatedAt:      job.updatedAt,
    snapshotId:     job.snapshotId ?? null,
    commandResults: job.commandResults ?? [],
    error:          job.error ?? null,
  };
}

async function executeJob(job) {
  const { repoName, branchRef, commands, commandTimeoutMs } = /** @type {JobInput} */ (job.input);
  let workDir = "";
  let branchDir = "";

  try {
    // --- 1. Pull beta snapshot from GCS ---
    stamp(job, { status: "running", stage: "pull" });
    console.log(`[JOB ${job.jobId}] starting | repo: ${repoName} | branch: ${branchRef} | commands: ${commands.length}`);

    let snapshotId;
    try {
      ({ workDir, snapshotId } = await pullSnapshot(repoName));
      console.log(`[JOB ${job.jobId}] snapshot pulled: ${snapshotId} -> ${workDir}`);
    } catch (err) {
      stamp(job, { status: "failed", stage: "pull", error: { code: E.PULL_FAILED, message: errMsg(err) } });
      return;
    }
    stamp(job, { snapshotId: snapshotId ?? null });

    // --- 2. Fetch branch diff via git and overlay onto snapshot ---
    stamp(job, { stage: "diff" });
    console.log(`[JOB ${job.jobId}] fetching branch diff for: ${branchRef}`);

    try {
      const result = await applyBranchDiff(repoName, branchRef, workDir);
      branchDir = result.branchDir;
      console.log(`[JOB ${job.jobId}] diff applied (${result.changedCount} changed, ${result.deletedCount} deleted)`);
    } catch (err) {
      stamp(job, { status: "failed", stage: "diff", error: { code: E.DIFF_FAILED, message: errMsg(err) } });
      return;
    }

    // --- 3. Install dependencies ---
    stamp(job, { stage: "install" });
    console.log(`[JOB ${job.jobId}] running pnpm install`);
    try {
      await runPnpmInstall(workDir, commandTimeoutMs);
      console.log(`[JOB ${job.jobId}] install complete`);
    } catch (err) {
      stamp(job, { status: "failed", stage: "install", error: { code: E.INSTALL_FAILED, message: errMsg(err) } });
      return;
    }

    // --- 4. Run commands ---
    stamp(job, { stage: "command" });
    console.log(`[JOB ${job.jobId}] running ${commands.length} command(s)`);
    const results = await runCommands(workDir, commands, commandTimeoutMs);
    stamp(job, { commandResults: results });

    const failed = results.find((r) => !r.success);
    if (failed) {
      const code = failed.timedOut ? E.COMMAND_TIMEOUT : E.COMMAND_FAILED;
      const message = failed.timedOut
        ? `Timed out after ${commandTimeoutMs}ms: ${failed.command}`
        : `Command failed: ${failed.command}`;
      stamp(job, { status: "failed", stage: "command", error: { code, message } });
      return;
    }

    console.log(`[JOB ${job.jobId}] completed`);
    stamp(job, { status: "completed", stage: "done" });

  } catch (err) {
    stamp(job, { status: "failed", stage: "internal", error: { code: E.INTERNAL, message: errMsg(err) } });
  } finally {
    if (workDir) {
      try { await fs.rm(workDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
    if (branchDir) {
      try { await fs.rm(branchDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }
}

function errMsg(err) {
  return err instanceof Error ? err.message : "Unknown error";
}

// ---------------------------------------------------------------------------
// Queue worker
// ---------------------------------------------------------------------------

const MAX_JOB_MS = Number(process.env.CHECK_RUNNER_MAX_JOB_MS || 900_000); // 15 min hard ceiling per job

/** Wrap executeJob with a hard timeout so a hung job can never block the queue forever. */
async function executeJobWithTimeout(job) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log(`[JOB ${job.jobId}] HARD TIMEOUT after ${MAX_JOB_MS}ms — force-failing`);
      stamp(job, { status: "failed", stage: job.stage || "unknown", error: { code: "JOB_TIMEOUT", message: `Job exceeded hard ceiling of ${MAX_JOB_MS}ms` } });
      resolve();
    }, MAX_JOB_MS);

    executeJob(job).then(resolve, (err) => {
      // Should never happen (executeJob catches internally), but guard anyway.
      console.error(`[JOB ${job.jobId}] uncaught error in executeJob:`, err);
      stamp(job, { status: "failed", stage: "internal", error: { code: E.INTERNAL, message: errMsg(err) } });
      resolve();
    }).finally(() => clearTimeout(timer));
  });
}

async function drainQueue() {
  if (workerBusy) return;
  workerBusy = true;
  try {
    while (queue.length > 0) {
      const id = queue.shift();
      const job = id && jobs.get(id);
      if (job) await executeJobWithTimeout(job);
    }
  } finally {
    // Always release the lock — even if something unexpected throws.
    workerBusy = false;
  }
}

// ---------------------------------------------------------------------------
// Job cleanup
// ---------------------------------------------------------------------------

function cleanup() {
  const now = Date.now();
  const stale = [];

  for (const [id, job] of jobs) {
    if (job.status !== "completed" && job.status !== "failed") continue;
    const t = Date.parse(String(job.updatedAt || job.createdAt));
    if (!Number.isNaN(t) && now - t > JOB_TTL_MS) {
      jobs.delete(id);
    } else {
      stale.push([id, t]);
    }
  }

  if (jobs.size > MAX_JOBS) {
    stale.sort((a, b) => a[1] - b[1]);
    while (jobs.size > MAX_JOBS && stale.length > 0) jobs.delete(stale.shift()[0]);
  }
}

const cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const JOB_ID_RE = /^\/run-checks\/([^/]+)$/;

const server = http.createServer(async (req, res) => {
  if (!isAuthorized(req)) {
    return json(res, 401, { code: E.UNAUTHORIZED, error: "Invalid or missing credentials" });
  }

  // --- poll job ---
  if (req.method === "GET") {
    const m = req.url && JOB_ID_RE.exec(req.url);
    if (!m) { res.writeHead(404); return res.end("Not found"); }
    const jobId = decodeURIComponent(m[1]);
    const job = jobs.get(jobId);
    if (!job) {
      console.log(`[GET] 404 — job not found: ${jobId}`);
      return json(res, 404, { error: "Job not found" });
    }
    console.log(`[GET] 200 — job: ${jobId} | status: ${job.status} | stage: ${job.stage}`);
    return json(res, 200, toResponse(job));
  }

  // --- submit job ---
  if (req.method !== "POST" || req.url !== "/run-checks") {
    res.writeHead(404); return res.end("Not found");
  }

  let body;
  try { body = await readBody(req); } catch {
    return json(res, 400, { error: "Invalid or oversized body" });
  }

  let parsed;
  try { parsed = parseJson(body); } catch (err) {
    return json(res, 400, { code: E.BAD_JSON, error: errMsg(err) });
  }

  const v = validateAndNormalize(parsed);
  if (!v.ok) return json(res, 400, { code: E.BAD_REQUEST, error: v.reason });

  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();
  const job = { jobId, status: "queued", stage: "queued", createdAt: now, updatedAt: now, input: v.input, commandResults: [] };

  jobs.set(jobId, job);
  queue.push(jobId);
  console.log(`[POST] 202 -> queued job: ${jobId} | branch: ${v.input.branchRef} | repo: ${v.input.repoName}`);
  void drainQueue();

  return json(res, 202, { jobId, status: "queued" });
});

server.listen(PORT, () => {
  console.log(`check-runner listening on :${PORT}`);
});
