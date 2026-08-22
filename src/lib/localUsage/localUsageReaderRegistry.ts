/**
 * Registry of local-usage readers, one per CLI.
 *
 * Mirrors `providerRegistry.ts`: descriptors are static and always available,
 * while the reader itself arrives through a dynamic import inside its factory.
 * Same reason as the provider registry — a static import graph across a dozen
 * readers is how circular dependencies start, and it would also force every
 * reader's cost of loading onto a caller who only wanted one of them.
 */

import type {
  LocalUsageCliId,
  LocalUsageReader,
  LocalUsageReaderDescriptor,
  LocalUsageReaderRegistration,
} from "../types/index.js";

const registry = new Map<LocalUsageCliId, LocalUsageReaderRegistration>();

export function registerLocalUsageReader(
  registration: LocalUsageReaderRegistration,
): void {
  registry.set(registration.descriptor.id, registration);
}

export function getLocalUsageDescriptors(): LocalUsageReaderDescriptor[] {
  return [...registry.values()].map((entry) => entry.descriptor);
}

export function getRegisteredLocalUsageCliIds(): LocalUsageCliId[] {
  return [...registry.keys()];
}

export async function createLocalUsageReader(
  cliId: LocalUsageCliId,
): Promise<LocalUsageReader> {
  const registration = registry.get(cliId);
  if (!registration) {
    throw new Error(
      `No local-usage reader registered for "${cliId}". Registered: ${
        getRegisteredLocalUsageCliIds().join(", ") || "(none)"
      }`,
    );
  }
  return registration.factory();
}

registerLocalUsageReader({
  descriptor: {
    id: "claude-code",
    displayName: "Claude Code",
    verified: true,
    dedupStrategy: "message-id-keep-max",
    costConfidence: "modeled",
    requiresSqlite: false,
  },
  factory: async () => {
    const { createClaudeCodeReader } = await import("./claudeCodeReader.js");
    return createClaudeCodeReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "codex",
    displayName: "Codex",
    verified: true,
    dedupStrategy: "session-dag",
    costConfidence: "unavailable",
    requiresSqlite: false,
  },
  factory: async () => {
    const { createCodexReader } = await import("./codexReader.js");
    return createCodexReader();
  },
});
