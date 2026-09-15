/**
 * A local OpenAI-compatible chat-completions endpoint, for asserting on the
 * bytes a provider actually puts on the wire.
 *
 * Several behaviours are invisible from a response alone — whether a schema
 * was sent as `response_format`, whether tools were attached, how many. A live
 * model usually answers with JSON whether or not the schema was enforced, so a
 * suite that only inspects the reply cannot tell an honoured schema from a
 * lucky one. This records the request instead.
 *
 * Every OpenAI-compatible provider takes a base-URL override
 * (`DEEPSEEK_BASE_URL`, `OPENAI_COMPATIBLE_BASE_URL`, …), so pointing one here
 * exercises the real client and the real serialization. Plain HTTP/1.1 is
 * enough — unlike Bedrock, these speak ordinary JSON over HTTP. No credentials
 * are validated and nothing leaves the machine.
 */

import { createServer, type Server } from "node:http";

export type CapturedCompletionRequest = {
  /** Parsed request body, or null when it did not parse as JSON. */
  body: Record<string, unknown> | null;
  path: string;
};

export type LocalOpenAICompatible = {
  /** Value for the provider's *_BASE_URL env var. */
  baseURL: string;
  /** Every request received, oldest first. */
  requests: CapturedCompletionRequest[];
  close: () => Promise<void>;
};

/** Tool names attached to a captured request, in wire order. */
export function toolNamesOnWire(
  request: CapturedCompletionRequest | undefined,
): string[] {
  const tools = (request?.body?.tools as unknown[] | undefined) ?? [];
  return tools.map((entry) => {
    const fn = (entry as { function?: { name?: unknown } }).function;
    return typeof fn?.name === "string" ? fn.name : "";
  });
}

/** The `response_format` a captured request carried, or null when absent. */
export function responseFormatOnWire(
  request: CapturedCompletionRequest | undefined,
): unknown {
  return request?.body?.response_format ?? null;
}

function parseBody(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function startLocalOpenAICompatible(
  reply = '{"capital":"Paris","population":2103000}',
): Promise<LocalOpenAICompatible> {
  const requests: CapturedCompletionRequest[] = [];
  const server: Server = createServer((req, res) => {
    // Answer only the route this helper claims to serve. Replying to every
    // method and path with a chat completion means a caller that dialled the
    // wrong URL still gets a plausible 200, and the captured request log --
    // which the assertions read positionally -- silently gains an entry that
    // was never a completion request.
    if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const body = parseBody(raw);
      requests.push({ body, path: req.url ?? "" });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-local",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: (body?.model as string) ?? "local-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: reply },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      );
    });
  });

  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    baseURL: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
