# 🔧 MCP (Model Context Protocol) Integration Guide

**NeuroLink Universal AI Platform with External Server Connectivity**

---

## 📖 **Overview**

NeuroLink now supports the **Model Context Protocol (MCP)** for seamless integration with external servers and tools. This enables unlimited extensibility through the growing MCP ecosystem while maintaining NeuroLink's simple interface.

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

### **3. Execute Tools (Coming Soon)**

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

## 🛠️ **Example MCP Server**

NeuroLink includes a **complete working example** MCP server that demonstrates modern SDK patterns and best practices.

### **Location & Setup**

```bash
# Example server is already configured and ready to use
cd neurolink-demo/
ls example-mcp-server.mjs  # Complete working server
ls MCP-SERVER-README.md    # Detailed documentation
```

### **Available Tools**

The example server provides three demonstration tools:

#### **1. `test_hello` - Greeting Tool**
```bash
# Test the hello tool
npx neurolink generate-text "Say hello to everyone using the example server" --provider google-ai
# Returns: "Hello everyone! This message is from the example MCP server configured in .neuro.config.json. 🎉"
```

#### **2. `test_math` - Math Operations**
```bash  
# Test math operations with validation
npx neurolink generate-text "Use the math tool to add 15 and 27 (operation should be 'add')" --provider google-ai
# Returns: "Math result: 15 add 27 = 42"

# Test validation (this will show proper error handling)
npx neurolink generate-text "Calculate 10 divided by 2 using operation 'divide'" --provider google-ai
# Returns: "Math result: 10 divide 2 = 5"
```

#### **3. `test_timestamp` - Time Information**
```bash
# Get current timestamp
npx neurolink generate-text "What's the current time? Use the example server timestamp tool" --provider google-ai
# Returns current time in ISO format
```

### **What It Demonstrates**

The example server showcases:

- ✅ **Modern MCP SDK v1.13.0** - Uses official `@modelcontextprotocol/sdk`
- ✅ **Tool Registration** - `.tool()` method with proper schemas
- ✅ **Zod Validation** - Parameter validation with detailed error messages
- ✅ **Error Handling** - Proper error responses and validation
- ✅ **Multiple Parameter Types** - Strings, numbers, enums, and optional parameters
- ✅ **Real Configuration** - Pre-configured in `.neuro.config.json`

### **Configuration**

The example server is configured in `.neuro.config.json`:

```json
{
  "mcpServers": {
    "example-server": {
      "name": "example-server",
      "command": "node",
      "args": ["./neurolink-demo/example-mcp-server.mjs"],
      "transport": "stdio",
      "description": "Example MCP server demonstrating modern SDK v1.13.0 patterns",
      "enabled": true
    }
  }
}
```

### **Creating Your Own Server**

Use the example as a template:

1. **Copy the server**: `cp neurolink-demo/example-mcp-server.mjs my-server.mjs`
2. **Modify tools**: Add your custom tools using the same patterns
3. **Update config**: Add your server to `.neuro.config.json`
4. **Test**: Use CLI commands to verify functionality

See **[MCP Server README](../neurolink-demo/MCP-SERVER-README.md)** for complete development guide.

---

## ⚙️ **Configuration**

### **Configuration File**

MCP servers are configured in `.neuro.config.json` (NeuroLink v2.0+ enhanced format):

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
      "transport": "stdio",
      "description": "File and directory operations for current project",
      "enabled": true
    },
    "github": {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "transport": "stdio",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      },
      "description": "GitHub repository management",
      "enabled": false
    },
    "custom": {
      "name": "custom",
      "command": "python",
      "args": ["/path/to/server.py"],
      "transport": "stdio",
      "cwd": "/project/directory",
      "description": "Custom Python MCP server",
      "enabled": true
    }
  },
  "autoDiscovery": {
    "enabled": true,
    "autoRegister": true,
    "sources": ["claude", "vscode", "cursor", "windsurf", "generic"]
  },
  "globalConfig": {
    "timeout": 30000,
    "retries": 3,
    "logLevel": "info",
    "enableDebug": false,
    "maxConcurrentServers": 10
  },
  "neurolink": {
    "enableInternalServers": true,
    "enableExternalServers": true,
    "aiCore": {
      "enabled": true,
      "tools": ["generate-text", "select-provider", "check-provider-status"]
    },
    "utilities": {
      "enabled": true,
      "tools": ["get-current-time", "calculate-date-difference", "format-number"]
    }
  }
}
```

### **Environment Variables**

Set these in your `.env` file for server authentication:

```bash
# GitHub Integration
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...

# Database Integration
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:port/db

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
**Requirements:** `GITHUB_PERSONAL_ACCESS_TOKEN`

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
**Requirements:** `POSTGRES_CONNECTION_STRING`

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
neurolink generate-text "Analyze the README.md file and suggest improvements" --tools filesystem

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
