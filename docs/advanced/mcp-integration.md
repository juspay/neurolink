# 🔧 MCP (Model Context Protocol) Integration Guide

**NeuroLink Universal AI Platform with External Server Connectivity**

---

## 📖 **Overview**

NeuroLink now supports the **Model Context Protocol (MCP)** for seamless integration with external servers and tools. This enables unlimited extensibility through the growing MCP ecosystem while maintaining NeuroLink's simple interface.

### **Enhanced MCP Integration with Factory Patterns**

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// NEW: Enhanced MCP integration with generate()
const result = await neurolink.generate({
  input: { text: "List files in current directory using MCP" },
  provider: "google-ai",
  disableTools: false, // Enable MCP tool usage
});

// Alternative approach using legacy method (backward compatibility)
const legacyResult = await neurolink.generate({
  prompt: "List files in current directory using MCP",
  provider: "google-ai",
  disableTools: false,
});
```

### **What is MCP?**

The Model Context Protocol is a standardized way for AI applications to connect to external tools and data sources. It enables:

- ✅ **External Tool Integration** - Connect to filesystem, databases, APIs, and more
- ✅ **Standardized Communication** - JSON-RPC 2.0 protocol over multiple transports
- ✅ **Tool Discovery** - Automatic discovery of available tools and capabilities
- ✅ **Secure Execution** - Controlled access to external resources
- ✅ **Ecosystem Compatibility** - Works with 65+ community servers

---

## 🚀 **Quick Start**

### **1. Install Popular MCP Servers**

```bash
# Install filesystem server for file operations
npx neurolink mcp install filesystem

# Install GitHub server for repository management
npx neurolink mcp install github

# Install database server for SQL operations
npx neurolink mcp install postgres
```

### **2. Test Connectivity**

```bash
# Test server connectivity and discover tools
npx neurolink mcp test filesystem

# List all configured servers with status
npx neurolink mcp list --status
```

### **3. 🆕 Programmatic Server Management**

**NEW!** Add MCP servers dynamically at runtime:

```typescript
import { NeuroLink } from "@juspay/neurolink";
const neurolink = new NeuroLink();

// Add external servers dynamically
await neurolink.addExternalMCPServer("bitbucket", {
  command: "npx",
  args: ["-y", "@nexus2520/bitbucket-mcp-server"],
  env: {
    BITBUCKET_USERNAME: "your-username",
    BITBUCKET_APP_PASSWORD: "your-token",
  },
});

// Add database integration
await neurolink.addExternalMCPServer("database", {
  command: "node",
  args: ["./custom-db-server.js"],
  env: { DB_CONNECTION: "postgresql://..." },
});

// Verify registration — getMCPStatus() also triggers MCP initialization,
// so always call it before listMCPServers() to ensure the subsystem is ready.
const status = await neurolink.getMCPStatus();
console.log("Active servers:", status.totalServers);

const servers = await neurolink.listMCPServers();
console.log(
  "Registered servers:",
  servers.map((s) => s.name),
);
```

### **4. Execute Tools (Planned)**

> This feature is planned for a future release.

```text
# Execute tools from connected servers (planned — not yet implemented)
npx neurolink mcp exec filesystem read_file --params '{"path": "README.md"}'
npx neurolink mcp exec github create_issue --params '{"title": "New feature", "body": "Description"}'
```

---

## 📋 **MCP CLI Commands Reference**

### **Server Management**

#### **Install Popular Servers**

```bash
neurolink mcp install <server>
```

**Available servers:**

- `filesystem` - File and directory operations
- `github` - GitHub repository management
- `postgres` - PostgreSQL database operations
- `brave-search` - Web search capabilities
- `puppeteer` - Browser automation

**Example:**

```bash
neurolink mcp install filesystem
# ✅ Installed MCP server: filesystem
# 💡 Test it with: neurolink mcp test filesystem
```

#### **Add Custom Servers**

```bash
neurolink mcp add <name> <command> [options]
```

**Options:**

- `--args` - Command arguments (array)
- `--transport` - Transport type (stdio|sse|websocket|http)
- `--url` - URL for SSE/WebSocket/HTTP transport
- `--headers` - HTTP headers for authentication (JSON)
- `--env` - Environment variables (JSON)
- `--cwd` - Working directory

**Examples:**

```bash
# Add custom server with arguments
neurolink mcp add myserver "python /path/to/server.py" --args "arg1,arg2"

# Add SSE server
neurolink mcp add webserver "http://localhost:8080" --transport sse --url "http://localhost:8080/mcp"

