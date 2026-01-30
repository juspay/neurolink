# Model Context Protocol (MCP) Research

> Comprehensive research on MCP specification, implementations, transport protocols, security, and adoption patterns (2024-2025)

**Research Date:** January 2026
**Protocol Version:** 2025-11-25 (Latest)
**Status:** Production Standard

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [MCP Specification Overview](#mcp-specification-overview)
3. [Core Architecture](#core-architecture)
4. [Transport Protocols](#transport-protocols)
5. [Security Best Practices](#security-best-practices)
6. [MCP Server Implementations](#mcp-server-implementations)
7. [Community Tools and Ecosystem](#community-tools-and-ecosystem)
8. [MCP vs Function Calling](#mcp-vs-function-calling)
9. [Adoption Patterns 2024-2025](#adoption-patterns-2024-2025)
10. [SDK Implementation Guide](#sdk-implementation-guide)
11. [Recommendations for NeuroLink](#recommendations-for-neurolink)
12. [References and Sources](#references-and-sources)

---

## Executive Summary

The Model Context Protocol (MCP) has emerged as the **de-facto standard** for connecting AI applications to external data sources and tools. Introduced by Anthropic in November 2024, MCP has achieved remarkable adoption in just one year:

### Key Statistics (as of late 2025)

- **97M+ monthly SDK downloads** across Python and TypeScript
- **10,000+ active public MCP servers**
- **First-class support** in ChatGPT, Claude, Cursor, Gemini, Microsoft Copilot, VS Code
- **Major platform adoption**: OpenAI (March 2025), Microsoft Azure (May 2025), Google DeepMind
- **Governance**: Donated to the Agentic AI Foundation under Linux Foundation (November 2025)

### Protocol Maturity

- **Specification version**: 2025-11-25 (anniversary release)
- **API freeze**: Registry API v0.1 (October 2025)
- **SEP process**: Formal Specification Enhancement Proposal process established
- **Official Registry**: registry.modelcontextprotocol.io launched September 2025

---

## MCP Specification Overview

### What is MCP?

MCP is an **open protocol** that enables seamless integration between LLM applications and external data sources and tools. It provides a universal interface for:

- Reading files and data
- Executing functions
- Handling contextual prompts
- Managing resources and tools

**Analogy**: MCP is like a USB-C port for AI applications - a standardized way to connect AI systems to external tools and data.

### Official Resources

| Resource               | URL                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Official Documentation | [modelcontextprotocol.io](https://modelcontextprotocol.io/)                                                  |
| Specification          | [modelcontextprotocol.io/specification/2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) |
| GitHub Organization    | [github.com/modelcontextprotocol](https://github.com/modelcontextprotocol)                                   |
| Official Registry      | [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)                                |
| Blog                   | [blog.modelcontextprotocol.io](http://blog.modelcontextprotocol.io/)                                         |

### Protocol Evolution Timeline

| Date           | Milestone                                                          |
| -------------- | ------------------------------------------------------------------ |
| November 2024  | MCP announced by Anthropic                                         |
| March 2025     | OpenAI adopts MCP for ChatGPT                                      |
| May 2025       | Microsoft Azure integrates MCP                                     |
| June 2025      | Spec update: OAuth 2.1, structured outputs, elicitation            |
| September 2025 | Official MCP Registry preview launch                               |
| October 2025   | Registry API freeze (v0.1)                                         |
| November 2025  | 1-year anniversary, new spec release, donation to Linux Foundation |

---

## Core Architecture

### Protocol Foundation: JSON-RPC 2.0

MCP uses **JSON-RPC 2.0** as its wire format for all client-server communication.

#### Message Types

**1. Requests** (bidirectional, expect response)

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id-123",
  "method": "tools/list",
  "params": {}
}
```

**2. Responses** (reply to requests)

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id-123",
  "result": {
    "tools": [...]
  }
}
```

**3. Notifications** (one-way, no response expected)

```json
{
  "jsonrpc": "2.0",
  "method": "progress",
  "params": { "progress": 50, "total": 100 }
}
```

#### Standard Error Codes

| Code   | Name             | Description                 |
| ------ | ---------------- | --------------------------- |
| -32700 | PARSE_ERROR      | Invalid JSON                |
| -32600 | INVALID_REQUEST  | Missing required fields     |
| -32601 | METHOD_NOT_FOUND | Unknown method              |
| -32602 | INVALID_PARAMS   | Parameter validation failed |
| -32603 | INTERNAL_ERROR   | Server-side failure         |

### Three Core Primitives

MCP defines three primitives with different **control patterns**:

#### 1. Tools (Model-Controlled)

Executable functions that AI applications can invoke to perform actions.

```typescript
// Tool definition schema
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": { "type": "string" }
    },
    "required": ["location"]
  }
}
```

**Discovery**: `tools/list`
**Execution**: `tools/call`
**Control**: Model decides when to invoke tools

#### 2. Resources (Application-Controlled)

Data sources providing contextual information.

```typescript
// Resource definition
{
  "uri": "file:///project/README.md",
  "name": "Project README",
  "mimeType": "text/markdown",
  "description": "Main project documentation"
}
```

**Discovery**: `resources/list`
**Retrieval**: `resources/read`
**Control**: Application explicitly fetches and manages resources

#### 3. Prompts (User-Controlled)

Reusable templates for structured interactions.

```typescript
// Prompt definition
{
  "name": "code_review",
  "description": "Structured code review template",
  "arguments": [
    { "name": "code", "description": "Code to review", "required": true }
  ]
}
```

**Discovery**: `prompts/list`
**Retrieval**: `prompts/get`
**Control**: User initiates prompt usage

### Client-Server Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Host Application                      │
│  (Claude Desktop, VS Code, IDE, Custom App)                     │
├─────────────────────────────────────────────────────────────────┤
│                         MCP Client                               │
│  - Manages server connections                                    │
│  - Routes requests/responses                                     │
│  - Handles capability negotiation                                │
├─────────────┬─────────────┬─────────────┬──────────────────────┤
│   Server A  │   Server B  │   Server C  │   Server D           │
│   (GitHub)  │   (Postgres)│   (Slack)   │   (Custom)           │
│   stdio     │   HTTP      │   SSE       │   WebSocket          │
└─────────────┴─────────────┴─────────────┴──────────────────────┘
```

### Initialization Handshake

```typescript
// Client sends initialize request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "sampling": {},
      "roots": { "listChanged": true }
    },
    "clientInfo": {
      "name": "NeuroLink",
      "version": "8.37.0"
    }
  }
}

// Server responds with capabilities
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": true },
      "prompts": { "listChanged": true }
    },
    "serverInfo": {
      "name": "github-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

---

## Transport Protocols

MCP supports multiple transport mechanisms, each suited for different deployment scenarios.

### 1. STDIO Transport (Local)

**Best for**: Local integrations, command-line tools, development

```typescript
// Configuration
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "transport": "stdio",
  "env": {
    "GITHUB_TOKEN": "ghp_xxx"
  }
}
```

**Characteristics**:

- Client spawns server as child process
- Communication via stdin/stdout streams
- Newline-delimited JSON-RPC messages
- No network exposure
- Simple to debug

### 2. Streamable HTTP Transport (Modern Standard)

**Best for**: Remote servers, production deployments, web services

```typescript
// Configuration
{
  "transport": "http",
  "url": "https://api.example.com/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "timeout": 15000,
  "retries": 5
}
```

**Characteristics**:

- Single URL path for all MCP communication
- HTTP POST for client-to-server messages
- Optional SSE for server-to-client streaming
- Session IDs via `Mcp-Session-Id` header
- Resumable connections with Event IDs
- Standard HTTP authentication
- Scalable for multiple clients

### 3. SSE Transport (Legacy - Deprecated)

> **Deprecated** as of MCP specification 2025-03-26. Use Streamable HTTP instead.

**Characteristics**:

- Two endpoints: SSE for server-to-client, POST for client-to-server
- Being phased out in favor of unified Streamable HTTP

### 4. WebSocket Transport (Community)

**Best for**: Real-time bidirectional communication, high-frequency updates

```typescript
// Configuration (community implementation)
{
  "transport": "websocket",
  "url": "wss://api.example.com/mcp/ws",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  }
}
```

**Characteristics**:

- Not officially in core spec, but widely used
- Full bidirectional communication
- Lower latency than HTTP
- Persistent connection
- Ideal for real-time applications

### Transport Selection Guide

| Scenario                | Recommended Transport      |
| ----------------------- | -------------------------- |
| Local CLI tools         | stdio                      |
| Remote cloud services   | Streamable HTTP            |
| Real-time collaboration | WebSocket                  |
| Browser-based apps      | Streamable HTTP / SSE      |
| Development/testing     | stdio                      |
| Enterprise production   | Streamable HTTP with OAuth |

### Custom Transports

MCP is transport-agnostic. Any transport implementing the Transport interface works:

```typescript
type Transport = {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
};
```

---

## Security Best Practices

### OAuth 2.1 Foundation

The June 2025 specification classified MCP servers as **OAuth 2.0 Resource Servers**:

```
# Server must serve
/.well-known/oauth-protected-resource
```

### Five Layers of MCP Security

1. **Agent Identity**: Each agent needs distinct, traceable identity
2. **Delegator Authentication**: User authenticates and consents to agent permissions
3. **Consent from Delegator to Agent**: Define what agent can do
4. **Access to MCP Server**: Agent authenticates to MCP server
5. **Access to Upstream Services**: Tools honor agent identity and delegator permissions

### Authentication Requirements

```typescript
// MCP Servers MUST:
- NOT use sessions for authentication
- Use secure, non-deterministic session IDs
- Generate session IDs with secure random number generators
- Implement Resource Indicators (RFC 8707)
```

### Resource Indicators (RFC 8707)

Combat "token mis-redemption" by explicitly stating intended recipient:

```typescript
// Token request with resource indicator
{
  "resource": "https://mcp-server.example.com",
  "grant_type": "authorization_code",
  "code": "authorization_code_here"
}
```

### Authorization Models

| Model | Use Case                           |
| ----- | ---------------------------------- |
| RBAC  | Role-based access to tools         |
| ReBAC | Relationship-based permissions     |
| ABAC  | Attribute-based conditional access |

### Scope Minimization

```typescript
// Start with minimal scope
const initialScopes = ["mcp:tools-basic"];

// Elevate via WWW-Authenticate challenge when needed
// Response: 401 with
// WWW-Authenticate: Bearer scope="mcp:tools-admin"
```

### Security Checklist

- [ ] Multi-factor authentication enabled
- [ ] Role-based access control implemented
- [ ] API key rotation policies established
- [ ] OAuth 2.1 integration configured
- [ ] Encryption at rest and in transit
- [ ] Network segmentation implemented
- [ ] Comprehensive logging enabled
- [ ] Input sanitization for all tool parameters
- [ ] Rate limiting implemented
- [ ] DNS rebinding protection for local servers

### Known Attack Vectors (OWASP)

| Vector            | Mitigation                                       |
| ----------------- | ------------------------------------------------ |
| Tool Poisoning    | Validate tool definitions, sign server manifests |
| Prompt Injection  | Input sanitization, output validation            |
| Memory Poisoning  | Secure resource access, audit logs               |
| Tool Interference | Isolate tool execution, sandbox environments     |
| Confused Deputy   | Resource indicators, token scoping               |

### HTTP Transport Security

```typescript
// Always validate for HTTP transports
{
  // Validate Origin headers
  validateOrigin: true,

  // Enforce authentication
  requireAuth: true,

  // Bind to localhost in development
  host: process.env.NODE_ENV === 'development' ? '127.0.0.1' : '0.0.0.0',

  // Rate limiting
  rateLimit: {
    windowMs: 60000,
    max: 100
  }
}
```

---

## MCP Server Implementations

### Official Reference Servers

The [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) repository contains reference implementations:

| Server              | Description                 | Transport |
| ------------------- | --------------------------- | --------- |
| Everything          | Reference/test server       | stdio     |
| Fetch               | Web content fetching        | stdio     |
| Filesystem          | Secure file operations      | stdio     |
| Git                 | Repository manipulation     | stdio     |
| Memory              | Knowledge graph persistence | stdio     |
| Sequential Thinking | Dynamic problem-solving     | stdio     |

### GitHub's Official MCP Server

[github/github-mcp-server](https://github.com/github/github-mcp-server)

**Capabilities**:

- Repository management (browse, query, search)
- Issue and PR automation
- CI/CD workflow intelligence
- Code analysis and security findings
- Dependabot alerts integration

### Popular Community Servers

| Server           | Purpose             | Stars  |
| ---------------- | ------------------- | ------ |
| Puppeteer MCP    | Browser automation  | High   |
| PostgreSQL MCP   | Database operations | High   |
| Google Drive MCP | File management     | High   |
| Slack MCP        | Team communication  | High   |
| Notion MCP       | Note/doc management | High   |
| Linear MCP       | Issue tracking      | Medium |
| Stripe MCP       | Payment operations  | Medium |
| Supabase MCP     | Database + Auth     | Medium |

### Curated Server Lists

- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) - Production-ready servers
- [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) - Comprehensive list
- [appcypher/awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers) - Categorized collection
- [PulseMCP Directory](https://www.pulsemcp.com/servers) - 7900+ servers

### Building Your Own Server

**Minimal Server Structure (TypeScript)**:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0",
});

// Register tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "my_tool",
      description: "Does something useful",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
        required: ["input"],
      },
    },
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my_tool") {
    const result = await doSomething(request.params.arguments.input);
    return { content: [{ type: "text", text: result }] };
  }
  throw new Error("Unknown tool");
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Community Tools and Ecosystem

### Official MCP Registry

Launched September 2025: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)

**Features**:

- Authoritative single source of truth
- Community-owned (Anthropic, GitHub, Microsoft, PulseMCP)
- Server discovery and metadata
- Version tracking
- API for programmatic access

**API Endpoints**:

```
GET /api/v1/servers              # List all servers
GET /api/v1/servers/{name}       # Get server details
GET /api/v1/search?q={query}     # Search servers
```

### GitHub MCP Registry

[GitHub MCP Registry](https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry-the-fastest-way-to-discover-mcp-servers/)

**Features**:

- Integrated with GitHub ecosystem
- Self-publishing for developers
- Automatic sync with community registry
- Discovery via GitHub Copilot

### Development Tools

| Tool          | Purpose                         |
| ------------- | ------------------------------- |
| MCP Inspector | Debug and test MCP servers      |
| MCP Studio    | Visual server builder           |
| Stainless     | API client generation           |
| FastMCP       | Rapid Python server development |

### Client Implementations

| Client          | Platform | Notes               |
| --------------- | -------- | ------------------- |
| Claude Desktop  | Desktop  | Native MCP support  |
| ChatGPT Desktop | Desktop  | Since March 2025    |
| Cursor          | IDE      | AI code editor      |
| VS Code         | IDE      | Via extensions      |
| Zed             | IDE      | Native support      |
| Continue        | IDE      | Open source         |
| NeuroLink       | SDK/CLI  | Your implementation |

---

## MCP vs Function Calling

### Fundamental Differences

| Aspect                  | Function Calling       | MCP               |
| ----------------------- | ---------------------- | ----------------- |
| **Definition Location** | Inline in LLM requests | Separate server   |
| **Standardization**     | Provider-specific      | Protocol standard |
| **Reusability**         | Per-application        | Cross-application |
| **Discovery**           | Static                 | Dynamic           |
| **Versioning**          | Application code       | Server versioning |
| **Security**            | Application-level      | Protocol-level    |

### Function Calling (Traditional)

```typescript
// Embedded directly in API call
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather for location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          }
        }
      }
    }
  ]
});
```

**Pros**:

- Simple, direct integration
- No additional infrastructure
- Quick prototyping
- All in one codebase

**Cons**:

- Vendor lock-in (different schemas per provider)
- Not reusable across applications
- Security at application level
- Difficult to version/manage

### MCP Approach

```typescript
// Tools defined in separate MCP server
// Client discovers tools dynamically
const tools = await mcpClient.listTools();

// Forward to LLM with standard format
const response = await llm.generate({
  messages: [...],
  tools: tools.map(transformToProviderFormat)
});
```

**Pros**:

- Provider-agnostic
- Reusable across applications
- Centralized security
- Versioned independently
- Dynamic discovery

**Cons**:

- Additional infrastructure
- Learning curve
- More complex setup

### When to Use Each

**Use Function Calling When**:

- Building simple prototypes (2-3 functions)
- Quick proof-of-concept
- Single-application tools
- No cross-team sharing needed

**Use MCP When**:

- Enterprise-grade applications
- Tools shared across multiple apps
- Security and governance matter
- Long-term maintenance planned
- Multiple team members
- Production deployment

### Hybrid Approach

The best architectures often use both:

```typescript
// Simple, app-specific tools via function calling
const inlineTools = [
  { name: 'format_output', ... }  // App-specific
];

// Complex, shared tools via MCP
const mcpTools = await mcpClient.listTools();

// Combine for LLM
const allTools = [...inlineTools, ...mcpTools];
```

### Cloudflare's Code Mode Discovery (2025)

> "LLMs are better at writing code to call MCP than at calling MCP directly."

Cloudflare found that converting MCP tools into a TypeScript API and asking the LLM to write code calling that API yields better results than exposing tools directly.

---

## Adoption Patterns 2024-2025

### Growth Metrics

| Metric           | Nov 2024 | Apr 2025 | Nov 2025   |
| ---------------- | -------- | -------- | ---------- |
| Server Downloads | ~100K    | 8M+      | 97M+/month |
| Active Servers   | <100     | 5,800+   | 10,000+    |
| MCP Clients      | ~10      | 100+     | 300+       |

### Major Platform Adoption Timeline

| Date     | Platform        | Integration       |
| -------- | --------------- | ----------------- |
| Nov 2024 | Claude Desktop  | Launch            |
| Mar 2025 | OpenAI/ChatGPT  | Desktop app       |
| May 2025 | Microsoft Azure | AI Agent Service  |
| Mid 2025 | Google Gemini   | Native support    |
| Mid 2025 | GitHub Copilot  | Full integration  |
| Mid 2025 | VS Code         | Extension support |

### Enterprise Adoption Statistics

From PwC and Gartner surveys (2025):

- **79%** of organizations have implemented AI agents
- **96%** of IT leaders plan to expand AI agent use
- **87%** rate interoperability as crucial for agentic AI
- **75%** of API gateway vendors will have MCP features by 2026
- **50%** of iPaaS vendors will have MCP features by 2026

### Market Projections

| Segment               | 2025          | 2030/2034       | CAGR  |
| --------------------- | ------------- | --------------- | ----- |
| AI Agents Market      | $7.92B        | $236.03B (2034) | High  |
| Enterprise Agentic AI | $2.58B (2024) | $24.50B (2030)  | 46.2% |

### Fortune 500 Deployments

Major deployments at:

- Block (Square/Cash App)
- Bloomberg
- Amazon
- Microsoft
- Hundreds of Fortune 500 companies

### Challenges and Risks

**Security Concerns**:

> "The S in MCP stands for security" - Community joke highlighting early security gaps

Key risks identified:

- Rapid adoption outpacing security practices
- Community servers with backdoor potential
- Abandoned server maintenance
- Trust verification challenges

---

## SDK Implementation Guide

### Official SDKs

| SDK        | Repository                                                                                    | Package                     |
| ---------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| TypeScript | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | `@modelcontextprotocol/sdk` |
| Python     | [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)         | `mcp`                       |

### TypeScript SDK

**Installation**:

```bash
npm install @modelcontextprotocol/sdk zod
```

**Server Implementation**:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "my-server",
  version: "1.0.0",
  capabilities: {
    tools: { listChanged: true },
    resources: { subscribe: true },
    prompts: { listChanged: true },
  },
});

// Tool handlers
server.setRequestHandler("tools/list", async () => ({
  tools: [
    /* tool definitions */
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  // Execute tool
  return { content: [{ type: "text", text: result }] };
});

// Start with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Client Implementation**:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";

const client = new Client({
  name: "my-client",
  version: "1.0.0",
});

// Connect to server
const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "my-mcp-server"],
});
await client.connect(transport);

// Discover and call tools
const tools = await client.listTools();
const result = await client.callTool({
  name: "my_tool",
  arguments: { input: "test" },
});
```

### Python SDK

**Installation**:

```bash
pip install mcp
# or with uv
uv add mcp
```

**Server Implementation**:

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("my-server")

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="my_tool",
            description="Does something useful",
            inputSchema={
                "type": "object",
                "properties": {
                    "input": {"type": "string"}
                },
                "required": ["input"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "my_tool":
        result = do_something(arguments["input"])
        return [TextContent(type="text", text=result)]
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### FastMCP (Python Rapid Development)

```python
from fastmcp import FastMCP

mcp = FastMCP("my-server")

@mcp.tool()
def get_weather(location: str) -> str:
    """Get weather for a location."""
    return f"Weather in {location}: Sunny, 72F"

@mcp.resource("config://settings")
def get_settings() -> dict:
    """Get application settings."""
    return {"theme": "dark", "version": "1.0"}

mcp.run()
```

### SDK Documentation

**TypeScript SDK docs** (`docs/` in repo):

- `server.md` - Building servers, transports, deployment
- `client.md` - High-level client, OAuth helpers
- `capabilities.md` - Sampling, elicitation, experimental features
- `faq.md` - Troubleshooting

---

## Recommendations for NeuroLink

Based on this research, here are recommendations for NeuroLink's MCP implementation:

### Current State Assessment

NeuroLink already has solid MCP support:

- `src/lib/mcp/toolRegistry.ts` - Tool management
- `src/lib/mcp/mcpClientFactory.ts` - Multi-transport client creation
- `src/lib/mcp/externalServerManager.ts` - Server lifecycle
- Support for stdio, HTTP, SSE, WebSocket transports

### Recommended Enhancements

#### 1. Upgrade to Latest Specification (2025-11-25)

```typescript
// Update protocol version in initialization
const initParams = {
  protocolVersion: "2025-11-25",
  capabilities: {
    sampling: {},
    roots: { listChanged: true },
    // Add new capabilities
    elicitation: true,
    structuredOutputs: true,
  },
};
```

#### 2. Implement OAuth 2.1 for HTTP Transport

```typescript
// Add OAuth configuration to ExternalMCPConfig
type ExternalMCPHttpConfig = {
  transport: "http";
  url: string;
  auth?: {
    type: "oauth2.1";
    clientId: string;
    authorizationServer: string;
    scopes: string[];
    resourceIndicator?: string; // RFC 8707
  };
};
```

#### 3. Add Registry Integration

```typescript
// Enable discovery from official registry
class MCPRegistryClient {
  private baseUrl = "https://registry.modelcontextprotocol.io/api/v1";

  async searchServers(query: string): Promise<MCPServerMetadata[]> {
    // ...
  }

  async getServer(name: string): Promise<MCPServerMetadata> {
    // ...
  }

  async installFromRegistry(name: string): Promise<void> {
    // Fetch metadata and configure server
  }
}
```

#### 4. Enhanced Security Middleware

```typescript
// Add security layer to MCP operations
class MCPSecurityMiddleware {
  // Rate limiting per server
  private rateLimiter: Map<string, TokenBucket>;

  // Tool-level permissions
  private permissions: Map<string, ToolPermissions>;

  async validateToolCall(
    serverId: string,
    toolName: string,
    args: unknown,
  ): Promise<void> {
    await this.checkRateLimit(serverId);
    await this.checkPermissions(serverId, toolName);
    await this.sanitizeArguments(args);
  }
}
```

#### 5. Structured Output Support

```typescript
// Support structured tool outputs (June 2025 spec)
type ToolResult = {
  content: ContentBlock[];
  structuredOutput?: {
    schema: JSONSchema;
    data: unknown;
  };
  isError?: boolean;
};
```

#### 6. Elicitation Support

```typescript
// Support server-initiated user interactions
type ElicitationRequest = {
  type: "form" | "url";
  message: string;
  schema?: JSONSchema; // For form elicitation
  url?: string; // For URL elicitation
};

// Handle in client
client.onElicitation(async (request) => {
  if (request.type === "form") {
    return await showFormToUser(request.schema);
  }
  if (request.type === "url") {
    return await openUrlAndWait(request.url);
  }
});
```

### Implementation Priority

| Priority | Enhancement          | Effort | Impact        |
| -------- | -------------------- | ------ | ------------- |
| High     | OAuth 2.1 support    | Medium | Security      |
| High     | Spec version update  | Low    | Compatibility |
| Medium   | Registry integration | Medium | UX            |
| Medium   | Security middleware  | Medium | Security      |
| Low      | Structured outputs   | Low    | Features      |
| Low      | Elicitation          | Medium | Features      |

### Testing Recommendations

1. **Use MCP Inspector** for debugging server connections
2. **Test against reference servers** from modelcontextprotocol/servers
3. **Validate JSON-RPC compliance** with official test suites
4. **Security testing** against OWASP MCP guidelines

---

## References and Sources

### Official Documentation

- [Model Context Protocol Official Site](https://modelcontextprotocol.io/)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP GitHub Organization](https://github.com/modelcontextprotocol)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)
- [MCP Blog](http://blog.modelcontextprotocol.io/)

### Anthropic Resources

- [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol)
- [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Introduction to MCP Course](https://anthropic.skilljar.com/introduction-to-model-context-protocol)
- [MCP Advanced Topics Course](https://anthropic.skilljar.com/model-context-protocol-advanced-topics)

### Transport Documentation

- [MCP Transports Guide](https://modelcontextprotocol.io/legacy/concepts/transports)
- [Roo Code: Server Transports](https://docs.roocode.com/features/mcp/server-transports)
- [AWS: STDIO vs Streamable HTTP](https://builder.aws.com/content/35A0IphCeLvYzly9Sw40G1dVNzc/mcp-transport-mechanisms-stdio-vs-streamable-http)

### Security Resources

- [MCP Security Best Practices (Official)](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [Securing MCP Servers Guide](https://www.infracloud.io/blogs/securing-mcp-servers/)
- [Stytch: MCP Auth Implementation](https://stytch.com/blog/MCP-authentication-and-authorization-guide/)
- [Permit.io: Ultimate Guide to MCP Auth](https://www.permit.io/blog/the-ultimate-guide-to-mcp-auth)
- [Auth0: MCP Spec Updates June 2025](https://auth0.com/blog/mcp-specs-update-all-about-auth/)
- [OWASP: Securing Third-Party MCP Servers](https://genai.owasp.org/resource/cheatsheet-a-practical-guide-for-securely-using-third-party-mcp-servers-1-0/)
- [Gopher Security: MCP Checklist](https://www.gopher.security/mcp-security/mcp-security-checklist-owasp-best-practices)

### Server Implementations

- [Official Reference Servers](https://github.com/modelcontextprotocol/servers)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [awesome-mcp-servers (punkpeye)](https://github.com/punkpeye/awesome-mcp-servers)
- [awesome-mcp-servers (wong2)](https://github.com/wong2/awesome-mcp-servers)
- [PulseMCP Directory](https://www.pulsemcp.com/servers)

### SDK Documentation

- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Stainless: SDK Comparison](https://www.stainless.com/mcp/mcp-sdk-comparison-python-vs-typescript-vs-go-implementations)

### MCP vs Function Calling

- [Gentoro: Function Calling vs MCP](https://www.gentoro.com/blog/function-calling-vs-model-context-protocol-mcp)
- [Descope: MCP vs Function Calling](https://www.descope.com/blog/post/mcp-vs-function-calling)
- [Runloop: Complete Guide](https://runloop.ai/blog/function-calling-vs-model-context-protocol-mcp)
- [Neon: MCP vs LLM Function Calling](https://neon.com/blog/mcp-vs-llm-function-calling)
- [LangWatch: Why You Need Both](https://langwatch.ai/blog/function-calling-vs-mcp-why-you-need-both-and-how-langwatch-makes-it-click)
- [Cloudflare: Code Mode](https://blog.cloudflare.com/code-mode/)

### Adoption and Market Analysis

- [Enterprise Adoption Guide 2025](https://guptadeepak.com/the-complete-guide-to-model-context-protocol-mcp-enterprise-adoption-market-trends-and-implementation-strategies/)
- [The New Stack: AI Engineering Trends 2025](https://thenewstack.io/ai-engineering-trends-in-2025-agents-mcp-and-vibe-coding/)
- [Arcade: Agentic AI Adoption Trends](https://blog.arcade.dev/agentic-framework-adoption-trends)
- [Pento: A Year of MCP Review](https://www.pento.ai/blog/a-year-of-mcp-2025-review)
- [Thoughtworks: MCP Impact 2025](https://www.thoughtworks.com/en-us/insights/blog/generative-ai/model-context-protocol-mcp-impact-2025)
- [Wikipedia: Model Context Protocol](https://en.wikipedia.org/wiki/Model_Context_Protocol)

### Protocol Specification

- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [MCPCat: JSON-RPC in MCP](https://mcpcat.io/guides/understanding-json-rpc-protocol-mcp/)
- [Portkey: MCP Message Types Guide](https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide/)
- [Hugging Face: MCP Communication Protocol](https://huggingface.co/learn/mcp-course/en/unit1/communication-protocol)

### Community and News

- [GitHub MCP Registry Announcement](https://github.blog/ai-and-ml/github-copilot/meet-the-github-mcp-registry-the-fastest-way-to-discover-mcp-servers/)
- [MCP Registry Blog Post](http://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/)
- [One Year of MCP Anniversary](http://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)
- [Anthropic: Donating MCP to Linux Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)

---

## Document History

| Version | Date       | Author             | Changes                        |
| ------- | ---------- | ------------------ | ------------------------------ |
| 1.0     | 2026-01-23 | NeuroLink Research | Initial comprehensive research |

---

_This research document is part of the NeuroLink Mastra Features Implementation project._
