---
title: "Client SDK"
description: Type-safe HTTP, SSE, and WebSocket client libraries for JavaScript and TypeScript applications, with React hooks and Vercel AI SDK compatibility
sidebar_position: 37
keywords:
  [
    client-sdk,
    http-client,
    react-hooks,
    sse,
    websocket,
    streaming,
    vercel-ai-sdk,
    authentication,
    interceptors,
  ]
---

# Client SDK

> **Since**: v9.30.0 | **Status**: Stable | **Availability**: SDK

## Overview

The NeuroLink Client SDK provides type-safe libraries for accessing NeuroLink APIs from JavaScript and TypeScript applications. It is designed for frontend apps, backend services, and full-stack frameworks alike.

**Key capabilities:**

- **HTTP Client** -- Type-safe request/response with automatic retries, middleware, and request cancellation
- **Streaming** -- Real-time token streaming via Server-Sent Events (SSE) and WebSocket transports
- **React Integration** -- Ready-made hooks (`useChat`, `useAgent`, `useWorkflow`, `useVoice`, `useStream`, `useTools`) with a context provider
- **Vercel AI SDK Compatibility** -- Drop-in `LanguageModelV1` adapter for `generateText` and `streamText`
- **Authentication** -- API key, Bearer token, OAuth2 client-credentials, and JWT token management
- **Interceptors & Middleware** -- Composable middleware for logging, retry, rate limiting, caching, and error handling

## Quick Start

```typescript
import { createClient } from "@juspay/neurolink/client";

const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
});

// Generate text
const result = await client.generate({
  input: { text: "Explain TCP in two sentences" },
  provider: "openai",
  model: "gpt-4o",
});

console.log(result.data.content);

// Stream text
await client.stream(
  {
    input: { text: "Tell me a story" },
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  },
  {
    onText: (text) => process.stdout.write(text),
    onDone: (res) => console.log("\nTokens:", res.usage),
  },
);
```

## HTTP Client

### `createClient(config)`

Creates a `NeuroLinkClient` instance. This is the primary entry point for all API interactions.

### ClientConfig

| Field     | Type                     | Required | Description                                                 |
| --------- | ------------------------ | -------- | ----------------------------------------------------------- |
| `baseUrl` | `string`                 | Yes      | Base URL for the NeuroLink API                              |
| `apiKey`  | `string`                 | No       | API key sent in `X-API-Key` header                          |
| `token`   | `string`                 | No       | Bearer token sent in `Authorization` header                 |
| `timeout` | `number`                 | No       | Default request timeout in ms (default: 30000)              |
| `headers` | `Record<string, string>` | No       | Default headers included in every request                   |
| `retry`   | `RetryConfig`            | No       | Retry configuration for failed requests                     |
| `debug`   | `boolean`                | No       | Enable debug logging                                        |
| `fetch`   | `typeof fetch`           | No       | Custom fetch implementation for non-browser environments    |
| `wsUrl`   | `string`                 | No       | WebSocket URL override (defaults to ws/wss version of base) |

### Making Requests

The client exposes typed methods for each API surface -- `generate`, `stream`, `executeAgent`, `streamAgent`, `executeWorkflow`, `listTools`, `listProviders`, `listAgents`, and more:

```typescript
// Text generation
const gen = await client.generate({
  input: { text: "Write a haiku about coding" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
});
console.log(gen.data.content);

// Agent execution
const agent = await client.executeAgent({
  agentId: "customer-support",
  input: "I need help with my order",
  sessionId: "user-123",
});

// List tools, providers, agents
const tools = await client.listTools({ category: "data" });
const providers = await client.listProviders();
```

Every response is wrapped in `ApiResponse<T>`:

| Field       | Type                     | Description                   |
| ----------- | ------------------------ | ----------------------------- |
| `data`      | `T`                      | Response payload              |
| `status`    | `number`                 | HTTP status code              |
| `headers`   | `Record<string, string>` | Response headers              |
| `duration`  | `number`                 | Request duration in ms        |
| `requestId` | `string`                 | Unique request ID for tracing |

### Middleware

Add middleware with `client.use()`. Middleware functions receive the request and a `next()` callback:

```typescript
client.use(async (request, next) => {
  console.log("Request:", request.method, request.url);
  const response = await next();
  console.log("Response:", response.status);
  return response;
});
```

Middleware executes in registration order. Call `client.clearMiddleware()` to remove all middleware.

---

## Streaming

The Client SDK provides three streaming approaches: callback-based streaming on the HTTP client, a dedicated SSE client, and a dedicated WebSocket client.

### Callback-Based Streaming (HTTP Client)

The simplest approach. Use `client.stream()` with `StreamCallbacks`. Available callbacks: `onText`, `onToolCall`, `onToolResult`, `onError`, `onDone`, `onMetadata`, `onAudio`, `onThinking`.