# Add HTTP remote server with authentication
neurolink mcp add remote-api "https://api.example.com/mcp" --transport http --url "https://api.example.com/mcp" --headers '{"Authorization": "Bearer YOUR_TOKEN"}'

# Add server with environment variables
neurolink mcp add dbserver "npx db-mcp-server" --env '{"DB_URL": "postgresql://..."}'
```

#### **List Configured Servers**

```bash
neurolink mcp list [--status]
```

**Example output:**

```
📋 Configured MCP servers (2):

🔧 filesystem
   Command: npx -y @modelcontextprotocol/server-filesystem /
   Transport: stdio
✔ filesystem: ✅ Available

🔧 github
   Command: npx @modelcontextprotocol/server-github
   Transport: stdio
✖ github: ❌ Not available
```

#### **Test Server Connectivity**

```bash
neurolink mcp test <server>
```

**Example output:**

```
🔍 Testing MCP server: filesystem

✔ ✅ Connection successful!

📋 Server Capabilities:
   Protocol Version: 2024-11-05
   Tools: ✅ Supported

🛠️  Available Tools:
   • read_file: Read file contents from filesystem
   • write_file: Create/overwrite files
   • edit_file: Make line-based edits
   • create_directory: Create directories
   • list_directory: List directory contents
   + 6 more tools...
```

#### **Remove Servers**

```bash
neurolink mcp remove <server>
```

---

## ⚙️ **Configuration**

### **External Server Configuration**

External MCP servers are configured in `.mcp-config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "transport": "stdio"
    },
    "github": {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "transport": "stdio"
    },
    "custom": {
      "name": "custom",
      "command": "python",
      "args": ["/path/to/server.py"],
      "transport": "stdio",
      "cwd": "/project/directory"
    }
  }
}
```

### **Who loads `.mcp-config.json`, and when**

A project config names commands to run and URLs to connect to, so **a directory is not a trust boundary**: a cloned repository's `.mcp-config.json` must not run its servers with your credentials just because you ran something inside it.

**SDK.** `new NeuroLink()` never reads the working directory's file on its own. Name the file, or opt into the directory, in the constructor:

```typescript
// Load a specific file (relative paths resolve against the working directory)
const neurolink = new NeuroLink({
  mcp: { configPath: "./config/mcp-servers.json" },
});

