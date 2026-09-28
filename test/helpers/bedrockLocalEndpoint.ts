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
  type Http2ServerResponse,
  type ServerHttp2Session,
} from "node:http2";
import { crc32 } from "node:zlib";

export type CapturedRequest = {
  /** Request path — carries the model id and the operation. */
  path: string;
  /** Raw request body as sent. */
  body: string;
  /**
   * True once the client closed this request's stream before the stand-in had
   * finished answering it: wire-level evidence that an abort reached the
   * transport. A request the stand-in answers in full never sets it, so
   * observing an abort means keeping the request open with `hold`.
   */
  aborted: boolean;
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

export type LocalBedrockOptions = {
  /**
   * When set, the FIRST buffered Converse call answers with a `toolUse`
   * content block and `stopReason: "tool_use"` instead of text, exactly as
   * the real service does when a model decides to call a tool. The provider
   * then runs the tool for real and sends a second request carrying the
   * `toolResult`, which is answered with `reply`.
   *
   * This is what makes tool-loop behaviour testable without an AWS account:
   * the loop, the tool dispatch and the second round trip are all genuine —
   * only the model's decision is scripted.
   */
  toolUse?: { name: string; input?: Record<string, unknown> };
  /**
   * Token usage every reply reports. The cache counters stay off the wire
   * unless given. Defaults to 5 in, 1 out.
   */
  usage?: LocalBedrockUsage;
  /**
   * Answer ConverseStream with 403 AccessDeniedException naming the streaming
   * permission, as IAM does for a principal that may call Converse but not
   * InvokeModelWithResponseStream. Buffered Converse keeps working, which is
   * the condition the provider's non-streaming fallback exists for.
   */
  denyStream?: boolean;
  /** Answer buffered Converse with 400 ValidationException. */
  failConverse?: boolean;
  /**
   * Leave one operation unanswered, so a test can act on a request that is
   * genuinely still in flight. `"converse-stream"` sends the message start and
   * the first text delta and then never ends the response; `"converse"` never
   * answers at all. The other operation, and a scripted `toolUse` turn, answer
   * normally, so a fallback or a tool loop cannot hang on the wrong one.
   *
   * Holding also stops the server echoing GOAWAY. The SDK sends
   * GOAWAY(NO_ERROR) as soon as response headers arrive, Node's h2 server
   * answers by closing its session, which sends a GOAWAY back, and the SDK's
   * session handler reads any GOAWAY as the end of the connection and cancels
   * every open stream. Without this the transport would end a held request on
   * its first bytes, before any abort under test could act. A real service does
   * not echo.
   */
  hold?: "converse" | "converse-stream";
};

export type LocalBedrockUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheWriteInputTokens?: number;
};

const DEFAULT_USAGE: LocalBedrockUsage = { inputTokens: 5, outputTokens: 1 };

/**
 * The `usage` block of a reply. `totalTokens` is the sum of every counter
 * given; the provider's loop adapter reads the individual counters and never
 * this one.
 */
function usagePayload(usage: LocalBedrockUsage): Record<string, number> {
  const { cacheReadInputTokens, cacheWriteInputTokens } = usage;
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens:
      usage.inputTokens +
      usage.outputTokens +
      (cacheReadInputTokens ?? 0) +
      (cacheWriteInputTokens ?? 0),
    ...(cacheReadInputTokens !== undefined && { cacheReadInputTokens }),
    ...(cacheWriteInputTokens !== undefined && { cacheWriteInputTokens }),
  };
}

