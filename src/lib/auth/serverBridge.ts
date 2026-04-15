/**
 * Bridge between auth providers and NeuroLink's server middleware.
 * Converts an auth provider's authenticateToken() into the validate
 * callback expected by the existing createAuthMiddleware.
 */

import type { AuthRequestContext, AuthProvider } from "../types/index.js";

/**
 * Create a validate function for server auth middleware from an auth provider.
 */
export function createAuthValidatorFromProvider(
  provider: AuthProvider,
): (
  token: string,
  ctx: unknown,
) => Promise<{ id: string; email?: string; roles?: string[] } | null> {
  return async (token: string, ctx: unknown) => {
    const result = await provider.authenticateToken(
      token,
      ctx as AuthRequestContext | undefined,
    );
    if (!result.valid) {
      return null;
    }
    if (result.user) {
      return {
        id: result.user.id,
        email: result.user.email,
        roles: result.user.roles,
      };
    }
    // Fail closed: valid token without a resolved user is treated as failure
    return null;
  };
}
