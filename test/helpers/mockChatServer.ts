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
