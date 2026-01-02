# HTTP Transport for MCP Servers

## Overview

NeuroLink now supports **HTTP/Streamable HTTP transport** for Model Context Protocol (MCP) servers, enabling integration with remote MCP services like GitHub Copilot MCP API and custom HTTP-based MCP endpoints.

The HTTP transport implements the [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports), providing:

- ✅ Remote MCP server connectivity
- ✅ Custom header support for authentication
- ✅ Session management and automatic reconnection
- ✅ Firewall and proxy compatibility
- ✅ Both streaming (SSE) and batch JSON responses

## Quick Start

### GitHub Copilot Integration

```bash
# Add GitHub Copilot MCP endpoint
npx neurolink mcp add github-copilot "https://api.githubcopilot.com/mcp" \
  --transport http \
  --url "https://api.githubcopilot.com/mcp" \
  --headers '{"Authorization": "Bearer YOUR_GITHUB_COPILOT_TOKEN"}'
```

### Configuration File

Add to `.mcp-config.json`:

```json
{
  "mcpServers": {
    "github-copilot": {
      "name": "github-copilot",
      "command": "https://api.githubcopilot.com/mcp",
      "transport": "http",
      "url": "https://api.githubcopilot.com/mcp",
      "headers": {
        "Authorization": "Bearer ghp_xxxxxxxxxxxxxxxxxxxx"
      },
      "description": "GitHub Copilot MCP API"
    }
  }
}
```

### Programmatic Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add HTTP MCP server
await neurolink.addInMemoryMCPServer("github-copilot", {
  server: {
    title: "GitHub Copilot MCP",
    description: "GitHub Copilot API integration",
    tools: {},
  },
  config: {
    id: "github-copilot",
    name: "github-copilot",
    description: "GitHub Copilot MCP API",
    command: "https://api.githubcopilot.com/mcp",
    transport: "http",
    url: "https://api.githubcopilot.com/mcp",
    headers: {
      Authorization: "Bearer YOUR_TOKEN",
    },
    tools: [],
    status: "initializing",
  },
});

// Use the MCP server
const result = await neurolink.generate({
  input: { text: "Use GitHub Copilot to help me write code" },
  provider: "openai",
  disableTools: false,
});
```

## Authentication

HTTP transport supports custom headers for authentication:

### Bearer Token Authentication

```json
{
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  }
}
```

### API Key Authentication

```json
{
  "headers": {
    "X-API-Key": "your-api-key-here"
  }
}
```

### Custom Headers

```json
{
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN",
    "X-Custom-Header": "custom-value",
    "X-Request-ID": "unique-request-id"
  }
}
```

### OAuth 2.1 Authentication

For enterprise integrations requiring OAuth 2.1 with PKCE:

```json
{
  "mcpServers": {
    "enterprise-api": {
      "transport": "http",
      "url": "https://api.enterprise.com/mcp",
      "auth": {
        "type": "oauth2",
        "oauth": {
          "clientId": "your-client-id",
          "clientSecret": "your-client-secret",
          "authorizationUrl": "https://auth.enterprise.com/oauth/authorize",
          "tokenUrl": "https://auth.enterprise.com/oauth/token",
          "redirectUrl": "http://localhost:8080/callback",
          "scope": "mcp:read mcp:write",
          "usePKCE": true
        }
      }
    }
  }
}
```

**OAuth Configuration Options:**

| Option             | Type    | Required | Description                              |
| ------------------ | ------- | -------- | ---------------------------------------- |
| `clientId`         | string  | Yes      | OAuth client identifier                  |
| `clientSecret`     | string  | No       | OAuth client secret (optional with PKCE) |
| `authorizationUrl` | string  | Yes      | Authorization endpoint URL               |
| `tokenUrl`         | string  | Yes      | Token endpoint URL                       |
| `redirectUrl`      | string  | Yes      | OAuth callback URL                       |
| `scope`            | string  | No       | Space-separated OAuth scopes             |
| `usePKCE`          | boolean | No       | Enable PKCE (recommended, default: true) |

### Authentication Types

The `auth` configuration supports three authentication types:

**1. OAuth 2.1 (recommended for enterprise)**

```json
{
  "auth": {
    "type": "oauth2",
    "oauth": { ... }
  }
}
```

**2. Bearer Token**

```json
{
  "auth": {
    "type": "bearer",
    "token": "your-access-token"
  }
}
```

**3. API Key**

```json
{
  "auth": {
    "type": "api-key",
    "apiKey": "your-api-key",
    "apiKeyHeader": "X-API-Key"
  }
}
```

## Transport Comparison

| Feature            | stdio    | SSE      | WebSocket | HTTP     |
| ------------------ | -------- | -------- | --------- | -------- |
| Local servers      | ✅       | ❌       | ❌        | ❌       |
| Remote servers     | ❌       | ✅       | ✅        | ✅       |
| Authentication     | Env vars | Headers  | Headers   | Headers  |
| Streaming          | ✅       | ✅       | ✅        | ✅       |
| Firewall friendly  | ✅       | ✅       | ⚠️        | ✅       |
| Session management | ❌       | ⚠️       | ⚠️        | ✅       |
| Reconnection       | ❌       | ⚠️       | ⚠️        | ✅       |
| Specification      | MCP Core | MCP Core | MCP Core  | MCP 2025 |

## Configuration Options

### Required Fields

- `transport`: Must be set to `"http"`
- `url`: The HTTP endpoint URL (e.g., `https://api.example.com/mcp`)
- `command`: Usually same as URL for HTTP transport