// Load <cwd>/.mcp-config.json — only for a directory you control
const trusted = new NeuroLink({ mcp: { trustProjectConfig: true } });
```

Servers added with `addExternalMCPServer()` / `addInMemoryMCPServer()` are unaffected. The legacy `ProviderRegistry.setOptions({ enableManualMCP: true })` switch is now honoured too: set after construction, it re-enables the old working-directory discovery for that process.

**CLI.** `neurolink` still discovers `./.mcp-config.json`, but loads it only after you have trusted that exact content. The file's SHA-256 is recorded in `~/.neurolink/trusted-mcp-configs.json` (`0600`, directory `0700`); a file that changes has to be trusted again.

- In a terminal, the first tool-enabled command shows the servers (names, commands, URLs, `env` key names — never values) and asks `Trust this file and start these servers? [y/N]`.
- Non-interactively (CI, pipes), an untrusted file is refused with exit status 1 at the moment it would load, with the same summary. Decide with one of:
  - `neurolink generate "…" --trust-mcp-config` or `NEUROLINK_TRUST_MCP_CONFIG=1` — trust and record the hash;
  - `NEUROLINK_TRUST_MCP_CONFIG=0` — run without the project config;
  - `--disable-tools` — no MCP server is needed.
- `neurolink --help`, `--version`, and any command that never initialises MCP are not affected.

### **`${VAR}` references**

`${NAME}` in a server's **`env`** and **`args`** is replaced with `process.env.NAME`. Only names matching `^[A-Z][A-Z0-9_]*$` are expanded; anything else is left as written. `${NAME}` is **never** expanded in `headers` or `url` — those values travel to a remote host, so a reference there would send the variable's value off the machine. A `${…}` left in a header is sent literally and logged as a warning.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

### **What a stdio server inherits**

A spawned server receives the MCP SDK's minimal default environment (`HOME`, `PATH`, `SHELL`, `TERM`, `USER`, `LOGNAME` on POSIX) plus its own `env`. It no longer receives the whole parent `process.env`, so provider keys and OAuth tokens held by the host do not reach an `npx -y …` server unless you pass them through: `"env": { "OPENAI_API_KEY": "${OPENAI_API_KEY}" }`. A server that genuinely needs everything can set `"inheritParentEnv": true`.

### **Transport URLs**

For `http`, `sse` and `websocket` servers the URL must use `https:` / `wss:` unless the host is loopback (`localhost`, `127.0.0.0/8`, `::1`), and the host must not be — or resolve to — a private, link-local, CGNAT or cloud-metadata address. A server on your own network opts out per entry with `"allowPrivateNetwork": true`, which also permits plaintext `http:` / `ws:` to private addresses; public hosts always need TLS. The WebSocket transport cannot send `headers` or `auth` (the handshake carries none), so a WebSocket server configured with either fails to connect instead of connecting unauthenticated — use `http` or `sse` for authenticated servers.

### **Environment Variables**

Set these in your `.env` file for server authentication (the CLI loads `.env`; the SDK does not — see [Environment Variables](/docs/getting-started/environment-variables)):

```bash
# Custom Server Configuration
CUSTOM_API_KEY=your-api-key
CUSTOM_ENDPOINT=https://api.example.com
```

---

## 🛠️ **Available MCP Servers**

### **Filesystem Server**

**Purpose:** File and directory operations
**Installation:** `neurolink mcp install filesystem`

**Available Tools:**

- `read_file` - Read file contents
- `write_file` - Create or overwrite files
- `edit_file` - Make line-based edits
- `create_directory` - Create directories
- `list_directory` - List directory contents
- `directory_tree` - Get recursive tree view
- `move_file` - Move/rename files
- `search_files` - Search for files by pattern
- `get_file_info` - Get file metadata

### **GitHub Server**

**Purpose:** GitHub repository management
**Installation:** `neurolink mcp install github`

**Available Tools:**

- `create_repository` - Create new repositories
- `search_repositories` - Search public repositories
- `get_file_contents` - Read repository files
- `create_or_update_file` - Modify repository files
- `create_issue` - Create GitHub issues
- `create_pull_request` - Create pull requests
- `fork_repository` - Fork repositories

### **PostgreSQL Server**

**Purpose:** Database operations
**Installation:** `neurolink mcp install postgres`

**Available Tools:**

- `read-query` - Execute SELECT queries
- `write-query` - Execute INSERT/UPDATE/DELETE queries
- `create-table` - Create database tables
- `list-tables` - List available tables
- `describe-table` - Get table schema

### **Brave Search Server**

**Purpose:** Web search capabilities
**Installation:** `neurolink mcp install brave-search`

**Available Tools:**

- `brave_web_search` - Search the web
- `brave_local_search` - Search for local businesses

### **Puppeteer Server**

**Purpose:** Browser automation
**Installation:** `neurolink mcp install puppeteer`

**Available Tools:**

- `puppeteer_navigate` - Navigate to URLs
- `puppeteer_screenshot` - Take screenshots
- `puppeteer_click` - Click elements
- `puppeteer_fill` - Fill forms
- `puppeteer_evaluate` - Execute JavaScript

---

## 🔧 **Advanced Usage**

### **Transport Types**

#### **STDIO Transport (Default)**

Best for local servers and CLI tools:

```bash
neurolink mcp add local-server "python server.py" --transport stdio
```

#### **SSE Transport**

For web-based servers:

```bash
neurolink mcp add web-server "http://localhost:8080" --transport sse --url "http://localhost:8080/sse"
```

#### **HTTP Transport (Streamable HTTP)**

For remote MCP servers with authentication, retry, and rate limiting:

```bash
neurolink mcp add remote-api "https://api.example.com/mcp" \
  --transport http \
  --url "https://api.example.com/mcp" \
  --headers '{"Authorization": "Bearer YOUR_TOKEN"}'
