#!/usr/bin/env tsx

/**
 * Continuous Test Suite — AWS SDK requests (Bedrock, SageMaker) and the
 * configured proxy.
 *
 * The AWS SDK does not read HTTP_PROXY / HTTPS_PROXY, and Bedrock and
 * SageMaker built their clients with the SDK's default transport, so their
 * traffic went straight past a proxy every other provider honoured. With a
 * proxy configured for the endpoint, both clients now get a proxy-aware
 * request handler; NO_PROXY keeps an endpoint direct; with no proxy the SDK's
 * own transport is left exactly as it was.
 *
 * Everything drives the shipped surface: `NeuroLink` from `../dist/index.js`,
 * no imports out of `src/`, nothing stubbed. No rule-15 exception. The real
 * AWS SDK clients are pointed at names that cannot resolve
 * (`bedrock-upstream.invalid` through the SDK's documented
 * `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`, `sagemaker-upstream.invalid` through the
 * public `credentials.sagemaker.endpoint`), so a request that does not go
 * through the proxy has nowhere to land. Requests are really signed with
 * SigV4 using placeholder keys; nothing reaches AWS.
 *
 * The answer text itself is the evidence, as in the Google GenAI proxy suite:
 * only the fake proxy replies with PROXY_MARKER, and it can be reached only by
 * way of the proxy. The proxy accepts both forms undici may use for a
 * plain-HTTP target (absolute-URI forwarding and a CONNECT tunnel), so the
 * suite does not depend on which one it picks.
 *
 * The two controls use the h2c stand-in from `helpers/bedrockLocalEndpoint`.
 * It speaks only cleartext HTTP/2, which is what the SDK's default Bedrock
 * transport speaks, so an answer from it also shows the default transport was
 * kept: the proxy handler speaks HTTP/1.1 and would be refused.
 *
 * Deliberate and load-bearing, as in the Google suite:
 *  - Every turn goes through `runOrFail`, which discards whatever was thrown
 *    and raises a fixed message. A request that skipped the proxy fails with
 *    a resolver error, which the harness would otherwise read as a SKIP.
 *  - Env is snapshotted and restored per case, and every proxy variable and
 *    endpoint override is cleared first, so ambient values cannot change what
 *    a case exercises.
 *  - No payload in assertion messages.
 *
 * Run: npx tsx test/continuous-test-suite-aws-proxy.ts
 *      pnpm run test:aws-proxy
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  startLocalBedrock,
  streamEvent,
} from "./helpers/bedrockLocalEndpoint.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite("AWS proxy", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

const BEDROCK_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const BEDROCK_UPSTREAM_HOST = "bedrock-upstream.invalid";
const SAGEMAKER_UPSTREAM_HOST = "sagemaker-upstream.invalid";
const PROXY_MARKER = "AWS_PROXY_MARKER_5e1d";
const DIRECT_MARKER = "AWS_DIRECT_MARKER_c03b";

const NO_ANSWER_VIA_PROXY = "no answer came through the configured proxy";
const NO_ANSWER_DIRECT = "the direct stand-in returned no answer";

const TOUCHED_ENV_VARS = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "SOCKS_PROXY",
  "socks_proxy",
  "NO_PROXY",
  "no_proxy",
  "AWS_ENDPOINT_URL",
  "AWS_ENDPOINT_URL_BEDROCK_RUNTIME",
  "AWS_ENDPOINT_URL_SAGEMAKER_RUNTIME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_REGION",
  "AWS_PROFILE",
  "SAGEMAKER_ENDPOINT",
] as const;

const PLACEHOLDER_KEYS = {
  AWS_ACCESS_KEY_ID: "test-fake-aws-key-id",
  AWS_SECRET_ACCESS_KEY: "test-fake-aws-secret",
  AWS_REGION: "us-east-1",
};

/** Clears every touched variable, applies `set`, and returns the restorer. */
function withEnv(set: Record<string, string> = {}): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(set)) {
    saved[key] ??= process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const key of Object.keys(saved)) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

type ProxiedCall = {
  /** The upstream the request was addressed to, `host[:port]`. */
  host: string;
  /** Request path without the query string. */
  path: string;
  /** Whether the request carried a SigV4 Authorization header. */
  signed: boolean;
};

type FakeProxy = {
  calls: ProxiedCall[];
  port: number;
  close: () => Promise<void>;
};

