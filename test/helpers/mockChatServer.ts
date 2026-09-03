/**
 * Local, loopback-only OpenAI-chat-completions stand-in.
 *
 * Exists so a suite can prove what NeuroLink actually sent to a model —
 * whether an archive's poisoned entry, a zip bomb's inflated bytes, or an
 * XXE payload's resolved secret made it into the outbound request — without
 * live credentials or a real network call. `provider: "openai"` accepts a
 * per-call `credentials.openai.baseURL` override (see
 * `src/lib/types/providers.ts`), so pointing it at `http://127.0.0.1:<port>`
 * with any non-empty `apiKey` string is enough to get past provider
 * construction; nothing after that talks to the internet.
 *
 * `buildMessages()` (file processing — the ArchiveProcessor / WordProcessor /
 * ExcelProcessor security checks under test) always runs before the actual
 * network call inside `BaseProvider.generate()`/`stream()`. So a security
 * guard that rejects or strips something never reaches this server at all,
 * and one that degrades gracefully (see the "archive delivery" suite's zip
 * bomb test) sends this server a request whose body is the evidence.
 *
 * This is a genuine HTTP server on 127.0.0.1, not a `fetch` patch — it
 * exercises the real request-serialisation path (headers, JSON body,
 * SSE framing for `stream()`), which a monkeypatched `fetch` would not.
 */
import { createServer, type IncomingMessage, type Server } from "node:http";

