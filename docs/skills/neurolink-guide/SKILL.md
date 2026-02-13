---
name: neurolink-guide
description: Guide for using the NeuroLink SDK and CLI. Invoke when users ask how to use neurolink, integrate AI providers, add MCP tools, configure RAG, set up memory, deploy servers, or work with multimodal content. Covers SDK, CLI, providers, tools, and enterprise features.
argument-hint: [topic]
allowed-tools: Read, Grep, Glob
---

# NeuroLink Usage Guide

NeuroLink is an enterprise AI development platform providing unified access to 13+ AI providers through a single API. It ships as both a TypeScript SDK (`@juspay/neurolink`) and a professional CLI.

## Quick Navigation

Based on your query, I'll guide you to the right documentation:

- **Getting Started** → Read sdk-quickstart.md
- **Provider Setup** → Read providers.md
- **Multimodal (images, PDFs, files)** → Read multimodal.md
- **MCP Tools Integration** → Read tools-mcp.md
- **RAG Pipelines** → Read rag-integration.md
- **Conversation Memory** → Read memory-conversations.md
- **CLI Commands** → Read cli-reference.md
- **Advanced Features** → Read advanced-features.md
- **Troubleshooting** → Read troubleshooting.md

## Topic Routing

If the user asked about `$ARGUMENTS`:

| Topic Keywords                                                             | Reference File          |
| -------------------------------------------------------------------------- | ----------------------- |
| install, setup, start, begin, quickstart                                   | sdk-quickstart.md       |
| provider, openai, anthropic, vertex, bedrock, azure, gemini, claude, model | providers.md            |
| image, pdf, csv, excel, document, file, multimodal, vision                 | multimodal.md           |
| tool, mcp, server, GitHub, external, function                              | tools-mcp.md            |
| rag, retrieval, chunk, vector, embed, document search                      | rag-integration.md      |
| memory, conversation, history, session, redis, context                     | memory-conversations.md |
| cli, command, terminal, generate, stream, loop, serve                      | cli-reference.md        |
| hitl, workflow, agent, observe, telemetry, deploy, server                  | advanced-features.md    |
| error, issue, problem, fix, debug, not working                             | troubleshooting.md      |

## Installation

```bash
npm install @juspay/neurolink
# or
pnpm add @juspay/neurolink
# or
yarn add @juspay/neurolink
```

## Minimal Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Generate text
const result = await neurolink.generate("Explain quantum computing");
console.log(result.content);

// Stream response
const stream = await neurolink.stream({ input: { text: "Write a story" } });
for await (const chunk of stream.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}
```

## Key Capabilities

| Feature           | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| **13+ Providers** | OpenAI, Anthropic, Vertex, Bedrock, Azure, Mistral, Ollama, etc. |
| **Multimodal**    | Images, PDFs, CSV, Excel, Word, 50+ file types                   |
| **MCP Tools**     | 58+ tools via Model Context Protocol                             |
| **RAG**           | Built-in chunking, embedding, vector search                      |
| **Memory**        | Conversation history with Redis support                          |
| **Streaming**     | Real-time token streaming                                        |
| **HITL**          | Human-in-the-loop approval workflows                             |
| **Observability** | Langfuse, OpenTelemetry integration                              |

## Code Templates

Ready-to-use examples in `templates/`:

- `templates/basic-setup.ts` - Basic SDK initialization
- `templates/streaming.ts` - Streaming responses
- `templates/with-tools.ts` - Tool integration
- `templates/rag-pipeline.ts` - RAG usage
- `templates/server-deploy.ts` - HTTP server deployment

## CLI Quick Reference

```bash
# Generate content
neurolink generate "Your prompt"

# Stream output
neurolink stream "Write a story"

# Interactive mode
neurolink loop

# Start HTTP server
neurolink serve --port 3000

# Setup providers
neurolink setup openai
```

## Environment Variables

Set up your provider credentials:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google AI Studio
GOOGLE_API_KEY=...

# Vertex AI
VERTEX_PROJECT_ID=...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# AWS Bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

## Type Imports

```typescript
import type {
  GenerateOptions,
  GenerateResult,
  StreamOptions,
  StreamResult,
  ChatMessage,
  ToolInfo,
  MCPServerInfo,
  RAGConfig,
  ProviderStatus,
} from "@juspay/neurolink";
```

## Getting Help

1. Check the relevant reference file above
2. Review troubleshooting.md for common issues
3. Look at code templates in `templates/`
4. Read the full CLAUDE.md in the project root for architecture details

---

**Instructions for Claude:** Based on the user's query about `$ARGUMENTS`, read the appropriate reference file and provide specific guidance. If no topic is specified, give a general overview of NeuroLink capabilities and ask what they'd like help with.
