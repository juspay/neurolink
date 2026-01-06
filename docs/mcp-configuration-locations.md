# MCP Configuration Locations Across AI Development Tools

This document provides a comprehensive guide to where different AI development tools store their Model Context Protocol (MCP) configurations.

## Summary of Common Patterns

Most AI development tools store MCP configurations in JSON files with a common structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": { "KEY": "value" }
    }
  }
}
```

The most common configuration keys are:

- `mcpServers` (most common)
- `servers` (alternative)
- `mcp.servers` (nested in settings)

## Tool-Specific Configuration Locations

### 1. Claude Desktop

- **Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Config Key**: `mcpServers` or `mcp_servers`

### 2. Cline AI Coder (VS Code Extension)

- **Location**: VS Code extension globalStorage
  - macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
  - Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
  - Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Config Key**: `mcpServers` or `servers`

### 3. VS Code

- **Workspace Configuration**:
  - `.vscode/mcp.json` (dedicated MCP file)
  - `.vscode/settings.json` (in `mcp.servers` section)
- **Global Configuration**:
  - macOS: `~/Library/Application Support/Code/User/settings.json`
  - Linux: `~/.config/Code/User/settings.json`
  - Windows: `%APPDATA%\Code\User\settings.json`
- **Config Key**: `mcpServers`, `servers`, or `mcp.servers` (in settings.json)

### 4. Cursor

- **Global**: `~/.cursor/mcp.json`
- **Project**: `.cursor/mcp.json`
- **Config Key**: `mcpServers` or `servers`

### 5. Windsurf

- **Location**: `~/.codeium/windsurf/mcp_config.json`
- **Config Key**: `mcpServers` or `servers`

### 6. Continue Dev

- **Global**: `~/.continue/config.json`
- **Project**: `.continue/config.json`
- **Config Key**: `mcpServers` or `contextProviders.mcp`

### 7. Aider

- **Location**: `~/.aider/config.json` or `~/.aider/aider.conf`
- **Config Key**: `mcp_servers`

### 8. Generic/Project-Level Configurations

Many tools also check for generic MCP configuration files in the project root:

- `mcp.json`
- `.mcp-config.json`
- `mcp_config.json`
- `.mcp-servers.json`

## Common Configuration Structure

Most tools follow a similar JSON structure:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    },
    "custom-server": {
      "command": "node",
      "args": ["/path/to/custom/server.js"],
      "cwd": "/path/to/working/directory",
      "env": {
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

## HTTP Transport Configuration

For remote MCP servers using HTTP/Streamable HTTP transport:

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
    },
    "oauth-protected-api": {
      "transport": "http",
      "url": "https://api.secure.com/mcp",
      "auth": {
        "type": "oauth2",
        "oauth": {
          "clientId": "your-client-id",
          "clientSecret": "your-client-secret",
          "authorizationUrl": "https://auth.provider.com/authorize",
          "tokenUrl": "https://auth.provider.com/token",
          "redirectUrl": "http://localhost:8080/callback",
          "scope": "mcp:read mcp:write",
          "usePKCE": true
        }
      }
    }
  }
}
```

### HTTP Configuration Options

| Option         | Type   | Description                                  |
| -------------- | ------ | -------------------------------------------- |
| `transport`    | string | Must be `"http"` for HTTP transport          |
| `url`          | string | Remote MCP endpoint URL                      |
| `headers`      | object | Custom HTTP headers (e.g., Authorization)    |
| `httpOptions`  | object | Connection timeout settings                  |
| `retryConfig`  | object | Retry with exponential backoff               |
| `rateLimiting` | object | Rate limiting configuration                  |
| `auth`         | object | OAuth 2.1, Bearer, or API key authentication |

See [MCP HTTP Transport Guide](./mcp-http-transport.md) for complete documentation.

## Key Observations

1. **Common Pattern**: Almost all tools use JSON files with an `mcpServers` object
2. **Location Hierarchy**: Tools typically check in this order:
   - Project/workspace specific configs
   - User/global configs
   - Default/fallback configs

3. **Platform Differences**:
   - macOS: Often uses `~/Library/Application Support/`
   - Linux: Typically uses `~/.config/`
   - Windows: Usually uses `%APPDATA%`

4. **Extension Storage**: VS Code extensions (like Cline) store configs in VS Code's globalStorage

## Auto-Discovery Priority

When multiple configurations exist, tools typically prioritize in this order:

1. Workspace/project-specific configurations (highest priority)
2. Tool-specific global configurations
3. Generic project configurations (lowest priority)

## Best Practices

1. **Project-Specific Servers**: Use `.vscode/mcp.json` or similar for project-specific MCP servers
2. **Global Servers**: Configure frequently-used servers in your tool's global config
3. **Environment Variables**: Store sensitive data (API keys) in environment variables
4. **Version Control**: Commit project-specific configs, exclude global configs with API keys

## NeuroLink Auto-Discovery

NeuroLink's MCP auto-discovery system automatically searches all these locations and can discover MCP servers configured in any of these tools. Use the CLI command:

```bash
neurolink mcp discover
```

This will find and list all MCP servers configured across your system, regardless of which tool configured them.
