import { logger } from "../../lib/utils/logger.js";
import type {
  CliProxyClientApplyResult,
  CliProxyClientConfigurator,
  CliProxyClientRestoreResult,
} from "../../lib/types/index.js";
import { claudeCodeConfigurator } from "./claudeCode.js";
import { openCodeConfigurator } from "./openCode.js";
import { codexConfigurator } from "./codex.js";
import { qwenCodeConfigurator } from "./qwenCode.js";
import { copilotConfigurator } from "./copilot.js";
import { geminiConfigurator } from "./gemini.js";

/**
 * Every CLI the proxy auto-configures, in apply order.
 *
 * Order is behaviour: it is the order messages appear during `proxy start`.
 * Restore runs in the same order.
 */
export const PROXY_CLIENT_CONFIGURATORS: readonly CliProxyClientConfigurator[] =
  [
    claudeCodeConfigurator,
    openCodeConfigurator,
    codexConfigurator,
    qwenCodeConfigurator,
    copilotConfigurator,
    geminiConfigurator,
  ];

/**
 * Point every detected client at the proxy.
 *
 * One client failing must never stop the others, so each is wrapped
 * independently and its error is returned rather than thrown. Callers decide
 * how loudly to report — the daemon-start path logs failures at debug level
 * while the setup wizard prints a visible warning.
 */
export async function applyAllClients(
  proxyBaseUrl: string,
): Promise<CliProxyClientApplyResult[]> {
  const results: CliProxyClientApplyResult[] = [];
  for (const client of PROXY_CLIENT_CONFIGURATORS) {
    try {
      const applied = (await client.detect())
        ? await client.apply(proxyBaseUrl)
        : false;
      // Only ask for a note when something was actually written: a note on a
      // client that was skipped would read as an instruction to act on a
      // configuration that does not exist.
      //
      // Computed in its own try, outside apply()'s. A note is advisory; a
      // throwing implementation must not be able to turn a successful write
      // into `applied: false` and an error the caller reports as a failed
      // configuration. Dormant today only because the one implementation
      // swallows its own errors, which is not a property to rely on.
      let note: string | null = null;
      if (applied) {
        try {
          note = (await client.postApplyNote?.(proxyBaseUrl)) ?? null;
        } catch (noteError) {
          logger.debug(
            `[proxy] ${client.id} post-apply note failed: ${
              noteError instanceof Error ? noteError.message : String(noteError)
            }`,
          );
        }
      }
      results.push({
        id: client.id,
        displayName: client.displayName,
        applied,
        ...(note === null ? {} : { note }),
      });
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error(String(error));
      // The result already carries the id, but a caller is free to ignore it.
      // Naming the client here means a path-resolution failure (a HOME that
      // moved, a directory that vanished mid-run) is never fully silent.
      logger.debug(`[proxy] ${client.id} apply failed: ${wrapped.message}`);
      results.push({
        id: client.id,
        displayName: client.displayName,
        applied: false,
        error: wrapped,
      });
    }
  }
  return results;
}

/** Restore every client's previous configuration. See applyAllClients. */
export async function restoreAllClients(
  proxyBaseUrl: string,
): Promise<CliProxyClientRestoreResult[]> {
  const results: CliProxyClientRestoreResult[] = [];
  for (const client of PROXY_CLIENT_CONFIGURATORS) {
    try {
      results.push({
        id: client.id,
        displayName: client.displayName,
        restored: await client.restore(proxyBaseUrl),
      });
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error(String(error));
      logger.debug(`[proxy] ${client.id} restore failed: ${wrapped.message}`);
      results.push({
        id: client.id,
        displayName: client.displayName,
        restored: false,
        error: wrapped,
      });
    }
  }
  return results;
}
