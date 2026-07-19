import { createServer, type Server } from "node:http";
import { once } from "node:events";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyReplayCommand } from "../src/cli/commands/proxyReplay.js";
import {
  compareProxyReplayBundle,
  exportProxyReplayBundle,
  readProxyReplayBundle,
  serializeProxyReplayDocument,
  writeProxyReplayDocument,
} from "../src/lib/proxy/proxyReplay.js";
import type { ProxyReplayBundle } from "../src/lib/types/index.js";
import {
  initRequestLogger,
  logBodyCapture,
} from "../src/lib/proxy/requestLogger.js";
import { logger } from "../src/lib/utils/logger.js";

const gunzipAsync = promisify(gunzip);
const gzipAsync = promisify(gzip);
const temporaryDirectories: string[] = [];
const servers: Server[] = [];

async function makeTempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "neurolink-replay-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) {
    return;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

afterEach(async () => {
  vi.restoreAllMocks();
  initRequestLogger(false);
  await Promise.allSettled(servers.splice(0).map(closeServer));
  await Promise.allSettled(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function captureRequest(args: {
  logsDir: string;
  requestId?: string;
  attempt?: number;
  url?: string;
  requestBody?: string;
  responseBody?: string;
  includeResponse?: boolean;
}) {
  initRequestLogger(true, args.logsDir);
  const requestId = args.requestId ?? "request-replay-1";
  const attempt = args.attempt ?? 1;
  const timestamp = "2026-07-19T10:00:00.000Z";
  const requestBody =
    args.requestBody ??
    JSON.stringify({
      model: "claude-sonnet-5",
      messages: [{ role: "user", content: "hello" }],
    });
  const responseBody =
    args.responseBody ??
    JSON.stringify({ id: "message-1", type: "message", content: [] });
  await logBodyCapture({
    timestamp,
    requestId,
    phase: "client_request",
    model: "claude-sonnet-5",
    stream: false,
    headers: {
      authorization: "Bearer client-secret",
      "content-type": "application/json",
    },
    body: requestBody,
  });
  await logBodyCapture({
    timestamp: "2026-07-19T10:00:00.010Z",
    requestId,
    phase: "upstream_request",
    model: "claude-sonnet-5",
    stream: false,
    headers: {
      authorization: "Bearer upstream-secret",
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: requestBody,
    account: "fixture@example.com",
    accountType: "oauth",
    attempt,
    metadata: {
      upstreamMethod: "POST",
      upstreamUrl:
        args.url ?? "https://api.anthropic.com/v1/messages?beta=true",
    },
  });
  if (args.includeResponse !== false) {
    await logBodyCapture({
      timestamp: "2026-07-19T10:00:00.020Z",
      requestId,
      phase: "upstream_response",
      model: "claude-sonnet-5",
      stream: false,
      headers: {
        "content-type": "application/json",
        "x-request-id": "upstream-1",
      },
      contentType: "application/json",
      body: responseBody,
      responseStatus: 200,
      account: "fixture@example.com",
      accountType: "oauth",
      attempt,
    });
    await logBodyCapture({
      timestamp: "2026-07-19T10:00:00.030Z",
      requestId,
      phase: "client_response",
      model: "claude-sonnet-5",
      stream: false,
      headers: { "content-type": "application/json" },
      contentType: "application/json",
      body: responseBody,
      responseStatus: 200,
      account: "fixture@example.com",
      accountType: "oauth",
      attempt,
    });
  }
  return { requestId, requestBody, responseBody };
}

async function debugIndex(logsDir: string): Promise<string> {
  const files = await readdir(logsDir);
  const file = files.find((entry) => entry.startsWith("proxy-debug-"));
  if (!file) {
    throw new Error("debug index not found");
  }
  return join(logsDir, file);
}

describe("proxy replay bundle export", () => {
  it("captures the exact upstream method and URL at every Anthropic request site", async () => {
    const source = await readFile(
      new URL("../src/lib/server/routes/claudeProxyRoutes.ts", import.meta.url),
      "utf8",
    );
    const blocks = [
      ...source.matchAll(
        /logProxyBody\(\{\s*phase: "upstream_request",[\s\S]*?\n\s*\}\);/g,
      ),
    ].map((match) => match[0]);
    expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      expect(block).toContain("metadata:");
      expect(block).toContain('upstreamMethod: "POST"');
      expect(block).toMatch(
        /upstreamUrl: (?:url|"https:\/\/api\.anthropic\.com\/v1\/messages\?beta=true")/,
      );
    }
  });

  it("exports deterministic, redacted, hash-verified evidence with restrictive permissions", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });

    const first = await exportProxyReplayBundle({ requestId, logsDir });
    const second = await exportProxyReplayBundle({ requestId, logsDir });
    expect(serializeProxyReplayDocument(first)).toBe(
      serializeProxyReplayDocument(second),
    );
    expect(first.completeness).toMatchObject({
      captures: 4,
      replayable: true,
      blockers: [],
    });
    expect(first.request).toMatchObject({
      method: "POST",
      url: "https://api.anthropic.com/v1/messages?beta=true",
      requiredHeaderInputs: ["authorization"],
      account: "fixture@example.com",
      accountType: "oauth",
    });
    expect(first.request.headers.authorization).toBe("[REDACTED]");

    const output = join(logsDir, "exports", "request.json");
    const written = await writeProxyReplayDocument(output, first);
    const serialized = await readFile(written.path, "utf8");
    expect(serialized).not.toContain("upstream-secret");
    expect(serialized).not.toContain("client-secret");
    expect((await stat(written.path)).mode & 0o777).toBe(0o600);
    expect(await readProxyReplayBundle(written.path)).toEqual(first);
  });

  it("honors quiet mode while still writing the CLI export", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const output = join(logsDir, "quiet-export.json");
    const always = vi
      .spyOn(logger, "always")
      .mockImplementation(() => undefined);

    await proxyReplayCommand.handler({
      $0: "neurolink",
      _: ["proxy", "replay"],
      action: "export",
      requestId,
      logsDir,
      output,
      format: "text",
      quiet: true,
    });

    expect(always).not.toHaveBeenCalled();
    expect((await stat(output)).isFile()).toBe(true);
  });

  it("selects the latest upstream attempt unless an attempt is requested", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir, attempt: 1 });
    await captureRequest({
      logsDir,
      requestId,
      attempt: 2,
      requestBody: JSON.stringify({
        model: "claude-sonnet-5",
        messages: [{ role: "user", content: "retry" }],
      }),
    });

    expect(
      (await exportProxyReplayBundle({ requestId, logsDir })).selectedAttempt,
    ).toBe(2);
    expect(
      (await exportProxyReplayBundle({ requestId, logsDir, attempt: 1 }))
        .selectedAttempt,
    ).toBe(1);
  });

  it("evaluates response completeness for the selected attempt", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir, attempt: 1 });
    await captureRequest({
      logsDir,
      requestId,
      attempt: 2,
      includeResponse: false,
    });

    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    expect(bundle.selectedAttempt).toBe(2);
    expect(bundle.capturedResponse).toBeNull();
    expect(bundle.completeness.missingRequiredPhases).toContain(
      "upstream_response",
    );
  });

  it("reports missing phases and refuses to claim the bundle is replayable", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({
      logsDir,
      includeResponse: false,
    });
    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    expect(bundle.completeness.replayable).toBe(false);
    expect(bundle.completeness.missingRequiredPhases).toEqual([
      "upstream_response",
      "client_response",
    ]);
    expect(bundle.capturedResponse).toBeNull();
  });

  it("marks truncated request evidence as non-replayable", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({
      logsDir,
      requestBody: JSON.stringify({ content: "x".repeat(1024 * 1024 + 256) }),
    });
    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    expect(bundle.request.bodyTruncated).toBe(true);
    expect(bundle.completeness.replayable).toBe(false);
    expect(bundle.completeness.blockers).toContain(
      "upstream_request_body_truncated",
    );
  });

  it("retains a diagnostic bundle when a managed artifact has been removed", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const indexPath = await debugIndex(logsDir);
    const entries = (await readFile(indexPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const upstreamRequest = entries.find(
      (entry) => entry.phase === "upstream_request",
    );
    if (!upstreamRequest) {
      throw new Error("upstream request index entry not found");
    }
    await rm(String(upstreamRequest.bodyPath));

    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    expect(bundle.completeness.replayable).toBe(false);
    expect(bundle.completeness.blockers).toContain(
      "upstream_request:1:body_artifact_missing",
    );
  });

  it("fails closed when an index points outside the managed body directory", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const indexPath = await debugIndex(logsDir);
    const lines = (await readFile(indexPath, "utf8")).trim().split("\n");
    const first = JSON.parse(lines[0]) as Record<string, unknown>;
    first.bodyPath = join(logsDir, "outside.json.gz");
    lines[0] = JSON.stringify(first);
    await writeFile(indexPath, `${lines.join("\n")}\n`);

    await expect(
      exportProxyReplayBundle({ requestId, logsDir }),
    ).rejects.toThrow("escapes the logs body directory");
  });

  it("fails closed when artifact contents no longer match the indexed hash", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const indexPath = await debugIndex(logsDir);
    const first = JSON.parse(
      (await readFile(indexPath, "utf8")).trim().split("\n")[0],
    ) as Record<string, unknown>;
    const artifactPath = String(first.bodyPath);
    const artifact = JSON.parse(
      (await gunzipAsync(await readFile(artifactPath))).toString("utf8"),
    ) as Record<string, unknown>;
    artifact.body = "tampered";
    await writeFile(artifactPath, await gzipAsync(JSON.stringify(artifact)));
    await chmod(artifactPath, 0o600);

    await expect(
      exportProxyReplayBundle({ requestId, logsDir }),
    ).rejects.toThrow("SHA-256 does not match");
  });

  it("fails closed when artifact metadata diverges from the debug index", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const indexPath = await debugIndex(logsDir);
    const entries = (await readFile(indexPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const upstreamRequest = entries.find(
      (entry) => entry.phase === "upstream_request",
    );
    if (!upstreamRequest) {
      throw new Error("upstream request index entry not found");
    }
    const artifactPath = String(upstreamRequest.bodyPath);
    const artifact = JSON.parse(
      (await gunzipAsync(await readFile(artifactPath))).toString("utf8"),
    ) as Record<string, unknown>;
    artifact.metadata = {
      upstreamMethod: "POST",
      upstreamUrl: "https://tampered.example/v1/messages",
    };
    await writeFile(artifactPath, await gzipAsync(JSON.stringify(artifact)));

    await expect(
      exportProxyReplayBundle({ requestId, logsDir }),
    ).rejects.toThrow("metadata does not match");
  });

  it("does not follow a symlink when writing an export", async () => {
    const directory = await makeTempDir();
    const target = join(directory, "target.json");
    const output = join(directory, "output.json");
    await writeFile(target, "preserve-me");
    await symlink(target, output);

    await expect(
      writeProxyReplayDocument(output, { safe: true }),
    ).rejects.toThrow();
    expect(await readFile(target, "utf8")).toBe("preserve-me");
  });

  it("refuses to write a replay document that cannot be read back", async () => {
    const directory = await makeTempDir();
    const output = join(directory, "oversized.json");

    await expect(
      writeProxyReplayDocument(output, {
        payload: "x".repeat(16 * 1024 * 1024),
      }),
    ).rejects.toThrow("safety limit");
    await expect(stat(output)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects malformed bundle contracts before direct execution", async () => {
    const directory = await makeTempDir();
    const bundlePath = join(directory, "malformed.json");
    await writeFile(
      bundlePath,
      JSON.stringify({
        schemaVersion: 1,
        kind: "neurolink.proxy.replay-bundle",
        requestId: "malformed",
        selectedAttempt: 1,
        completeness: {},
        request: {
          method: "POST",
          url: "https://example.com",
          headers: { authorization: 42 },
          requiredHeaderInputs: [],
          body: "{}",
          bodyTruncated: false,
        },
        captures: [],
        capturedResponse: null,
      }),
    );
    await expect(readProxyReplayBundle(bundlePath)).rejects.toThrow(
      "Invalid or unsupported",
    );
  });
});