### Optional Fields

- `headers`: Object with HTTP headers for authentication and configuration
- `httpOptions`: Fine-grained HTTP connection settings (see below)
- `retryConfig`: Automatic retry configuration with exponential backoff
- `rateLimiting`: Rate limiting to prevent API throttling
- `auth`: Authentication configuration (OAuth 2.1, Bearer, API Key)
- `timeout`: Connection timeout in milliseconds (default: 10000)
- `retries`: Maximum retry attempts (default: 3)
- `autoRestart`: Whether to automatically restart on failure (default: true)
- `healthCheckInterval`: Health check interval in milliseconds (default: 30000)

### HTTP Options Configuration

Fine-tune HTTP connection behavior:

```typescript
{
  httpOptions: {
    connectionTimeout: 30000,  // Connection timeout (ms), default: 30000
    requestTimeout: 60000,     // Request timeout (ms), default: 60000
    idleTimeout: 120000,       // Idle connection timeout (ms), default: 120000
    keepAliveTimeout: 30000    // Keep-alive timeout (ms), default: 30000
  }
}
```

| Option              | Type   | Default | Description                          |
| ------------------- | ------ | ------- | ------------------------------------ |
| `connectionTimeout` | number | 30000   | Maximum time to establish connection |
| `requestTimeout`    | number | 60000   | Maximum time for request completion  |
| `idleTimeout`       | number | 120000  | Time before closing idle connections |
| `keepAliveTimeout`  | number | 30000   | Keep-alive connection timeout        |

### Retry Configuration

Automatic retry with exponential backoff:

```typescript
{
  retryConfig: {
    maxAttempts: 3,           // Maximum retry attempts, default: 3
    initialDelay: 1000,       // Initial delay (ms), default: 1000
    maxDelay: 30000,          // Maximum delay (ms), default: 30000
    backoffMultiplier: 2      // Backoff multiplier, default: 2
  }
}
```

| Option              | Type   | Default | Description                        |
| ------------------- | ------ | ------- | ---------------------------------- |
| `maxAttempts`       | number | 3       | Maximum number of retry attempts   |
| `initialDelay`      | number | 1000    | Initial delay before first retry   |
| `maxDelay`          | number | 30000   | Maximum delay between retries      |
| `backoffMultiplier` | number | 2       | Multiplier for exponential backoff |

