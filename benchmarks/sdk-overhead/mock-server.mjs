// A fake OpenAI-compatible server with a fixed 300-word reply, so the
// benchmarks time NeuroLink's own work and never the network or a model.
import http from "node:http";

const WORDS = Array.from({ length: 300 }, (_, i) => `word${i}`);
const USAGE = { prompt_tokens: 50, completion_tokens: 300, total_tokens: 350 };

function chunk(delta, finishReason, extra = {}) {
  return `data: ${JSON.stringify({
    id: "bench",
    object: "chat.completion.chunk",
    created: 1,
    model: "mock-model",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
    ...extra,
  })}\n\n`;
}

export function startMockServer(port = 0) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url.endsWith("/models")) {
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            object: "list",
            data: [{ id: "mock-model", object: "model" }],
          }),
        );
        return;
      }
      let request = {};
      try {
        request = JSON.parse(body || "{}");
      } catch {
        // A malformed body still gets the plain reply.
      }
      if (request.stream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const word of WORDS) {
          res.write(chunk({ content: `${word} ` }, null));
        }
        res.write(chunk({}, "stop", { usage: USAGE }));
        res.end("data: [DONE]\n\n");
        return;
      }
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "bench",
          object: "chat.completion",
          created: 1,
          model: "mock-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: WORDS.join(" ") },
              finish_reason: "stop",
            },
          ],
          usage: USAGE,
        }),
      );
    });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (import.meta.main) {
  const server = await startMockServer(Number(process.argv[2] || 0));
  console.log(`mock server on http://127.0.0.1:${server.address().port}/v1`);
}