describe("direct upstream replay comparison", () => {
  it("requires explicit execution and all redacted header values", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const bundle = await exportProxyReplayBundle({ requestId, logsDir });

    await expect(
      compareProxyReplayBundle(bundle, { execute: false }),
    ).rejects.toThrow("execute=true");
    await expect(
      compareProxyReplayBundle(bundle, { execute: true }),
    ).rejects.toThrow("Missing environment-backed values");
    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        headerValues: {
          authorization: "Bearer direct-secret",
          "invalid header": "value",
        },
      }),
    ).rejects.toThrow("Invalid replay header names");
  });

  it("executes only an explicit loopback/HTTPS request and redacts comparison output", async () => {
    let receivedAuthorization = "";
    let receivedBody = "";
    const server = createServer((request, response) => {
      receivedAuthorization = request.headers.authorization ?? "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        receivedBody += String(chunk);
      });
      request.on("end", () => {
        response.writeHead(200, {
          "content-type": "application/json",
          "set-cookie": "private-cookie",
        });
        response.end(
          JSON.stringify({
            id: "message-2",
            type: "message",
            content: [],
            access_token: "response-secret",
          }),
        );
      });
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("fixture server did not expose a port");
    }

    const logsDir = await makeTempDir();
    const { requestId, requestBody } = await captureRequest({
      logsDir,
      url: `http://127.0.0.1:${address.port}/v1/messages`,
    });
    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    const comparison = await compareProxyReplayBundle(bundle, {
      execute: true,
      headerValues: { authorization: "Bearer direct-secret" },
      urlOverride: bundle.request.url ?? undefined,
      timeoutMs: 5_000,
    });

    expect(receivedAuthorization).toBe("Bearer direct-secret");
    expect(receivedBody).toBe(requestBody);
    expect(comparison.direct.status).toBe(200);
    expect(comparison.request.headers.authorization).toBe("[REDACTED]");
    expect(comparison.direct.headers["set-cookie"]).toBe("[REDACTED]");
    expect(comparison.direct.body).toContain('"access_token":"[REDACTED]"');
    expect(serializeProxyReplayDocument(comparison)).not.toContain(
      "direct-secret",
    );
    expect(serializeProxyReplayDocument(comparison)).not.toContain(
      "response-secret",
    );
    expect(comparison.comparison).toMatchObject({
      statusMatches: true,
      contentTypeMatches: true,
      jsonShapeMatches: false,
    });
  });

  it("requires a complete override when the captured request body was redacted", async () => {
    const bundle = {
      schemaVersion: 1,
      kind: "neurolink.proxy.replay-bundle",
      requestId: "redacted-request",
      selectedAttempt: 1,
      source: { logsDirectory: "logs", indexFiles: [] },
      completeness: {
        captures: 0,
        phasesPresent: [],
        missingRequiredPhases: [],
        truncatedCaptures: 0,
        artifactsWithIssues: 0,
        replayable: false,
        blockers: ["upstream_request_body_contains_redactions"],
      },
      request: {
        method: "POST",
        url: "https://example.com/v1/messages",
        headers: {},
        requiredHeaderInputs: [],
        body: '{"api_key":"[REDACTED]"}',
        bodySha256: null,
        bodyTruncated: false,
        contentType: "application/json",
        account: null,
        accountType: null,
        model: null,
        stream: false,
      },
      capturedResponse: null,
      captures: [],
    } satisfies ProxyReplayBundle;

    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        fetchImpl: async () => new Response("{}", { status: 200 }),
      }),
    ).rejects.toThrow("provide a complete body override");

    let replayedBody = "";
    const comparison = await compareProxyReplayBundle(bundle, {
      execute: true,
      bodyOverride: '{"api_key":"replacement"}',
      urlOverride: "https://example.com/v1/messages",
      fetchImpl: async (_input, init) => {
        replayedBody = String(init?.body);
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });
    expect(replayedBody).toBe('{"api_key":"replacement"}');
    expect(comparison.request.usedBodyOverride).toBe(true);
    expect(serializeProxyReplayDocument(comparison)).not.toContain(
      "replacement",
    );
  });

  it("bounds direct response evidence and disables incomplete body comparison", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    const responseBody = "x".repeat(1024 * 1024 + 256);

    const comparison = await compareProxyReplayBundle(bundle, {
      execute: true,
      headerValues: { authorization: "Bearer direct-secret" },
      fetchImpl: async () =>
        new Response(responseBody, {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    });

    expect(comparison.direct.bodyTruncated).toBe(true);
    expect(comparison.direct.observedBodyBytes).toBe(responseBody.length);
    expect(comparison.direct.storedBodyBytes).toBeLessThanOrEqual(1024 * 1024);
    expect(comparison.comparison.bodyHashMatches).toBeNull();
  });

  it("rejects a captured request body whose replay hash no longer matches", async () => {
    const logsDir = await makeTempDir();
    const { requestId } = await captureRequest({ logsDir });
    const bundle = await exportProxyReplayBundle({ requestId, logsDir });
    const originalBody = bundle.request.body;
    bundle.request.body = '{"model":"tampered"}';

    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        headerValues: { authorization: "Bearer direct-secret" },
        fetchImpl: async () => new Response("{}"),
      }),
    ).rejects.toThrow("body hash mismatch");

    bundle.request.body = originalBody;
    bundle.request.headers.authorization = "unredacted-secret";
    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        fetchImpl: async () => new Response("{}"),
      }),
    ).rejects.toThrow("unredacted request header");

    bundle.request.headers.authorization = "[REDACTED]";
    const responseCapture = bundle.captures.find(
      (capture) => capture.phase === "upstream_response",
    );
    if (!responseCapture) {
      throw new Error("upstream response capture not found");
    }
    responseCapture.headers["set-cookie"] = "unredacted-cookie";
    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        headerValues: { authorization: "Bearer direct-secret" },
        fetchImpl: async () => new Response("{}"),
      }),
    ).rejects.toThrow("unredacted capture header");
  });

  it("rejects non-loopback plaintext endpoints before calling fetch", async () => {
    const bundle = {
      schemaVersion: 1,
      kind: "neurolink.proxy.replay-bundle",
      requestId: "unsafe-url",
      selectedAttempt: 1,
      source: { logsDirectory: "logs", indexFiles: [] },
      completeness: {
        captures: 0,
        phasesPresent: [],
        missingRequiredPhases: [],
        truncatedCaptures: 0,
        artifactsWithIssues: 0,
        replayable: true,
        blockers: [],
      },
      request: {
        method: "POST",
        url: "http://example.com/v1/messages",
        headers: {},
        requiredHeaderInputs: [],
        body: "{}",
        bodySha256:
          "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
        bodyTruncated: false,
        contentType: "application/json",
        account: null,
        accountType: null,
        model: null,
        stream: false,
      },
      capturedResponse: null,
      captures: [],
    } satisfies ProxyReplayBundle;
    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        fetchImpl: async () => new Response("{}"),
      }),
    ).rejects.toThrow("HTTPS");

    bundle.request.url = "https://example.com/v1/messages?api_key=secret";
    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        fetchImpl: async () => new Response("{}"),
      }),
    ).rejects.toThrow("sensitive query parameter");

    bundle.request.url = "https://example.com/v1/messages";
    await expect(
      compareProxyReplayBundle(bundle, {
        execute: true,
        fetchImpl: async () => new Response("{}"),
      }),
    ).rejects.toThrow("explicit URL override");
  });
});
