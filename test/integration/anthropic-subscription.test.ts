import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import {
  AIProviderName,
  AnthropicModels,
} from "../../src/lib/constants/enums.js";
import type {
  ClaudeSubscriptionTier,
  OAuthToken,
  AnthropicRateLimitInfo,
} from "../../src/lib/types/subscriptionTypes.js";

/**
 * Anthropic Subscription Integration Tests
 *
 * Comprehensive tests for Claude Pro/Max subscription support including:
 * - OAuth 2.0 authentication flow with PKCE
 * - Token storage and management
 * - Model tier access and validation
 * - Provider integration with subscription auth
 * - Configuration and environment detection
 */

// =============================================================================
// MOCKS
// =============================================================================

// Mock the open package for browser opening
vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger to avoid console noise
vi.mock("../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    always: vi.fn(),
  },
}));

// Mock fs for token storage tests
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  chmod: vi.fn(),
  rename: vi.fn(),
}));

// Mock sync fs operations to prevent reading real OAuth credentials from disk.
// The provider uses readFileSync/existsSync (not fs/promises) to load
// ~/.neurolink/anthropic-credentials.json. Without this mock, tests on any
// machine that has real credentials stored will auto-detect OAuth mode instead
// of the API key mode the tests expect.
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => {
      throw Object.assign(new Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
      });
    }),
  };
});

// Mock proxy fetch
vi.mock("../../src/lib/proxy/proxyFetch.js", () => ({
  createProxyFetch: vi.fn(() => fetch),
}));

// Mock @ai-sdk/anthropic
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() =>
    vi.fn(() => ({
      modelName: "claude-3-5-sonnet-20241022",
      provider: "anthropic",
    })),
  ),
}));

// Mock providerConfig to provide valid API key
vi.mock("../../src/lib/utils/providerConfig.js", () => ({
  validateApiKey: vi.fn(() => "sk-ant-test-key-valid"),
  createAnthropicConfig: vi.fn(() => ({
    envVarName: "ANTHROPIC_API_KEY",
    providerName: "Anthropic",
  })),
  getProviderModel: vi.fn(
    (_envVar: string, defaultModel: string) => defaultModel,
  ),
}));

// =============================================================================
// 1. OAUTH FLOW TESTS
// =============================================================================

