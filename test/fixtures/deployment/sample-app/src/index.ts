import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Middleware
app.use("*", cors());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Generate endpoint - simulates NeuroLink generate
app.post("/api/generate", async (c) => {
  const body = await c.req.json();
  const { prompt, model } = body;

  // Simulated response
  return c.json({
    content: `Response to: ${prompt}`,
    model: model || "default-model",
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    },
  });
});

// Stream endpoint - simulates NeuroLink stream
app.post("/api/stream", async (c) => {
  const body = await c.req.json();
  const { prompt } = body;

  // Return streaming response
  return new Response(
    new ReadableStream({
      async start(controller) {
        const chunks = [`Streaming response to: ${prompt}`, " chunk1", " chunk2", " done"];
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
          await new Promise((r) => setTimeout(r, 100));
        }
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
});

// Tools endpoint
app.get("/api/tools", (c) => {
  return c.json({
    tools: [
      {
        name: "getCurrentTime",
        description: "Get the current time",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "calculateMath",
        description: "Perform mathematical calculations",
        inputSchema: {
          type: "object",
          properties: {
            expression: { type: "string" },
          },
          required: ["expression"],
        },
      },
    ],
  });
});

// Execute tool endpoint
app.post("/api/tools/:toolName", async (c) => {
  const toolName = c.req.param("toolName");
  const body = await c.req.json();

  // Simulated tool execution
  return c.json({
    toolName,
    result: `Executed ${toolName} with input: ${JSON.stringify(body)}`,
    success: true,
  });
});

// Providers endpoint
app.get("/api/providers", (c) => {
  return c.json({
    providers: ["openai", "anthropic", "google-ai-studio", "vertex", "bedrock", "azure", "ollama"],
  });
});

// Models endpoint
app.get("/api/models", (c) => {
  return c.json({
    models: {
      openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
      anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
      "google-ai-studio": ["gemini-2.0-flash", "gemini-1.5-pro"],
    },
  });
});

export default app;