export type MockChatServer = {
  /** Base URL to hand to `credentials.<provider>.baseURL`. */
  readonly baseURL: string;
  /** The raw JSON body of the most recent request, or null if none arrived. */
  getLastRequestBody(): string | null;
  /** Every request body received so far, oldest first. */
  getAllRequestBodies(): string[];
  /** True once at least one request has reached this server. */
  wasCalled(): boolean;
  /** Shut the server down and release its port. */
  close(): Promise<void>;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function sseChunk(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Start a local server that answers any `/chat/completions`-shaped POST
 * with a fixed, harmless assistant reply — non-streaming JSON when the
 * request body has no `"stream":true`, SSE chunks otherwise.
 *
 * The reply content is deliberately inert ("mock reply"): these suites
 * assert on what the SDK sent, not on what a model says back.
 */
export function startMockChatServer(): Promise<MockChatServer> {
  const bodies: string[] = [];

  const server: Server = createServer((req, res) => {
    readBody(req)
      .then((bodyStr) => {
        bodies.push(bodyStr);
        let streaming = false;
        try {
          streaming = JSON.parse(bodyStr)?.stream === true;
        } catch {
          // Malformed JSON is still a captured body; fall through to the
          // non-streaming reply so the caller's assertion sees it.
        }

        if (streaming) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          const created = Math.floor(Date.now() / 1000);
          const base = {
            id: "mock-stream",
            object: "chat.completion.chunk",
            created,
            model: "gpt-4o-mini",
          };
          res.write(
            sseChunk({
              ...base,
              choices: [
                {
                  index: 0,
                  delta: { role: "assistant", content: "mock reply" },
                  finish_reason: null,
                },
              ],
            }),
          );
          res.write(
            sseChunk({
              ...base,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
            }),
          );
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "mock-completion",
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: "gpt-4o-mini",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "mock reply" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      })
      .catch(() => {
        res.writeHead(500);
        res.end();
      });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseURL: `http://127.0.0.1:${port}/v1`,
        getLastRequestBody: () =>
          bodies.length > 0 ? bodies[bodies.length - 1] : null,
        getAllRequestBodies: () => [...bodies],
        wasCalled: () => bodies.length > 0,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/**
 * A `MockChatServer` that answers a SCRIPTED SEQUENCE of chat-completion
 * bodies, one per request, repeating the last once the script runs out.
 *
 * Exists to reproduce vendor misbehaviour that only shows up across two
 * requests, which no single fixed reply can express and no live endpoint will
 * produce on demand:
 *
 *  - io.net's Llama endpoint ends a tool loop on `finish_reason: "tool_calls"`
 *    with `content: null` and no `tool_calls` array. The recovery re-asks once
 *    with `tool_choice: "none"`, so proving it needs a first reply that is the
 *    broken shape and a second that is the answer.
 *  - GMI Cloud's MiniMax endpoint ignores a strict `json_schema` request and
 *    answers in markdown. The recovery re-asks with the schema spelled into
 *    the system prompt, so again the first and second replies must differ.
 *
 * Bodies are returned verbatim, so a test can send a shape the SDK's own
 * serialiser would never produce.
 */
export type ScriptedChatServer = MockChatServer & {
  /** How many requests have been answered so far. */
  requestCount(): number;
};

export type ScriptedReply =
  | Record<string, unknown>
  | { status: number; body: Record<string, unknown> };

const replyStatus = (reply: ScriptedReply): number =>
  typeof (reply as { status?: unknown }).status === "number"
    ? (reply as { status: number }).status
    : 200;

const replyBody = (reply: ScriptedReply): Record<string, unknown> =>
  typeof (reply as { status?: unknown }).status === "number"
    ? (reply as { body: Record<string, unknown> }).body
    : (reply as Record<string, unknown>);

export function startScriptedChatServer(
  script: ReadonlyArray<ScriptedReply>,
): Promise<ScriptedChatServer> {
  if (script.length === 0) {
    throw new Error("startScriptedChatServer: script must not be empty");
  }
  const bodies: string[] = [];

  const server: Server = createServer((req, res) => {
    readBody(req)
      .then((bodyStr) => {
        bodies.push(bodyStr);
        const reply = script[Math.min(bodies.length - 1, script.length - 1)];
        res.writeHead(replyStatus(reply), {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify(replyBody(reply)));
      })
      .catch(() => {
        res.writeHead(500);
        res.end();
      });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseURL: `http://127.0.0.1:${port}/v1`,
        getLastRequestBody: () =>
          bodies.length > 0 ? bodies[bodies.length - 1] : null,
        getAllRequestBodies: () => [...bodies],
        wasCalled: () => bodies.length > 0,
        requestCount: () => bodies.length,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/**
 * One chat-completion body. `content: null` with `finish_reason: "tool_calls"`
 * and no `tool_calls` is the io.net shape; it is expressible here and nowhere
 * else in the test helpers.
 */
export function chatCompletion(options: {
  content?: string | null;
  finishReason?: string;
  toolCalls?: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  return {
    id: "scripted-completion",
    object: "chat.completion",
    created: 1,
    model: "scripted-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: options.content ?? null,
          ...(options.toolCalls ? { tool_calls: options.toolCalls } : {}),
        },
        finish_reason: options.finishReason ?? "stop",
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

/**
 * Fake-but-syntactically-present OpenAI credentials pointed at a
 * `MockChatServer`. Provider construction only checks that an API key
 * string exists; it never validates it, so any non-empty value clears
 * that gate without touching a real key.
 */
export function mockOpenAICredentials(server: MockChatServer): {
  openai: { apiKey: string; baseURL: string };
} {
  return {
    openai: { apiKey: "sk-mock-local-server", baseURL: server.baseURL },
  };
}

/**
 * A `MockChatServer` whose replies are PACED and ADDRESSED by the prompt.
 *
 * Same loopback server, two additions the delegation suite needs and no live
 * model can give: a request whose body contains `DELAY:<ms>` is answered that
 * many milliseconds later, and one containing `TAG:<name>` is answered with
 * content naming that tag. That makes "which worker finished first" a property
 * of the test, not of the weather — which is the only way to prove that
 * collection order is independent of spawn order rather than merely observing
 * it once.
 */
export type PacedChatServer = MockChatServer & {
  /** How many requests are being held right now (paced, not yet answered). */
  inFlight(): number;
};

/**
 * Upper bound on a paced reply. The delay is read from the request body, and an
 * unbounded value would let one request hold its socket (and the suite) for
 * arbitrarily long. Suites pace in tens of milliseconds; ten seconds is far
 * above any legitimate use.
 */
const MAX_PACED_DELAY_MS = 10_000;

export function startPacedChatServer(): Promise<PacedChatServer> {
  const bodies: string[] = [];
  let inFlight = 0;

  const server: Server = createServer((req, res) => {
    readBody(req)
      .then((bodyStr) => {
        bodies.push(bodyStr);
        // Digit-capped at the regex AND bounded by an explicit comparison —
        // the comparison is the form static analysis recognises as the
        // upper-bound barrier on a request-derived timer duration.
        const requestedDelay =
          Number(/DELAY:(\d{1,5})/.exec(bodyStr)?.[1] ?? "0") || 0;
        const delayMs =
          requestedDelay > MAX_PACED_DELAY_MS
            ? MAX_PACED_DELAY_MS
            : requestedDelay;
        const tag = /TAG:([A-Za-z0-9_-]+)/.exec(bodyStr)?.[1] ?? "untagged";
        inFlight++;
        let held = true;
        const timer = setTimeout(() => {
          held = false;
          inFlight--;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "paced-completion",
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: "gpt-4o-mini",
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: `WORKER-REPORT ${tag}: finished after ${delayMs}ms.`,
                  },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: 1,
                completion_tokens: 1,
                total_tokens: 2,
              },
            }),
          );
        }, delayMs);
        // A held request must never keep the process alive on its own.
        timer.unref?.();
        // A cancelled worker stops being held. `res` 'close' is the reliable
        // signal: it fires on premature termination even after the request
        // body has ended, where the deprecated `req` 'aborted' stays silent.
        // It also fires after a NORMAL completion, so the cleanup is guarded.
        res.once("close", () => {
          if (held) {
            held = false;
            clearTimeout(timer);
            inFlight--;
          }
        });
      })
      .catch(() => {
        res.writeHead(500);
        res.end();
      });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseURL: `http://127.0.0.1:${port}/v1`,
        getLastRequestBody: () =>
          bodies.length > 0 ? bodies[bodies.length - 1] : null,
        getAllRequestBodies: () => [...bodies],
        wasCalled: () => bodies.length > 0,
        inFlight: () => inFlight,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