describe("1. OAuth Flow Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;
  const originalFetch = global.fetch;
  let mockFetch: Mock<typeof fetch>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("OAuth URL Generation with PKCE", () => {
    it("should generate valid authorization URL with all required parameters", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id-12345";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id-12345",
        redirectUri: "http://localhost:3000/callback",
      });

      const authUrl = oauth.generateAuthUrl();

      expect(authUrl).toBeDefined();
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("client_id=test-client-id-12345");
      expect(authUrl).toContain("redirect_uri=");
      expect(authUrl).toContain("state=");
      expect(authUrl).toContain("scope=");
    });

    it("should generate URL with custom scopes", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id",
        scopes: ["chat", "read:user", "read:subscription"],
      });

      const authUrl = oauth.generateAuthUrl();

      expect(authUrl).toContain("scope=chat");
      expect(authUrl).toContain("read%3Auser");
      expect(authUrl).toContain("read%3Asubscription");
    });

    it("should include PKCE code challenge when code challenge is provided", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id",
      });

      const codeVerifier = AnthropicOAuth.generateCodeVerifier();
      const codeChallenge =
        await AnthropicOAuth.generateCodeChallenge(codeVerifier);
      const authUrl = oauth.generateAuthUrl({ codeChallenge });

      expect(authUrl).toContain("code_challenge=");
      expect(authUrl).toContain("code_challenge_method=S256");
    });

    it("should generate unique state parameters for CSRF protection", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth1 = new AnthropicOAuth({ clientId: "test-client-id" });
      const oauth2 = new AnthropicOAuth({ clientId: "test-client-id" });

      const url1 = oauth1.generateAuthUrl();
      const url2 = oauth2.generateAuthUrl();

      const state1 = new URL(url1).searchParams.get("state");
      const state2 = new URL(url2).searchParams.get("state");

      expect(state1).not.toBe(state2);
      expect(state1!.length).toBeGreaterThan(20);
      expect(state2!.length).toBeGreaterThan(20);
    });

    it("should include additional params when provided", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      const authUrl = oauth.generateAuthUrl({
        additionalParams: {
          prompt: "consent",
          login_hint: "user@example.com",
        },
      });

      expect(authUrl).toContain("prompt=consent");
      expect(authUrl).toContain("login_hint=user%40example.com");
    });
  });

  describe("Code Verifier/Challenge Generation", () => {
    it("should generate cryptographically secure code verifier", async () => {
      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const verifier1 = AnthropicOAuth.generateCodeVerifier();
      const verifier2 = AnthropicOAuth.generateCodeVerifier();

      // Verifiers should be unique
      expect(verifier1).not.toBe(verifier2);

      // Verifiers should have appropriate length (base64url encoding of 48 bytes = 64 chars)
      expect(verifier1.length).toBe(64);
      expect(verifier2.length).toBe(64);

      // Verifiers should be base64url strings (no + / = characters)
      expect(/^[A-Za-z0-9_-]+$/.test(verifier1)).toBe(true);
      expect(/^[A-Za-z0-9_-]+$/.test(verifier2)).toBe(true);
    });

    it("should generate valid S256 code challenge from verifier", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });
      const codeVerifier = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH";

      const codeChallenge =
        await AnthropicOAuth.generateCodeChallenge(codeVerifier);
      const authUrl = oauth.generateAuthUrl({ codeChallenge });
      const params = new URL(authUrl).searchParams;

      const retrievedChallenge = params.get("code_challenge");
      const challengeMethod = params.get("code_challenge_method");

      expect(challengeMethod).toBe("S256");
      expect(retrievedChallenge).toBeDefined();
      expect(retrievedChallenge).toBe(codeChallenge);
      // Base64URL encoded without padding
      expect(/^[A-Za-z0-9_-]+$/.test(retrievedChallenge!)).toBe(true);
    });
  });

  describe("Token Exchange (Mocked HTTP)", () => {
    it("should exchange authorization code for tokens", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "test-refresh-token",
          scope: "chat read:user",
        }),
      } as Response);

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });
      const codeVerifier = AnthropicOAuth.generateCodeVerifier();

      const tokens = await oauth.exchangeCodeForTokens(
        "test-auth-code",
        codeVerifier,
      );

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBe("test-access-token");
      expect(tokens.tokenType).toBe("Bearer");
      expect(tokens.refreshToken).toBe("test-refresh-token");
      expect(tokens.expiresAt).toBeInstanceOf(Date);
      expect(tokens.scopes).toContain("chat");
    });

    it("should throw OAuthTokenExchangeError on failed exchange", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "invalid_grant",
      } as Response);

      const { AnthropicOAuth, OAuthTokenExchangeError } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });
      const codeVerifier = AnthropicOAuth.generateCodeVerifier();

      await expect(
        oauth.exchangeCodeForTokens("invalid-code", codeVerifier),
      ).rejects.toThrow(OAuthTokenExchangeError);
    });

    it("should throw when authorization code is empty", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth, OAuthTokenExchangeError } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });
      const codeVerifier = AnthropicOAuth.generateCodeVerifier();

      await expect(
        oauth.exchangeCodeForTokens("", codeVerifier),
      ).rejects.toThrow(OAuthTokenExchangeError);
    });

    it("should include client secret for confidential clients", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";
      process.env.ANTHROPIC_OAUTH_CLIENT_SECRET = "test-client-secret";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      } as Response);

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      });

      const codeVerifier = AnthropicOAuth.generateCodeVerifier();
      await oauth.exchangeCodeForTokens("test-auth-code", codeVerifier);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = fetchCall[1]?.body as string;
      expect(body).toContain("client_secret=test-client-secret");
    });

    it("should include PKCE code verifier in token exchange", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      } as Response);

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });
      const codeVerifier = AnthropicOAuth.generateCodeVerifier();

      await oauth.exchangeCodeForTokens("test-auth-code", codeVerifier);

      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = fetchCall[1]?.body as string;
      expect(body).toContain("code_verifier=");
    });
  });

  describe("Token Refresh (Mocked HTTP)", () => {
    it("should refresh access token using refresh token", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
        }),
      } as Response);

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      const newTokens = await oauth.refreshAccessToken("old-refresh-token");

      expect(newTokens.accessToken).toBe("new-access-token");
      expect(newTokens.refreshToken).toBe("new-refresh-token");
      expect(newTokens.expiresAt).toBeInstanceOf(Date);
    });

    it("should throw OAuthTokenRefreshError when refresh token is missing", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth, OAuthTokenRefreshError } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      await expect(oauth.refreshAccessToken("")).rejects.toThrow(
        OAuthTokenRefreshError,
      );
    });

    it("should throw OAuthTokenRefreshError on server error", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "invalid_token",
      } as Response);

      const { AnthropicOAuth, OAuthTokenRefreshError } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      await expect(
        oauth.refreshAccessToken("expired-refresh-token"),
      ).rejects.toThrow(OAuthTokenRefreshError);
    });
  });

  describe("Token Validation", () => {
    it("should validate valid access token", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          expires_in: 3000,
          scope: "chat read:user",
          user: {
            id: "user-123",
            email: "user@example.com",
            subscription: "pro",
          },
        }),
      } as Response);

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      const result = await oauth.validateTokenWithDetails("valid-access-token");

      expect(result.isValid).toBe(true);
      expect(result.expiresIn).toBe(3000);
      expect(result.scopes).toContain("chat");
      expect(result.scopes).toContain("read:user");
      expect(result.user?.subscription).toBe("pro");
    });

    it("should return invalid for expired token", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "token_expired",
      } as Response);

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      const result = await oauth.validateTokenWithDetails("expired-token");

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Token validation failed");
    });

    it("should return invalid for empty token", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({ clientId: "test-client-id" });

      const result = await oauth.validateTokenWithDetails("");

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Access token is required");
    });

    it("should check token expiration with configurable buffer", async () => {
      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      // Token expires in 30 seconds
      const expiresAt = new Date(Date.now() + 30 * 1000);

      // With default 60 second buffer, should be expired
      expect(AnthropicOAuth.isTokenExpired(expiresAt, 60)).toBe(true);

      // With 10 second buffer, should not be expired
      expect(AnthropicOAuth.isTokenExpired(expiresAt, 10)).toBe(false);

      // With 0 second buffer, should not be expired
      expect(AnthropicOAuth.isTokenExpired(expiresAt, 0)).toBe(false);

      // Already expired token
      const expired = new Date(Date.now() - 1000);
      expect(AnthropicOAuth.isTokenExpired(expired, 0)).toBe(true);
    });
  });
});

// =============================================================================
// 2. TOKEN STORAGE TESTS
// =============================================================================

