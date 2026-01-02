/**
 * HTTP Transport MCP Server Example
 *
 * This comprehensive example demonstrates how to connect to HTTP-based MCP servers,
 * such as the GitHub Copilot MCP API, using the HTTP/Streamable HTTP transport.
 *
 * HTTP transport is ideal for:
 * - Remote MCP APIs (GitHub Copilot, enterprise services)
 * - Cloud-hosted MCP servers
 * - REST-style MCP endpoints
 * - Services requiring OAuth or API key authentication
 *
 * Prerequisites:
 * 1. Set environment variables for your API tokens
 * 2. Or replace with your own HTTP MCP endpoint
 *
 * Configuration options demonstrated:
 * - Basic HTTP transport with Bearer token
 * - Full configuration with timeouts, retries, and rate limiting
 * - OAuth 2.1 authentication
 * - API key authentication
 * - High-throughput configuration
 */

import { NeuroLink } from "@juspay/neurolink";

// ============================================
// HTTP TRANSPORT CONFIGURATION REFERENCE
// ============================================

/**
 * HTTP Transport Configuration Options (MCPServerInfo type)
 *
 * Required fields (all MCPServerInfo):
 * - id: string - Unique server identifier
 * - name: string - Server display name
 * - description: string - Server description
 * - transport: "http" - Specifies HTTP/Streamable HTTP transport
 * - status: "initializing" - Initial connection status
 * - tools: [] - Empty array (populated after connection)
 * - url: string - The full URL of the MCP HTTP endpoint
 *
 * Authentication (choose one):
 * - headers.Authorization - Bearer token or custom auth header
 * - auth.type: "api-key" - API key authentication
 * - auth.type: "bearer" - Bearer token authentication
 * - auth.type: "oauth2" - OAuth 2.1 with optional PKCE
 *
 * HTTP Options (httpOptions):
 * - connectionTimeout - Time to establish connection (ms, default: 30000)
 * - requestTimeout - Total request timeout (ms, default: 60000)
 * - idleTimeout - Idle timeout for connection pool (ms, default: 120000)
 * - keepAliveTimeout - Keep-alive timeout (ms, default: 30000)
 *
 * Retry Configuration (retryConfig):
 * - maxAttempts - Maximum retry attempts
 * - initialDelay - Initial delay between retries (ms)
 * - maxDelay - Maximum delay between retries (ms)
 * - backoffMultiplier - Exponential backoff multiplier
 *
 * Rate Limiting (rateLimiting):
 * - requestsPerMinute - Max requests per minute (default: 60)
 * - requestsPerHour - Max requests per hour (optional)
 * - maxBurst - Max burst size for token bucket (default: 10)
 * - useTokenBucket - Use token bucket algorithm (default: true)
 */

