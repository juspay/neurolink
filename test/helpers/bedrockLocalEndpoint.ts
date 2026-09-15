/**
 * A local Bedrock Runtime endpoint, for proving what a caller's text looks
 * like by the time it reaches the wire.
 *
 * The AWS SDK honours `AWS_ENDPOINT_URL_BEDROCK_RUNTIME`, so pointing it at a
 * server we own exercises the real client, the real SigV4 signing and the real
 * serialization, and records the request body that comes out the far end. That
 * is the only way to check the facade and the CLI: both build their own
 * provider internally, so there is no seam to hang a middleware on.
 *
 * Cleartext HTTP/2 on purpose. The SDK speaks h2 to this service — an HTTP/1.1
 * listener gets an ALPN rejection that surfaces as "Protocol error", and a TLS
 * listener would mean shipping a certificate and key, which this repo's secret
 * scanning would rightly object to. h2c needs neither.
 *
 * No credentials are used or needed: SigV4 signs happily with placeholder keys
 * and nothing here validates a signature. Nothing reaches AWS.
 */

import {
  createServer,
  type Http2Server,
  type ServerHttp2Session,
} from "node:http2";
import { crc32 } from "node:zlib";

export type CapturedRequest = {
  /** Request path — carries the model id and the operation. */
  path: string;
  /** Raw request body as sent. */
  body: string;
};

/**
 * Encode one AWS event-stream frame: a prelude (total length, header length,
 * prelude CRC), the headers, the payload, then a CRC over everything before it.
 * ConverseStream replies in this framing, so a fake that skips it never gets
 * past the SDK's parser.
 */
function frame(headers: Record<string, string>, payload: string): Buffer {
  const encoded: Buffer[] = [];
  for (const [key, value] of Object.entries(headers)) {
    const name = Buffer.from(key, "utf8");
    const val = Buffer.from(value, "utf8");
    const buf = Buffer.alloc(1 + name.length + 1 + 2 + val.length);
    let offset = 0;
    buf.writeUInt8(name.length, offset);
    offset += 1;
    name.copy(buf, offset);
    offset += name.length;
    buf.writeUInt8(7, offset); // 7 = string
    offset += 1;
    buf.writeUInt16BE(val.length, offset);
    offset += 2;
    val.copy(buf, offset);
    encoded.push(buf);
  }
  const headerBuf = Buffer.concat(encoded);
  const body = Buffer.from(payload, "utf8");
  const total = 4 + 4 + 4 + headerBuf.length + body.length + 4;

  const prelude = Buffer.alloc(8);
  prelude.writeUInt32BE(total, 0);
  prelude.writeUInt32BE(headerBuf.length, 4);
  const preludeCrc = Buffer.alloc(4);
  preludeCrc.writeUInt32BE(crc32(prelude) >>> 0, 0);

  const withoutCrc = Buffer.concat([prelude, preludeCrc, headerBuf, body]);
  const messageCrc = Buffer.alloc(4);
  messageCrc.writeUInt32BE(crc32(withoutCrc) >>> 0, 0);
  return Buffer.concat([withoutCrc, messageCrc]);
}

function streamEvent(type: string, payload: unknown): Buffer {
  return frame(
    {
      ":event-type": type,
      ":message-type": "event",
      ":content-type": "application/json",
    },
    JSON.stringify(payload),
  );
}

export type LocalBedrock = {
  /** Value for AWS_ENDPOINT_URL_BEDROCK_RUNTIME. */
  endpoint: string;
  /** Every request the SDK has sent, oldest first. */
  requests: CapturedRequest[];
  close: () => Promise<void>;
};

/**
 * Start the endpoint. `reply` is the assistant text both the buffered and the
 * streaming operation answer with, so a caller can assert on a round trip and
 * not merely on the request.
 */
export async function startLocalBedrock(reply = "OK"): Promise<LocalBedrock> {
  const requests: CapturedRequest[] = [];
  const server: Http2Server = createServer();

  // `server.close()` stops accepting connections, then waits for every open
  // session to end on its own. Whether that is instant depends on the client:
  // this SDK opens a session per request and lets each one go, but a pooled or
  // keep-alive client would leave one open and the wait would be the suite's to
  // pay. Tracking the sessions and destroying them here makes the shutdown
  // bounded by this helper instead of by the client's connection reuse.
  const sessions = new Set<ServerHttp2Session>();
  server.on("session", (session) => {
    sessions.add(session);
    session.on("close", () => sessions.delete(session));
  });

  server.on("request", (req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      requests.push({
        path: req.url ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
      });
      if ((req.url ?? "").includes("converse-stream")) {
        res.writeHead(200, {
          "content-type": "application/vnd.amazon.eventstream",
        });
        res.write(streamEvent("messageStart", { role: "assistant" }));
        res.write(
          streamEvent("contentBlockDelta", {
            contentBlockIndex: 0,
            delta: { text: reply },
          }),
        );
        res.write(streamEvent("contentBlockStop", { contentBlockIndex: 0 }));
        res.write(streamEvent("messageStop", { stopReason: "end_turn" }));
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          output: {
            message: { role: "assistant", content: [{ text: reply }] },
          },
          stopReason: "end_turn",
          usage: { inputTokens: 5, outputTokens: 1, totalTokens: 6 },
        }),
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    endpoint: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        for (const session of sessions) {
          session.destroy();
        }
        server.close(() => resolve());
      }),
  };
}

/** The user text the request body actually carries, or "" when absent. */
export function userTextOnWire(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      messages?: Array<{ content?: Array<{ text?: string }> }>;
    };
    return parsed.messages?.[0]?.content?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

/** Placeholder AWS credentials. Signed, never validated, never real. */
export const PLACEHOLDER_AWS_ENV = {
  AWS_ACCESS_KEY_ID: "AKIALOCALENDPOINTONLY",
  AWS_SECRET_ACCESS_KEY: "local-endpoint-secret-not-real",
  AWS_REGION: "us-east-1",
} as const;
