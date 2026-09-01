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

registerLocalUsageReader({
  descriptor: {
    id: "opencode",
    displayName: "OpenCode",
    verified: true,
    dedupStrategy: "rowid-high-water-mark",
    costConfidence: "unavailable",
    requiresSqlite: true,
  },
  factory: async () => {
    const { createOpenCodeReader } = await import("./openCodeReader.js");
    return createOpenCodeReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "qwen-code",
    displayName: "Qwen Code",
    verified: true,
    dedupStrategy: "message-id-keep-max",
    costConfidence: "unavailable",
    requiresSqlite: false,
  },
  factory: async () => {
    const { createQwenCodeReader } = await import("./qwenCodeReader.js");
    return createQwenCodeReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "gemini-cli",
    displayName: "Gemini CLI",
    verified: true,
    dedupStrategy: "message-id-keep-max",
    costConfidence: "unavailable",
    requiresSqlite: false,
  },
  factory: async () => {
    const { createGeminiCliReader } = await import("./geminiCliReader.js");
    return createGeminiCliReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "copilot",
    displayName: "Copilot CLI",
    verified: true,
    dedupStrategy: "rowid-high-water-mark",
    costConfidence: "unavailable",
    requiresSqlite: true,
  },
  factory: async () => {
    const { createCopilotCliReader } = await import("./copilotCliReader.js");
    return createCopilotCliReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "cursor",
    displayName: "Cursor",
    verified: true,
    dedupStrategy: "last-write-wins",
    costConfidence: "unavailable",
    requiresSqlite: true,
    requestUnit: "session-snapshot",
  },
  factory: async () => {
    const { createCursorReader } = await import("./cursorReader.js");
    return createCursorReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "grok",
    displayName: "Grok Build",
    verified: true,
    dedupStrategy: "last-write-wins",
    costConfidence: "unavailable",
    requiresSqlite: false,
  },
  factory: async () => {
    const { createGrokReader } = await import("./grokReader.js");
    return createGrokReader();
  },
});

registerLocalUsageReader({
  descriptor: {
    id: "hermes",
    displayName: "Hermes Agent",
    verified: true,
    dedupStrategy: "last-write-wins",
    costConfidence: "modeled",
    requiresSqlite: true,
  },
  factory: async () => {
    const { createHermesReader } = await import("./hermesReader.js");
    return createHermesReader();
  },
});