async function main() {
  console.log("HTTP Transport MCP Example");
  console.log("==========================\n");

  // Initialize NeuroLink
  const neurolink = new NeuroLink();

  // ============================================
  // EXAMPLE 1: Basic HTTP Transport
  // ============================================

  console.log("Example 1: Basic HTTP Transport with Bearer Token");
  console.log("-".repeat(50));

  try {
    // Use FLAT MCPServerInfo structure - no server/config wrappers
    await neurolink.addExternalMCPServer("basic-http", {
      id: "basic-http",
      name: "basic-http",
      description: "Simple HTTP transport with Bearer token authentication",
      transport: "http",
      status: "initializing",
      tools: [],
      url: "https://api.example.com/mcp",
      // Simple Bearer token authentication
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN || "YOUR_TOKEN_HERE"}`,
      },
    });
    console.log("Successfully configured basic HTTP transport\n");
  } catch (error) {
    console.log("Configuration example (not connected):", error);
  }

  // ============================================
  // EXAMPLE 2: GitHub Copilot MCP API
  // ============================================

  console.log("\nExample 2: GitHub Copilot MCP API (Full Configuration)");
  console.log("-".repeat(50));

  try {
    // Use FLAT MCPServerInfo structure with full configuration
    await neurolink.addExternalMCPServer("github-copilot", {
      id: "github-copilot",
      name: "github-copilot",
      description: "GitHub Copilot API integration via HTTP transport",
      transport: "http",
      status: "initializing",
      tools: [],
      url: "https://api.githubcopilot.com/mcp",
      // Bearer token from environment
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_COPILOT_TOKEN || "YOUR_TOKEN_HERE"}`,
        "User-Agent": "NeuroLink/1.0",
      },
      // HTTP-specific options
      httpOptions: {
        connectionTimeout: 30000, // 30 seconds to establish connection
        requestTimeout: 60000, // 60 seconds for request completion
        idleTimeout: 120000, // 2 minutes idle timeout
        keepAliveTimeout: 30000, // 30 seconds keep-alive
      },
      // Retry configuration for resilience
      retryConfig: {
        maxAttempts: 3, // Retry up to 3 times
        initialDelay: 1000, // Start with 1 second delay
        maxDelay: 30000, // Max 30 seconds between retries
        backoffMultiplier: 2, // Double delay each retry
      },
      // Rate limiting to avoid API throttling
      rateLimiting: {
        requestsPerMinute: 60, // 60 requests/minute
        maxBurst: 10, // Allow bursts of 10
      },
    });
    console.log("Successfully configured GitHub Copilot MCP\n");
  } catch (error) {
    console.log("Configuration example (not connected):", error);
  }

  // ============================================
  // EXAMPLE 3: OAuth 2.1 Authentication
  // ============================================

  console.log("\nExample 3: Enterprise OAuth 2.1 + PKCE");
  console.log("-".repeat(50));

  // FLAT MCPServerInfo structure with OAuth 2.1 configuration
  const oauthConfig = {
    id: "enterprise-oauth",
    name: "enterprise-oauth",
    description: "Enterprise MCP with OAuth 2.1 + PKCE",
    transport: "http" as const,
    status: "initializing" as const,
    tools: [],
    url: "https://api.enterprise.example.com/mcp",
    // OAuth 2.1 authentication configuration
    auth: {
      type: "oauth2" as const,
      oauth: {
        clientId: process.env.OAUTH_CLIENT_ID || "your-client-id",
        clientSecret: process.env.OAUTH_CLIENT_SECRET || "your-secret",
        authorizationUrl: "https://auth.enterprise.example.com/authorize",
        tokenUrl: "https://auth.enterprise.example.com/token",
        redirectUrl: "http://localhost:8080/callback",
        scope: "mcp:read mcp:write tools:execute",
        usePKCE: true, // Use PKCE for enhanced security
      },
    },
    // Additional headers
    headers: {
      "X-API-Version": "2024-01",
      "X-Client-ID": "neurolink",
    },
    // Extended timeouts for enterprise operations
    httpOptions: {
      connectionTimeout: 60000,
      requestTimeout: 120000,
      idleTimeout: 300000, // 5 minutes for long operations
      keepAliveTimeout: 60000, // 1 minute keep-alive
    },
    // Aggressive retry for enterprise reliability
    retryConfig: {
      maxAttempts: 5,
      initialDelay: 500,
      maxDelay: 60000,
      backoffMultiplier: 2,
    },
    // Enterprise rate limits
    rateLimiting: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      maxBurst: 20,
      useTokenBucket: true,
    },
  };

  console.log("OAuth Configuration:");
  console.log(JSON.stringify(oauthConfig, null, 2));
  console.log();

  // ============================================
  // EXAMPLE 4: API Key Authentication
  // ============================================

  console.log("\nExample 4: API Key Authentication");
  console.log("-".repeat(50));

  // FLAT MCPServerInfo structure with API key authentication
  const apiKeyConfig = {
    id: "api-key-server",
    name: "api-key-server",
    description: "MCP server with API key authentication",
    transport: "http" as const,
    status: "initializing" as const,
    tools: [],
    url: "https://api.example.com/mcp",
    // API key authentication
    auth: {
      type: "api-key" as const,
      apiKey: process.env.API_KEY || "your-api-key",
    },
    // API key in header (some APIs require this)
    headers: {
      "X-API-Key": process.env.API_KEY || "your-api-key",
    },
    httpOptions: {
      connectionTimeout: 30000,
      requestTimeout: 30000,
    },
  };

  console.log("API Key Configuration:");
  console.log(JSON.stringify(apiKeyConfig, null, 2));
  console.log();

  // ============================================
  // EXAMPLE 5: High-Throughput Configuration
  // ============================================

  console.log("\nExample 5: High-Throughput Configuration");
  console.log("-".repeat(50));

  // FLAT MCPServerInfo structure optimized for high throughput
  const highThroughputConfig = {
    id: "high-throughput",
    name: "high-throughput",
    description: "Optimized for bulk operations",
    transport: "http" as const,
    status: "initializing" as const,
    tools: [],
    url: "https://api.highvolume.example.com/mcp",
    headers: {
      Authorization: `Bearer ${process.env.HT_API_TOKEN || "YOUR_TOKEN"}`,
    },
    // Optimized for speed
    httpOptions: {
      connectionTimeout: 10000, // Quick connection timeout
      requestTimeout: 30000, // Fast request timeout
      idleTimeout: 60000, // 1 minute idle timeout
      keepAliveTimeout: 10000, // Quick keep-alive for high throughput
    },
    // High volume rate limits
    rateLimiting: {
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
      maxBurst: 100,
      useTokenBucket: true, // Token bucket for smoother rate limiting
    },
    // Quick retry for transient failures
    retryConfig: {
      maxAttempts: 3,
      initialDelay: 100, // Start with 100ms
      maxDelay: 5000, // Max 5 seconds
      backoffMultiplier: 2,
    },
  };

  console.log("High-Throughput Configuration:");
  console.log(JSON.stringify(highThroughputConfig, null, 2));
  console.log();

  // ============================================
  // EXAMPLE 6: Internal Network Configuration
  // ============================================

  console.log("\nExample 6: Internal Network (Relaxed SSL)");
  console.log("-".repeat(50));

  // FLAT MCPServerInfo structure for internal network
  const internalConfig = {
    id: "internal-api",
    name: "internal-api",
    description: "Internal network MCP server",
    transport: "http" as const,
    status: "initializing" as const,
    tools: [],
    url: "http://internal-mcp.company.local:8080/api/mcp",
    headers: {
      "X-Internal-Auth": process.env.INTERNAL_API_KEY || "internal-key",
      "X-Service-Name": "neurolink",
    },
    // Note: For internal networks with self-signed certs, configure your
    // Node.js environment with NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production)
    httpOptions: {
      connectionTimeout: 5000, // Quick for internal network
      requestTimeout: 30000,
      idleTimeout: 60000,
    },
    retryConfig: {
      maxAttempts: 2,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
    },
  };

  console.log("Internal Network Configuration:");
  console.log(JSON.stringify(internalConfig, null, 2));
  console.log();

  // ============================================
  // TRANSPORT COMPARISON
  // ============================================

  console.log("\nTransport Types Comparison");
  console.log("=".repeat(50));

  const transports = [
    {
      type: "stdio",
      use: "Local MCP servers, CLI tools",
      auth: "Environment variables",
      example: 'npx @modelcontextprotocol/server-filesystem "/"',
      pros: "Simple setup, no network",
      cons: "Local only, requires CLI tool",
    },
    {
      type: "sse",
      use: "Web-based MCP servers (legacy)",
      auth: "Custom headers",
      example: "http://localhost:8080/sse",
      pros: "Real-time updates",
      cons: "Legacy, limited browser support",
    },
    {
      type: "http",
      use: "Remote MCP APIs, GitHub Copilot",
      auth: "Bearer tokens, OAuth, API keys",
      example: "https://api.githubcopilot.com/mcp",
      pros: "Standard REST, full auth options, enterprise-ready",
      cons: "Requires network, may need auth setup",
    },
  ];

  transports.forEach((t) => {
    console.log(`\n${t.type.toUpperCase()} Transport:`);
    console.log(`  Use case: ${t.use}`);
    console.log(`  Authentication: ${t.auth}`);
    console.log(`  Example: ${t.example}`);
    console.log(`  Pros: ${t.pros}`);
    console.log(`  Cons: ${t.cons}`);
  });

  // ============================================
  // CONFIGURATION FILE EXAMPLE
  // ============================================

  console.log("\n\nConfiguration File Example (.mcp-config.json)");
  console.log("=".repeat(50));

  const configFileExample = {
    mcpServers: {
      // stdio transport (local)
      filesystem: {
        name: "filesystem",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
        transport: "stdio",
      },
      // HTTP transport (remote) - FLAT structure
      "github-copilot": {
        id: "github-copilot",
        name: "github-copilot",
        description: "GitHub Copilot MCP API",
        transport: "http",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: "Bearer ${GITHUB_COPILOT_TOKEN}",
        },
        httpOptions: {
          connectionTimeout: 30000,
          requestTimeout: 60000,
        },
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 30000,
        },
        rateLimiting: {
          requestsPerMinute: 60,
          maxBurst: 10,
        },
      },
    },
    autoDiscovery: {
      enabled: true,
      autoRegister: true,
    },
  };

  console.log(JSON.stringify(configFileExample, null, 2));
  console.log("\nSave this to .mcp-config.json in your project root.\n");

  // ============================================
  // USAGE WITH AI GENERATION
  // ============================================

  console.log("\nUsing HTTP MCP Servers with AI Generation");
  console.log("=".repeat(50));

  console.log(`
// After configuring HTTP MCP servers, use them with AI:

import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Add HTTP MCP server using FLAT MCPServerInfo structure
await neurolink.addExternalMCPServer("github-copilot", {
  id: "github-copilot",
  name: "github-copilot",
  description: "GitHub Copilot MCP API",
  transport: "http",
  status: "initializing",
  tools: [],
  url: "https://api.githubcopilot.com/mcp",
  headers: {
    Authorization: "Bearer TOKEN"
  },
  httpOptions: {
    connectionTimeout: 30000,
    requestTimeout: 60000
  },
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000
  },
  rateLimiting: {
    requestsPerMinute: 60,
    maxBurst: 10
  }
});

// Generate with MCP tools enabled
const result = await neurolink.generate({
  input: { text: "Help me with this code" },
  provider: "openai",
  model: "gpt-4",
  disableTools: false,  // Enable MCP tools
});

console.log(result.text);
`);

  console.log("\nHTTP Transport example completed!");
  console.log("\nFor more examples, see:");
  console.log("  - .mcp-servers.example.json - All configuration options");
  console.log("  - docs/MCP-HTTP-TRANSPORT.md - Full documentation");
  console.log("  - examples/dynamic-mcp-servers.js - Programmatic usage");
}

// Run the example
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
