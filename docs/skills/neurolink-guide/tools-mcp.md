# NeuroLink MCP Tools Integration

NeuroLink integrates with the Model Context Protocol (MCP) for tool calling, supporting 58+ external servers.

## Built-in Tools

NeuroLink includes these tools by default:

| Tool                 | Description               |
| -------------------- | ------------------------- |
| `getCurrentTime`     | Get current date/time     |
| `readFile`           | Read file contents        |
| `writeFile`          | Write content to file     |
| `listDirectory`      | List directory contents   |
| `calculateMath`      | Mathematical calculations |
| `websearchGrounding` | Web search (Vertex AI)    |

```typescript
// Use built-in tools
const timeResult = await neurolink.generate({
  input: { text: "What time is it?" },
  tools: ["getCurrentTime"],
});

// Read a file
const fileResult = await neurolink.generate({
  input: { text: "Read and summarize the README" },
  tools: ["readFile"],
});
```

## Adding External MCP Servers

### Stdio Transport (Local Servers)

Most common for npm-based MCP servers:

```typescript
// GitHub MCP
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  },
});

// PostgreSQL MCP
await neurolink.addExternalMCPServer("postgres", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-postgres"],
  transport: "stdio",
  env: {
    POSTGRES_CONNECTION_STRING: process.env.DATABASE_URL,
  },
});

// File System MCP
await neurolink.addExternalMCPServer("filesystem", {
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/path/to/allowed/dir",
  ],
  transport: "stdio",
});
```

### HTTP Transport (Remote Servers)

For cloud-hosted MCP servers:

```typescript
await neurolink.addExternalMCPServer("my-api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
    "X-API-Key": "your-api-key",
  },
  timeout: 15000,
  retries: 3,
});
```

### SSE Transport

Server-Sent Events for real-time updates:

```typescript
await neurolink.addExternalMCPServer("realtime-api", {
  transport: "sse",
  url: "https://api.example.com/mcp/sse",
  headers: {
    Authorization: "Bearer TOKEN",
  },
});
```

### WebSocket Transport

For bidirectional communication:

```typescript
await neurolink.addExternalMCPServer("ws-api", {
  transport: "websocket",
  url: "wss://api.example.com/mcp/ws",
  headers: {
    Authorization: "Bearer TOKEN",
  },
});
```

## Popular MCP Servers

### GitHub

```typescript
await neurolink.addExternalMCPServer("github", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-github"],
  transport: "stdio",
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN },
});

// Use GitHub tools
const result = await neurolink.generate({
  input: { text: 'Create a GitHub issue titled "Bug: Login fails"' },
  tools: ["create_issue", "search_repositories", "get_file_contents"],
});
```

### Slack

```typescript
await neurolink.addExternalMCPServer("slack", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-slack"],
  transport: "stdio",
  env: {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_TEAM_ID: process.env.SLACK_TEAM_ID,
  },
});
```

### Google Drive

```typescript
await neurolink.addExternalMCPServer("gdrive", {
  command: "npx",
  args: ["-y", "@anthropic/mcp-server-gdrive"],
  transport: "stdio",
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
});
```

### Brave Search

```typescript
await neurolink.addExternalMCPServer("brave-search", {
  command: "npx",
  args: ["-y", "@anthropic/mcp-server-brave-search"],
  transport: "stdio",
  env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY },
});
```

### Memory (Persistent Knowledge)

```typescript
await neurolink.addExternalMCPServer("memory", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-memory"],
  transport: "stdio",
});
```

## Custom Tool Registration

Register your own tools:

```typescript
neurolink.registerTool("getWeather", {
  name: "getWeather",
  description: "Get current weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name or coordinates",
      },
      units: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        default: "celsius",
      },
    },
    required: ["location"],
  },
  execute: async ({ location, units = "celsius" }) => {
    // Your implementation
    const weather = await fetchWeather(location, units);
    return {
      temperature: weather.temp,
      condition: weather.condition,
      humidity: weather.humidity,
    };
  },
});

// Use custom tool
const result = await neurolink.generate({
  input: { text: "What is the weather in Tokyo?" },
  tools: ["getWeather"],
});
```

