/**
 * HeaderReplay — polyfills missing headers from stored snapshots.
 *
 * When a request comes through the proxy without the full set of headers
 * that a real Claude Code client would send (x-stainless-*, anthropic-beta,
 * user-agent, etc.), this plugin injects the missing headers from a
 * previously recorded snapshot for the same account.
 *
 * This enables "replay mode" where non-Claude-Code clients can make
 * requests that look identical to real Claude Code requests.
 *
 * Order: 5 (runs BEFORE headerScrubber at 10, so scrubber can still
 * strip anything it needs to after replay).
 */

import type { CloakingPlugin, CloakingContext } from "../../../types/index.js";
import { polyfillHeaders, saveHeaderSnapshot } from "../../headerSnapshot.js";

export function createHeaderReplay(): CloakingPlugin {
  return {
    name: "header-replay",
    order: 5,
    enabled: true,

    async transformRequest(ctx: CloakingContext): Promise<CloakingContext> {
      const accountKey = ctx.account.id;
      const headers = ctx.request.headers;

      // Build a flat record of current headers (skip undefined values)
      const current: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string") {
          current[key.toLowerCase()] = value;
        }
      }

      // Polyfill missing headers from the stored snapshot
      const polyfilled = await polyfillHeaders(accountKey, current);

      if (polyfilled > 0) {
        // Merge polyfilled headers back into the request
        const merged: Record<string, string | undefined> = {};
        for (const [key, value] of Object.entries(current)) {
          merged[key] = value;
        }
        return {
          ...ctx,
          request: {
            ...ctx.request,
            headers: merged,
          },
        };
      }

      return ctx;
    },

    async transformResponse(ctx: CloakingContext): Promise<CloakingContext> {
      // On response, record the request headers for future replay.
      // The cloaking pipeline only runs on successful upstream calls,
      // so any response reaching here is worth recording.
      if (ctx.response) {
        const accountKey = ctx.account.id;
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(ctx.request.headers)) {
          if (typeof value === "string") {
            headers[key] = value;
          }
        }
        saveHeaderSnapshot(accountKey, headers);
      }

      return ctx;
    },
  };
}
