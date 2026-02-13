/**
 * NeuroLink Server Deployment Template
 *
 * This template demonstrates how to deploy NeuroLink
 * as an HTTP API server using various frameworks.
 */

// Import NeuroLink when creating server instances
// import { NeuroLink } from "@juspay/neurolink";
// import { createServer } from "@juspay/neurolink/server";

// ============================================
// Basic Hono Server (Default)
// ============================================

async function honoServer(): Promise<void> {
  console.log("=== Hono Server ===\n");

  // Note: createServer is imported from @juspay/neurolink/server
  // This is a simplified example showing the pattern

  const serverConfig = {
    framework: "hono" as const,
    config: {
      port: 3000,
      cors: true,
      rateLimit: {
        windowMs: 60000, // 1 minute
        max: 100, // 100 requests per window
      },
    },
  };

  console.log("Server configuration:", serverConfig);
  console.log("Would start at: http://localhost:3000");

  // Actual usage:
  // import { createServer } from '@juspay/neurolink/server';
  // const server = await createServer(neurolink, serverConfig);
  // await server.start();
}

// ============================================
// Express Server
// ============================================

async function expressServer(): Promise<void> {
  console.log("\n=== Express Server ===\n");

  const serverConfig = {
    framework: "express" as const,
    config: {
      port: 3001,
      cors: {
        origin: ["http://localhost:3000", "https://myapp.com"],
        methods: ["GET", "POST"],
      },
      rateLimit: {
        windowMs: 60000,
        max: 50,
      },
    },
  };

  console.log("Express configuration:", serverConfig);

  // With existing Express app:
  // import express from 'express';
  // const app = express();
  // app.use('/custom', myMiddleware);
  // const server = await createServer(neurolink, {
  //   framework: 'express',
  //   app
  // });
}

// ============================================
// Fastify Server
// ============================================

async function fastifyServer(): Promise<void> {
  console.log("\n=== Fastify Server ===\n");

  const serverConfig = {
    framework: "fastify" as const,
    config: {
      port: 3002,
      host: "0.0.0.0", // Listen on all interfaces
      cors: true,
    },
  };

  console.log("Fastify configuration:", serverConfig);

  // With Fastify:
  // import Fastify from 'fastify';
  // const fastify = Fastify({ logger: true });
  // const server = await createServer(neurolink, {
  //   framework: 'fastify',
  //   app: fastify
  // });
  // await fastify.listen({ port: 3002, host: '0.0.0.0' });
}

// ============================================
// Available API Routes
// ============================================

function showRoutes(): void {
  console.log("\n=== Available API Routes ===\n");

  const routes = [
    { method: "POST", path: "/api/generate", description: "Text generation" },
    {
      method: "POST",
      path: "/api/stream",
      description: "Streaming generation",
    },
    { method: "GET", path: "/api/tools", description: "List available tools" },
    { method: "POST", path: "/api/tools/:name", description: "Execute a tool" },
    { method: "GET", path: "/api/providers", description: "Provider status" },
    { method: "GET", path: "/api/health", description: "Health check" },
    {
      method: "GET",
      path: "/api/conversations/:id",
      description: "Get conversation",
    },
    {
      method: "DELETE",
      path: "/api/conversations/:id",
      description: "Delete conversation",
    },
  ];

  for (const route of routes) {
    console.log(
      `${route.method.padEnd(7)} ${route.path.padEnd(30)} ${route.description}`,
    );
  }
}

// ============================================
// Request Examples
// ============================================