/** Answers one proxied request the way the addressed AWS operation would. */
function answer(
  req: IncomingMessage,
  res: ServerResponse,
  host: string,
  path: string,
  calls: ProxiedCall[],
): void {
  req.resume();
  req.on("end", () => {
    const authorization = String(req.headers.authorization ?? "");
    calls.push({
      host,
      path,
      signed: authorization.startsWith("AWS4-HMAC-SHA256"),
    });
    if (path.endsWith("/converse-stream")) {
      res.writeHead(200, {
        "content-type": "application/vnd.amazon.eventstream",
      });
      res.write(streamEvent("messageStart", { role: "assistant" }));
      res.write(
        streamEvent("contentBlockDelta", {
          contentBlockIndex: 0,
          delta: { text: PROXY_MARKER },
        }),
      );
      res.write(streamEvent("contentBlockStop", { contentBlockIndex: 0 }));
      res.write(streamEvent("messageStop", { stopReason: "end_turn" }));
      res.write(
        streamEvent("metadata", {
          usage: { inputTokens: 5, outputTokens: 1, totalTokens: 6 },
        }),
      );
      res.end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    if (path.endsWith("/converse")) {
      res.end(
        JSON.stringify({
          output: {
            message: { role: "assistant", content: [{ text: PROXY_MARKER }] },
          },
          stopReason: "end_turn",
          usage: { inputTokens: 5, outputTokens: 1, totalTokens: 6 },
        }),
      );
      return;
    }
    // SageMaker InvokeEndpoint, and anything else: a text-generation reply.
    res.end(JSON.stringify([{ generated_text: PROXY_MARKER }]));
  });
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return typeof address === "object" && address ? address.port : 0;
}

/**
 * A forward proxy. Answers every request that reaches it and records which
 * upstream it was addressed to. A plain-HTTP target arrives either as an
 * absolute-URI request or as a CONNECT followed by an ordinary request on the
 * tunnelled socket; both are handled and attributed to the upstream named.
 */
async function startForwardProxy(): Promise<FakeProxy> {
  const calls: ProxiedCall[] = [];
  const sockets = new Set<Socket>();
  const tunnelledHost = new WeakMap<Duplex, string>();

  const inner = createServer((req, res) => {
    answer(
      req,
      res,
      tunnelledHost.get(req.socket) ?? req.headers.host ?? "",
      String(req.url ?? "").split("?")[0],
      calls,
    );
  });

  const server = createServer((req, res) => {
    let host = req.headers.host ?? "";
    let path = String(req.url ?? "");
    try {
      const target = new URL(path);
      host = target.host;
      path = target.pathname;
    } catch {
      path = path.split("?")[0];
    }
    answer(req, res, host, path, calls);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  server.on("connect", (req, clientSocket, head) => {
    tunnelledHost.set(clientSocket, String(req.url ?? ""));
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      clientSocket.unshift(head);
    }
    inner.emit("connection", clientSocket);
  });

  const port = await listen(server);
  return {
    calls,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) {
          socket.destroy();
        }
        server.closeAllConnections?.();
        inner.closeAllConnections?.();
        inner.close();
        server.close(() => resolve());
      }),
  };
}

/**
 * Runs one turn and returns its text. On ANY failure the caught error is
 * discarded unread and a fixed message is raised instead: a request that
 * skipped the proxy fails with a resolver error, and that text is exactly
 * what the harness turns into a SKIP.
 */
async function runOrFail(
  run: () => Promise<string>,
  failMessage: string,
): Promise<string> {
  try {
    return await run();
  } catch {
    throw new Error(failMessage);
  }
}

async function bedrockText(mode: "generate" | "stream"): Promise<string> {
  const nl = new NeuroLink();
  try {
    const options = {
      input: { text: "hi" },
      provider: "bedrock",
      model: BEDROCK_MODEL,
      maxTokens: 16,
      disableTools: true,
      disableInternalFallback: true,
    };
    if (mode === "generate") {
      return (await nl.generate(options))?.content ?? "";
    }
    const result = await nl.stream(options);
    let text = "";
    for await (const chunk of result.stream) {
      text += "content" in chunk ? (chunk.content ?? "") : "";
    }
    return text;
  } finally {
    await nl.dispose();
  }
}

section("requests go through the configured proxy");