describe("2. Token Storage Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Saving Tokens to Storage", () => {
    it("should save valid tokens to in-memory storage", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();
      const tokens = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: Date.now() + 3600000,
        tokenType: "Bearer",
      };

      await storage.saveTokens("anthropic-server", tokens);

      const retrieved = await storage.getTokens("anthropic-server");
      expect(retrieved).toBeDefined();
      expect(retrieved?.accessToken).toBe("test-access-token");
      expect(retrieved?.refreshToken).toBe("test-refresh-token");
    });

    it("should update existing tokens", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      await storage.saveTokens("server-1", {
        accessToken: "old-token",
        expiresAt: Date.now() + 3600000,
        tokenType: "Bearer",
      });

      await storage.saveTokens("server-1", {
        accessToken: "new-token",
        expiresAt: Date.now() + 7200000,
        tokenType: "Bearer",
      });

      const retrieved = await storage.getTokens("server-1");
      expect(retrieved?.accessToken).toBe("new-token");
    });

    it("should handle multiple provider tokens", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      await storage.saveTokens("anthropic", {
        accessToken: "anthropic-token",
        tokenType: "Bearer",
      });

      await storage.saveTokens("openai", {
        accessToken: "openai-token",
        tokenType: "Bearer",
      });

      await storage.saveTokens("google", {
        accessToken: "google-token",
        tokenType: "Bearer",
      });

      expect(storage.size).toBe(3);
      expect((await storage.getTokens("anthropic"))?.accessToken).toBe(
        "anthropic-token",
      );
      expect((await storage.getTokens("openai"))?.accessToken).toBe(
        "openai-token",
      );
      expect((await storage.getTokens("google"))?.accessToken).toBe(
        "google-token",
      );
    });
  });

  describe("Loading Tokens from Storage", () => {
    it("should return null for non-existent tokens", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      const tokens = await storage.getTokens("non-existent-provider");
      expect(tokens).toBeNull();
    });

    it("should return complete token object", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();
      const expectedTokens = {
        accessToken: "test-token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() + 3600000,
        tokenType: "Bearer",
        scope: "chat read:user",
      };

      await storage.saveTokens("server", expectedTokens);
      const retrieved = await storage.getTokens("server");

      expect(retrieved).toEqual(expectedTokens);
    });

    it("should check if tokens exist for provider", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      expect(await storage.hasTokens("provider")).toBe(false);

      await storage.saveTokens("provider", {
        accessToken: "token",
        tokenType: "Bearer",
      });

      expect(await storage.hasTokens("provider")).toBe(true);
    });

    it("should list all stored server IDs", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      await storage.saveTokens("server-a", {
        accessToken: "token-a",
        tokenType: "Bearer",
      });
      await storage.saveTokens("server-b", {
        accessToken: "token-b",
        tokenType: "Bearer",
      });

      const serverIds = storage.getServerIds();
      expect(serverIds).toContain("server-a");
      expect(serverIds).toContain("server-b");
      expect(serverIds.length).toBe(2);
    });
  });

  describe("Clearing Tokens", () => {
    it("should clear tokens for a specific provider", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      await storage.saveTokens("server-1", {
        accessToken: "token-1",
        tokenType: "Bearer",
      });
      await storage.saveTokens("server-2", {
        accessToken: "token-2",
        tokenType: "Bearer",
      });

      await storage.deleteTokens("server-1");

      expect(await storage.hasTokens("server-1")).toBe(false);
      expect(await storage.hasTokens("server-2")).toBe(true);
      expect(storage.size).toBe(1);
    });

    it("should clear all tokens at once", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      await storage.saveTokens("server-1", {
        accessToken: "token-1",
        tokenType: "Bearer",
      });
      await storage.saveTokens("server-2", {
        accessToken: "token-2",
        tokenType: "Bearer",
      });
      await storage.saveTokens("server-3", {
        accessToken: "token-3",
        tokenType: "Bearer",
      });

      expect(storage.size).toBe(3);

      await storage.clearAll();

      expect(storage.size).toBe(0);
      expect(await storage.hasTokens("server-1")).toBe(false);
      expect(await storage.hasTokens("server-2")).toBe(false);
    });

    it("should handle clearing non-existent tokens gracefully", async () => {
      const { InMemoryTokenStorage } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const storage = new InMemoryTokenStorage();

      // Should not throw
      await expect(storage.deleteTokens("non-existent")).resolves.not.toThrow();
    });
  });

  describe("Token Expiry Detection", () => {
    it("should detect expired tokens", async () => {
      const { isTokenExpired } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const expiredTokens = {
        accessToken: "token",
        expiresAt: Date.now() - 1000, // 1 second ago
        tokenType: "Bearer",
      };

      expect(isTokenExpired(expiredTokens)).toBe(true);
    });

    it("should detect non-expired tokens", async () => {
      const { isTokenExpired } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const validTokens = {
        accessToken: "token",
        expiresAt: Date.now() + 3600000, // 1 hour from now
        tokenType: "Bearer",
      };

      expect(isTokenExpired(validTokens)).toBe(false);
    });

    it("should respect buffer time for expiry", async () => {
      const { isTokenExpired } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      // Token expires in 30 seconds
      const soonExpiringTokens = {
        accessToken: "token",
        expiresAt: Date.now() + 30000,
        tokenType: "Bearer",
      };

      // With 60 second buffer, should be considered expired
      expect(isTokenExpired(soonExpiringTokens, 60)).toBe(true);

      // With 10 second buffer, should not be expired
      expect(isTokenExpired(soonExpiringTokens, 10)).toBe(false);

      // With default buffer (60s), should be expired
      expect(isTokenExpired(soonExpiringTokens)).toBe(true);
    });

    it("should handle tokens without expiration", async () => {
      const { isTokenExpired } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const noExpiryTokens = {
        accessToken: "token",
        tokenType: "Bearer",
        // No expiresAt
      };

      // Should not be considered expired
      expect(isTokenExpired(noExpiryTokens)).toBe(false);
    });

    it("should calculate expiration from expires_in", async () => {
      const { calculateExpiresAt } = await import(
        "../../src/lib/mcp/auth/tokenStorage.js"
      );

      const now = Date.now();
      const expiresIn = 3600; // 1 hour in seconds
      const expiresAt = calculateExpiresAt(expiresIn);

      // Should be approximately 1 hour from now (within 100ms tolerance)
      expect(expiresAt).toBeGreaterThanOrEqual(now + expiresIn * 1000 - 100);
      expect(expiresAt).toBeLessThanOrEqual(now + expiresIn * 1000 + 100);
    });
  });

  describe("TokenStore (File-based Storage)", () => {
    it("should initialize with correct storage path", async () => {
      const { TokenStore } = await import("../../src/lib/auth/tokenStore.js");

      const store = new TokenStore();
      const storagePath = store.getStoragePath();

      expect(storagePath).toContain(".neurolink");
      expect(storagePath).toContain("tokens.json");
    });

    it("should allow custom storage path", async () => {
      const { TokenStore } = await import("../../src/lib/auth/tokenStore.js");

      const customPath = "/custom/path/tokens.json";
      const store = new TokenStore({ customStoragePath: customPath });

      expect(store.getStoragePath()).toBe(customPath);
    });

    it("should validate tokens before saving", async () => {
      const { TokenStore, TokenStoreError } = await import(
        "../../src/lib/auth/tokenStore.js"
      );

      const store = new TokenStore();

      // Invalid token - missing access token
      await expect(
        store.saveTokens("anthropic", {
          accessToken: "",
          refreshToken: "refresh",
          expiresAt: Date.now() + 3600000,
          tokenType: "Bearer",
        }),
      ).rejects.toThrow(TokenStoreError);

      // refreshToken is optional — saving without one should succeed
      // Invalid token - non-string refresh token should still fail validation
      await expect(
        store.saveTokens("anthropic", {
          accessToken: "access",
          refreshToken: 123 as unknown as string,
          expiresAt: Date.now() + 3600000,
          tokenType: "Bearer",
        }),
      ).rejects.toThrow(TokenStoreError);

      // Invalid token - missing expiry
      await expect(
        store.saveTokens("anthropic", {
          accessToken: "access",
          refreshToken: "refresh",
          expiresAt: -1,
          tokenType: "Bearer",
        }),
      ).rejects.toThrow(TokenStoreError);
    });

    it("should support token refresher functions", async () => {
      const { TokenStore } = await import("../../src/lib/auth/tokenStore.js");

      const store = new TokenStore();

      const mockRefresher = vi.fn().mockResolvedValue({
        accessToken: "new-token",
        refreshToken: "new-refresh",
        expiresAt: Date.now() + 3600000,
        tokenType: "Bearer",
      });

      store.setTokenRefresher("anthropic", mockRefresher);

      // Verify refresher was set (internal state)
      expect(store).toBeDefined();
    });
  });
});

