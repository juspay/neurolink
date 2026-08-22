import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { performance } from "node:perf_hooks";

const configuredRequests = Number(
  process.env.PROXY_TRANSPORT_BENCH_REQUESTS ?? 1_000,
);
const REQUESTS = Math.max(
  100,
  Number.isFinite(configuredRequests) ? Math.floor(configuredRequests) : 1_000,
);
const WARMUP_REQUESTS = Math.min(100, Math.max(20, Math.floor(REQUESTS / 10)));
const configuredBudget = Number(process.env.PROXY_TRANSPORT_MAX_ADDED_P95_MS);
const MAX_ADDED_P95_MS =
  Number.isFinite(configuredBudget) && configuredBudget >= 0
    ? configuredBudget
    : 5;
const payload = JSON.stringify({
  model: "claude-sonnet-fixture",
  messages: [{ role: "user", content: "x".repeat(1_024) }],
  stream: false,
});

function summarize(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (fraction: number) => {
    const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
    return Number((sorted[index] ?? 0).toFixed(3));
  };
  return {
    count: sorted.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(3)),
  };
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function listen(
  server: ReturnType<typeof createServer>,
): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fixture server did not expose a TCP port");
  }
  return address.port;
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  server.close();
  await once(server, "close");
}

async function request(url: string): Promise<number> {
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
  if (!response.ok) {
    throw new Error(`Fixture request failed with HTTP ${response.status}`);
  }
  await response.arrayBuffer();
  return performance.now() - startedAt;
}

const upstream = createServer(async (incoming, outgoing) => {
  const body = await readBody(incoming);
  outgoing.writeHead(200, { "content-type": "application/json" });
  outgoing.end(
    JSON.stringify({
      type: "message",
      echoedBytes: body.byteLength,
      content: "y".repeat(2_048),
    }),
  );
});
const upstreamPort = await listen(upstream);
const upstreamUrl = `http://127.0.0.1:${upstreamPort}/v1/messages`;

const proxy = createServer(
  async (incoming: IncomingMessage, outgoing: ServerResponse) => {
    try {
      const body = await readBody(incoming);
      const response = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Node accepts a Buffer at runtime, but BodyInit in this project's lib
        // set admits neither Buffer nor any ArrayBufferView. The payload is
        // JSON (see the content-type just above), so decode it as UTF-8 text —
        // which is a BodyInit and round-trips JSON exactly.
        body: body.toString("utf8"),
      });
      outgoing.writeHead(
        response.status,
        Object.fromEntries(response.headers.entries()),
      );
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.writeHead(502, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ error: "Proxy fixture failed" }));
    }
  },
);
const proxyPort = await listen(proxy);
const proxyUrl = `http://127.0.0.1:${proxyPort}/v1/messages`;

try {
  for (let index = 0; index < WARMUP_REQUESTS; index += 1) {
    await request(index % 2 === 0 ? upstreamUrl : proxyUrl);
  }

  const directSamples: number[] = [];
  const proxySamples: number[] = [];
  for (let index = 0; index < REQUESTS; index += 1) {
    if (index % 2 === 0) {
      directSamples.push(await request(upstreamUrl));
      proxySamples.push(await request(proxyUrl));
    } else {
      proxySamples.push(await request(proxyUrl));
      directSamples.push(await request(upstreamUrl));
    }
  }
  const direct = summarize(directSamples);
  const throughProxy = summarize(proxySamples);
  const addedP95Ms = Number(
    Math.max(0, throughProxy.p95Ms - direct.p95Ms).toFixed(3),
  );
  const passed = addedP95Ms <= MAX_ADDED_P95_MS;
  process.stdout.write(
    `${JSON.stringify(
      {
        fixture: "local-json-reconstruction",
        warmupRequests: WARMUP_REQUESTS,
        measuredRequestsPerPath: REQUESTS,
        direct,
        throughProxy,
        addedP95Ms,
        budget: { maxAddedP95Ms: MAX_ADDED_P95_MS },
        passed,
      },
      null,
      2,
    )}\n`,
  );
  if (!passed) {
    process.exitCode = 1;
  }
} finally {
  await close(proxy);
  await close(upstream);
}
