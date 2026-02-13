# NeuroLink Advanced Features

Enterprise-grade capabilities for production AI applications.

## Human-in-the-Loop (HITL)

Require approval for sensitive tool operations.

### Configuration

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["delete", "remove", "drop", "truncate"],
    timeout: 30000, // 30 seconds
    allowArgumentModification: true,
    autoApproveOnTimeout: false,
    auditLogging: true,
  },
});
```

### Custom Rules

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    customRules: [
      {
        name: "payment-approval",
        condition: (toolName, args) => {
          return toolName === "processPayment" && args.amount > 1000;
        },
        requiresConfirmation: true,
        customMessage: "Large payment requires approval",
      },
      {
        name: "production-deploy",
        condition: (toolName, args) => {
          return toolName === "deploy" && args.environment === "production";
        },
        requiresConfirmation: true,
      },
    ],
  },
});
```

### Handling Confirmations

```typescript
const emitter = neurolink.getEventEmitter();

emitter.on("hitl:confirmation-request", async (event) => {
  console.log(`Approval needed: ${event.payload.toolName}`);
  console.log(`Arguments: ${JSON.stringify(event.payload.arguments)}`);
  console.log(
    `Dangerous keywords: ${event.payload.metadata.dangerousKeywords}`,
  );

  // Your approval logic (UI prompt, Slack notification, etc.)
  const approved = await promptUserForApproval(event.payload);

  if (approved) {
    // Continue execution
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: {
        confirmationId: event.payload.confirmationId,
        approved: true,
        metadata: { timestamp: new Date().toISOString(), responseTime: 0 },
      },
    });
  } else {
    emitter.emit("hitl:confirmation-response", {
      type: "hitl:confirmation-response",
      payload: {
        confirmationId: event.payload.confirmationId,
        approved: false,
        reason: "User rejected",
        metadata: { timestamp: new Date().toISOString(), responseTime: 0 },
      },
    });
  }
});
```

## Workflow Engine

Create complex AI workflows with branching and parallel execution.

### Basic Workflow

```typescript
import { WorkflowEngine } from "@juspay/neurolink";

const workflow = new WorkflowEngine();

// Define workflow
workflow
  .addStep("analyze", async (input, context) => {
    const result = await neurolink.generate({
      input: { text: `Analyze: ${input.data}` },
    });
    return { analysis: result.content };
  })
  .addStep("summarize", async (input, context) => {
    const result = await neurolink.generate({
      input: { text: `Summarize: ${context.analysis}` },
    });
    return { summary: result.content };
  });

// Execute
const result = await workflow.execute({ data: "Your input" });
```

### Fluent Builder API

```typescript
const workflow = new WorkflowEngine()
  .then("step1", async (input) => processInput(input))
  .branch(
    "decision",
    async (input) => {
      if (input.type === "A") return "pathA";
      return "pathB";
    },
    {
      pathA: async (input) => handlePathA(input),
      pathB: async (input) => handlePathB(input),
    },
  )
  .parallel([
    { name: "task1", handler: async (input) => doTask1(input) },
    { name: "task2", handler: async (input) => doTask2(input) },
  ])
  .then("final", async (input) => finalize(input));
```

### Workflow with Checkpointing

```typescript
const workflow = new WorkflowEngine({
  persistence: {
    type: "redis",
    url: "redis://localhost:6379",
  },
  checkpointing: {
    enabled: true,
    frequency: "every-step",
  },
});

// Resume from checkpoint
const result = await workflow.resume(checkpointId);
```

### Ensemble Workflow

Run multiple models and synthesize results:

```typescript
const result = await neurolink.generate({
  input: { text: "Complex question" },
  workflow: {
    type: "ensemble",
    models: [
      { provider: "openai", model: "gpt-4o" },
      { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
      { provider: "vertex", model: "gemini-2.5-pro" },
    ],
    judge: {
      provider: "openai",
      model: "gpt-4o",
      criteria: ["accuracy", "completeness", "clarity"],
    },
  },
});
```

## Extended Thinking

Enable deep reasoning for complex tasks.

### Anthropic (Claude)

```typescript
const result = await neurolink.generate({
  input: { text: "Solve this complex math problem" },
  provider: "anthropic",
  thinkingLevel: "high", // minimal, low, medium, high
});

// With token budget
const resultWithBudget = await neurolink.generate({
  input: { text: "Complex reasoning" },
  provider: "anthropic",
  thinking: {
    enabled: true,
    budget: 20000, // tokens for thinking
  },
});
```

### Google (Gemini 3)

```typescript
const result = await neurolink.generate({
  input: { text: "Analyze this architecture" },
  provider: "vertex",
  model: "gemini-3-flash",
  thinkingLevel: "high",
});
```

## Observability

### Langfuse Integration

```typescript
const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: "https://cloud.langfuse.com",
    },
  },
});
```

### Context Management

```typescript
import { setLangfuseContext, getLangfuseContext } from "@juspay/neurolink";

const result = await setLangfuseContext(
  {
    userId: "user-123",
    sessionId: "session-456",
    conversationId: "conv-789",
    requestId: "req-abc",
    traceName: "customer-support",
    metadata: {
      feature: "chat",
      tier: "premium",
    },
  },
  async () => {
    return await neurolink.generate({ input: { text: "Hello" } });
  },
);
```

### External TracerProvider

For apps with existing OpenTelemetry setup:

```typescript
import { NeuroLink, getSpanProcessors } from "@juspay/neurolink";
import { NodeSDK } from "@opentelemetry/sdk-node";

const neurolink = new NeuroLink({
  observability: {
    langfuse: {
      enabled: true,
      useExternalTracerProvider: true,
    },
  },
});

// Add NeuroLink processors to your OTEL setup
const sdk = new NodeSDK({
  spanProcessors: [yourExistingProcessor, ...getSpanProcessors()],
});
```