```

**Configuration in `.mcp-config.json`:**

```json
{
  "mcpServers": {
    "remote-api": {
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      },
      "httpOptions": {
        "connectionTimeout": 30000,
        "requestTimeout": 60000,
        "idleTimeout": 120000,
        "keepAliveTimeout": 30000
      },
      "retryConfig": {
        "maxAttempts": 3,
        "initialDelay": 1000,
        "maxDelay": 30000,
        "backoffMultiplier": 2
      },
      "rateLimiting": {
        "requestsPerMinute": 60,
        "maxBurst": 10,
        "useTokenBucket": true
      }
    }
  }
}
```

**HTTP Transport Features:**

- Custom headers for authentication (Bearer, API Key)
- Configurable connection and request timeouts
- Automatic retry with exponential backoff
- Rate limiting with token bucket algorithm
- OAuth 2.1 support with PKCE

See [MCP HTTP Transport Guide](../mcp-http-transport.md) for complete documentation.

### **Server Environment Configuration**

Pass environment variables to servers:

```bash
neurolink mcp add secure-server "npx secure-mcp" --env '{"API_KEY": "secret", "DEBUG": "true"}'
```

### **Working Directory**

Set server working directory:

```bash
neurolink mcp add project-server "python local-server.py" --cwd "/path/to/project"
```

---

## 🚀 Advanced MCP Features

NeuroLink provides advanced MCP capabilities for production environments with multiple servers and complex tool ecosystems.

### Tool Router

Intelligent tool call routing for multi-server environments with round-robin, least-loaded, capability-based, and session affinity strategies.

### Tool Cache

Cache tool results with configurable LRU, FIFO, or LFU eviction strategies, pattern-based invalidation, and cache statistics.

### Request Batcher

Batch multiple tool calls for efficient execution with automatic batch sizing and server-grouped batching.

### Tool Annotations

Add safety metadata to tools (readOnly, destructive, idempotent) with automatic safety level inference and annotation-based filtering.

### Custom MCP Servers

Create custom MCP servers using the `MCPServerBase` abstract class with built-in tool registration, event emission, and lifecycle management.

### Elicitation Protocol

Interactive tool input during execution supporting text, select, multi-select, confirmation, file upload, and form elicitation types.

### Multi-Server Manager

Load balancing and coordination across multiple MCP servers with server groups and a unified tool interface.

> **Full Documentation**: See the [MCP Enhancements Guide](../features/mcp-enhancements.md) for complete API reference, configuration options, and usage examples.

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Server Not Available**

```
✖ server: ❌ Not available
```

**Solutions:**

1. Check server installation: `npm list -g @modelcontextprotocol/server-*`
2. Verify command path: `which npx`
3. Test command manually: `npx @modelcontextprotocol/server-filesystem /`
4. Check environment variables
5. Verify network connectivity (for SSE servers)

#### **Connection Timeout**

```
❌ Connection failed: Timeout connecting to MCP server
```

**Solutions:**

1. Increase timeout (servers may need time to start)
2. Check server logs for errors
3. Verify server supports MCP protocol version 2024-11-05
4. Test with simpler server first (filesystem)

#### **Authentication Errors**

```
❌ Connection failed: Authentication required
```

**Solutions:**

1. Set required environment variables
2. Check API key/token validity
3. Verify permissions for required resources
4. Review server documentation for auth requirements

#### **Tool Execution Errors**

```
❌ Tool execution failed: Invalid parameters
```

**Solutions:**

1. Check tool parameter schema: `neurolink mcp test <server>`
2. Validate JSON parameter format
3. Review tool documentation
4. Test with minimal parameters first

### **Debug Mode**

Enable verbose logging for troubleshooting:

```bash
export NEUROLINK_DEBUG=true
neurolink mcp test filesystem
```

---

## 🔗 **Integration with AI Providers**

### **Using MCP Tools with AI Generation**

```bash
# Generate text that uses MCP tool results
neurolink generate "Analyze the README.md file and suggest improvements" --tools filesystem

# Stream responses that incorporate MCP data
neurolink stream "Create a GitHub issue based on the project status" --tools github
```

### **Multi-Tool Workflows**

```bash
# Combine multiple MCP servers in workflows
neurolink workflow "
1. Read project files (filesystem)
2. Analyze codebase (ai)
3. Create GitHub issue (github)
4. Update database (postgres)
"
```

---

## 📚 **Resources**

### **Official MCP Resources**

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP Server Index](https://github.com/modelcontextprotocol/servers)
- [MCP Documentation](https://modelcontextprotocol.io/docs)

### **NeuroLink MCP Resources**

- [MCP Testing Guide](mcp-testing-guide.md)
- [CLI Command Reference](../cli/commands.md#mcp)
- [API Integration](../sdk/api-reference.md)

### **Community Servers**

- [Awesome MCP Servers](https://github.com/modelcontextprotocol/awesome-mcp-servers)
- [Custom Server Development](https://modelcontextprotocol.io/docs/building-servers)

---

## 🚀 **What's Next?**

### **Get Involved**

- Report issues on [GitHub](https://github.com/juspay/neurolink/issues)
- Join the [MCP community](https://modelcontextprotocol.io/community)
- Contribute server integrations
- Share usage examples

---

**Ready to extend NeuroLink with unlimited external capabilities! 🌟**