```typescript
await client.stream(
  { input: { text: "Explain quantum computing" }, provider: "openai" },
  {
    onText: (text) => process.stdout.write(text),
    onToolCall: (toolCall) => console.log("Tool:", toolCall),
    onError: (error) => console.error("Error:", error),
    onDone: (result) => console.log("\nUsage:", result.usage),
  },
);
```

### SSE Client

For long-lived SSE connections with automatic reconnection:

```typescript
import { createSSEClient } from "@juspay/neurolink/client";

const sse = createSSEClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
});

// Connect with event handlers
sse.connect("/api/agent/stream", {
  onOpen: () => console.log("SSE connected"),
  onEvent: (event) => {
    if (event.type === "text") {
      process.stdout.write(event.content ?? "");
    }
  },
  onClose: () => console.log("SSE disconnected"),
  onReconnect: (attempt) => console.log(`Reconnecting (attempt ${attempt})`),
});
```

### WebSocket Client

For bidirectional real-time communication:

```typescript
import { createWebSocketClient } from "@juspay/neurolink/client";

const ws = createWebSocketClient({
  baseUrl: "wss://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
  autoReconnect: true,
  heartbeatInterval: 30000,
});

ws.connect({
  onOpen: () => console.log("WebSocket connected"),
  onMessage: (event) => {
    if (event.type === "text") process.stdout.write(event.content ?? "");
  },
  onClose: (code, reason) => console.log(`Closed: ${code} ${reason}`),
});

ws.send({ type: "message", payload: { text: "Hello" } });
ws.disconnect();
```

### Streaming Utilities

The SDK also exports `createStreamingClient` (factory that picks SSE or WebSocket from config), `createAsyncStream` (converts callbacks to `AsyncIterable`), and `collectStream` (accumulates a stream into a single string).

---

## React Integration

The React integration provides hooks and a context provider. Requires React 18+ as a peer dependency.

### NeuroLinkProvider

Wrap your application to make the client available to all hooks:

```tsx
import { NeuroLinkProvider } from "@juspay/neurolink/client";

function App() {
  return (
    <NeuroLinkProvider
      config={{
        baseUrl: "https://api.neurolink.example.com",
        apiKey: process.env.NEUROLINK_API_KEY,
      }}
    >
      <YourApp />
    </NeuroLinkProvider>
  );
}
```

### useChat

Build chat interfaces with streaming, message history, and tool call support:

```tsx
import { useChat } from "@juspay/neurolink/client";

function ChatComponent() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    setMessages,
  } = useChat({
    agentId: "my-agent",
    sessionId: "user-session-1",
    onFinish: (message) => console.log("Done:", message.content),
    onError: (err) => console.error(err),
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button disabled={isLoading}>Send</button>
      </form>
      {isLoading && <button onClick={stop}>Stop</button>}
    </div>
  );
}
```

### useAgent

Execute agents with session continuity:

```tsx
import { useAgent } from "@juspay/neurolink/client";

function AgentPanel() {
  const { execute, stream, isLoading, isStreaming, result, error, abort } =
    useAgent({
      agentId: "customer-support",
      onResponse: (result) => console.log("Agent replied:", result.content),
      onToolCall: (toolCall) => console.log("Tool used:", toolCall),
    });

  return (
    <div>
      <button onClick={() => execute("Help me with my order")}>
        Ask Agent
      </button>
      {isLoading && <span>Thinking...</span>}
      {result && <p>{result.content}</p>}
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

### Additional Hooks

| Hook          | Purpose                                    | Key Returns                                            |
| ------------- | ------------------------------------------ | ------------------------------------------------------ |
| `useWorkflow` | Execute and monitor workflow runs          | `execute`, `resume`, `cancel`, `status`, `result`      |
| `useVoice`    | Voice input/output with speech recognition | `startListening`, `speak`, `transcript`, `isListening` |
| `useStream`   | Low-level streaming control                | `start`, `stop`, `text`, `events`, `isStreaming`       |
| `useTools`    | Browse and execute tools                   | `tools`, `execute`, `refresh`, `isLoading`             |

---

## Vercel AI SDK Compatibility

The AI SDK adapter implements `LanguageModelV1`, allowing NeuroLink to work as a drop-in provider with `generateText`, `streamText`, and other AI SDK functions.

### createNeuroLinkProvider

```typescript
import { createNeuroLinkProvider } from "@juspay/neurolink/client";
import { generateText, streamText } from "ai";

const neurolink = createNeuroLinkProvider({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
});

// Non-streaming generation
const result = await generateText({
  model: neurolink("gpt-4o"),
  prompt: "Explain recursion in one sentence",
});
console.log(result.text);

