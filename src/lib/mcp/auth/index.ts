/**
 * MCP Authentication Module
 * OAuth 2.1 authentication support for MCP HTTP transport
 */

// Note: OAuth types (OAuthTokens, TokenStorage, MCPOAuthConfig, etc.)
// should be imported directly from the types folder: src/lib/types/mcpTypes.ts
// Consumers should use: import type { MCPOAuthConfig } from "@juspay/neurolink"

// Token storage implementations
export {
  InMemoryTokenStorage,
  FileTokenStorage,
  isTokenExpired,
  calculateExpiresAt,
} from "./tokenStorage.js";

// OAuth client provider
export {
  NeuroLinkOAuthProvider,
  createOAuthProviderFromConfig,
} from "./oauthClientProvider.js";
