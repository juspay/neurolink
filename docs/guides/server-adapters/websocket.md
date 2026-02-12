---
title: WebSocket Support
sidebar_label: "WebSocket"
description: Real-time bidirectional communication for AI agents using WebSocket connections
sidebar_position: 8
keywords: websocket, real-time, streaming, bidirectional, connection management, authentication
---

# WebSocket Support

NeuroLink server adapters include built-in WebSocket support for real-time, bidirectional communication with AI agents. WebSocket connections are ideal for interactive applications requiring low-latency streaming, live updates, and persistent connections.

---

## Why WebSocket?

| Feature                    | Benefit                                                         |
| -------------------------- | --------------------------------------------------------------- |
| **Bidirectional**          | Send and receive messages without polling                       |
| **Low Latency**            | Single persistent connection reduces overhead                   |
| **Real-time Streaming**    | Stream AI responses token-by-token                              |
| **Connection Management**  | Built-in ping/pong, reconnection, and graceful shutdown         |
| **Multi-client Broadcast** | Send messages to multiple connected clients simultaneously      |
| **Authentication**         | Secure connections with bearer tokens, API keys, or custom auth |

---

## Quick Start

### Basic WebSocket Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer, WebSocketConnectionManager } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    basePath: "/api",
  },
});

// Create WebSocket manager
const wsManager = new WebSocketConnectionManager({
  path: "/ws",
  maxConnections: 1000,
  pingInterval: 30000,
  pongTimeout: 10000,
  maxMessageSize: 1024 * 1024, // 1MB
});

// Register a handler
wsManager.registerHandler("/ws", {
  onOpen: async (connection) => {
    console.log(`Client connected: ${connection.id}`);
  },
  onMessage: async (connection, message) => {
    console.log(`Received: ${message.data}`);
  },
  onClose: async (connection, code, reason) => {
    console.log(`Client disconnected: ${connection.id}`);
  },
  onError: async (connection, error) => {
    console.error(`Error: ${error.message}`);
  },
});

await server.initialize();
await server.start();

console.log("WebSocket server running on ws://localhost:3000/ws");
```

### Client Connection

```javascript
// Browser client
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ type: "generate", payload: { prompt: "Hello!" } }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};