// Streaming generation
const stream = await streamText({
  model: neurolink("claude-sonnet-4-6"),
  prompt: "Write a short poem about TypeScript",
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

The provider automatically infers the upstream AI provider from the model ID (e.g., `gpt-4o` maps to OpenAI, `claude-sonnet-4-6` to Anthropic, `gemini-3-flash-preview` to Google AI).

### createNeuroLinkModel

For a single pre-configured model without creating a full provider:

```typescript
import { createNeuroLinkModel } from "@juspay/neurolink/client";
import { generateText } from "ai";

const model = createNeuroLinkModel({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
  modelId: "gpt-4o",
  provider: "openai",
});

const result = await generateText({ model, prompt: "Hello!" });
```

### Server-Side Streaming Response

Use `createStreamingResponse` in Next.js API routes or server actions to return an AI SDK-compatible SSE stream:

```typescript
import { createStreamingResponse } from "@juspay/neurolink/client";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  return createStreamingResponse({
    baseUrl: process.env.NEUROLINK_URL!,
    apiKey: process.env.NEUROLINK_API_KEY!,
    input: { text: prompt },
    provider: "openai",
    model: "gpt-4o",
  });
}
```

---

## Authentication

The Client SDK supports multiple authentication strategies, from simple API keys to automatic OAuth2 token refresh.

### API Key

The simplest approach -- pass the key in the client config:

```typescript
const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: process.env.NEUROLINK_API_KEY,
});
```

Or use the middleware for more control:

```typescript
import { createClient, createApiKeyMiddleware } from "@juspay/neurolink/client";

const client = createClient({ baseUrl: "https://api.neurolink.example.com" });
client.use(createApiKeyMiddleware("your-api-key", "X-Custom-Key"));
```

### Bearer Token

```typescript
import {
  createClient,
  createBearerTokenMiddleware,
} from "@juspay/neurolink/client";

const client = createClient({ baseUrl: "https://api.neurolink.example.com" });
client.use(createBearerTokenMiddleware(sessionToken));
```

### OAuth2 Client Credentials

`OAuth2TokenManager` handles token acquisition, caching, and automatic refresh:

```typescript
import {
  createClient,
  OAuth2TokenManager,
  createTokenManagerMiddleware,
} from "@juspay/neurolink/client";

const tokenManager = new OAuth2TokenManager({
  tokenUrl: "https://auth.example.com/oauth/token",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  scope: "api:read api:write",
});

const client = createClient({ baseUrl: "https://api.neurolink.example.com" });
client.use(createTokenManagerMiddleware(tokenManager));
```

For automatic retry on 401 with token refresh:

```typescript
import { createAuthWithRetryMiddleware } from "@juspay/neurolink/client";

client.use(createAuthWithRetryMiddleware(tokenManager));
```

### JWT Token Management

`JWTTokenManager` manages JWT lifecycle with a custom refresh function:

```typescript
import {
  JWTTokenManager,
  createTokenManagerMiddleware,
} from "@juspay/neurolink/client";

const tokenManager = new JWTTokenManager({
  token: initialJWT,
  expiresAt: Date.now() + 3600000,
  refreshFn: async () => {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    return {
      accessToken: data.token,
      expiresIn: data.expiresIn,
      tokenType: "Bearer",
    };
  },
});

client.use(createTokenManagerMiddleware(tokenManager));
```

The SDK also exports JWT helpers: `decodeJWTPayload`, `isJWTExpired`, `getJWTExpiry`, and `getApiKeyFromEnv`.

---

## Interceptors & Middleware

Interceptors are middleware functions you register with `client.use()`. The SDK ships several built-in interceptors and a composition utility.

### Built-in Interceptors

| Interceptor                          | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `createLoggingInterceptor`           | Request/response logging with redaction |
| `createRetryInterceptor`             | Exponential backoff retry               |
| `createRateLimitInterceptor`         | Token-bucket rate limiting              |
| `createCacheInterceptor`             | In-memory response caching              |
| `createTimeoutInterceptor`           | Per-request timeout enforcement         |
| `createErrorHandlerInterceptor`      | Centralized error handling/reporting    |
| `createRequestTransformInterceptor`  | Modify requests before sending          |
| `createResponseTransformInterceptor` | Modify responses before returning       |

### composeMiddleware

Combine multiple middleware into a single unit:

```typescript
import {
  composeMiddleware,
  createLoggingInterceptor,
  createRetryInterceptor,
  createRateLimitInterceptor,
} from "@juspay/neurolink/client";

client.use(
  composeMiddleware(
    createLoggingInterceptor({ logRequest: true, logResponse: true }),
    createRetryInterceptor({
      maxAttempts: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
    }),
    createRateLimitInterceptor({
      maxRequests: 100,
      windowMs: 60000,
      strategy: "queue",
    }),
  ),
);
```

### conditionalMiddleware

Apply middleware only when a condition is met:

```typescript
import {
  conditionalMiddleware,
  createLoggingInterceptor,
} from "@juspay/neurolink/client";

client.use(
  conditionalMiddleware(
    (request) => request.url.includes("/api/agents"),
    createLoggingInterceptor({ logBody: true }),
  ),
);
```

---

## Error Handling

The Client SDK provides a structured error hierarchy rooted in `NeuroLinkError`. Every error carries a `code`, optional `status`, and `retryable` flag.

### Error Hierarchy

| Class                 | Code                      | Typical Cause                     |
| --------------------- | ------------------------- | --------------------------------- |
| `NeuroLinkError`      | varies                    | Base class for all SDK errors     |
| `HttpError`           | mapped from status        | HTTP 4xx/5xx responses            |
| `RateLimitError`      | `RATE_LIMITED`            | 429 Too Many Requests             |
| `ValidationError`     | `VALIDATION_ERROR`        | 400 with validation details       |
| `AuthenticationError` | `UNAUTHORIZED`            | 401 invalid credentials           |
| `AuthorizationError`  | `FORBIDDEN`               | 403 insufficient permissions      |
| `NotFoundError`       | `NOT_FOUND`               | 404 resource not found            |
| `NetworkError`        | `NETWORK_ERROR`           | Connection failures               |
| `TimeoutError`        | `TIMEOUT`                 | Request exceeded timeout          |
| `ConnectionError`     | `CONNECTION_REFUSED`      | Server unreachable                |
| `AbortError`          | `ABORT_ERROR`             | Request cancelled via signal      |
| `ConfigurationError`  | `CONFIGURATION_ERROR`     | Invalid client configuration      |
| `StreamError`         | `STREAM_ERROR`            | Stream processing failure         |
| `ProviderError`       | `PROVIDER_ERROR`          | Upstream AI provider error        |
| `ContextLengthError`  | `CONTEXT_LENGTH_EXCEEDED` | Input exceeds model context       |
| `ContentFilterError`  | `CONTENT_FILTERED`        | Response blocked by safety filter |

### Error Handling Pattern

```typescript
import { isRetryableError, isNeuroLinkError } from "@juspay/neurolink/client";

try {
  const result = await client.generate({
    input: { text: "Hello" },
    provider: "openai",
  });
  console.log(result.data.content);
} catch (error) {
  if (isNeuroLinkError(error)) {
    console.error(
      `[${error.code}] ${error.message} (retryable: ${error.retryable})`,
    );

    if (isRetryableError(error)) {
      // Safe to retry this request
    }
  }
}
```

### Utility Functions

| Function                  | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `isRetryableError(error)` | Returns `true` if the error is safe to retry        |
| `isNeuroLinkError(error)` | Type guard for `NeuroLinkError` instances           |
| `isApiError(error)`       | Type guard for `ApiError` objects                   |
| `mapStatusToErrorCode(s)` | Maps HTTP status to `ErrorCode` constant            |
| `createErrorFromResponse` | Creates typed error from an API error response      |
| `createErrorFromNative`   | Wraps a native `Error` in the appropriate SDK class |

---

## Best Practices

1. **Reuse client instances** -- create one `NeuroLinkClient` and share it; the client manages middleware state internally.
2. **Set reasonable timeouts** -- the default is 30 s; streaming and agent tasks may need higher values via `RequestOptions`.
3. **Compose middleware** -- use `composeMiddleware` instead of many individual `client.use()` calls for clarity.
4. **Use `createNeuroLinkProvider` for AI SDK projects** -- it auto-infers providers from model IDs.
5. **Handle errors at the right level** -- `createErrorHandlerInterceptor` for telemetry, `try/catch` for business logic.
6. **Leverage `isRetryableError`** -- check before implementing custom retry logic.
7. **Scope React providers** -- place `<NeuroLinkProvider>` at the highest needed point, but below your auth boundary.
8. **Use `AbortSignal` for cancellation** -- pass `AbortController.signal` via `RequestOptions` and clean up on unmount.
9. **Cache read-heavy endpoints** -- `createCacheInterceptor` works well for `listTools` and `listProviders`.
10. **Protect secrets in the browser** -- never embed raw API keys client-side; use a proxy or `OAuth2TokenManager`.

---

## See Also

- [Streaming Guide](streaming.md) -- Server-side streaming with the NeuroLink SDK
- [Server Adapters](../guides/server-adapters/index.md) -- Expose NeuroLink as HTTP APIs
- [MCP Integration](../advanced/mcp-integration.md) -- Tool orchestration
- [Getting Started](../getting-started/index.md) -- Installation and setup
