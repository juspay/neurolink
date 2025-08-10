# SDK Reference

The NeuroLink SDK provides a TypeScript-first programmatic interface for integrating AI capabilities into your applications.

## 🎯 Overview

The SDK is designed for:

- **Web applications** (React, Vue, Svelte, Angular)
- **Backend services** (Node.js, Express, Fastify)
- **Serverless functions** (Vercel, Netlify, AWS Lambda)
- **Desktop applications** (Electron, Tauri)

## 🚀 Quick Start

=== "Basic Usage"

    ```typescript
    import { NeuroLink } from "@juspay/neurolink";

    const neurolink = new NeuroLink();

    // Generate text
    const result = await neurolink.generate({
      input: { text: "Write a haiku about programming" },
      provider: "google-ai",
    });

    console.log(result.content);
    ```

=== "With Provider Factory"

    ```typescript
    import { createBestAIProvider } from "@juspay/neurolink";

    // Auto-selects best available provider
    const provider = createBestAIProvider();

    const result = await provider.generate({
      input: { text: "Explain quantum computing" },
      maxTokens: 500,
      temperature: 0.7,
    });
    ```

=== "Streaming"

    ```typescript
    const stream = await neurolink.stream({
      input: { text: "Tell me a long story" },
      provider: "anthropic",
    });

    for await (const chunk of stream.stream) {
      process.stdout.write(chunk.content);
    }
    ```

## 📚 Documentation Sections

<div class="grid cards" markdown>

- :material-api: **[API Reference](api-reference.md)**

  ***

  Complete TypeScript API documentation with interfaces, types, and method signatures.

- :material-web: **[Framework Integration](framework-integration.md)**

  ***

  Integration guides for Next.js, SvelteKit, React, Vue, and other popular frameworks.

- :material-tools: **[Custom Tools](custom-tools.md)**

  ***

  How to create and register custom tools for enhanced AI capabilities.

</div>

## 🏗️ Core Architecture

The SDK uses a **Factory Pattern** architecture that provides:

- **Unified Interface**: All providers implement the same `AIProvider` interface
- **Type Safety**: Full TypeScript support with IntelliSense
- **Automatic Fallback**: Seamless provider switching on failures
- **Built-in Tools**: 6 core tools available across all providers

```typescript
interface AIProvider {
  generate(options: TextGenerationOptions): Promise<EnhancedGenerateResult>;
  stream(options: StreamOptions): Promise<StreamResult>;
  supportsTools(): boolean;
}
```

## ⚙️ Configuration

The SDK automatically detects configuration from:

```typescript
// Environment variables
process.env.OPENAI_API_KEY;
process.env.GOOGLE_AI_API_KEY;
process.env.ANTHROPIC_API_KEY;
// ... and more

// Programmatic configuration
const neurolink = new NeuroLink({
  defaultProvider: "openai",
  timeout: 30000,
  enableAnalytics: true,
});
```

## 🔧 Advanced Features

### Analytics & Evaluation

```typescript
const result = await neurolink.generate({
  input: { text: "Generate a business proposal" },
  enableAnalytics: true, // Track usage and costs
  enableEvaluation: true, // AI quality scoring
});

console.log(result.analytics); // Usage data
console.log(result.evaluation); // Quality scores
```

### Custom Tools

```typescript
// Register a single tool
neurolink.registerTool("weatherLookup", {
  description: "Get current weather for a city",
  parameters: z.object({
    city: z.string(),
    units: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
  execute: async ({ city, units = "celsius" }) => {
    // Your implementation
    return { city, temperature: 22, units, condition: "sunny" };
  },
});

// Register multiple tools - Object format
neurolink.registerTools({
  stockPrice: {
    description: "Get stock price",
    execute: async () => ({ price: 150.25 }),
  },
  calculator: {
    description: "Calculate math",
    execute: async () => ({ result: 42 }),
  },
});

// Register multiple tools - Array format (Lighthouse compatible)
neurolink.registerTools([
  {
    name: "analytics",
    tool: {
      description: "Get analytics data",
      parameters: z.object({
        merchantId: z.string(),
        dateRange: z.string().optional(),
      }),
      execute: async ({ merchantId, dateRange }) => {
        return { data: "analytics result" };
      },
    },
  },
  {
    name: "processor",
    tool: {
      description: "Process payments",
      execute: async () => ({ status: "processed" }),
    },
  },
]);
```

### Context Integration

```typescript
const result = await neurolink.generate({
  input: { text: "Create a summary" },
  context: {
    userId: "123",
    project: "Q1-report",
    department: "sales",
  },
});
```

## 🌐 Framework Examples

=== "Next.js API Route"

    ```typescript
    // app/api/ai/route.ts
    import { NeuroLink } from "@juspay/neurolink";

    export async function POST(request: Request) {
      const { prompt } = await request.json();
      const neurolink = new NeuroLink();

      const result = await neurolink.generate({
        input: { text: prompt },
        timeout: "2m",
      });

      return Response.json({ text: result.content });
    }
    ```

=== "SvelteKit Endpoint"

    ```typescript
    // src/routes/api/ai/+server.ts
    import { createBestAIProvider } from "@juspay/neurolink";

    export const POST: RequestHandler = async ({ request }) => {
      const { message } = await request.json();
      const provider = createBestAIProvider();

      const stream = await provider.stream({
        input: { text: message },
        timeout: "2m",
      });

      return new Response(stream.toReadableStream());
    };
    ```

=== "Express.js Server"

    ```typescript
    import express from 'express';
    import { NeuroLink } from "@juspay/neurolink";

    const app = express();
    const neurolink = new NeuroLink();

    app.post('/api/generate', async (req, res) => {
      const result = await neurolink.generate({
        input: { text: req.body.prompt },
      });

      res.json({ content: result.content });
    });
    ```

## 🔗 Related Resources

- **[Examples & Tutorials](../examples/index.md)** - Practical implementation examples
- **[Advanced Features](../advanced/index.md)** - MCP integration, analytics, streaming
- **[Troubleshooting](../reference/troubleshooting.md)** - Common issues and solutions