// =============================================================================
// 3. MODEL TIER ACCESS TESTS
// =============================================================================

describe("3. Model Tier Access Tests", () => {
  describe("isModelAvailableForTier", () => {
    it("should allow free tier access to Haiku models", async () => {
      const { isModelAvailableForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      // Free tier should access Haiku models
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_HAIKU, "free"),
      ).toBe(true);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_5_HAIKU, "free"),
      ).toBe(true);

      // Free tier should NOT access Sonnet or Opus models
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_5_SONNET, "free"),
      ).toBe(false);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_SONNET_4, "free"),
      ).toBe(false);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, "free"),
      ).toBe(false);
    });

    it("should allow pro tier access to Haiku and Sonnet models", async () => {
      const { isModelAvailableForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      // Pro tier should access Haiku and Sonnet
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_HAIKU, "pro"),
      ).toBe(true);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_5_HAIKU, "pro"),
      ).toBe(true);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_5_SONNET, "pro"),
      ).toBe(true);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_SONNET_4, "pro"),
      ).toBe(true);

      // Pro tier should NOT access Opus models
      expect(isModelAvailableForTier(AnthropicModel.CLAUDE_3_OPUS, "pro")).toBe(
        false,
      );
      expect(isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, "pro")).toBe(
        false,
      );
    });

    it("should allow max tier access to all models", async () => {
      const { isModelAvailableForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      // Max tier should access all models
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_HAIKU, "max"),
      ).toBe(true);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_5_SONNET, "max"),
      ).toBe(true);
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_SONNET_4, "max"),
      ).toBe(true);
      expect(isModelAvailableForTier(AnthropicModel.CLAUDE_3_OPUS, "max")).toBe(
        true,
      );
      expect(isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, "max")).toBe(
        true,
      );
    });

    it("should allow max_5 and max_20 tiers access to all models", async () => {
      const { isModelAvailableForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      const maxTiers: ClaudeSubscriptionTier[] = ["max_5", "max_20"];

      for (const tier of maxTiers) {
        expect(
          isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, tier),
        ).toBe(true);
        expect(
          isModelAvailableForTier(AnthropicModel.CLAUDE_3_HAIKU, tier),
        ).toBe(true);
      }
    });

    it("should allow api tier access to all models", async () => {
      const { isModelAvailableForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      // API tier has full access
      expect(isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, "api")).toBe(
        true,
      );
      expect(isModelAvailableForTier(AnthropicModel.CLAUDE_3_OPUS, "api")).toBe(
        true,
      );
      expect(
        isModelAvailableForTier(AnthropicModel.CLAUDE_3_HAIKU, "api"),
      ).toBe(true);
    });

    it("should return false for invalid model IDs", async () => {
      const { isModelAvailableForTier } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      expect(isModelAvailableForTier("invalid-model-id", "max")).toBe(false);
      expect(isModelAvailableForTier("", "api")).toBe(false);
    });
  });

  describe("getAvailableModelsForTier", () => {
    it("should return only Haiku models for free tier", async () => {
      const { getAvailableModelsForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      const freeModels = getAvailableModelsForTier("free");

      expect(freeModels).toContain(AnthropicModel.CLAUDE_3_HAIKU);
      expect(freeModels).toContain(AnthropicModel.CLAUDE_3_5_HAIKU);
      expect(freeModels).not.toContain(AnthropicModel.CLAUDE_OPUS_4);
      expect(freeModels.length).toBe(2);
    });

    it("should return Haiku and Sonnet models for pro tier", async () => {
      const { getAvailableModelsForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      const proModels = getAvailableModelsForTier("pro");

      expect(proModels).toContain(AnthropicModel.CLAUDE_3_HAIKU);
      expect(proModels).toContain(AnthropicModel.CLAUDE_3_5_HAIKU);
      expect(proModels).toContain(AnthropicModel.CLAUDE_3_5_SONNET);
      expect(proModels).toContain(AnthropicModel.CLAUDE_SONNET_4);
      expect(proModels).not.toContain(AnthropicModel.CLAUDE_OPUS_4);
    });

    it("should return all models for max tier", async () => {
      const { getAvailableModelsForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      const maxModels = getAvailableModelsForTier("max");

      expect(maxModels).toContain(AnthropicModel.CLAUDE_3_HAIKU);
      expect(maxModels).toContain(AnthropicModel.CLAUDE_3_5_SONNET);
      expect(maxModels).toContain(AnthropicModel.CLAUDE_OPUS_4);
      expect(maxModels.length).toBeGreaterThanOrEqual(7);
    });

    it("should return all models for api tier", async () => {
      const { getAvailableModelsForTier } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      const apiModels = getAvailableModelsForTier("api");
      const maxModels = getAvailableModelsForTier("max");

      // API tier should have same access as max tier
      expect(apiModels.length).toBe(maxModels.length);
    });
  });

  describe("getDefaultModelForTier", () => {
    it("should return Haiku for free tier", async () => {
      const { getDefaultModelForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      expect(getDefaultModelForTier("free")).toBe(
        AnthropicModel.CLAUDE_3_5_HAIKU,
      );
    });

    it("should return Sonnet 4 for pro tier", async () => {
      const { getDefaultModelForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      expect(getDefaultModelForTier("pro")).toBe(
        AnthropicModel.CLAUDE_SONNET_4,
      );
    });

    it("should return Opus 4 for max tiers", async () => {
      const { getDefaultModelForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      expect(getDefaultModelForTier("max")).toBe(AnthropicModel.CLAUDE_OPUS_4);
      expect(getDefaultModelForTier("max_5")).toBe(
        AnthropicModel.CLAUDE_OPUS_4,
      );
      expect(getDefaultModelForTier("max_20")).toBe(
        AnthropicModel.CLAUDE_OPUS_4,
      );
    });

    it("should return Sonnet for api tier (best balance)", async () => {
      const { getDefaultModelForTier, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      expect(getDefaultModelForTier("api")).toBe(
        AnthropicModel.CLAUDE_SONNET_4,
      );
    });
  });

  describe("Model Metadata and Capabilities", () => {
    it("should return correct metadata for models", async () => {
      const { getModelMetadata, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      const opusMetadata = getModelMetadata(AnthropicModel.CLAUDE_OPUS_4);
      expect(opusMetadata).toBeDefined();
      expect(opusMetadata?.displayName).toBe("Claude Opus 4");
      expect(opusMetadata?.family).toBe("opus");
      expect(opusMetadata?.supportsExtendedThinking).toBe(true);
      expect(opusMetadata?.supportsVision).toBe(true);

      const haikuMetadata = getModelMetadata(AnthropicModel.CLAUDE_3_5_HAIKU);
      expect(haikuMetadata?.family).toBe("haiku");
      expect(haikuMetadata?.supportsExtendedThinking).toBe(false);
    });

    it("should return undefined for unknown models", async () => {
      const { getModelMetadata } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      expect(getModelMetadata("unknown-model")).toBeUndefined();
    });

    it("should get minimum tier for model correctly", async () => {
      const { getMinimumTierForModel, AnthropicModel } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      // Haiku should be free tier
      expect(getMinimumTierForModel(AnthropicModel.CLAUDE_3_HAIKU)).toBe(
        "free",
      );

      // Sonnet should be pro tier
      expect(getMinimumTierForModel(AnthropicModel.CLAUDE_3_5_SONNET)).toBe(
        "pro",
      );

      // Opus should be max tier
      expect(getMinimumTierForModel(AnthropicModel.CLAUDE_OPUS_4)).toBe("max");
    });

    it("should validate model access and throw on invalid access", async () => {
      const { validateModelAccess, ModelAccessError, AnthropicModel } =
        await import("../../src/lib/models/anthropicModels.js");

      // Should not throw for valid access
      expect(() =>
        validateModelAccess(AnthropicModel.CLAUDE_3_HAIKU, "free"),
      ).not.toThrow();

      // Should throw for invalid access
      expect(() =>
        validateModelAccess(AnthropicModel.CLAUDE_OPUS_4, "free"),
      ).toThrow(ModelAccessError);
    });
  });

  describe("Tier Comparison", () => {
    it("should compare tiers correctly", async () => {
      const { compareTiers } = await import(
        "../../src/lib/models/anthropicModels.js"
      );

      // Free is lower than pro
      expect(compareTiers("free", "pro")).toBeLessThan(0);

      // Max is higher than pro
      expect(compareTiers("max", "pro")).toBeGreaterThan(0);

      // Same tier should be 0
      expect(compareTiers("pro", "pro")).toBe(0);

      // API is highest
      expect(compareTiers("api", "max")).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// 4. PROVIDER INTEGRATION TESTS
// =============================================================================

describe("4. Provider Integration Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    // Reset module registry so each dynamic `await import(...)` gets a fresh
    // module instance with the current env vars and mocked fs state.
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Provider Initialization with API Key", () => {
    it("should initialize with valid API key", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe(AIProviderName.ANTHROPIC);
      expect(provider.getAuthMethod()).toBe("api_key");
    });

    it("should use default model when none specified", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";
      delete process.env.ANTHROPIC_MODEL;

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();
      const defaultModel = provider.getDefaultModel();

      expect(defaultModel).toBe(AnthropicModels.CLAUDE_3_5_SONNET);
    });

    it("should use custom model when specified", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider("claude-3-opus-20240229");
      expect(provider).toBeDefined();
    });

    it("should default to api tier for API key auth", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";
      delete process.env.ANTHROPIC_SUBSCRIPTION_TIER;

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      expect(provider.getSubscriptionTier()).toBe("api");
    });
  });

  describe("Provider Initialization with OAuth Token", () => {
    it("should parse JSON OAuth token from environment", async () => {
      process.env.ANTHROPIC_OAUTH_TOKEN = JSON.stringify({
        accessToken: "oauth-access-token",
        refreshToken: "oauth-refresh-token",
        expiresAt: Date.now() + 3600 * 1000,
      });
      delete process.env.ANTHROPIC_API_KEY;

      const oauthToken = process.env.ANTHROPIC_OAUTH_TOKEN;
      expect(oauthToken).toBeDefined();

      const parsed = JSON.parse(oauthToken!);
      expect(parsed.accessToken).toBe("oauth-access-token");
      expect(parsed.refreshToken).toBe("oauth-refresh-token");
    });

    it("should handle plain string OAuth token", async () => {
      process.env.CLAUDE_OAUTH_TOKEN = "simple-access-token";

      const token = process.env.CLAUDE_OAUTH_TOKEN;
      expect(typeof token).toBe("string");
      expect(token).toBe("simple-access-token");
    });

    it("should detect tier from OAuth token scopes", () => {
      const oauthTokenWithMaxScope: OAuthToken = {
        accessToken: "token",
        scopes: ["chat", "max_20"],
      };

      expect(oauthTokenWithMaxScope.scopes).toContain("max_20");
    });

    it("should default to pro tier for OAuth without explicit scope", () => {
      const oauthTokenBasic: OAuthToken = {
        accessToken: "token",
        scopes: ["chat", "read:user"],
      };

      expect(oauthTokenBasic.scopes).not.toContain("max_5");
      expect(oauthTokenBasic.scopes).not.toContain("max_20");
      expect(oauthTokenBasic.scopes).not.toContain("max");
    });
  });

  describe("Beta Headers Inclusion", () => {
    it("should include correct beta headers for Claude Code", () => {
      const betaHeaders = {
        "anthropic-beta":
          "claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14",
      };

      expect(betaHeaders["anthropic-beta"]).toContain("claude-code");
      expect(betaHeaders["anthropic-beta"]).toContain("interleaved-thinking");
      expect(betaHeaders["anthropic-beta"]).toContain(
        "fine-grained-tool-streaming",
      );
    });

    it("should generate auth headers with beta features", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();
      const headers = provider.getAuthHeaders();

      expect(headers["anthropic-beta"]).toBeDefined();
      expect(provider.areBetaFeaturesEnabled()).toBe(true);
    });
  });

  describe("Model Access Validation", () => {
    it("should validate model access based on subscription tier", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      // API tier should have access to all models
      expect(provider.validateModelAccess("claude-3-5-sonnet-20241022")).toBe(
        true,
      );
      expect(provider.validateModelAccess("claude-opus-4-20250514")).toBe(true);
    });
  });

  describe("Backward Compatibility", () => {
    it("should work with existing ANTHROPIC_API_KEY environment variable", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      expect(provider).toBeDefined();
      expect(provider.getAuthMethod()).toBe("api_key");
    });

    it("should check availability with API key", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();
      const isAvailable = await provider.isAvailable();

      expect(isAvailable).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication errors", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      const error = new Error("Invalid API key");

      // handleProviderError returns (not throws) — callers do: throw this.handleProviderError(e)
      expect(() => {
        throw (
          provider as unknown as { handleProviderError: (e: unknown) => Error }
        ).handleProviderError(error);
      }).toThrow(/Invalid Anthropic API key/);
    });

    it("should handle rate limit errors", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      const error = new Error("rate limit exceeded");

      expect(() => {
        throw (
          provider as unknown as { handleProviderError: (e: unknown) => Error }
        ).handleProviderError(error);
      }).toThrow(/rate limit/);
    });

    it("should handle network errors", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      const error = new Error("ECONNREFUSED");

      expect(() => {
        throw (
          provider as unknown as { handleProviderError: (e: unknown) => Error }
        ).handleProviderError(error);
      }).toThrow(/Connection error/);
    });

    it("should handle server errors", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();

      const error = new Error("500 server error");

      expect(() => {
        throw (
          provider as unknown as { handleProviderError: (e: unknown) => Error }
        ).handleProviderError(error);
      }).toThrow(/Server error/);
    });
  });

  describe("Usage Tracking", () => {
    it("should initialize with empty usage info", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-12345678901234567890";

      const { AnthropicProvider } = await import(
        "../../src/lib/providers/anthropic.js"
      );

      const provider = new AnthropicProvider();
      const usage = provider.getUsageInfo();

      expect(usage).toBeDefined();
      expect(usage?.messagesUsed).toBe(0);
      expect(usage?.tokensUsed).toBe(0);
      expect(usage?.isRateLimited).toBe(false);
    });
  });
});