## Tool Execution

### Direct Tool Execution

```typescript
const result = await neurolink.executeTool("readFile", {
  path: "./config.json",
});
console.log(result);
```

### With Options

```typescript
const result = await neurolink.executeTool("apiCall", params, {
  timeout: 5000,
  maxRetries: 3,
});
```

## List Available Tools

```typescript
const tools = await neurolink.getAllAvailableTools();
console.log(tools);
// [
//   { name: 'getCurrentTime', description: '...', category: 'built-in' },
//   { name: 'create_issue', description: '...', serverId: 'github' },
//   ...
// ]
```

## MCP Server Status

```typescript
const status = await neurolink.getMCPStatus();
console.log(status);
// {
//   servers: [
//     { id: 'github', status: 'connected', toolCount: 15 },
//     { id: 'postgres', status: 'connected', toolCount: 8 }
//   ],
//   totalTools: 23
// }
```

## Remove MCP Server

```typescript
await neurolink.removeExternalMCPServer("github");
```

## Tool Events

```typescript
const emitter = neurolink.getEventEmitter();

emitter.on("tool:start", (event) => {
  console.log(`Starting tool: ${event.toolName}`);
  console.log("Input:", event.input);
});

emitter.on("tool:end", (event) => {
  console.log(
    `Tool ${event.toolName}: ${event.success ? "success" : "failed"}`,
  );
  console.log(`Duration: ${event.responseTime}ms`);
});

emitter.on("externalMCP:serverConnected", (event) => {
  console.log(
    `MCP server ${event.serverId} connected with ${event.toolCount} tools`,
  );
});

emitter.on("externalMCP:toolDiscovered", (event) => {
  console.log(`New tool discovered: ${event.toolName} from ${event.serverId}`);
});
```

## Advanced Configuration

### Rate Limiting

```typescript
await neurolink.addExternalMCPServer("api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  rateLimiting: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    maxBurst: 10,
    useTokenBucket: true,
  },
});
```

### Retry Configuration

```typescript
await neurolink.addExternalMCPServer("api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
});
```

### Blocked Tools

Block specific tools for security:

```typescript
await neurolink.addExternalMCPServer("filesystem", {
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
  transport: "stdio",
  blockedTools: ["delete_file", "write_file"], // Read-only
});
```

### Authentication

```typescript
// OAuth2
await neurolink.addExternalMCPServer("oauth-api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  auth: {
    type: "oauth2",
    oauth: {
      clientId: "your-client-id",
      clientSecret: "your-client-secret",
      tokenUrl: "https://auth.example.com/token",
    },
  },
});

// Bearer token
await neurolink.addExternalMCPServer("bearer-api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  auth: {
    type: "bearer",
    bearer: { token: process.env.API_TOKEN },
  },
});

// API Key
await neurolink.addExternalMCPServer("apikey-api", {
  transport: "http",
  url: "https://api.example.com/mcp",
  auth: {
    type: "api-key",
    apiKey: {
      key: process.env.API_KEY,
      headerName: "X-API-Key",
    },
  },
});
```

## CLI Usage

```bash
# List MCP servers
neurolink mcp list

# Add MCP server
neurolink mcp add github --command "npx" --args "-y @modelcontextprotocol/server-github"

# Check MCP status
neurolink mcp status

# Remove server
neurolink mcp remove github

# Generate with specific tools
neurolink generate "Create a GitHub issue" --tools create_issue
```

## Tool Health Report

```typescript
const health = await neurolink.getToolHealthReport();
console.log("Healthy tools:", health.healthy.length);
console.log("Unhealthy tools:", health.unhealthy.length);
```

## Next Steps

- RAG integration - Document-grounded generation
- Memory - Conversation memory
- Advanced features - HITL, workflows
