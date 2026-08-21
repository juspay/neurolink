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
      results.push({ id: client.id, displayName: client.displayName, applied });
    } catch (error) {
      results.push({
        id: client.id,
        displayName: client.displayName,
        applied: false,
        error: error instanceof Error ? error : new Error(String(error)),
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
      results.push({
        id: client.id,
        displayName: client.displayName,
        restored: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  return results;
}