/** An AWS restJson1 error: the exception name rides in `x-amzn-errortype`. */
function respondWithError(
  res: Http2ServerResponse,
  status: number,
  errorType: string,
  message: string,
): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "x-amzn-errortype": errorType,
  });
  res.end(JSON.stringify({ message }));
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
export async function startLocalBedrock(
  reply = "OK",
  options: LocalBedrockOptions = {},
): Promise<LocalBedrock> {
  const requests: CapturedRequest[] = [];
  let converseCalls = 0;
  let streamCalls = 0;
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
    if (options.hold) {
      // See `hold`: Node's h2 server echoes the client's GOAWAY(NO_ERROR) by
      // closing its session, which a real service does not do.
      session.close = () => undefined;
    }
  });

  server.on("request", (req, res) => {
    const chunks: Buffer[] = [];
    let captured: CapturedRequest | undefined;
    // `close` also follows a normal `end()`, so an abort is a close the
    // stand-in did not cause itself.
    res.on("close", () => {
      if (captured && !res.writableEnded) {
        captured.aborted = true;
      }
    });
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      captured = {
        path: req.url ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
        aborted: false,
      };
      requests.push(captured);
      const usage = usagePayload(options.usage ?? DEFAULT_USAGE);
      if ((req.url ?? "").includes("converse-stream")) {
        streamCalls += 1;
        if (options.denyStream) {
          respondWithError(
            res,
            403,
            "AccessDeniedException",
            "User: arn:aws:iam::000000000000:user/local-endpoint is not authorized to perform: bedrock:InvokeModelWithResponseStream on resource: arn:aws:bedrock:us-east-1::foundation-model/local because no identity-based policy allows the bedrock:InvokeModelWithResponseStream action",
          );
          return;
        }
        res.writeHead(200, {
          "content-type": "application/vnd.amazon.eventstream",
        });
        if (options.toolUse && streamCalls === 1) {
          // The streamed form of a tool call: the name arrives in
          // contentBlockStart and the arguments as JSON-string deltas, which
          // is what the provider's adapter accumulates and parses.
          res.write(streamEvent("messageStart", { role: "assistant" }));
          res.write(
            streamEvent("contentBlockStart", {
              contentBlockIndex: 0,
              start: {
                toolUse: {
                  name: options.toolUse.name,
                  toolUseId: "tooluse-local-stream-1",
                },
              },
            }),
          );
          res.write(
            streamEvent("contentBlockDelta", {
              contentBlockIndex: 0,
              delta: {
                toolUse: { input: JSON.stringify(options.toolUse.input ?? {}) },
              },
            }),
          );
          res.write(streamEvent("contentBlockStop", { contentBlockIndex: 0 }));
          res.write(streamEvent("messageStop", { stopReason: "tool_use" }));
          res.write(streamEvent("metadata", { usage }));
          res.end();
          return;
        }
        res.write(streamEvent("messageStart", { role: "assistant" }));
        res.write(
          streamEvent("contentBlockDelta", {
            contentBlockIndex: 0,
            delta: { text: reply },
          }),
        );
        if (options.hold === "converse-stream") {
          return;
        }
        res.write(streamEvent("contentBlockStop", { contentBlockIndex: 0 }));
        res.write(streamEvent("messageStop", { stopReason: "end_turn" }));
        // Real ConverseStream ends with a `metadata` event carrying usage —
        // without it, a caller (or test) that checks the turn's reported
        // token usage on the streaming path sees zeros no matter what
        // actually happened.
        res.write(streamEvent("metadata", { usage }));
        res.end();
        return;
      }
      converseCalls += 1;
      if (options.failConverse) {
        respondWithError(
          res,
          400,
          "ValidationException",
          "The provided request is not valid",
        );
        return;
      }
      if (
        options.hold === "converse" &&
        !(options.toolUse && converseCalls === 1)
      ) {
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      if (options.toolUse && converseCalls === 1) {
        res.end(
          JSON.stringify({
            output: {
              message: {
                role: "assistant",
                content: [
                  {
                    toolUse: {
                      toolUseId: "tooluse-local-1",
                      name: options.toolUse.name,
                      input: options.toolUse.input ?? {},
                    },
                  },
                ],
              },
            },
            stopReason: "tool_use",
            usage,
          }),
        );
        return;
      }
      res.end(
        JSON.stringify({
          output: {
            message: { role: "assistant", content: [{ text: reply }] },
          },
          stopReason: "end_turn",
          usage,
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

/**
 * The tool-result payloads a request body carries back to the model, as JSON
 * strings. Non-empty only on the turn that follows a `toolUse` reply, so it is
 * direct wire evidence that the tool really ran and its output was returned.
 */
export function toolResultsOnWire(body: string): string[] {
  try {
    const parsed = JSON.parse(body) as {
      messages?: Array<{
        content?: Array<{
          toolResult?: { content?: Array<{ text?: string; json?: unknown }> };
        }>;
      }>;
    };
    const out: string[] = [];
    for (const message of parsed.messages ?? []) {
      for (const block of message.content ?? []) {
        if (!block.toolResult) {
          continue;
        }
        for (const part of block.toolResult.content ?? []) {
          out.push(part.text ?? JSON.stringify(part.json ?? null));
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Placeholder AWS credentials. Signed, never validated, never real. */
export const PLACEHOLDER_AWS_ENV = {
  AWS_ACCESS_KEY_ID: "AKIALOCALENDPOINTONLY",
  AWS_SECRET_ACCESS_KEY: "local-endpoint-secret-not-real",
  AWS_REGION: "us-east-1",
} as const;
