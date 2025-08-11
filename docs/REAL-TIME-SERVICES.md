# 🌐 Real-time Services Guide

**Enterprise WebSocket Infrastructure for NeuroLink**

## 📋 Overview

NeuroLink provides enterprise-grade real-time services with WebSocket infrastructure, enhanced chat capabilities, and streaming optimization. These features enable building professional AI applications with real-time bidirectional communication.

## 🚀 Key Features

- **🌐 WebSocket Infrastructure** - Professional-grade server with connection management
- **💬 Enhanced Chat Services** - Dual-mode SSE + WebSocket support
- **🏠 Room Management** - Group chat and broadcasting capabilities
- **📡 Streaming Channels** - Real-time AI response streaming
- **🔧 Performance Optimization** - Compression, buffering, and latency control
- **🛡️ Production Ready** - Connection pooling, heartbeat monitoring, error handling

---

## 🌐 WebSocket Infrastructure

### Basic WebSocket Server

```typescript
import { NeuroLinkWebSocketServer } from "@juspay/neurolink";

const wsServer = new NeuroLinkWebSocketServer({
  port: 8080,
  maxConnections: 1000,
  enableCompression: true,
  heartbeatInterval: 30000, // 30 seconds
});

// Handle connections
wsServer.on("connection", ({ connectionId, userAgent, remoteAddress }) => {
  console.log(`New connection: ${connectionId} from ${remoteAddress}`);

  // Join default room
  wsServer.joinRoom(connectionId, "general");
});

// Handle disconnections
wsServer.on("disconnect", ({ connectionId, reason }) => {
  console.log(`Connection ${connectionId} disconnected: ${reason}`);
});

// Start server
await wsServer.start();
console.log("WebSocket server running on port 8080");
```

### Connection Management

```typescript
// Advanced connection handling
wsServer.on("connection", ({ connectionId, userAgent, headers }) => {
  // Authenticate connection
  const token = headers["authorization"];
  if (!validateToken(token)) {
    wsServer.closeConnection(connectionId, "Authentication failed");
    return;
  }

  // Store connection metadata
  wsServer.setConnectionData(connectionId, {
    userId: extractUserId(token),
    joinedAt: new Date(),
    permissions: getUserPermissions(token),
  });

  // Send welcome message
  wsServer.sendMessage(connectionId, {
    type: "welcome",
    data: { message: "Connected to NeuroLink AI" },
  });
});

// Monitor connection health
wsServer.on("heartbeat", ({ connectionId, latency }) => {
  if (latency > 5000) {
    // 5 seconds
    console.warn(`High latency detected: ${connectionId} (${latency}ms)`);
  }
});
```

---

## 🏠 Room Management

### Creating and Managing Rooms

```typescript
// Join users to rooms
wsServer.joinRoom(connectionId, "ai-support-room");
wsServer.joinRoom(connectionId, "project-alpha");

// Leave rooms
wsServer.leaveRoom(connectionId, "general");

// Get room information
const roomInfo = wsServer.getRoomInfo("ai-support-room");
console.log(`Room has ${roomInfo.memberCount} members`);

// List all rooms for a connection
const userRooms = wsServer.getUserRooms(connectionId);
console.log("User is in rooms:", userRooms);
```

### Broadcasting to Rooms

```typescript
// Broadcast AI responses to room
wsServer.broadcastToRoom("ai-support-room", {
  type: "ai-response",
  data: {
    text: "How can I help you today?",
    timestamp: new Date().toISOString(),
    provider: "openai",
  },
});

// Broadcast to multiple rooms
wsServer.broadcastToRooms(["room1", "room2"], {
  type: "announcement",
  data: { message: "System maintenance in 10 minutes" },
});

// Broadcast to all connections
wsServer.broadcast({
  type: "global-message",
  data: { message: "Welcome to NeuroLink AI" },
});
```

---

## 📡 Streaming Channels

### Creating Streaming Channels

```typescript
// Create streaming channel for AI responses
const channel = wsServer.createStreamingChannel(connectionId, "ai-stream");

// Configure channel options
channel.setOptions({
  bufferSize: 4096,
  compressionEnabled: true,
  maxChunkSize: 1024,
});

// Handle streaming data
channel.onData = (chunk) => {
  console.log("Received chunk:", chunk);
};

channel.onComplete = () => {
  console.log("Streaming complete");
};

channel.onError = (error) => {
  console.error("Streaming error:", error);
};
```

### AI Response Streaming