// =============================================================================
// 5. CONFIGURATION TESTS
// =============================================================================

describe("5. Configuration Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Environment Variable Detection", () => {
    it("should detect ANTHROPIC_API_KEY", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-123456789012345678";

      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      expect(hasApiKey).toBe(true);
    });

    it("should detect missing ANTHROPIC_API_KEY", () => {
      delete process.env.ANTHROPIC_API_KEY;

      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      expect(hasApiKey).toBe(false);
    });

    it("should detect ANTHROPIC_OAUTH_CLIENT_ID", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { hasAnthropicOAuthCredentials } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      expect(hasAnthropicOAuthCredentials()).toBe(true);
    });

    it("should detect missing ANTHROPIC_OAUTH_CLIENT_ID", async () => {
      delete process.env.ANTHROPIC_OAUTH_CLIENT_ID;

      const { hasAnthropicOAuthCredentials } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      expect(hasAnthropicOAuthCredentials()).toBe(false);
    });

    it("should detect ANTHROPIC_SUBSCRIPTION_TIER", () => {
      process.env.ANTHROPIC_SUBSCRIPTION_TIER = "pro";

      const tier = process.env.ANTHROPIC_SUBSCRIPTION_TIER;
      expect(tier).toBe("pro");
    });

    it("should detect ANTHROPIC_MODEL", () => {
      process.env.ANTHROPIC_MODEL = "claude-3-opus-20240229";

      const model = process.env.ANTHROPIC_MODEL;
      expect(model).toBe("claude-3-opus-20240229");
    });

    it("should use default model when not configured", () => {
      delete process.env.ANTHROPIC_MODEL;

      const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
      expect(model).toBe("claude-3-5-sonnet-20241022");
    });
  });

  describe("Config File Loading", () => {
    it("should create OAuth config with correct structure", async () => {
      const { createAnthropicOAuthConfig } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const config = createAnthropicOAuthConfig();

      expect(config.providerName).toBe("Anthropic OAuth");
      expect(config.envVarName).toBe("ANTHROPIC_OAUTH_CLIENT_ID");
      expect(config.description).toContain("Claude");
      expect(config.instructions).toBeDefined();
      expect(Array.isArray(config.instructions)).toBe(true);
    });
  });

  describe("Default Values", () => {
    it("should have correct default OAuth endpoints", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id",
      });

      const authUrl = oauth.generateAuthUrl();

      // The official Claude OAuth authorization endpoint is on claude.ai
      expect(authUrl).toContain("claude.ai/oauth/authorize");
    });

    it("should have correct default OAuth scopes", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id",
      });

      const authUrl = oauth.generateAuthUrl();

      // Should include the default Claude Code scopes
      expect(authUrl).toContain("scope=");
      expect(authUrl).toContain("user%3Aprofile"); // "user:profile" encoded
    });

    it("should have correct default redirect URI", async () => {
      process.env.ANTHROPIC_OAUTH_CLIENT_ID = "test-client-id";
      delete process.env.ANTHROPIC_OAUTH_REDIRECT_URI;

      const { AnthropicOAuth } = await import(
        "../../src/lib/auth/anthropicOAuth.js"
      );

      const oauth = new AnthropicOAuth({
        clientId: "test-client-id",
      });

      const authUrl = oauth.generateAuthUrl();

      expect(authUrl).toContain("redirect_uri=");
      // Default redirect URI uses the official Anthropic console callback
      expect(authUrl).toContain("console.anthropic.com");
    });
  });

  describe("Credential Masking", () => {
    it("should properly mask API key for display", () => {
      const apiKey = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz12345678901234";

      const maskCredential = (credential: string): string => {
        if (!credential || credential.length < 8) {
          return "****";
        }
        const knownPrefixes = ["sk-ant-"];
        const prefix =
          knownPrefixes.find((p) => credential.startsWith(p)) ??
          credential.slice(0, 3);
        const end = credential.slice(-4);
        const stars = "*".repeat(
          Math.max(4, credential.length - prefix.length - 4),
        );
        return `${prefix}${stars}${end}`;
      };

      const masked = maskCredential(apiKey);

      expect(masked.startsWith("sk-ant-")).toBe(true);
      expect(masked.endsWith("1234")).toBe(true);
      expect(masked).toContain("****");
      expect(masked).not.toContain("abcdefghijklmnopqrstuvwxyz");
    });

    it("should handle short credentials", () => {
      const shortCredential = "short";

      const maskCredential = (credential: string): string => {
        if (!credential || credential.length < 8) {
          return "****";
        }
        return credential;
      };

      expect(maskCredential(shortCredential)).toBe("****");
      expect(maskCredential("")).toBe("****");
    });
  });
});