### Rate Limiting Configuration

Prevent API throttling with token bucket rate limiting:

```typescript
{
  rateLimiting: {
    requestsPerMinute: 60,    // Max requests per minute, default: 60
    requestsPerHour: 1000,    // Max requests per hour (optional)
    maxBurst: 10,             // Max burst size, default: 10
    useTokenBucket: true      // Use token bucket algorithm, default: true
  }
}
```

| Option              | Type    | Default | Description                         |
| ------------------- | ------- | ------- | ----------------------------------- |
| `requestsPerMinute` | number  | 60      | Maximum requests allowed per minute |
| `requestsPerHour`   | number  | -       | Maximum requests allowed per hour   |
| `maxBurst`          | number  | 10      | Maximum burst size for token bucket |
| `useTokenBucket`    | boolean | true    | Use token bucket algorithm          |

### Example: Complete Configuration

```json
{
  "mcpServers": {
    "custom-api": {
      "name": "custom-api",
      "command": "https://your-api.example.com/mcp",
      "transport": "http",
      "url": "https://your-api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN",
        "X-Custom-Header": "value"
      },
      "httpOptions": {
        "connectionTimeout": 30000,
        "requestTimeout": 60000,
        "idleTimeout": 120000,
        "keepAliveTimeout": 30000
      },
      "retryConfig": {
        "maxAttempts": 5,
        "initialDelay": 1000,
        "maxDelay": 30000,
        "backoffMultiplier": 2
      },
      "rateLimiting": {
        "requestsPerMinute": 100,
        "maxBurst": 20,
        "useTokenBucket": true
      },
      "timeout": 15000,
      "autoRestart": true,
      "healthCheckInterval": 60000,
      "description": "Custom MCP API endpoint"
    }
  }
}
```

## Use Cases

### 1. GitHub Copilot Integration

Access GitHub Copilot's AI capabilities through MCP:

```typescript
const neurolink = new NeuroLink();

await neurolink.addInMemoryMCPServer("copilot", {
  server: { title: "GitHub Copilot", tools: {} },
  config: {
    id: "copilot",
    name: "copilot",
    description: "GitHub Copilot MCP",
    transport: "http",
    url: "https://api.githubcopilot.com/mcp",
    headers: { Authorization: "Bearer YOUR_TOKEN" },
    tools: [],
    status: "initializing",
  },
});
```

### 2. Enterprise API Gateway

Connect to internal MCP services behind API gateways:

```json
{
  "internal-tools": {
    "transport": "http",
    "url": "https://internal-gateway.company.com/mcp",
    "headers": {
      "Authorization": "Bearer INTERNAL_TOKEN",
      "X-Tenant-ID": "tenant-123"
    }
  }
}
```

### 3. Multi-Cloud MCP Services

Connect to MCP services across different cloud providers:

```json
{
  "aws-mcp": {
    "transport": "http",
    "url": "https://mcp.us-east-1.amazonaws.com/api",
    "headers": {
      "X-API-Key": "AWS_API_KEY"
    }
  },
  "azure-mcp": {
    "transport": "http",
    "url": "https://mcp.azure.com/api/v1",
    "headers": {
      "Ocp-Apim-Subscription-Key": "AZURE_KEY"
    }
  }
}
```

## Troubleshooting

### Connection Failed

**Problem:** Unable to connect to HTTP MCP server

**Solutions:**

1. Verify the URL is correct and accessible
2. Check authentication headers are valid
3. Ensure firewall/proxy allows HTTPS traffic
4. Test with `curl` first:
   ```bash
   curl -H "Authorization: Bearer TOKEN" https://api.example.com/mcp
   ```

### Authentication Errors

**Problem:** 401 Unauthorized or 403 Forbidden

**Solutions:**

1. Verify token is valid and not expired
2. Check token has required permissions
3. Ensure header format matches API requirements
4. Try regenerating the authentication token

### Timeout Issues

**Problem:** Connection times out

**Solutions:**

