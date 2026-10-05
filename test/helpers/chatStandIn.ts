/**
 * A local OpenAI-wire chat endpoint that answers "OK" and remembers what it was
 * sent, so a suite can assert on what actually reached the model without any
 * provider credentials.
 */

import { createServer } from "node:http";

export async function startChatStandIn() {
  const bodies: Array<{
    model?: string;
    messages?: Array<{ content?: unknown }>;
  }> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const body = raw ? JSON.parse(raw) : {};
      bodies.push(body);
      if (body.stream !== true) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "stand-in",
            object: "chat.completion",
            created: 1,
            model: "test-model",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "OK" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
        return;
      }
      const chunk = (delta: Record<string, unknown>, finish: string | null) =>
        `data: ${JSON.stringify({
          id: "stand-in",
          object: "chat.completion.chunk",
          created: 1,
          model: "test-model",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`;
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write(chunk({ role: "assistant", content: "OK" }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseURL: `http://127.0.0.1:${port}`,
    imagePartCount: (): number =>
      bodies
        .flatMap((body) => body.messages ?? [])
        .flatMap((message) =>
          Array.isArray(message.content) ? message.content : [],
        )
        .filter((part) => (part as { type?: string }).type === "image_url")
        .length,
    requestedModels: (): string[] =>
      bodies.flatMap((body) =>
        typeof body.model === "string" ? [body.model] : [],
      ),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