```typescript
import { createBestAIProvider } from "@juspay/neurolink";

// Handle chat messages with streaming
wsServer.on("chat-message", async ({ connectionId, message }) => {
  const channel = wsServer.createStreamingChannel(
    connectionId,
    `chat-${Date.now()}`,
  );
  const provider = await createBestAIProvider();

  try {
    // Start streaming AI response (NEW: Primary method)
    const result = await provider.stream({
      input: { text: message.data.prompt },
      temperature: 0.7,
    });

    // Stream chunks to client
    for await (const chunk of result.stream) {
      channel.send({
        type: "text-chunk",
        data: { chunk: chunk.content, provider: result.provider },
      });
    }

    // Signal completion
    channel.complete({
      type: "stream-complete",
      data: {
        provider: result.provider,
        model: result.model,
        totalChunks: channel.getChunkCount(),
      },
    });
  } catch (error) {
    channel.error({
      type: "stream-error",
      data: { error: error.message },
    });
  }
});
```

---

## 💬 Enhanced Chat Services

### Dual-Mode Chat (SSE + WebSocket)

```typescript
import {
  createEnhancedChatService,
  createBestAIProvider,
} from "@juspay/neurolink";

const provider = await createBestAIProvider();
const chatService = createEnhancedChatService({
  provider,
  enableSSE: true, // Server-Sent Events for simple streaming
  enableWebSocket: true, // WebSocket for real-time bidirectional
  streamingConfig: {
    bufferSize: 8192,
    compressionEnabled: true,
    latencyTarget: 100, // Target 100ms latency
  },
});

// Handle streaming responses
await chatService.streamChat({
  prompt: "Generate a story about AI and humanity",
  onChunk: (chunk) => {
    console.log("Chunk:", chunk);
    // Send to WebSocket clients
    wsServer.broadcast({
      type: "story-chunk",
      data: { chunk },
    });
  },
  onComplete: (result) => {
    console.log("Story complete:", result.text);
    wsServer.broadcast({
      type: "story-complete",
      data: result,
    });
  },
  onError: (error) => {
    console.error("Story generation error:", error);
    wsServer.broadcast({
      type: "story-error",
      data: { error: error.message },
    });
  },
});
```

### Chat Session Management

```typescript
// Create persistent chat sessions
const sessionId = "user-123-session";
const chatSession = chatService.createSession(sessionId, {
  maxHistory: 50, // Keep last 50 messages
  persistToDisk: true,
  sessionTimeout: 3600000, // 1 hour timeout
});

// Add message to session history
chatSession.addMessage({
  role: "user",
  content: "Hello, AI!",
  timestamp: new Date(),
});

// Generate response with session context
const response = await chatSession.generateResponse({
  temperature: 0.7,
  maxTokens: 500,
});

// Session automatically maintains conversation history
console.log("Session history:", chatSession.getHistory());
console.log("Token usage:", chatSession.getTokenUsage());
```

---

## 🔧 Performance Optimization

### Connection Pooling

```typescript
const wsServer = new NeuroLinkWebSocketServer({
  port: 8080,
  maxConnections: 5000,

  // Connection pooling
  connectionPool: {
    enabled: true,
    maxIdleTime: 300000, // 5 minutes
    cleanupInterval: 60000, // 1 minute
  },

  // Performance tuning
  performance: {
    enableCompression: true,
    compressionLevel: 6, // 1-9, 6 is balanced
    maxPayloadSize: 16777216, // 16MB
    pingInterval: 30000, // 30 seconds
    pongTimeout: 5000, // 5 seconds
  },
});
```

### Load Balancing

```typescript
// Multiple server instances with load balancing
const servers = [];
const ports = [8080, 8081, 8082];

for (const port of ports) {
  const server = new NeuroLinkWebSocketServer({ port });

  // Shared Redis for cross-server communication
  server.setMessageBroker({
    type: "redis",
    url: "redis://localhost:6379",
    prefix: "neurolink:ws",
  });

  servers.push(server);
  await server.start();
}

console.log(`Started ${servers.length} WebSocket servers`);
```

### Streaming Optimization

```typescript
// Configure optimal streaming for different use cases
const streamingConfigs = {
  // Low latency for chat
  chat: {
    bufferSize: 1024,
    compressionEnabled: false, // Disable for speed
    latencyTarget: 50,
  },

  // High throughput for content generation
  content: {
    bufferSize: 16384,
    compressionEnabled: true,
    latencyTarget: 200,
  },

  // Balanced for general use
  general: {
    bufferSize: 4096,
    compressionEnabled: true,
    latencyTarget: 100,
  },
};

// Apply configuration based on use case
const chatService = createEnhancedChatService({
  provider: await createBestAIProvider(),
  enableWebSocket: true,
  streamingConfig: streamingConfigs.chat, // Use chat optimization
});
```

---

## 🛡️ Production Deployment

### Docker Configuration

```dockerfile
# Dockerfile for WebSocket service
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# WebSocket port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "dist/server.js"]
```

### Docker Compose with Redis