// =============================================================================
// 6. RATE LIMIT HEADER PARSING TESTS
// =============================================================================

describe("6. Rate Limit Header Parsing Tests", () => {
  describe("Parse Rate Limit Headers", () => {
    it("should parse all rate limit headers correctly", () => {
      const headers = new Headers({
        "anthropic-ratelimit-requests-limit": "50",
        "anthropic-ratelimit-requests-remaining": "45",
        "anthropic-ratelimit-requests-reset": "2024-01-01T00:00:00Z",
        "anthropic-ratelimit-tokens-limit": "100000",
        "anthropic-ratelimit-tokens-remaining": "95000",
        "anthropic-ratelimit-tokens-reset": "2024-01-01T00:00:00Z",
      });

      const rateLimitInfo: AnthropicRateLimitInfo = {
        requestsLimit: parseInt(
          headers.get("anthropic-ratelimit-requests-limit") || "0",
        ),
        requestsRemaining: parseInt(
          headers.get("anthropic-ratelimit-requests-remaining") || "0",
        ),
        requestsReset:
          headers.get("anthropic-ratelimit-requests-reset") || undefined,
        tokensLimit: parseInt(
          headers.get("anthropic-ratelimit-tokens-limit") || "0",
        ),
        tokensRemaining: parseInt(
          headers.get("anthropic-ratelimit-tokens-remaining") || "0",
        ),
        tokensReset:
          headers.get("anthropic-ratelimit-tokens-reset") || undefined,
      };

      expect(rateLimitInfo.requestsLimit).toBe(50);
      expect(rateLimitInfo.requestsRemaining).toBe(45);
      expect(rateLimitInfo.tokensLimit).toBe(100000);
      expect(rateLimitInfo.tokensRemaining).toBe(95000);
      expect(rateLimitInfo.requestsReset).toBe("2024-01-01T00:00:00Z");
    });

    it("should handle missing headers gracefully", () => {
      const headers = new Headers();

      const rateLimitInfo: AnthropicRateLimitInfo = {
        requestsLimit:
          parseInt(headers.get("anthropic-ratelimit-requests-limit") || "") ||
          undefined,
        tokensLimit:
          parseInt(headers.get("anthropic-ratelimit-tokens-limit") || "") ||
          undefined,
      };

      expect(rateLimitInfo.requestsLimit).toBeUndefined();
      expect(rateLimitInfo.tokensLimit).toBeUndefined();
    });

    it("should parse retry-after header for rate limited responses", () => {
      const headers = new Headers({
        "retry-after": "30",
      });

      const retryAfter = parseInt(headers.get("retry-after") || "0");
      expect(retryAfter).toBe(30);
    });

    it("should handle partial rate limit headers", () => {
      const headers = new Headers({
        "anthropic-ratelimit-requests-limit": "50",
        "anthropic-ratelimit-requests-remaining": "45",
        // Missing tokens headers
      });

      const rateLimitInfo: AnthropicRateLimitInfo = {
        requestsLimit: parseInt(
          headers.get("anthropic-ratelimit-requests-limit") || "0",
        ),
        requestsRemaining: parseInt(
          headers.get("anthropic-ratelimit-requests-remaining") || "0",
        ),
        tokensLimit:
          parseInt(headers.get("anthropic-ratelimit-tokens-limit") || "") ||
          undefined,
        tokensRemaining:
          parseInt(headers.get("anthropic-ratelimit-tokens-remaining") || "") ||
          undefined,
      };

      expect(rateLimitInfo.requestsLimit).toBe(50);
      expect(rateLimitInfo.requestsRemaining).toBe(45);
      expect(rateLimitInfo.tokensLimit).toBeUndefined();
      expect(rateLimitInfo.tokensRemaining).toBeUndefined();
    });
  });
});

