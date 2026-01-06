# Interactive Playground

Try NeuroLink in a live coding environment without any local setup required.

## Try NeuroLink Now

Click the button below to open a live coding environment powered by StackBlitz:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/juspay/neurolink-playground)

## Example Playgrounds

Explore these interactive examples to learn NeuroLink's capabilities:

### Basic Chat

Get started with a simple chat application using NeuroLink.

- **Demonstrates:** Provider setup, basic text generation
- **Complexity:** Beginner
- [Open in StackBlitz](https://stackblitz.com/github/juspay/neurolink-playground/tree/main/examples/basic-chat)

**Preview:**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.generate({
  prompt: "Hello! Tell me about NeuroLink.",
  provider: "openai",
});

console.log(result.text);
```

### Streaming Responses

Learn how to implement real-time streaming responses.

- **Demonstrates:** Stream API, chunk processing, real-time UI updates
- **Complexity:** Intermediate
- [Open in StackBlitz](https://stackblitz.com/github/juspay/neurolink-playground/tree/main/examples/streaming)

**Preview:**

```typescript
const stream = await neurolink.stream({
  prompt: "Write a story about AI",
  provider: "anthropic",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### MCP Tools Integration

Explore Model Context Protocol (MCP) tools with NeuroLink.

- **Demonstrates:** Tool registry, tool execution, external MCP servers
- **Complexity:** Advanced
- [Open in StackBlitz](https://stackblitz.com/github/juspay/neurolink-playground/tree/main/examples/mcp-tools)

**Preview:**

```typescript
import { NeuroLink, MCPToolRegistry } from "@juspay/neurolink";

const registry = new MCPToolRegistry();
await registry.addBuiltinTools(["readFile", "writeFile"]);

const neurolink = new NeuroLink({ toolRegistry: registry });
const result = await neurolink.generate({
  prompt: "Read the README.md file",
  provider: "anthropic",
});
```

### Multi-Provider Failover

Implement enterprise-grade multi-provider failover patterns.

- **Demonstrates:** Provider failover, error handling, cost optimization
- **Complexity:** Advanced
- [Open in StackBlitz](https://stackblitz.com/github/juspay/neurolink-playground/tree/main/examples/multi-provider)

**Preview:**

```typescript
const result = await neurolink.generate({
  prompt: "Analyze this data",
  provider: "openai",
  fallbackProviders: ["anthropic", "google-ai"],
});
```

## Running Playgrounds Locally

Want to run these examples on your local machine? Use `degit` to quickly clone any example:

### Quick Start

```bash
# Clone the basic chat example
npx degit juspay/neurolink-playground/examples/basic-chat my-neurolink-app

# Navigate to the project
cd my-neurolink-app

# Install dependencies
pnpm install

# Set up your environment variables
cp .env.example .env
# Edit .env and add your API keys

# Run the development server
pnpm dev
```

### Available Examples

Clone any example by changing the path:

```bash
# Streaming example
npx degit juspay/neurolink-playground/examples/streaming my-project

# MCP tools example
npx degit juspay/neurolink-playground/examples/mcp-tools my-project

# Multi-provider example
npx degit juspay/neurolink-playground/examples/multi-provider my-project
```

## Create Your Own Playground

Start from our template to build custom NeuroLink applications:

```bash
# Clone the playground template
npx degit juspay/neurolink-playground my-custom-app

# Install dependencies
cd my-custom-app
pnpm install

# Start developing
pnpm dev
```

## Playground Features

All playground examples include:

- **Zero Configuration** - Pre-configured with sensible defaults
- **TypeScript Support** - Full type safety out of the box
- **Hot Reload** - Instant feedback as you code
- **Environment Setup** - `.env.example` files for easy API key configuration
- **Modern Stack** - Built with Vite, TypeScript, and modern tooling
- **Commented Code** - Detailed inline documentation explaining key concepts

## Embed Playgrounds

You can embed any playground example in your documentation or blog posts:

### Iframe Embed

```html
<iframe
  src="https://stackblitz.com/github/juspay/neurolink-playground/tree/main/examples/basic-chat?embed=1"
  style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
  title="NeuroLink Basic Chat"
  allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
></iframe>
```

### Markdown Embed Link

```markdown
[![Edit in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/juspay/neurolink-playground/tree/main/examples/basic-chat)
```

## Need Help?

- **Documentation:** [Getting Started Guide](../getting-started/index.md)
- **Examples:** [SDK Examples](../examples/index.md)
- **Support:** [GitHub Issues](https://github.com/juspay/neurolink/issues)
- **Community:** [GitHub Discussions](https://github.com/juspay/neurolink/discussions)

---

**Note:** The NeuroLink Playground repository is currently under development. Some examples may be placeholders. We welcome contributions! See our [Contributing Guide](../contributing.md) for details.
