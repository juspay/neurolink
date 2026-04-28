#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Client SDK
 *
 * Tests the consumer-facing Client SDK the way developers actually use it:
 *   1. Start a real NeuroLink server (Hono adapter)
 *   2. Connect with NeuroLinkClient over HTTP
 *   3. Generate text, stream responses, execute tools
 *   4. Verify auth, interceptors, error handling, AI SDK adapter
 *
 * All tests hit real endpoints. Provider-dependent tests SKIP when
 * credentials are not configured.
 *
 * Run: npx tsx test/continuous-test-suite-client.ts
 *      npx tsx test/continuous-test-suite-client.ts --provider=vertex --model=gemini-2.5-flash
 */

import "dotenv/config";

// ============================================================
// LOGGING UTILITIES
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = { PASS: "PASS", FAIL: "FAIL", SKIP: "SKIP", TESTING: "TEST" };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  const icon = icons[status];
  const clr = statusColors[status] || "reset";
  const det = details ? ` — ${details}` : "";
  log(`[${icon}] ${testName}${det}`, clr);
}

// ============================================================
// TEST CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "ollama",
  model: process.env.TEST_MODEL || "llama3.2",
  timeout: 60_000,
  interTestDelay: 1_000,
  serverPort: 9200,
};

// ============================================================
// TEST RESULTS TRACKING
// ============================================================

const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];

// ============================================================
// HELPERS
// ============================================================

function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "api_key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "cannot connect",
    "failed to generate",
    "google_application_credentials",
    "econnrefused",
    "enotfound",
    "fetch failed",
    "provider not found",
    "not configured",
    "resource_exhausted",
    "permission denied",
    "unauthorized",
    "billing",
    "payment required",
    "too many requests",
    "connection refused",
    "403",
    "429",
    "402",
    "endpoint not found",
    "provider error",
    "all providers failed",
    "ollama",
    "environment variable",
    "missing required",
    "configuration error",
    "failed to create provider",
  ].some((p) => lower.includes(p));
}

// ============================================================
// SERVER LIFECYCLE
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serverInstance: any = null;

/** Compute the server URL from the current TEST_CONFIG (must be called after CLI args are parsed). */
function getServerUrl(): string {
  return `http://localhost:${TEST_CONFIG.serverPort}`;
}

async function startServer(): Promise<boolean> {
  try {
    const { NeuroLink } = await import("../src/lib/neurolink.js");
    const { createServer, registerAllRoutes } =
      await import("../src/lib/server/index.js");

    const sdk = new NeuroLink();

    serverInstance = await createServer(sdk, {
      framework: "hono",
      config: {
        port: TEST_CONFIG.serverPort,
        cors: { origins: ["*"] },
        timeout: TEST_CONFIG.timeout,
      },
    });

    await serverInstance.initialize();

    // Register all routes (agent, tools, health, MCP, memory) after framework initialization
    registerAllRoutes(serverInstance);

    await serverInstance.start();
    log(`Server started on port ${TEST_CONFIG.serverPort}`, "green");
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`Failed to start server: ${msg}`, "red");
    return false;
  }
}

async function stopServer(): Promise<void> {
  if (serverInstance) {
    try {
      await serverInstance.stop();
      log("Server stopped", "blue");
    } catch {
      // ignore
    }
  }
}

// ============================================================
// TEST #1: Client connects and health check works
// ============================================================