function showRequestExamples(): void {
  console.log("\n=== API Request Examples ===\n");

  // Generate
  console.log("POST /api/generate");
  console.log(
    JSON.stringify(
      {
        input: { text: "Explain quantum computing" },
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 500,
      },
      null,
      2,
    ),
  );

  // Stream
  console.log("\nPOST /api/stream");
  console.log(
    JSON.stringify(
      {
        input: { text: "Write a story" },
        temperature: 0.8,
      },
      null,
      2,
    ),
  );

  // With RAG
  console.log("\nPOST /api/generate (with RAG)");
  console.log(
    JSON.stringify(
      {
        prompt: "What features are available?",
        rag: {
          files: ["./docs/features.md"],
          strategy: "markdown",
          topK: 5,
        },
      },
      null,
      2,
    ),
  );

  // With tools
  console.log("\nPOST /api/generate (with tools)");
  console.log(
    JSON.stringify(
      {
        input: { text: "What time is it?" },
        tools: ["getCurrentTime"],
      },
      null,
      2,
    ),
  );
}

// ============================================
// Authentication Middleware
// ============================================

function showAuthExamples(): void {
  console.log("\n=== Authentication Examples ===\n");

  // JWT Auth
  console.log("JWT Authentication:");
  console.log(`
import { createServer, createAuthMiddleware } from '@juspay/neurolink';

const authMiddleware = createAuthMiddleware({
  type: 'jwt',
  secret: process.env.JWT_SECRET,
  issuer: 'my-app'
});

const server = await createServer(neurolink, {
  middleware: [authMiddleware],
  config: { port: 3000 }
});
`);

  // API Key Auth
  console.log("API Key Authentication:");
  console.log(`
const apiKeyAuth = createAuthMiddleware({
  type: 'api-key',
  headerName: 'X-API-Key',
  validator: async (key) => {
    return await validateApiKey(key);
  }
});
`);
}

// ============================================
// Docker Deployment
// ============================================

function showDockerfile(): void {
  console.log("\n=== Dockerfile Example ===\n");

  const dockerfile = `
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
`;

  console.log(dockerfile);

  console.log("docker-compose.yml:");
  const compose = `
version: '3.8'
services:
  neurolink-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
`;
  console.log(compose);
}

// ============================================
// CLI Server Commands
// ============================================

function showCLICommands(): void {
  console.log("\n=== CLI Server Commands ===\n");

  const commands = [
    {
      command: "neurolink serve",
      description: "Start default server (port 3000)",
    },
    { command: "neurolink serve --port 4000", description: "Custom port" },
    {
      command: "neurolink serve --framework express",
      description: "Use Express framework",
    },
    { command: "neurolink serve --cors", description: "Enable CORS" },
    {
      command: "neurolink serve --rate-limit",
      description: "Enable rate limiting",
    },
    {
      command: "neurolink serve --swagger",
      description: "Enable Swagger docs",
    },
    { command: "neurolink serve status", description: "Check server status" },
    { command: "neurolink serve stop", description: "Stop server" },
  ];

  for (const { command, description } of commands) {
    console.log(`${command.padEnd(40)} ${description}`);
  }
}

// ============================================
// Production Configuration
// ============================================

function showProductionConfig(): void {
  console.log("\n=== Production Configuration ===\n");

  const portValue = Number(process.env["PORT"]);
  const port = Number.isNaN(portValue) ? 3000 : portValue;

  const config = {
    server: {
      port,
      host: "0.0.0.0",
      cors: {
        origin: ["https://myapp.com"],
        credentials: true,
      },
      rateLimit: {
        windowMs: 60000,
        max: 100,
        keyGenerator: "ip", // or 'user' for authenticated
      },
      timeout: 120000,
    },
    neurolink: {
      conversationMemory: {
        enabled: true,
        redisConfig: {
          url: process.env["REDIS_URL"],
          tls: true,
        },
      },
      observability: {
        langfuse: {
          enabled: true,
          publicKey: process.env["LANGFUSE_PUBLIC_KEY"],
          secretKey: process.env["LANGFUSE_SECRET_KEY"],
        },
      },
    },
  };

  // Log only non-sensitive fields
  console.log(JSON.stringify({ server: config.server }, null, 2));
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  await honoServer();
  await expressServer();
  await fastifyServer();
  showRoutes();
  showRequestExamples();
  showAuthExamples();
  showDockerfile();
  showCLICommands();
  showProductionConfig();
}

main().catch(console.error);
