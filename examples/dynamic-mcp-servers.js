#!/usr/bin/env node

/**
 * NeuroLink Dynamic MCP Server Management Examples
 * Demonstrates programmatic addition of MCP servers at runtime
 *
 * This example shows:
 * - Adding stdio-based MCP servers (local CLI tools)
 * - Adding HTTP-based MCP servers (remote APIs like GitHub Copilot)
 * - Configuring retry, rate limiting, and authentication
 *
 * IMPORTANT: All servers use FLAT MCPServerInfo structure (no nested server/config wrappers)
 */

import { NeuroLink } from "@juspay/neurolink";

async function demonstrateDynamicServers() {
  console.log("NeuroLink Dynamic MCP Server Management Demo");
  console.log("=============================================\n");

  const neurolink = new NeuroLink();

  // ============================================
  // STDIO TRANSPORT EXAMPLES (Local CLI tools)
  // ============================================

  // Example 1: Bitbucket Integration (stdio)
  console.log("Example 1: Adding Bitbucket Integration (stdio transport)");
  try {
    await neurolink.addExternalMCPServer("bitbucket", {
      id: "bitbucket",
      name: "Bitbucket MCP Server",
      description: "Bitbucket repository management and development workflows",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: "npx",
      args: ["-y", "@nexus2520/bitbucket-mcp-server"],
      env: {
        BITBUCKET_USERNAME: process.env.BITBUCKET_USERNAME || "demo-user",
        BITBUCKET_TOKEN: process.env.BITBUCKET_TOKEN || "demo-token",
        BITBUCKET_BASE_URL:
          process.env.BITBUCKET_BASE_URL || "https://api.bitbucket.org/2.0",
      },
    });
    console.log("  [OK] Bitbucket server added successfully\n");
  } catch (error) {
    console.log(
      "  [FAILED] Failed to add Bitbucket server:",
      error.message,
      "\n",
    );
  }

  // Example 2: Custom Database Connector (stdio)
  console.log("Example 2: Adding Custom Database Connector (stdio transport)");
  try {
    await neurolink.addExternalMCPServer("database-analytics", {
      id: "database-analytics",
      name: "Database Analytics MCP Server",
      description: "Custom database analytics and reporting server",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: "node",
      args: ["./custom-db-mcp-server.js"],
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL || "postgresql://localhost:5432/demo",
        DB_POOL_SIZE: "10",
      },
      cwd: process.cwd(),
    });
    console.log("  [OK] Database analytics server added successfully\n");
  } catch (error) {
    console.log(
      "  [FAILED] Failed to add database server:",
      error.message,
      "\n",
    );
  }

  // Example 3: Slack Integration (stdio)
  console.log("Example 3: Adding Slack Integration (stdio transport)");
  try {
    await neurolink.addExternalMCPServer("slack-bot", {
      id: "slack-bot",
      name: "Slack Bot MCP Server",
      description: "Slack integration for messaging and notifications",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: "npx",
      args: ["-y", "@slack/mcp-server"],
      env: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "xoxb-demo-token",
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "demo-secret",
      },
    });
    console.log("  [OK] Slack bot server added successfully\n");
  } catch (error) {
    console.log("  [FAILED] Failed to add Slack server:", error.message, "\n");
  }

  // ============================================
  // HTTP TRANSPORT EXAMPLES (Remote APIs)
  // ============================================

  // Example 4: GitHub Copilot MCP API (http transport)
  console.log("Example 4: Adding GitHub Copilot MCP API (http transport)");
  try {
    await neurolink.addExternalMCPServer("github-copilot", {
      id: "github-copilot",
      name: "GitHub Copilot MCP",
      description: "GitHub Copilot API integration via HTTP transport",
      transport: "http",
      status: "initializing",
      tools: [],
      url: "https://api.githubcopilot.com/mcp",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_COPILOT_TOKEN || "YOUR_TOKEN_HERE"}`,
      },
      httpOptions: {
        connectionTimeout: 30000, // 30 seconds to establish connection
        requestTimeout: 60000, // 60 seconds for request completion
        idleTimeout: 120000, // 2 minutes idle before closing
      },
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
      },
      rateLimiting: {
        requestsPerMinute: 60,
        maxBurst: 10,
      },
    });
    console.log("  [OK] GitHub Copilot server added successfully\n");
  } catch (error) {
    console.log(
      "  [FAILED] Failed to add GitHub Copilot server:",
      error.message,
      "\n",
    );
  }

  // Example 5: Custom Enterprise HTTP MCP Server with OAuth
  console.log("Example 5: Adding Enterprise HTTP MCP Server with OAuth");
  try {
    await neurolink.addExternalMCPServer("enterprise-api", {
      id: "enterprise-api",
      name: "Enterprise MCP API",
      description: "Enterprise HTTP MCP endpoint with OAuth 2.1 authentication",
      transport: "http",
      status: "initializing",
      tools: [],
      url: "https://api.enterprise.example.com/mcp/v1",
      // OAuth 2.1 authentication
      auth: {
        type: "oauth2",
        oauth: {
          clientId: process.env.OAUTH_CLIENT_ID || "your-client-id",
          clientSecret: process.env.OAUTH_CLIENT_SECRET || "your-secret",
          authorizationUrl: "https://auth.enterprise.example.com/authorize",
          tokenUrl: "https://auth.enterprise.example.com/token",
          redirectUrl: "http://localhost:3000/oauth/callback",
          scope: "mcp:read mcp:write",
          usePKCE: true,
        },
      },
      // Custom headers
      headers: {
        "X-API-Version": "2024-01",
        "X-Client-ID": "neurolink",
      },
      // Extended timeout for long operations
      httpOptions: {
        connectionTimeout: 60000,
        requestTimeout: 120000,
        idleTimeout: 300000, // 5 minutes idle for long operations
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
    });
    console.log("  [OK] Enterprise API server added successfully\n");
  } catch (error) {
    console.log(
      "  [FAILED] Failed to add Enterprise API server:",
      error.message,
      "\n",
    );
  }

  // Example 6: Simple HTTP API with API Key
  console.log("Example 6: Adding Simple HTTP API with API Key");
  try {
    await neurolink.addExternalMCPServer("simple-api", {
      id: "simple-api",
      name: "Simple API",
      description: "Simple HTTP MCP with API key authentication",
      transport: "http",
      status: "initializing",
      tools: [],
      url: "https://api.example.com/mcp",
      auth: {
        type: "api-key",
        apiKey: process.env.API_KEY || "your-api-key",
        apiKeyHeader: "X-API-Key",
      },
    });
    console.log("  [OK] Simple API server added successfully\n");
  } catch (error) {
    console.log(
      "  [FAILED] Failed to add Simple API server:",
      error.message,
      "\n",
    );
  }

  // Example 7: Bearer Token Authentication (http)
  console.log("Example 7: Adding HTTP API with Bearer Token");
  try {
    await neurolink.addExternalMCPServer("bearer-api", {
      id: "bearer-api",
      name: "Bearer Token API",
      description: "HTTP MCP with Bearer token authentication",
      transport: "http",
      status: "initializing",
      tools: [],
      url: "https://api.service.com/mcp",
      auth: {
        type: "bearer",
        token: process.env.BEARER_TOKEN || "your-bearer-token",
      },
    });
    console.log("  [OK] Bearer Token API server added successfully\n");
  } catch (error) {
    console.log(
      "  [FAILED] Failed to add Bearer Token API server:",
      error.message,
      "\n",
    );
  }

  // ============================================
  // STATUS AND VERIFICATION
  // ============================================

  // Check Status
  console.log("Current MCP Status:");
  const status = await neurolink.getMCPStatus();
  console.log(`  Total Servers: ${status.totalServers}`);
  console.log(`  Available Servers: ${status.availableServers}`);
  console.log(`  Total Tools: ${status.totalTools}`);

  // List All Servers
  console.log("\nRegistered Servers:");
  const registry = neurolink.getUnifiedRegistry();
  const servers = registry.listServers();
  servers.forEach((server, index) => {
    console.log(`  ${index + 1}. ${server}`);
  });

  console.log("\nDynamic MCP server management demo completed!");

  console.log("\nTransport Types Summary:");
  console.log("   stdio  - Local CLI tools (npx, node, python)");
  console.log("   sse    - Server-Sent Events (legacy web servers)");
  console.log("   http   - HTTP/REST APIs (GitHub Copilot, enterprise APIs)");

  console.log("\nHTTP Transport Configuration Options (httpOptions):");
  console.log("   connectionTimeout  - Time to establish connection (ms)");
  console.log("   requestTimeout     - Total request timeout (ms)");
  console.log("   idleTimeout        - Idle timeout for connection pool (ms)");
  console.log("   keepAliveTimeout   - Keep-alive timeout (ms)");
  console.log("\nRetry Configuration (retryConfig):");
  console.log("   maxAttempts        - Maximum retry attempts");
  console.log("   initialDelay       - Initial delay between retries (ms)");
  console.log("   maxDelay           - Maximum delay between retries (ms)");
  console.log("   backoffMultiplier  - Exponential backoff multiplier");
  console.log("\nRate Limiting (rateLimiting):");
  console.log("   requestsPerMinute  - Max requests per minute");
  console.log("   requestsPerHour    - Max requests per hour (optional)");
  console.log("   maxBurst           - Max burst size for token bucket");
  console.log("   useTokenBucket     - Use token bucket algorithm");
  console.log("\nAuthentication (auth):");
  console.log("   type: api-key      - API key authentication");
  console.log("   type: bearer       - Bearer token authentication");
  console.log("   type: oauth2       - OAuth 2.1 with optional PKCE");

  console.log("\nMCPServerInfo Structure (FLAT - no nested wrappers):");
  console.log("   id, name, description  - Server identification (required)");
  console.log(
    "   transport, status      - Transport type and status (required)",
  );
  console.log("   tools                  - Empty array initially (required)");
  console.log("   command, args, env     - For stdio transport");
  console.log("   url, headers, auth     - For http transport");

  console.log("\nNext Steps:");
  console.log("   - Set environment variables for real integrations");
  console.log("   - Use neurolink.generate() to leverage new tools");
  console.log("   - See .mcp-servers.example.json for more config examples");
  console.log("   - Read docs/MCP-HTTP-TRANSPORT.md for full documentation");
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("\nUnhandled promise rejection:", error.message);
  process.exit(1);
});

// Run the demonstration
demonstrateDynamicServers().catch((error) => {
  console.error("\nDemo failed:", error.message);
  process.exit(1);
});