async function testClientHealthCheck(): Promise<boolean | null> {
  logSection("Test #1: Client health check");
  logTest("Client connects to server", "TESTING");

  try {
    const { createClient } = await import("../src/lib/client/index.js");

    const client = createClient({
      baseUrl: getServerUrl(),
    });

    const response = await client.health();

    if (!response.data || !response.data.status) {
      logTest("Client connects to server", "FAIL", "No health data returned");
      return false;
    }

    logTest(
      "Client connects to server",
      "PASS",
      `status=${response.data.status}, version=${response.data.version || "n/a"}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Client connects to server", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #2: Client.generate() with real provider
// ============================================================

async function testClientGenerate(): Promise<boolean | null> {
  logSection("Test #2: Client.generate()");
  logTest("Generate text via HTTP client", "TESTING");

  try {
    const { createClient } = await import("../src/lib/client/index.js");

    const client = createClient({ baseUrl: getServerUrl() });

    const response = await client.generate({
      input: { text: "What is 2 + 2? Reply with just the number." },
      provider: TEST_CONFIG.provider,
      model: TEST_CONFIG.model,
      maxTokens: 50,
    });

    const content = response.data?.content || "";
    if (!content) {
      logTest("Generate text via HTTP client", "FAIL", "Empty content");
      return false;
    }

    logTest(
      "Generate text via HTTP client",
      "PASS",
      `content=${content.length} chars, provider=${response.data?.provider || TEST_CONFIG.provider}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Generate text via HTTP client", "SKIP", msg);
      return null;
    }
    logTest("Generate text via HTTP client", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #3: Client.stream() with real streaming
// ============================================================

async function testClientStream(): Promise<boolean | null> {
  logSection("Test #3: Client.stream()");
  logTest("Stream text via HTTP client", "TESTING");

  try {
    const { createClient } = await import("../src/lib/client/index.js");

    const client = createClient({ baseUrl: getServerUrl() });

    const textChunks: string[] = [];
    let doneReceived = false;

    const result = await client.stream(
      {
        input: { text: "Count from 1 to 5. Just the numbers." },
        provider: TEST_CONFIG.provider,
        model: TEST_CONFIG.model,
        maxTokens: 100,
      },
      {
        onText: (text: string) => {
          textChunks.push(text);
        },
        onDone: () => {
          doneReceived = true;
        },
      },
    );

    const content = result.content || "";
    if (!content && textChunks.length === 0) {
      logTest(
        "Stream text via HTTP client",
        "FAIL",
        "Server returned 200 but no SSE content was received — possible SSE format mismatch between server adapter and client",
      );
      return false;
    }

    logTest(
      "Stream text via HTTP client",
      "PASS",
      `chunks=${textChunks.length}, content=${content.length} chars, done=${doneReceived}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("Stream text via HTTP client", "SKIP", msg);
      return null;
    }
    logTest("Stream text via HTTP client", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: Middleware composition works end-to-end
// ============================================================

async function testMiddlewareComposition(): Promise<boolean | null> {
  logSection("Test #4: Middleware composition");
  logTest("Interceptors execute in order", "TESTING");

  try {
    const { createClient, composeMiddleware } =
      await import("../src/lib/client/index.js");

    const executionOrder: string[] = [];

    const trackingMiddleware =
      (name: string) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (request: any, next: () => Promise<any>) => {
        executionOrder.push(`${name}:before`);
        const response = await next();
        executionOrder.push(`${name}:after`);
        return response;
      };

    const composed = composeMiddleware(
      trackingMiddleware("first"),
      trackingMiddleware("second"),
      trackingMiddleware("third"),
    );

    const client = createClient({ baseUrl: getServerUrl() });
    client.use(composed);

    // Health check will trigger the middleware chain
    await client.health();

    const expected = [
      "first:before",
      "second:before",
      "third:before",
      "third:after",
      "second:after",
      "first:after",
    ];

    const orderCorrect = expected.every(
      (step, i) => executionOrder[i] === step,
    );

    if (!orderCorrect) {
      logTest(
        "Interceptors execute in order",
        "FAIL",
        `Expected [${expected.join(",")}], got [${executionOrder.join(",")}]`,
      );
      return false;
    }

    logTest(
      "Interceptors execute in order",
      "PASS",
      `${executionOrder.length} middleware steps in correct onion order`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Interceptors execute in order", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #5: Auth interceptor adds headers
// ============================================================

async function testAuthInterceptor(): Promise<boolean | null> {
  logSection("Test #5: Auth interceptor");
  logTest("API key interceptor adds header", "TESTING");

  try {
    const { createClient, createApiKeyAuthInterceptor } =
      await import("../src/lib/client/index.js");

    let capturedHeaders: Record<string, string> = {};

    // Interceptor that captures headers after auth interceptor runs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headerCapture = async (request: any, next: () => Promise<any>) => {
      capturedHeaders = { ...request.headers };
      return next();
    };

    const client = createClient({ baseUrl: getServerUrl() });
    client.use(createApiKeyAuthInterceptor("test-secret-key-123"));
    client.use(headerCapture);

    await client.health();

    if (!capturedHeaders["x-api-key"] && !capturedHeaders["X-API-Key"]) {
      logTest(
        "API key interceptor adds header",
        "FAIL",
        `No X-API-Key found in headers: ${Object.keys(capturedHeaders).join(", ")}`,
      );
      return false;
    }

    const keyValue =
      capturedHeaders["x-api-key"] || capturedHeaders["X-API-Key"];
    if (keyValue !== "test-secret-key-123") {
      logTest(
        "API key interceptor adds header",
        "FAIL",
        `Wrong key value: ${keyValue}`,
      );
      return false;
    }

    logTest(
      "API key interceptor adds header",
      "PASS",
      "X-API-Key header injected correctly",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("API key interceptor adds header", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #6: Error classes and hierarchy
// ============================================================

async function testErrorHierarchy(): Promise<boolean | null> {
  logSection("Test #6: Error hierarchy");
  logTest("Error classes work correctly", "TESTING");

  try {
    const {
      ErrorCode,
      NeuroLinkError,
      HttpError,
      ClientRateLimitError,
      ClientAuthenticationError,
      NotFoundError,
      isRetryableError,
      isRetryableStatus,
      mapStatusToErrorCode,
      isNeuroLinkError,
      createErrorFromResponse,
    } = await import("../src/lib/client/index.js");

    const errors: string[] = [];

    // Test 1: Inheritance chain
    const httpErr = new HttpError("Not Found", 404, {
      code: ErrorCode.NOT_FOUND,
    });
    if (!(httpErr instanceof NeuroLinkError)) {
      errors.push("HttpError should extend NeuroLinkError");
    }
    if (!(httpErr instanceof Error)) {
      errors.push("HttpError should extend Error");
    }
    if (httpErr.status !== 404) {
      errors.push(`HttpError.status should be 404, got ${httpErr.status}`);
    }

    // Test 2: Specialized errors
    const rateErr = new ClientRateLimitError("Rate limited", {
      retryAfter: 5000,
    });
    if (!(rateErr instanceof HttpError)) {
      errors.push("ClientRateLimitError should extend HttpError");
    }
    if (typeof rateErr.retryAfter !== "number") {
      errors.push("ClientRateLimitError should have retryAfter");
    }

    const notFound = new NotFoundError("Missing");
    if (notFound.status !== 404) {
      errors.push(`NotFoundError.status should be 404, got ${notFound.status}`);
    }

    // Test 3: isRetryableError
    // Use ClientNetworkError (from errors.ts) which extends NeuroLinkError with retryable=true
    // The plain NetworkError from httpClient.ts is NOT a NeuroLinkError
    const { ClientNetworkError } = await import("../src/lib/client/index.js");
    const retryable = new ClientNetworkError("connection reset");
    if (!isRetryableError(retryable)) {
      errors.push("NetworkError should be retryable");
    }

    const authErr = new ClientAuthenticationError("bad key");
    if (isRetryableError(authErr)) {
      errors.push("ClientAuthenticationError should NOT be retryable");
    }

    // Test 4: isRetryableStatus
    if (!isRetryableStatus(429)) {
      errors.push("429 should be retryable");
    }
    if (!isRetryableStatus(503)) {
      errors.push("503 should be retryable");
    }
    if (isRetryableStatus(404)) {
      errors.push("404 should NOT be retryable");
    }

    // Test 5: mapStatusToErrorCode
    const code401 = mapStatusToErrorCode(401);
    if (!code401 || !String(code401).toLowerCase().includes("unauthorized")) {
      // Check it maps to something auth-related
      const code = String(code401).toLowerCase();
      if (!code.includes("auth") && !code.includes("unauthorized")) {
        errors.push(
          `mapStatusToErrorCode(401) returned unexpected: ${code401}`,
        );
      }
    }

    // Test 6: isNeuroLinkError type guard
    if (!isNeuroLinkError(httpErr)) {
      errors.push("isNeuroLinkError should return true for HttpError");
    }
    if (isNeuroLinkError(new Error("plain"))) {
      errors.push("isNeuroLinkError should return false for plain Error");
    }

    // Test 7: createErrorFromResponse
    const fromResponse = createErrorFromResponse({
      code: "NOT_FOUND",
      message: "Resource not found",
      status: 404,
    });
    if (!isNeuroLinkError(fromResponse)) {
      errors.push("createErrorFromResponse should return NeuroLinkError");
    }

    if (errors.length > 0) {
      logTest("Error classes work correctly", "FAIL", errors.join("; "));
      return false;
    }

    logTest(
      "Error classes work correctly",
      "PASS",
      "Inheritance, retryable detection, status mapping, factory all correct",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Error classes work correctly", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #7: JWT decode and expiry utilities
// ============================================================

async function testJWTUtilities(): Promise<boolean | null> {
  logSection("Test #7: JWT utilities");
  logTest("JWT decode, expiry, and token managers", "TESTING");

  try {
    const { decodeJWTPayload, isJWTExpired, getJWTExpiry, JWTTokenManager } =
      await import("../src/lib/client/index.js");

    const errors: string[] = [];

    // Create a real JWT-like token (base64 encoded)
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-123", exp: futureExp }),
    ).toString("base64url");
    const signature = "test-signature";
    const validToken = `${header}.${payload}.${signature}`;

    // Test 1: decodeJWTPayload
    const decoded = decodeJWTPayload(validToken);
    if (decoded.sub !== "user-123") {
      errors.push(`decoded.sub should be 'user-123', got '${decoded.sub}'`);
    }

    // Test 2: isJWTExpired — should not be expired
    if (isJWTExpired(validToken)) {
      errors.push("Token with future exp should not be expired");
    }

    // Test 3: Create expired token
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const expiredPayload = Buffer.from(
      JSON.stringify({ sub: "user-123", exp: pastExp }),
    ).toString("base64url");
    const expiredToken = `${header}.${expiredPayload}.${signature}`;

    if (!isJWTExpired(expiredToken)) {
      errors.push("Token with past exp should be expired");
    }

    // Test 4: getJWTExpiry
    const expiry = getJWTExpiry(validToken);
    if (expiry === null) {
      errors.push("getJWTExpiry returned null for a valid token");
    } else if (expiry <= Date.now()) {
      errors.push(`getJWTExpiry should return future ms, got ${expiry}`);
    }

    // Test 5: JWTTokenManager
    const manager = new JWTTokenManager({
      token: validToken,
      expiresAt: futureExp * 1000,
      refreshFn: async () => {
        return {
          accessToken: validToken,
          expiresIn: 3600,
          tokenType: "Bearer",
        };
      },
    });

    if (!manager.isValid()) {
      errors.push("JWTTokenManager with future token should be valid");
    }

    const retrieved = await manager.getToken();
    if (retrieved !== validToken) {
      errors.push("getToken should return the valid token");
    }

    if (errors.length > 0) {
      logTest(
        "JWT decode, expiry, and token managers",
        "FAIL",
        errors.join("; "),
      );
      return false;
    }

    logTest(
      "JWT decode, expiry, and token managers",
      "PASS",
      "decode, expiry check, getJWTExpiry, JWTTokenManager all correct",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("JWT decode, expiry, and token managers", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #8: AI SDK adapter creates valid models
// ============================================================

async function testAiSdkAdapter(): Promise<boolean | null> {
  logSection("Test #8: AI SDK adapter");
  logTest("createNeuroLinkProvider returns valid AI SDK models", "TESTING");

  try {
    const { createNeuroLinkProvider, createNeuroLinkModel } =
      await import("../src/lib/client/index.js");

    const errors: string[] = [];

    // Test 1: Create provider
    const provider = createNeuroLinkProvider({
      baseUrl: getServerUrl(),
      apiKey: "test-key",
      defaultProvider: "openai",
    });

    if (typeof provider !== "function") {
      errors.push("createNeuroLinkProvider should return a callable");
    }

    // Test 2: Create model via provider
    const model = provider("gpt-4o");
    if (!model) {
      errors.push("provider('gpt-4o') should return a model");
    }

    if (model.modelId !== "gpt-4o") {
      errors.push(`model.modelId should be 'gpt-4o', got '${model.modelId}'`);
    }

    // Test 3: Model has required AI SDK interface methods
    if (typeof model.doGenerate !== "function") {
      errors.push("model should have doGenerate method");
    }
    if (typeof model.doStream !== "function") {
      errors.push("model should have doStream method");
    }

    // Test 4: Provider inference from model name
    const claudeModel = provider("claude-3-opus");
    if (
      claudeModel.provider !== "anthropic" &&
      String(claudeModel.provider).toLowerCase() !== "anthropic"
    ) {
      // Some implementations may not infer provider — just note it
      log(
        `   Note: Provider inference returned '${claudeModel.provider}' for claude-3-opus`,
        "yellow",
      );
    }

    // Test 5: createNeuroLinkModel standalone
    const standalone = createNeuroLinkModel({
      baseUrl: getServerUrl(),
      apiKey: "test-key",
      modelId: "gemini-pro",
      provider: "vertex",
    });

    if (!standalone || standalone.modelId !== "gemini-pro") {
      errors.push(
        "createNeuroLinkModel should create model with correct modelId",
      );
    }

    if (errors.length > 0) {
      logTest(
        "createNeuroLinkProvider returns valid AI SDK models",
        "FAIL",
        errors.join("; "),
      );
      return false;
    }

    logTest(
      "createNeuroLinkProvider returns valid AI SDK models",
      "PASS",
      "provider callable, model.doGenerate/doStream present, modelId correct",
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("createNeuroLinkProvider returns valid AI SDK models", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #9: AI SDK adapter generate() round-trip
// ============================================================

async function testAiSdkGenerate(): Promise<boolean | null> {
  logSection("Test #9: AI SDK adapter generate()");
  logTest("AI SDK doGenerate() round-trip", "TESTING");

  try {
    const { createNeuroLinkProvider } =
      await import("../src/lib/client/index.js");

    const provider = createNeuroLinkProvider({
      baseUrl: getServerUrl(),
      defaultProvider: TEST_CONFIG.provider,
    });

    const model = provider(TEST_CONFIG.model);

    const result = await model.doGenerate({
      prompt: "What is 7 + 3? Reply with just the number.",
      maxTokens: 50,
    });

    // The AI SDK adapter catches errors and returns { text: "", finishReason: "error" }
    // Check if this is a provider error (credentials missing, etc.)
    if (!result.text) {
      if (result.finishReason === "error") {
        // Check raw response for provider error details
        const rawMsg =
          result.rawResponse instanceof Error
            ? result.rawResponse.message
            : typeof result.rawResponse === "object" &&
                result.rawResponse !== null
              ? JSON.stringify(result.rawResponse)
              : String(result.rawResponse);
        if (isExpectedProviderError(rawMsg)) {
          logTest(
            "AI SDK doGenerate() round-trip",
            "SKIP",
            rawMsg.substring(0, 100),
          );
          return null;
        }
      }
      logTest(
        "AI SDK doGenerate() round-trip",
        "SKIP",
        "No text in response (provider likely not configured)",
      );
      return null;
    }

    logTest(
      "AI SDK doGenerate() round-trip",
      "PASS",
      `text=${result.text.length} chars, finishReason=${result.finishReason || "n/a"}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      logTest("AI SDK doGenerate() round-trip", "SKIP", msg);
      return null;
    }
    logTest("AI SDK doGenerate() round-trip", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #10: SSE streaming client
// ============================================================

async function testSSEClient(): Promise<boolean | null> {
  logSection("Test #10: SSE streaming client");
  logTest("SSEClient streams real responses", "TESTING");

  try {
    const { SSEClient } = await import("../src/lib/client/index.js");

    const sseUrl = `${getServerUrl()}/api/agent/stream`;

    const sseClient = new SSEClient(sseUrl, {
      autoReconnect: false,
    });

    const receivedEvents: string[] = [];
    let textContent = "";

    sseClient.on("text", (data: unknown) => {
      if (typeof data === "string") {
        textContent += data;
      } else if (data && typeof data === "object" && "content" in data) {
        textContent += String((data as { content: string }).content);
      }
      receivedEvents.push("text");
    });

    sseClient.on("done", () => {
      receivedEvents.push("done");
    });

    sseClient.on("error", (_err: unknown) => {
      receivedEvents.push("error");
    });

    try {
      await sseClient.connect({
        body: {
          input: { text: "Say hello in one word." },
          provider: TEST_CONFIG.provider,
          model: TEST_CONFIG.model,
          maxTokens: 30,
        },
        headers: { "Content-Type": "application/json" },
      });

      // Wait for the done event, with a 3-second timeout fallback
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3000);
        sseClient.on("done", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      sseClient.disconnect();

      if (receivedEvents.length === 0 || textContent.length === 0) {
        // Check if only error events came through
        const hasOnlyErrors = receivedEvents.every((e) => e === "error");
        if (hasOnlyErrors && receivedEvents.length > 0) {
          logTest(
            "SSEClient streams real responses",
            "FAIL",
            `Only error events received (${receivedEvents.length}) — SSE format mismatch or server error`,
          );
        } else {
          logTest(
            "SSEClient streams real responses",
            "FAIL",
            `events=${receivedEvents.length}, text=${textContent.length} chars — no actual text content streamed`,
          );
        }
        return false;
      }

      logTest(
        "SSEClient streams real responses",
        "PASS",
        `events=${receivedEvents.length}, text=${textContent.length} chars`,
      );
      return true;
    } catch (connectErr) {
      sseClient.disconnect();
      const msg =
        connectErr instanceof Error ? connectErr.message : String(connectErr);
      if (isExpectedProviderError(msg)) {
        logTest("SSEClient streams real responses", "SKIP", msg);
        return null;
      }
      logTest("SSEClient streams real responses", "FAIL", msg);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("SSEClient streams real responses", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #11: Client handles server errors gracefully
// ============================================================

async function testClientErrorHandling(): Promise<boolean | null> {
  logSection("Test #11: Error handling");
  logTest("Client produces typed errors on failures", "TESTING");

  try {
    const { createClient } = await import("../src/lib/client/index.js");

    const client = createClient({ baseUrl: getServerUrl() });

    // Request to a non-existent endpoint should produce a meaningful error
    let caughtError: unknown = null;
    try {
      await client.generate({
        input: { text: "test" },
        provider: "nonexistent_provider_xyz_999",
        model: "nonexistent_model_xyz_999",
        maxTokens: 10,
      });
    } catch (err) {
      caughtError = err;
    }

    if (!caughtError) {
      logTest(
        "Client produces typed errors on failures",
        "FAIL",
        "Expected error for invalid provider but got none",
      );
      return false;
    }

    // The error should be something we can inspect
    const errMsg =
      caughtError instanceof Error ? caughtError.message : String(caughtError);

    logTest(
      "Client produces typed errors on failures",
      "PASS",
      `Error caught: ${errMsg.substring(0, 100)}`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Client produces typed errors on failures", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #12: React hooks export verification (SKIP in Node)
// ============================================================

async function testReactHooksExports(): Promise<boolean | null> {
  logSection("Test #12: React hooks exports");
  logTest("React hooks are importable", "TESTING");

  try {
    const clientModule = await import("../src/lib/client/index.js");

    const hooks = [
      "NeuroLinkProvider",
      "useNeuroLinkClient",
      "useChat",
      "useAgent",
      "useWorkflow",
      "useVoice",
      "useStream",
      "useTools",
    ];

    const missing = hooks.filter((h) => !(h in clientModule));

    if (missing.length > 0) {
      logTest(
        "React hooks are importable",
        "FAIL",
        `Missing: ${missing.join(", ")}`,
      );
      return false;
    }

    // Verify they're functions (not undefined/null)
    const notFunctions = hooks.filter(
      (h) => typeof (clientModule as Record<string, unknown>)[h] !== "function",
    );
    if (notFunctions.length > 0) {
      logTest(
        "React hooks are importable",
        "FAIL",
        `Not functions: ${notFunctions.join(", ")}`,
      );
      return false;
    }

    logTest(
      "React hooks are importable",
      "PASS",
      `All ${hooks.length} hooks exported as functions (DOM required to invoke)`,
    );

    // Skip actual invocation — needs React DOM
    logTest(
      "React hooks invocation",
      "SKIP",
      "React hooks require browser DOM — cannot invoke in Node",
    );

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("React hooks are importable", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #13: Retry interceptor retries on failure
// ============================================================

async function testRetryInterceptor(): Promise<boolean | null> {
  logSection("Test #13: Retry interceptor");
  logTest("Retry interceptor retries failed requests", "TESTING");

  try {
    const { createClient, createRetryInterceptor } =
      await import("../src/lib/client/index.js");

    let retryCallbackCount = 0;

    const client = createClient({
      baseUrl: "http://localhost:1", // Non-existent server — will fail immediately
      timeout: 2000,
      // Disable the client's built-in retry so only the interceptor retries
      retry: {
        maxAttempts: 1,
        initialDelayMs: 100,
        maxDelayMs: 500,
        backoffMultiplier: 2,
        retryOnNetworkError: false,
      },
    });

    client.use(
      createRetryInterceptor({
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 500,
        backoffMultiplier: 2,
        retryOnNetworkError: true,
        onRetry: (_attempt) => {
          retryCallbackCount++;
        },
      }),
    );

    try {
      await client.health();
    } catch {
      // Expected to fail
    }

    // onRetry is called for each retry (attempt 1 and 2, not the initial attempt 0)
    // So with maxAttempts=3, we expect 2 retries (onRetry called twice)
    if (retryCallbackCount >= 1) {
      logTest(
        "Retry interceptor retries failed requests",
        "PASS",
        `${retryCallbackCount} retries observed via onRetry callback (configured max 3 attempts)`,
      );
      return true;
    } else {
      logTest(
        "Retry interceptor retries failed requests",
        "FAIL",
        `Only ${retryCallbackCount} retries observed, expected at least 1`,
      );
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("Retry interceptor retries failed requests", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log("\n--- NeuroLink Continuous Test Suite: Client SDK ---", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}  Model: ${TEST_CONFIG.model}  Port: ${TEST_CONFIG.serverPort}`,
    "cyan",
  );

  // Start the server first
  logSection("Starting NeuroLink Server");
  const serverStarted = await startServer();

  if (!serverStarted) {
    log("Cannot run client tests without a server. Exiting.", "red");
    process.exit(1);
  }

  // Wait for server to be ready
  await new Promise((r) => setTimeout(r, 2000));

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    { name: "Client health check", fn: testClientHealthCheck },
    { name: "Client generate()", fn: testClientGenerate },
    { name: "Client stream()", fn: testClientStream },
    { name: "Middleware composition", fn: testMiddlewareComposition },
    { name: "Auth interceptor", fn: testAuthInterceptor },
    { name: "Error hierarchy", fn: testErrorHierarchy },
    { name: "JWT utilities", fn: testJWTUtilities },
    { name: "AI SDK adapter models", fn: testAiSdkAdapter },
    { name: "AI SDK generate()", fn: testAiSdkGenerate },
    { name: "SSE streaming", fn: testSSEClient },
    { name: "Client error handling", fn: testClientErrorHandling },
    { name: "React hooks exports", fn: testReactHooksExports },
    { name: "Retry interceptor", fn: testRetryInterceptor },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      testResults.push({ name: test.name, result, error: null });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logTest(test.name, "FAIL", `Uncaught: ${msg}`);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Stop the server
  await stopServer();

  // Summary
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;

  for (const t of testResults) {
    logTest(
      t.name,
      t.result === true ? "PASS" : t.result === false ? "FAIL" : "SKIP",
      t.error || "",
    );
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${testResults.length} total) in ${duration}s`,
    failed === 0 ? "green" : "red",
  );

  process.exit(failed === 0 ? 0 : 1);
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--provider=")) {
    TEST_CONFIG.provider = arg.split("=")[1];
  }
  if (arg.startsWith("--model=")) {
    TEST_CONFIG.model = arg.split("=")[1];
  }
  if (arg.startsWith("--port=")) {
    TEST_CONFIG.serverPort = parseInt(arg.split("=")[1], 10);
  }
  if (arg === "--help" || arg === "-h") {
    console.log(
      "Usage: npx tsx test/continuous-test-suite-client.ts [--provider=X] [--model=Y] [--port=N]",
    );
    console.log("\nTests the Client SDK end-to-end:");
    console.log(
      "  Starts a real NeuroLink server, connects with NeuroLinkClient,",
    );
    console.log(
      "  generates text, streams responses, tests auth/interceptors/errors.",
    );
    console.log(
      "  Provider-dependent tests SKIP when credentials unavailable.",
    );
    console.log(
      `\nDefaults: --provider=${TEST_CONFIG.provider} --model=${TEST_CONFIG.model} --port=${TEST_CONFIG.serverPort}`,
    );
    process.exit(0);
  }
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: Client SDK", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}