1. Increase timeout value in configuration
2. Check network connectivity
3. Verify the server is running and responsive
4. Test with a simple HTTP client first

### Invalid Headers

**Problem:** Server rejects custom headers

**Solutions:**

1. Check header names follow HTTP specification
2. Ensure header values are properly formatted
3. Some headers may be reserved or blocked by proxies
4. Try different header names (e.g., `X-API-Key` instead of `Api-Key`)

## Technical Details

### Implementation

HTTP transport uses the `StreamableHTTPClientTransport` from the `@modelcontextprotocol/sdk` package, which implements:

- **JSON-RPC 2.0** for message protocol
- **Server-Sent Events (SSE)** for streaming responses
- **HTTP POST** for sending requests
- **Session management** via `Mcp-Session-Id` header
- **Automatic reconnection** with exponential backoff

### Security Considerations

1. **HTTPS Required**: Always use HTTPS in production
2. **Token Security**: Store tokens securely (environment variables, secrets management)
3. **Header Sanitization**: Avoid logging sensitive headers
4. **Network Security**: Use VPNs or private networks for internal APIs
5. **Rate Limiting**: Implement client-side rate limiting for public APIs

## Migration Guide

### From SSE to HTTP

If you're currently using SSE transport, migration is straightforward:

**Before (SSE):**

```json
{
  "transport": "sse",
  "url": "http://localhost:8080/sse"
}
```

**After (HTTP):**

```json
{
  "transport": "http",
  "url": "https://api.example.com/mcp",
  "headers": {
    "Authorization": "Bearer TOKEN"
  }
}
```

### From stdio to HTTP

Migrating from local stdio servers to remote HTTP requires server changes:

1. Deploy your MCP server as an HTTP service
2. Implement authentication endpoint
3. Update client configuration to use HTTP transport
4. Add authentication headers

## Resources

- [MCP Specification - Transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [GitHub Copilot MCP API Documentation](https://github.com/features/copilot)
- [NeuroLink MCP Integration Guide](./MCP-INTEGRATION.md)
- Example HTTP Transport Configurations:

```json
{
  "mcpServers": {
    "github-copilot": {
      "name": "github-copilot",
      "transport": "http",
      "url": "https://api.githubcopilot.com/mcp",
      "headers": {
        "Authorization": "Bearer ${GITHUB_COPILOT_TOKEN}"
      },
      "httpOptions": {
        "connectionTimeout": 30000,
        "requestTimeout": 60000
      },
      "retryConfig": {
        "maxAttempts": 3,
        "initialDelay": 1000,
        "maxDelay": 30000
      },
      "rateLimiting": {
        "requestsPerMinute": 60,
        "maxBurst": 10
      },
      "description": "GitHub Copilot MCP API with full configuration"
    },
    "simple-http-server": {
      "name": "simple-http-server",
      "transport": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      },
      "description": "Minimal HTTP transport configuration"
    },
    "enterprise-oauth-server": {
      "name": "enterprise-oauth-server",
      "transport": "http",
      "url": "https://api.enterprise.com/mcp",
      "auth": {
        "type": "oauth2",
        "oauth": {
          "clientId": "${OAUTH_CLIENT_ID}",
          "clientSecret": "${OAUTH_CLIENT_SECRET}",
          "authorizationUrl": "https://auth.enterprise.com/authorize",
          "tokenUrl": "https://auth.enterprise.com/token",
          "redirectUrl": "http://localhost:8080/callback",
          "scope": "mcp:read mcp:write tools:execute",
          "usePKCE": true
        }
      },
      "description": "Enterprise MCP server with OAuth 2.1 + PKCE"
    }
  }
}
```

## Support

For issues or questions:

- GitHub Issues: [juspay/neurolink/issues](https://github.com/juspay/neurolink/issues)
- Documentation: [NeuroLink Docs](https://github.com/juspay/neurolink/docs)
- Examples: [Basic Usage Examples](examples/basic-usage.md)