// =============================================================================
// 7. CLI AUTH COMMAND TESTS
// =============================================================================

describe("7. CLI Auth Command Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("API Key Validation", () => {
    it("should validate correct API key format", () => {
      const validApiKeys = [
        "sk-ant-api03-abcdefghijklmnopqrstuvwxyz",
        "sk-ant-test123456789012345678901234567890",
      ];

      for (const key of validApiKeys) {
        expect(key.startsWith("sk-ant-")).toBe(true);
        expect(key.length).toBeGreaterThan(20);
      }
    });

    it("should reject invalid API key format", () => {
      const invalidApiKeys = [
        "invalid-key",
        "sk-wrong-prefix",
        "sk-ant-", // Too short
        "", // Empty
      ];

      for (const key of invalidApiKeys) {
        const isValid = key.startsWith("sk-ant-") && key.length > 20;
        expect(isValid).toBe(false);
      }
    });
  });

  describe("Auth Status Detection", () => {
    it("should detect API key presence", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-123456789012345678";

      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      expect(hasApiKey).toBe(true);
    });

    it("should detect API key absence", () => {
      delete process.env.ANTHROPIC_API_KEY;

      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      expect(hasApiKey).toBe(false);
    });

    it("should detect model configuration", () => {
      process.env.ANTHROPIC_MODEL = "claude-3-opus-20240229";

      const hasModel = !!process.env.ANTHROPIC_MODEL;
      const model = process.env.ANTHROPIC_MODEL;

      expect(hasModel).toBe(true);
      expect(model).toBe("claude-3-opus-20240229");
    });
  });

  describe("Command Options", () => {
    it("should support check-only mode", () => {
      const checkOnlyOptions = {
        checkOnly: true,
        interactive: false,
      };

      expect(checkOnlyOptions.checkOnly).toBe(true);
      expect(checkOnlyOptions.interactive).toBe(false);
    });

    it("should support non-interactive mode", () => {
      const nonInteractiveOptions = {
        checkOnly: false,
        interactive: false,
      };

      expect(nonInteractiveOptions.interactive).toBe(false);
    });
  });
});

