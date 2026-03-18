# Interactive Playground

Try NeuroLink with working examples you can run locally in minutes.

## Get the Demo Project

Clone the NeuroLink repository which includes a ready-to-run demo:

```bash
git clone https://github.com/juspay/neurolink.git
cd neurolink/neurolink-demo
pnpm install
pnpm dev
```

Browse the full demo source on GitHub: [neurolink-demo](https://github.com/juspay/neurolink/tree/release/neurolink-demo)

## Example Playgrounds

Explore these examples to learn NeuroLink's capabilities:

### Basic Chat

Get started with a simple chat application using NeuroLink.

- **Demonstrates:** Provider setup, basic text generation
- **Complexity:** Beginner
- [View on GitHub](https://github.com/juspay/neurolink/tree/release/neurolink-demo)

**Preview:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Hello! Tell me about NeuroLink." },
  provider: "openai",
});

console.log(result.content);
```

### Streaming Responses

Learn how to implement real-time streaming responses.

- **Demonstrates:** Stream API, chunk processing, real-time UI updates
- **Complexity:** Intermediate
- [View on GitHub](https://github.com/juspay/neurolink/tree/release/neurolink-demo)

**Preview:**

```typescript
const result = await neurolink.stream({
  input: { text: "Write a story about AI" },
  provider: "anthropic",
});

for await (const chunk of result.stream) {
  process.stdout.write(chunk.content);
}
```

### MCP Tools Integration

Explore Model Context Protocol (MCP) tools with NeuroLink.

- **Demonstrates:** Tool registry, tool execution, external MCP servers
- **Complexity:** Advanced
- [View on GitHub](https://github.com/juspay/neurolink/tree/release/neurolink-demo)

**Preview:**

```typescript
import { NeuroLink, MCPToolRegistry } from "@juspay/neurolink";

const registry = new MCPToolRegistry();
await registry.addBuiltinTools(["readFile", "writeFile"]);

const neurolink = new NeuroLink({ toolRegistry: registry });
const result = await neurolink.generate({
  input: { text: "Read the README.md file" },
  provider: "anthropic",
});
```

### Multi-Provider Failover

Implement enterprise-grade multi-provider failover patterns.

- **Demonstrates:** Provider failover, error handling, cost optimization
- **Complexity:** Advanced
- [View on GitHub](https://github.com/juspay/neurolink/tree/release/neurolink-demo)

**Preview:**

```typescript
const result = await neurolink.generate({
  input: { text: "Analyze this data" },
  provider: "openai",
  fallbackProviders: ["anthropic", "google-ai"],
});
```

## Running Examples Locally

Clone the full NeuroLink repository and run the demo project:

```bash
git clone https://github.com/juspay/neurolink.git
cd neurolink/neurolink-demo
pnpm install
pnpm dev
```

## Playground Features

All examples include:

- **Zero Configuration** - Pre-configured with sensible defaults
- **TypeScript Support** - Full type safety out of the box
- **Hot Reload** - Instant feedback as you code
- **Environment Setup** - `.env.example` files for easy API key configuration
- **Modern Stack** - Built with Vite, TypeScript, and modern tooling
- **Commented Code** - Detailed inline documentation explaining key concepts

## Need Help?

- **Documentation:** [Getting Started Guide](../getting-started/index.md)
- **Examples:** [SDK Examples](../examples/index.md)
- **Support:** [GitHub Issues](https://github.com/juspay/neurolink/issues)
- **Community:** [GitHub Discussions](https://github.com/juspay/neurolink/discussions)