for (const mode of ["generate", "stream"] as const) {
  await test(`Bedrock ${mode} traffic goes through HTTP_PROXY`, async () => {
    const proxy = await startForwardProxy();
    const restore = withEnv({
      ...PLACEHOLDER_KEYS,
      HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
      AWS_ENDPOINT_URL_BEDROCK_RUNTIME: `http://${BEDROCK_UPSTREAM_HOST}`,
    });
    try {
      const text = await runOrFail(
        () => bedrockText(mode),
        NO_ANSWER_VIA_PROXY,
      );
      assert(
        text.includes(PROXY_MARKER),
        "the answer did not come through the configured proxy",
      );
      assert(
        proxy.calls.length >= 1,
        "the proxy received no request from the provider",
      );
      assert(
        (proxy.calls[0]?.host ?? "").startsWith(BEDROCK_UPSTREAM_HOST),
        "the proxy was asked for a different upstream than the configured endpoint",
      );
      assert(
        (proxy.calls[0]?.path ?? "").endsWith(
          mode === "stream" ? "/converse-stream" : "/converse",
        ),
        "the proxied request did not address the expected Converse operation",
      );
      assert(
        proxy.calls[0]?.signed === true,
        "the proxied request lost its SigV4 signature",
      );
    } finally {
      restore();
      await proxy.close();
    }
  });
}

await test("SageMaker traffic goes through HTTP_PROXY", async () => {
  const proxy = await startForwardProxy();
  const restore = withEnv({
    HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
  });
  // The MCP path resolves the provider differently and does not carry the
  // per-request credentials this case relies on.
  const priorSkipMcp = process.env.NEUROLINK_SKIP_MCP;
  process.env.NEUROLINK_SKIP_MCP = "true";
  const nl = new NeuroLink();
  try {
    const text = await runOrFail(async () => {
      const result = await nl.generate({
        input: { text: "hi" },
        provider: "sagemaker",
        model: "proxy-endpoint",
        maxTokens: 16,
        disableTools: true,
        disableInternalFallback: true,
        credentials: {
          sagemaker: {
            accessKeyId: PLACEHOLDER_KEYS.AWS_ACCESS_KEY_ID,
            secretAccessKey: PLACEHOLDER_KEYS.AWS_SECRET_ACCESS_KEY,
            region: "us-east-1",
            endpoint: `http://${SAGEMAKER_UPSTREAM_HOST}`,
          },
        },
      });
      return result?.content ?? "";
    }, NO_ANSWER_VIA_PROXY);
    assert(
      text.includes(PROXY_MARKER),
      "the answer did not come through the configured proxy",
    );
    assert(
      (proxy.calls[0]?.host ?? "").startsWith(SAGEMAKER_UPSTREAM_HOST),
      "the proxy was asked for a different upstream than the configured endpoint",
    );
    assert(
      (proxy.calls[0]?.path ?? "").includes("/invocations"),
      "the proxied request did not address an endpoint invocation",
    );
    assert(
      proxy.calls[0]?.signed === true,
      "the proxied request lost its SigV4 signature",
    );
  } finally {
    await nl.dispose();
    if (priorSkipMcp === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = priorSkipMcp;
    }
    restore();
    await proxy.close();
  }
});

section("controls: the proxy is not used when it should not be");

await test("NO_PROXY keeps a local Bedrock endpoint direct", async () => {
  const proxy = await startForwardProxy();
  const direct = await startLocalBedrock(DIRECT_MARKER);
  const restore = withEnv({
    ...PLACEHOLDER_KEYS,
    HTTP_PROXY: `http://127.0.0.1:${proxy.port}`,
    NO_PROXY: "127.0.0.1",
    AWS_ENDPOINT_URL_BEDROCK_RUNTIME: direct.endpoint,
  });
  try {
    const text = await runOrFail(() => bedrockText("stream"), NO_ANSWER_DIRECT);
    assert(
      text.includes(DIRECT_MARKER),
      "the answer for a NO_PROXY endpoint did not come from that endpoint",
    );
    assert(
      direct.requests.length >= 1,
      "the NO_PROXY endpoint received no request",
    );
    assert(
      proxy.calls.length === 0,
      `a NO_PROXY endpoint was still sent through the proxy (${proxy.calls.length} requests)`,
    );
  } finally {
    restore();
    await proxy.close();
    await direct.close();
  }
});

await test("with no proxy configured the Bedrock transport is unchanged", async () => {
  const proxy = await startForwardProxy();
  const direct = await startLocalBedrock(DIRECT_MARKER);
  const restore = withEnv({
    ...PLACEHOLDER_KEYS,
    AWS_ENDPOINT_URL_BEDROCK_RUNTIME: direct.endpoint,
  });
  try {
    const text = await runOrFail(
      () => bedrockText("generate"),
      NO_ANSWER_DIRECT,
    );
    assert(
      text.includes(DIRECT_MARKER),
      "the answer without a proxy did not come from the configured endpoint",
    );
    assert(
      proxy.calls.length === 0,
      `a request was sent through a proxy that was not configured (${proxy.calls.length} requests)`,
    );
  } finally {
    restore();
    await proxy.close();
    await direct.close();
  }
});

await runSuite();