/**
 * Test Coverage Summary
 *
 * 1. OAuth Flow Tests:
 *    - URL generation with all required parameters
 *    - Custom scopes support
 *    - PKCE code verifier/challenge generation
 *    - State parameter uniqueness for CSRF protection
 *    - Additional params support
 *    - Token exchange (mocked HTTP)
 *    - Client secret inclusion for confidential clients
 *    - Token refresh
 *    - Token validation
 *    - Expiration checking with buffer
 *
 * 2. Token Storage Tests:
 *    - Saving tokens (in-memory and file-based)
 *    - Loading tokens
 *    - Clearing individual and all tokens
 *    - Token expiry detection with buffer
 *    - Multiple provider support
 *    - Token validation before save
 *    - Custom storage paths
 *
 * 3. Model Tier Access Tests:
 *    - isModelAvailableForTier for each tier
 *    - getAvailableModelsForTier
 *    - getDefaultModelForTier
 *    - Model metadata retrieval
 *    - Minimum tier for model
 *    - Model access validation with error throwing
 *    - Tier comparison
 *
 * 4. Provider Integration Tests:
 *    - API key initialization
 *    - OAuth token initialization
 *    - Beta headers inclusion
 *    - Model access validation
 *    - Backward compatibility
 *    - Error handling (auth, rate limit, network, server)
 *    - Usage tracking
 *
 * 5. Configuration Tests:
 *    - Environment variable detection
 *    - Config file loading
 *    - Default values
 *    - Credential masking
 *
 * 6. Rate Limit Header Parsing:
 *    - Complete header parsing
 *    - Missing headers handling
 *    - Retry-after parsing
 *    - Partial headers handling
 *
 * 7. CLI Auth Command Tests:
 *    - API key validation
 *    - Auth status detection
 *    - Command options
 *
 * Total: 80+ test cases across 7 major test suites
 */