### Custom Spans

```typescript
import { getTracer } from "@juspay/neurolink";

const tracer = getTracer("my-app");
const span = tracer.startSpan("custom-operation");

try {
  // Your code
  await doSomething();
} finally {
  span.end();
}
```

## Server Adapters

Deploy NeuroLink as an HTTP API.

### Hono (Default)

```typescript
import { NeuroLink, createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    cors: true,
    rateLimit: {
      windowMs: 60000,
      max: 100,
    },
  },
});

await server.start();
```

### Express

```typescript
import { createServer } from "@juspay/neurolink";
import express from "express";

const app = express();
const server = await createServer(neurolink, {
  framework: "express",
  app, // Use existing Express app
});

app.listen(3000);
```

### Fastify

```typescript
import { createServer } from "@juspay/neurolink";
import Fastify from "fastify";

const fastify = Fastify();
const server = await createServer(neurolink, {
  framework: "fastify",
  app: fastify,
});

await fastify.listen({ port: 3000 });
```

### Available Routes

| Route            | Method | Description          |
| ---------------- | ------ | -------------------- |
| `/api/generate`  | POST   | Text generation      |
| `/api/stream`    | POST   | Streaming generation |
| `/api/tools`     | GET    | List available tools |
| `/api/providers` | GET    | Provider status      |
| `/api/health`    | GET    | Health check         |

## Multi-Agent Networks

Orchestrate multiple specialized agents.

### Define Agents

```typescript
import { Agent, AgentNetwork } from "@juspay/neurolink";

const researchAgent = new Agent({
  name: "researcher",
  description: "Research and gather information",
  systemPrompt: "You are a research specialist.",
  tools: ["websearch", "readFile"],
});

const writerAgent = new Agent({
  name: "writer",
  description: "Write and edit content",
  systemPrompt: "You are a content writer.",
  tools: ["writeFile"],
});

const reviewerAgent = new Agent({
  name: "reviewer",
  description: "Review and improve content",
  systemPrompt: "You are an editor.",
});
```

### Create Network

```typescript
const network = new AgentNetwork({
  agents: [researchAgent, writerAgent, reviewerAgent],
  topology: "hub-spoke", // or 'mesh', 'hierarchical'
  router: {
    type: "llm",
    model: "gpt-4o-mini",
  },
});

const result = await network.execute({
  task: "Research AI trends and write a blog post",
});
```

### Routing Agent

```typescript
import { RoutingAgent } from "@juspay/neurolink";

const router = new RoutingAgent({
  agents: [researchAgent, writerAgent, reviewerAgent],
  routingStrategy: "confidence",
  fallbackAgent: "researcher",
});

const result = await router.route({
  task: "Write about machine learning",
});

console.log("Routed to:", result.selectedAgent);
console.log("Confidence:", result.confidence);
```

## Evaluation and Scoring

Score AI responses for quality.

### Built-in Scorers

```typescript
import { evaluateResponse } from "@juspay/neurolink";

const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  evaluation: {
    enabled: true,
    scorers: ["relevance", "coherence", "completeness"],
  },
});

console.log(result.evaluation);
// {
//   scores: { relevance: 0.92, coherence: 0.88, completeness: 0.85 },
//   passed: true
// }
```

### Available Scorers

| Scorer          | Type | Description                  |
| --------------- | ---- | ---------------------------- |
| `relevance`     | LLM  | Response relevance to prompt |
| `coherence`     | LLM  | Logical flow and structure   |
| `completeness`  | LLM  | Coverage of topic            |
| `accuracy`      | LLM  | Factual correctness          |
| `toxicity`      | Rule | Detect harmful content       |
| `length`        | Rule | Response length check        |
| `json-validity` | Rule | Valid JSON output            |
| `regex-match`   | Rule | Pattern matching             |

### Custom Evaluation

```typescript
const result = await neurolink.generate({
  input: { text: "Query" },
  evaluation: {
    enabled: true,
    domain: "healthcare",
    customPrompt: "Evaluate medical accuracy...",
    threshold: 0.8,
  },
});
```

## Storage Abstraction

Unified storage layer for persistence.

```typescript
import { createStorage } from "@juspay/neurolink";

// File storage
const fileStorage = createStorage({
  type: "file",
  path: "./data",
});

// Redis
const redisStorage = createStorage({
  type: "redis",
  url: "redis://localhost:6379",
});

// PostgreSQL
const pgStorage = createStorage({
  type: "postgres",
  connectionString: process.env.DATABASE_URL,
});

// S3
const s3Storage = createStorage({
  type: "s3",
  bucket: "my-bucket",
  region: "us-east-1",
});
```

## Authentication

Protect your NeuroLink API.

```typescript
import { createServer, createAuthMiddleware } from "@juspay/neurolink";

const authMiddleware = createAuthMiddleware({
  type: "jwt",
  secret: process.env.JWT_SECRET,
  issuer: "my-app",
});

const server = await createServer(neurolink, {
  middleware: [authMiddleware],
  config: { port: 3000 },
});
```

### Supported Auth Types

- JWT tokens
- API keys
- OAuth2
- Session-based
- Custom middleware

## Deployment

### Docker

```bash
neurolink deploy docker --output ./docker
```

### AWS Lambda

```bash
neurolink deploy lambda --function-name my-ai-api
```

### Vercel

```bash
neurolink deploy vercel
```

## Next Steps

- SDK quickstart - Basic usage
- Providers - Provider configuration
- Tools - MCP integration
- Troubleshooting - Common issues