ws.onclose = (event) => {
  console.log(`Disconnected: ${event.code} - ${event.reason}`);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

---

## Configuration

### WebSocketConfig

The `WebSocketConfig` type defines all available configuration options:

```typescript
type WebSocketConfig = {
  /** WebSocket endpoint path (default: "/ws") */
  path?: string;

  /** Maximum number of concurrent connections (default: 1000) */
  maxConnections?: number;

  /** Interval between ping messages in ms (default: 30000) */
  pingInterval?: number;

  /** Time to wait for pong response in ms (default: 10000) */
  pongTimeout?: number;

  /** Maximum message size in bytes (default: 1MB) */
  maxMessageSize?: number;

  /** Authentication configuration */
  auth?: AuthConfig;
};
```

### Configuration Options

| Option           | Type         | Default   | Description                                        |
| ---------------- | ------------ | --------- | -------------------------------------------------- |
| `path`           | `string`     | `"/ws"`   | WebSocket endpoint path                            |
| `maxConnections` | `number`     | `1000`    | Maximum concurrent connections                     |
| `pingInterval`   | `number`     | `30000`   | Milliseconds between ping messages (0 to disable)  |
| `pongTimeout`    | `number`     | `10000`   | Milliseconds to wait for pong before disconnecting |
| `maxMessageSize` | `number`     | `1048576` | Maximum message size in bytes (1MB default)        |
| `auth`           | `AuthConfig` | `none`    | Authentication configuration                       |

### Full Configuration Example

```typescript
const wsManager = new WebSocketConnectionManager({
  path: "/ws/agent",
  maxConnections: 500,
  pingInterval: 15000,
  pongTimeout: 5000,
  maxMessageSize: 512 * 1024, // 512KB
  auth: {
    strategy: "bearer",
    required: true,
    validate: async (token) => {
      const decoded = await verifyJWT(token);
      return decoded ? { id: decoded.sub, roles: decoded.roles } : null;
    },
  },
});
```

---

## WebSocket Types

### WebSocketConnection

Represents an active WebSocket connection:

```typescript
type WebSocketConnection = {
  /** Unique connection identifier */
  id: string;

  /** Underlying WebSocket socket */
  socket: unknown;

  /** Authenticated user (if auth enabled) */
  user?: AuthenticatedUser;

  /** Custom metadata for the connection */
  metadata: Record<string, unknown>;

  /** Connection creation timestamp */
  createdAt: number;

  /** Last activity timestamp */
  lastActivity: number;
};
```

### WebSocketMessage

Represents an incoming WebSocket message:

```typescript
type WebSocketMessage = {
  /** Message type: text, binary, ping, pong, or close */
  type: WebSocketMessageType;

  /** Message payload */
  data: string | ArrayBuffer;

  /** Message timestamp */
  timestamp: number;
};

type WebSocketMessageType = "text" | "binary" | "ping" | "pong" | "close";
```

### WebSocketHandler

Interface for handling WebSocket events:

```typescript
type WebSocketHandler = {
  /** Called when a connection is established */
  onOpen?: (connection: WebSocketConnection) => void | Promise<void>;

  /** Called when a message is received */
  onMessage?: (
    connection: WebSocketConnection,
    message: WebSocketMessage,
  ) => void | Promise<void>;

  /** Called when a connection is closed */
  onClose?: (
    connection: WebSocketConnection,
    code: number,
    reason: string,
  ) => void | Promise<void>;

  /** Called when an error occurs */
  onError?: (
    connection: WebSocketConnection,
    error: Error,
  ) => void | Promise<void>;
};
```

### AuthenticatedUser

User information from successful authentication:

```typescript
type AuthenticatedUser = {
  /** Unique user identifier */
  id: string;

  /** User email (optional) */
  email?: string;

  /** Display name (optional) */
  name?: string;

  /** User roles for authorization */
  roles?: string[];

  /** User permissions for fine-grained access */
  permissions?: string[];

  /** Additional user metadata */
  metadata?: Record<string, unknown>;
};
```

---

## Authentication

### Authentication Strategies

NeuroLink supports multiple authentication strategies for WebSocket connections:

| Strategy | Description                      | Use Case                         |
| -------- | -------------------------------- | -------------------------------- |
| `bearer` | JWT or OAuth bearer token        | API authentication               |
| `apiKey` | API key in header or query param | Service-to-service communication |
| `basic`  | HTTP Basic authentication        | Simple username/password         |
| `custom` | Custom validation function       | Complex authentication flows     |
| `none`   | No authentication (default)      | Development or public endpoints  |

### AuthConfig

```typescript
type AuthConfig = {
  /** Authentication strategy */
  strategy: "bearer" | "apiKey" | "basic" | "custom" | "none";

  /** Whether authentication is required */
  required?: boolean;

  /** Custom header name for token (default: "Authorization") */
  headerName?: string;

  /** Query parameter name for token */
  queryParam?: string;

  /** Custom validation function */
  validate?: (token: string) => Promise<AuthenticatedUser | null>;

  /** Required roles for access */
  roles?: string[];

  /** Required permissions for access */
  permissions?: string[];
};
```

### Bearer Token Authentication

```typescript
const wsManager = new WebSocketConnectionManager({
  path: "/ws",
  auth: {
    strategy: "bearer",
    required: true,
    validate: async (token) => {
      try {
        const decoded = await verifyJWT(token);
        return {
          id: decoded.sub,
          email: decoded.email,
          roles: decoded.roles || [],
        };
      } catch {
        return null;
      }
    },
  },
});

// Client connection with bearer token (Node.js only)
// Note: Custom headers in the WebSocket constructor are only supported by
// Node.js WebSocket libraries (e.g., `ws`). Browser WebSocket API does not
// support custom headers. For browser clients, use query parameters, cookies,
// or send authentication in the first message after connection.
const ws = new WebSocket("ws://localhost:3000/ws", [], {
  headers: {
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
});
```

### API Key Authentication

```typescript
const wsManager = new WebSocketConnectionManager({
  path: "/ws",
  auth: {
    strategy: "apiKey",
    required: true,
    headerName: "X-API-Key",
    validate: async (apiKey) => {
      const user = await validateApiKey(apiKey);
      return user ? { id: user.id, roles: user.roles } : null;
    },
  },
});

// Client connection with API key
const ws = new WebSocket("ws://localhost:3000/ws?apiKey=your-api-key");

// Or via header (if supported by client)
const ws = new WebSocket("ws://localhost:3000/ws", [], {
  headers: {
    "X-API-Key": "your-api-key",
  },
});
```

### Role-Based Access Control

```typescript
const wsManager = new WebSocketConnectionManager({
  path: "/ws/admin",
  auth: {
    strategy: "bearer",
    required: true,
    roles: ["admin", "superuser"], // Only allow these roles
    validate: async (token) => {
      const decoded = await verifyJWT(token);
      return decoded ? { id: decoded.sub, roles: decoded.roles } : null;
    },
  },
});

// Access user info in handler
wsManager.registerHandler("/ws/admin", {
  onOpen: async (connection) => {
    if (connection.user?.roles?.includes("admin")) {
      console.log(`Admin connected: ${connection.user.id}`);
    }
  },
});
```

---

## WebSocketConnectionManager

The `WebSocketConnectionManager` class provides comprehensive connection management.

### Connection Management Methods

```typescript
// Get a specific connection
const connection = wsManager.getConnection(connectionId);

// Get all active connections
const connections = wsManager.getAllConnections();

// Get connections for a specific user
const userConnections = wsManager.getConnectionsByUser(userId);

// Get connections for a specific path
const pathConnections = wsManager.getConnectionsByPath("/ws/agent");

// Get total connection count
const count = wsManager.getConnectionCount();
```

### Sending Messages

```typescript
// Send to a specific connection
wsManager.send(connectionId, JSON.stringify({ type: "update", data: "Hello" }));

// Send binary data
const buffer = new ArrayBuffer(8);
wsManager.send(connectionId, buffer);
```

### Broadcasting

```typescript
// Broadcast to all connections
wsManager.broadcast(
  JSON.stringify({ type: "announcement", message: "Server update" }),
);

// Broadcast with filter
wsManager.broadcast(
  JSON.stringify({ type: "admin-only", data: "Secret info" }),
  (connection) => connection.user?.roles?.includes("admin") ?? false,
);

// Broadcast to specific path
wsManager.broadcast(
  JSON.stringify({ type: "update" }),
  (connection) => connection.metadata.path === "/ws/notifications",
);
```

### Closing Connections

```typescript
// Close a specific connection
await wsManager.close(connectionId, 1000, "Session ended");

// Close all connections (for shutdown)
await wsManager.closeAll(1001, "Server shutting down");
```

---

## Message Routing

### WebSocketMessageRouter

For structured message handling, use the `WebSocketMessageRouter`:

```typescript
import {
  WebSocketConnectionManager,
  WebSocketMessageRouter,
} from "@juspay/neurolink";

const wsManager = new WebSocketConnectionManager({ path: "/ws" });
const router = new WebSocketMessageRouter();

// Register message routes
router.route("generate", async (connection, payload) => {
  const { prompt, options } = payload as { prompt: string; options?: unknown };

  // Generate AI response
  const result = await neurolink.generate({ prompt, ...options });

  return { type: "response", content: result.content };
});

router.route("stream", async (connection, payload) => {
  const { prompt } = payload as { prompt: string };

  // Start streaming
  const socket = connection.socket as { send: (data: string) => void };

  for await (const chunk of neurolink.generateStream({ prompt })) {
    socket.send(JSON.stringify({ type: "chunk", content: chunk.content }));
  }

  return { type: "stream_complete" };
});

router.route("tool_call", async (connection, payload) => {
  const { toolName, args } = payload as { toolName: string; args: unknown };

  const result = await neurolink.executeTool(toolName, args);

  return { type: "tool_result", toolName, result };
});

// Register handler that uses router
wsManager.registerHandler("/ws", {
  onOpen: async (connection) => {
    const socket = connection.socket as { send: (data: string) => void };
    socket.send(
      JSON.stringify({
        type: "connected",
        connectionId: connection.id,
        timestamp: Date.now(),
      }),
    );
  },

  onMessage: async (connection, message) => {
    try {
      const result = await router.handle(connection, message);
      if (result) {
        const socket = connection.socket as { send: (data: string) => void };
        socket.send(JSON.stringify(result));
      }
    } catch (error) {
      const socket = connection.socket as { send: (data: string) => void };
      socket.send(
        JSON.stringify({
          type: "error",
          error: (error as Error).message,
        }),
      );
    }
  },
});

// List registered routes
console.log("Registered routes:", router.getRoutes());
// Output: ["generate", "stream", "tool_call"]
```

### Message Format

Messages should follow this JSON structure:

```json
{
  "type": "generate",
  "payload": {
    "prompt": "Hello, how are you?",
    "options": {
      "temperature": 0.7
    }
  }
}
```

---

## AI Agent WebSocket Handler

NeuroLink provides a pre-built handler for AI agent interactions:

```typescript
import {
  WebSocketConnectionManager,
  createAgentWebSocketHandler,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({ defaultProvider: "openai" });

const wsManager = new WebSocketConnectionManager({
  path: "/ws/agent",
  auth: {
    strategy: "bearer",
    required: true,
    validate: async (token) => verifyJWT(token),
  },
});

// Use the pre-built agent handler
wsManager.registerHandler("/ws/agent", createAgentWebSocketHandler(neurolink));

// Supported message types:
// - { type: "generate", payload: { prompt, options } }
// - { type: "stream", payload: { prompt, options } }
// - { type: "tool_call", payload: { toolName, args } }
```

### Client Usage

```javascript
// Node.js client (using 'ws' library)
// Note: Custom headers in the WebSocket constructor are only supported by
// Node.js WebSocket libraries. Browser WebSocket API does not support custom
// headers. For browser clients, use query parameters or send authentication
// in the first message after connection.
const ws = new WebSocket("ws://localhost:3000/ws/agent", [], {
  headers: { Authorization: `Bearer ${token}` },
});

// Browser alternative: use query parameter for auth token
// const ws = new WebSocket(`ws://localhost:3000/ws/agent?token=${token}`);

ws.onopen = () => {
  // Generate a response
  ws.send(
    JSON.stringify({
      type: "generate",
      payload: {
        prompt: "What is the capital of France?",
        options: { temperature: 0.5 },
      },
    }),
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "connected":
      console.log("Connected:", message.connectionId);
      break;
    case "response":
      console.log("Response:", message.data);
      break;
    case "stream_start":
      console.log("Stream starting...");
      break;
    case "chunk":
      process.stdout.write(message.content);
      break;
    case "stream_complete":
      console.log("\nStream complete");
      break;
    case "error":
      console.error("Error:", message.error);
      break;
  }
};
```

---

## Error Handling

### WebSocket Errors

NeuroLink provides typed errors for WebSocket operations:

```typescript
import { WebSocketError, WebSocketConnectionError } from "@juspay/neurolink";

wsManager.registerHandler("/ws", {
  onMessage: async (connection, message) => {
    try {
      // Process message
      await processMessage(message);
    } catch (error) {
      if (error instanceof WebSocketError) {
        console.error(`WebSocket error: ${error.message}`);
        console.error(`Connection ID: ${error.connectionId}`);
      }

      // Send error to client
      const socket = connection.socket as { send: (data: string) => void };
      socket.send(
        JSON.stringify({
          type: "error",
          error: error.message,
          code:
            error instanceof WebSocketError
              ? "WEBSOCKET_ERROR"
              : "UNKNOWN_ERROR",
        }),
      );
    }
  },

  onError: async (connection, error) => {
    console.error(`Connection ${connection.id} error: ${error.message}`);

    // Optionally close the connection
    await wsManager.close(connection.id, 1011, "Internal error");
  },
});
```

### Connection Limits

```typescript
const wsManager = new WebSocketConnectionManager({
  maxConnections: 100,
});

// When max connections reached, new connections will receive:
// WebSocketConnectionError: Maximum connections (100) reached
```

### Message Size Limits

```typescript
const wsManager = new WebSocketConnectionManager({
  maxMessageSize: 64 * 1024, // 64KB
});

// Messages exceeding the limit will throw:
// WebSocketError: Message exceeds max size (65536 bytes)
```

---

## Graceful Shutdown

Handle server shutdown gracefully to close all WebSocket connections:

```typescript
const wsManager = new WebSocketConnectionManager({ path: "/ws" });

// Handle shutdown signals
process.on("SIGTERM", async () => {
  console.log("Shutting down WebSocket connections...");

  // Close all connections with shutdown code
  await wsManager.closeAll(1001, "Server shutting down");

  // Then stop the server
  await server.stop();

  process.exit(0);
});

// Or close connections individually with custom messages
process.on("SIGTERM", async () => {
  const connections = wsManager.getAllConnections();

  for (const connection of connections) {
    const socket = connection.socket as { send: (data: string) => void };

    // Notify client before closing
    socket.send(
      JSON.stringify({
        type: "shutdown",
        message: "Server is shutting down. Please reconnect in a few minutes.",
      }),
    );

    // Give client time to receive message
    await new Promise((resolve) => setTimeout(resolve, 100));

    await wsManager.close(connection.id, 1001, "Server shutdown");
  }

  await server.stop();
  process.exit(0);
});
```

---

## Ping/Pong Keep-Alive

WebSocket connections include automatic ping/pong for connection health:

```typescript
const wsManager = new WebSocketConnectionManager({
  pingInterval: 30000, // Send ping every 30 seconds
  pongTimeout: 10000, // Close if no pong within 10 seconds
});

// Ping messages are sent automatically
// If native ping/pong is not available, uses JSON messages:
// { "type": "ping", "timestamp": 1706745600000 }

// Client should respond with:
// { "type": "pong", "timestamp": 1706745600000 }
```

### Disable Ping/Pong

```typescript
const wsManager = new WebSocketConnectionManager({
  pingInterval: 0, // Disable automatic pings
});
```

---

## Monitoring Connections

### Connection Statistics

```typescript
// Get connection count
const totalConnections = wsManager.getConnectionCount();
console.log(`Active connections: ${totalConnections}`);

// Get connections by user
const userConnections = wsManager.getConnectionsByUser(userId);
console.log(`User ${userId} has ${userConnections.length} connections`);

// Get connections by path
const agentConnections = wsManager.getConnectionsByPath("/ws/agent");
console.log(`Agent connections: ${agentConnections.length}`);

// Monitor connection details
const connections = wsManager.getAllConnections();
for (const conn of connections) {
  console.log({
    id: conn.id,
    userId: conn.user?.id,
    path: conn.metadata.path,
    connectedSince: new Date(conn.createdAt).toISOString(),
    lastActivity: new Date(conn.lastActivity).toISOString(),
  });
}
```

### Health Endpoint Integration

```typescript
// Add WebSocket stats to health endpoint
server.registerRoute({
  method: "GET",
  path: "/api/health/websocket",
  handler: async () => ({
    status: "ok",
    connections: {
      total: wsManager.getConnectionCount(),
      maxConnections: 1000,
      paths: {
        "/ws/agent": wsManager.getConnectionsByPath("/ws/agent").length,
        "/ws/notifications":
          wsManager.getConnectionsByPath("/ws/notifications").length,
      },
    },
  }),
  description: "WebSocket health status",
  tags: ["health"],
});
```

---

## Best Practices

### 1. Use Structured Messages

```typescript
// Define message types
type ClientMessage =
  | { type: "generate"; payload: { prompt: string } }
  | { type: "stream"; payload: { prompt: string } }
  | { type: "cancel"; payload: { requestId: string } };

type ServerMessage =
  | { type: "connected"; connectionId: string }
  | { type: "response"; content: string }
  | { type: "chunk"; content: string }
  | { type: "error"; error: string };
```

### 2. Implement Reconnection Logic (Client)

```javascript
function createWebSocket(url, options = {}) {
  let ws;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  function connect() {
    ws = new WebSocket(url, options);

    ws.onopen = () => {
      reconnectAttempts = 0;
      console.log("Connected");
    };

    ws.onclose = (event) => {
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1);
        console.log(`Reconnecting in ${delay}ms...`);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  connect();
  return { getSocket: () => ws };
}
```

### 3. Handle Connection Limits Per User

```typescript
const MAX_CONNECTIONS_PER_USER = 3;

wsManager.registerHandler("/ws", {
  onOpen: async (connection) => {
    if (connection.user) {
      const userConnections = wsManager.getConnectionsByUser(
        connection.user.id,
      );

      if (userConnections.length > MAX_CONNECTIONS_PER_USER) {
        const oldest = userConnections[0];
        await wsManager.close(oldest.id, 1008, "Connection limit exceeded");
      }
    }
  },
});
```

### 4. Use Connection Metadata

```typescript
wsManager.registerHandler("/ws", {
  onOpen: async (connection) => {
    // Store custom metadata
    connection.metadata.sessionId = generateSessionId();
    connection.metadata.subscriptions = [];
  },

  onMessage: async (connection, message) => {
    const data = JSON.parse(message.data as string);

    if (data.type === "subscribe") {
      (connection.metadata.subscriptions as string[]).push(data.channel);
    }
  },
});
```

---

## Production Checklist

- [ ] Configure authentication (`auth.strategy` and `auth.validate`)
- [ ] Set appropriate `maxConnections` limit
- [ ] Configure `maxMessageSize` for your use case
- [ ] Enable ping/pong with reasonable intervals
- [ ] Implement graceful shutdown handling
- [ ] Add connection monitoring and logging
- [ ] Set up health check endpoint with WebSocket stats
- [ ] Implement rate limiting per connection
- [ ] Handle reconnection logic on client side
- [ ] Test with expected concurrent connection load

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Security Best Practices](./security.md)** - Authentication patterns
- **[Hono Adapter](./hono.md)** - Using WebSocket with Hono
- **[Configuration Reference](../../reference/server-configuration.md)** - Full configuration options

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).