```yaml
# docker-compose.yml
version: "3.8"
services:
  neurolink-ws:
    build: .
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - neurolink-ws

volumes:
  redis_data:
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurolink-websocket
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neurolink-websocket
  template:
    metadata:
      labels:
        app: neurolink-websocket
    spec:
      containers:
        - name: websocket
          image: neurolink/websocket:latest
          ports:
            - containerPort: 8080
          env:
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: neurolink-config
                  key: redis-url
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: neurolink-secrets
                  key: openai-api-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: neurolink-websocket-service
spec:
  selector:
    app: neurolink-websocket
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

---

## 📊 Monitoring and Health Checks

### Built-in Metrics

```typescript
// Enable metrics collection
wsServer.enableMetrics({
  collectConnectionStats: true,
  collectMessageStats: true,
  collectPerformanceStats: true,
  exportPrometheus: true,
  metricsEndpoint: "/metrics",
});

// Get real-time statistics
const stats = wsServer.getStats();
console.log("Active connections:", stats.activeConnections);
console.log("Messages per second:", stats.messagesPerSecond);
console.log("Average latency:", stats.averageLatency);
console.log("Memory usage:", stats.memoryUsage);
```

### Health Check Endpoint

```typescript
// Health check implementation
wsServer.addHealthCheck("aiProviders", async () => {
  try {
    const provider = await createBestAIProvider();
    await provider.generate({ input: { text: "test" }, maxTokens: 1 });
    return { status: "healthy", message: "AI providers operational" };
  } catch (error) {
    return { status: "unhealthy", message: error.message };
  }
});

wsServer.addHealthCheck("redis", async () => {
  try {
    await redis.ping();
    return { status: "healthy", message: "Redis connection active" };
  } catch (error) {
    return { status: "unhealthy", message: "Redis connection failed" };
  }
});

// Health endpoint available at /health
```

---

## 🚀 Getting Started

### Quick Setup

```bash
# Install NeuroLink with real-time features
npm install @juspay/neurolink

# Set up environment
echo "OPENAI_API_KEY=your-key" > .env
echo "REDIS_URL=redis://localhost:6379" >> .env

# Start Redis (if not already running)
docker run -d -p 6379:6379 redis:alpine
```

### Minimal Server Example

```typescript
// server.js
import {
  NeuroLinkWebSocketServer,
  createEnhancedChatService,
  createBestAIProvider,
} from "@juspay/neurolink";

async function startServer() {
  // Initialize WebSocket server
  const wsServer = new NeuroLinkWebSocketServer({ port: 8080 });

  // Initialize enhanced chat
  const provider = await createBestAIProvider();
  const chatService = createEnhancedChatService({
    provider,
    enableWebSocket: true,
  });

  // Handle chat messages
  wsServer.on("chat-message", async ({ connectionId, message }) => {
    await chatService.streamChat({
      prompt: message.data.prompt,
      onChunk: (chunk) => {
        wsServer.sendMessage(connectionId, {
          type: "ai-chunk",
          data: { chunk },
        });
      },
      onComplete: (result) => {
        wsServer.sendMessage(connectionId, {
          type: "ai-complete",
          data: result,
        });
      },
    });
  });

  // Start server
  await wsServer.start();
  console.log("🚀 NeuroLink WebSocket server running on port 8080");
}

startServer().catch(console.error);
```

```bash
# Run the server
node server.js
```

### Client Example

```html
<!-- client.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>NeuroLink Real-time Chat</title>
  </head>
  <body>
    <div id="chat"></div>
    <input id="message" type="text" placeholder="Type your message..." />
    <button onclick="sendMessage()">Send</button>

    <script>
      const ws = new WebSocket("ws://localhost:8080");
      const chat = document.getElementById("chat");
      const messageInput = document.getElementById("message");

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "ai-chunk") {
          appendToChat(data.data.chunk, false);
        } else if (data.type === "ai-complete") {
          appendToChat("\n\n", false);
        }
      };

      function sendMessage() {
        const message = messageInput.value;
        if (message) {
          appendToChat(`You: ${message}\n`, true);

          ws.send(
            JSON.stringify({
              type: "chat-message",
              data: { prompt: message },
            }),
          );

          messageInput.value = "";
          appendToChat("AI: ", true);
        }
      }

      function appendToChat(text, isNewLine) {
        if (isNewLine) {
          chat.innerHTML += text;
        } else {
          chat.innerHTML += text;
        }
        chat.scrollTop = chat.scrollHeight;
      }

      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
      });
    </script>
  </body>
</html>
```

---

## 📚 Additional Resources

- **[API Reference](./API-REFERENCE.md)** - Complete TypeScript API
- **[Telemetry Guide](./TELEMETRY-GUIDE.md)** - Enterprise monitoring setup
- **[Performance Optimization](./PERFORMANCE-OPTIMIZATION.md)** - Optimization strategies
- **[Examples Repository](examples/index.md)** - Working example applications

**Ready to build enterprise-grade real-time AI applications with NeuroLink! 🚀**
