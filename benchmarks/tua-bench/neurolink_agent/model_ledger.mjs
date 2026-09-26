import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { StringDecoder } from "node:string_decoder";

const upstream = new URL(process.env.LEDGER_UPSTREAM);
// A dedicated proxy speaks http; a direct API upstream speaks https.
const client = upstream.protocol === "https:" ? https : http;
const port = Number(process.env.LEDGER_PORT ?? 18080);
const ledgerPath = process.env.LEDGER_PATH ?? "/logs/agent/model-ledger.jsonl";
const readyPath = process.env.LEDGER_READY ?? "/tmp/.model-ledger-ready";
const KEPT_HEADERS = [
  "x-neurolink-served-by",
  "x-neurolink-account-type",
  "x-neurolink-attempt",
];
const CAPTURE_LIMIT = 4 * 1024 * 1024;

const modelOf = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.model === "string") {
      return parsed.model;
    }
  } catch {
    // Not JSON (e.g. a stream); fall back to the first model field below.
  }
  const match = text.match(/"model"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// Thinking parity between harnesses is checked on what each request asked for.
const thinkingOf = (request) =>
  request && typeof request.thinking === "object" && request.thinking !== null
    ? {
        type: request.thinking.type ?? null,
        budget: request.thinking.budget_tokens ?? null,
      }
    : null;

// Token counts per request, so a trial is costed however the harness ends.
// Streamed counts are cumulative, so the largest value of each key is final.
const USAGE_KEYS = [
  "input_tokens",
  "output_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
];
const CACHE_WRITE_KEYS = [
  "ephemeral_5m_input_tokens",
  "ephemeral_1h_input_tokens",
];

const mergeUsage = (total, usage) => {
  if (!usage || typeof usage !== "object") {
    return;
  }
  const counts = [
    ...USAGE_KEYS.map((key) => [key, usage[key]]),
    ...CACHE_WRITE_KEYS.map((key) => [key, usage.cache_creation?.[key]]),
  ];
  for (const [key, value] of counts) {
    if (typeof value === "number") {
      total[key] = Math.max(total[key] ?? 0, value);
    }
  }
};

const streamUsageScanner = (total) => {
  const decoder = new StringDecoder("utf8");
  let pending = "";
  return (chunk) => {
    pending += decoder.write(chunk);
    const lines = pending.split("\n");
    pending = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const event = parseJson(line.slice(5).trim());
      if (event?.type === "message_start") {
        mergeUsage(total, event.message?.usage);
      } else if (event?.type === "message_delta") {
        mergeUsage(total, event.usage);
      }
    }
  };
};

const record = (entry) =>
  fs.appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`);

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const startedAt = Date.now();
    const headers = { ...req.headers, host: upstream.host };
    // Identity encoding keeps the served model readable; content is untouched.
    delete headers["accept-encoding"];
    const forward = client.request(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port,
        method: req.method,
        path: req.url,
        headers,
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        const seen = [];
        let seenBytes = 0;
        const usage = {};
        const streamed = String(
          upstreamRes.headers["content-type"] ?? "",
        ).includes("text/event-stream");
        const scanStream = streamed ? streamUsageScanner(usage) : null;
        upstreamRes.on("data", (chunk) => {
          if (seenBytes < CAPTURE_LIMIT) {
            seen.push(chunk);
            seenBytes += chunk.length;
          }
          scanStream?.(chunk);
          res.write(chunk);
        });
        upstreamRes.on("end", () => {
          res.end();
          const responseText = Buffer.concat(seen).toString("utf8");
          if (!streamed) {
            mergeUsage(usage, parseJson(responseText)?.usage);
          }
          record({
            at: new Date(startedAt).toISOString(),
            ms: Date.now() - startedAt,
            method: req.method,
            path: req.url,
            upstream: upstream.host,
            status: upstreamRes.statusCode,
            requestModel: modelOf(body.toString("utf8")),
            thinking: thinkingOf(parseJson(body.toString("utf8"))),
            maxTokens: parseJson(body.toString("utf8"))?.max_tokens ?? null,
            responseModel: modelOf(responseText),
            usage: Object.keys(usage).length ? usage : null,
            ...Object.fromEntries(
              KEPT_HEADERS.map((name) => [
                name,
                upstreamRes.headers[name] ?? null,
              ]),
            ),
          });
        });
      },
    );
    forward.on("error", (error) => {
      record({
        at: new Date(startedAt).toISOString(),
        path: req.url,
        error: error.message,
      });
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end();
    });
    forward.end(body);
  });
});

server.listen(port, "127.0.0.1", () =>
  fs.writeFileSync(readyPath, String(process.pid)),
);
