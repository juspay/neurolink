/**
 * SessionIdentity — generates unique user_id / session_id values per account
 * so that Anthropic sees consistent "user" fingerprints even when requests are
 * spread across multiple accounts.
 *
 * The generated metadata matches Claude Code's shape:
 *   {"device_id":"<64 hex>","account_uuid":"<uuid>","session_id":"<uuid>"}
 */

import type { CloakingPlugin, CloakingContext } from "../../../types/index.js";
import {
  getOrCreateClaudeCodeIdentity,
  purgeExpiredClaudeCodeIdentities,
} from "../../../auth/anthropicOAuth.js";

export function purgeExpiredSessions(): void {
  purgeExpiredClaudeCodeIdentities();
}

export function createSessionIdentity(): CloakingPlugin {
  return {
    name: "session-identity",
    order: 20,
    enabled: true,

    async transformRequest(ctx: CloakingContext): Promise<CloakingContext> {
      const accountId = ctx.account.id;
      const identity = getOrCreateClaudeCodeIdentity(accountId, {
        existingUserId: (
          ctx.request.body.metadata as Record<string, unknown> | undefined
        )?.user_id,
      });

      const body = { ...ctx.request.body };
      // Only set user_id if not already present — in passthrough mode,
      // oauthFetch.ts owns this field and sets it from the shared helper.
      if (!(body.metadata as Record<string, unknown> | undefined)?.user_id) {
        body.metadata = {
          ...(body.metadata as Record<string, unknown> | undefined),
          user_id: identity.metadataUserId,
        };
      }

      return {
        ...ctx,
        request: {
          ...ctx.request,
          body,
        },
      };
    },
  };
}
