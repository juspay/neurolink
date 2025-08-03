# 🔧 MCP (Model Context Protocol) Integration Guide

## ✅ IMPLEMENTATION STATUS: COMPLETE (2025-01-07)

**Generate Function Migration completed - MCP integration enhanced with factory patterns**

- ✅ MCP tools work seamlessly with modern `generate()` method
- ✅ Factory pattern provides better MCP tool management
- ✅ Enhanced error handling for MCP server connections
- ✅ All existing MCP configurations continue working

> **Migration Note**: MCP integration enhanced but remains transparent.
> Use `generate()` for future-ready MCP workflows.

---

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
await neurolink.addMCPServer("bitbucket", {
  command: "npx",
  args: ["-y", "@nexus2520/bitbucket-mcp-server"],
  env: {
    BITBUCKET_USERNAME: "your-username",
    BITBUCKET_APP_PASSWORD: "your-token",
  },
});

// Add database integration
await neurolink.addMCPServer("database", {
  command: "node",
  args: ["./custom-db-server.js"],
  env: { DB_CONNECTION: "postgresql://..." },
});

// Verify registration
const status = await neurolink.getMCPStatus();
console.log("Active servers:", status.totalServers);
```

### **4. Execute Tools (Coming Soon)**

```bash
# Execute tools from connected servers
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
- `--transport` - Transport type (stdio|sse)
- `--url` - URL for SSE transport
- `--env` - Environment variables (JSON)
- `--cwd` - Working directory

**Examples:**

```bash
# Add custom server with arguments
neurolink mcp add myserver "python /path/to/server.py" --args "arg1,arg2"

# Add SSE server
neurolink mcp add webserver "http://localhost:8080" --transport sse --url "http://localhost:8080/mcp"

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

### **External Server Configuration** [Coming Soon]

External MCP servers will be configured in `.mcp-config.json`:

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

### **Environment Variables**

Set these in your `.env` file for server authentication:

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

- [MCP Testing Guide](./MCP-TESTING-GUIDE.md)
- [CLI Command Reference](./CLI-GUIDE.md#mcp-commands)
- [API Integration](./API-REFERENCE.md#mcp-integration)

### **Community Servers**

- [Awesome MCP Servers](https://github.com/modelcontextprotocol/awesome-mcp-servers)
- [Custom Server Development](https://modelcontextprotocol.io/docs/building-servers)

---

## 🚀 **What's Next?**

### **Coming Soon**

- ✅ **Tool Execution** - Direct tool invocation from CLI
- ✅ **Workflow Orchestration** - Multi-step tool workflows
- ✅ **AI Integration** - Tools accessible during AI generation
- ✅ **Performance Optimization** - Parallel tool execution
- ✅ **Advanced Security** - Fine-grained permissions

### **Get Involved**

- Report issues on [GitHub](https://github.com/juspay/neurolink/issues)
- Join the [MCP community](https://modelcontextprotocol.io/community)
- Contribute server integrations
- Share usage examples

---

**Ready to extend NeuroLink with unlimited external capabilities! 🌟**
