import { nanoid } from "nanoid";
import { NeuroLink } from "../neurolink.js";
import type {
  ConversationMemoryConfig,
  LoopSessionState,
  McpOutputStrategy,
  NeurolinkConstructorConfig,
  SessionVariableValue,
} from "../types/index.js";

import { buildObservabilityConfigFromEnv } from "../utils/observabilityHelpers.js";

/**
 * Build mcp.outputLimits config from environment variables.
 * Reads NEUROLINK_MCP_OUTPUT_STRATEGY and NEUROLINK_MCP_MAX_OUTPUT_BYTES.
 * Returns undefined when neither variable is set (no overhead).
 */
function buildMcpOutputLimitsFromEnv():
  | { strategy: McpOutputStrategy; maxBytes?: number; warnBytes?: number }
  | undefined {
  const strategyRaw = process.env.NEUROLINK_MCP_OUTPUT_STRATEGY;
  const maxBytesRaw = process.env.NEUROLINK_MCP_MAX_OUTPUT_BYTES;
  const warnBytesRaw = process.env.NEUROLINK_MCP_WARN_OUTPUT_BYTES;

  if (!strategyRaw && !maxBytesRaw) {
    return undefined;
  }

  const strategy: McpOutputStrategy =
    strategyRaw === "inline" || strategyRaw === "externalize"
      ? strategyRaw
      : "externalize"; // safe default when only maxBytes is set

  const maxBytes = maxBytesRaw ? parseInt(maxBytesRaw, 10) : undefined;
  const warnBytes = warnBytesRaw ? parseInt(warnBytesRaw, 10) : undefined;

  return {
    strategy,
    ...(maxBytes !== undefined && Number.isFinite(maxBytes) && maxBytes >= 0
      ? { maxBytes }
      : {}),
    ...(warnBytes !== undefined && Number.isFinite(warnBytes) && warnBytes >= 0
      ? { warnBytes }
      : {}),
  };
}

export class GlobalSessionManager {
  private static instance: GlobalSessionManager;
  private loopSession: LoopSessionState | null = null;

  static getInstance(): GlobalSessionManager {
    if (!GlobalSessionManager.instance) {
      GlobalSessionManager.instance = new GlobalSessionManager();
    }
    return GlobalSessionManager.instance;
  }

  setLoopSession(config?: ConversationMemoryConfig): string {
    const sessionId = `NL_${nanoid()}`;
    const neurolinkOptions: NeurolinkConstructorConfig = {};

    if (config?.enabled) {
      neurolinkOptions.conversationMemory = {
        enabled: true,
        maxSessions: config.maxSessions,
        maxTurnsPerSession: config.maxTurnsPerSession,
      };
    }

    // Add observability config from environment variables (CLI usage)
    const observabilityConfig = buildObservabilityConfigFromEnv();
    if (observabilityConfig) {
      neurolinkOptions.observability = observabilityConfig;
    }

    // Add MCP output limits from environment variables (CLI usage)
    const mcpOutputLimits = buildMcpOutputLimitsFromEnv();
    if (mcpOutputLimits) {
      neurolinkOptions.mcp = {
        ...neurolinkOptions.mcp,
        outputLimits: mcpOutputLimits,
      };
    }

    this.loopSession = {
      neurolinkInstance: new NeuroLink(neurolinkOptions),
      sessionId,
      isActive: true,
      conversationMemoryConfig: config,
      sessionVariables: {},
    };

    return sessionId;
  }

  /**
   * Restore a loop session with an existing sessionId and NeuroLink instance
   * Used for conversation restoration
   */
  restoreLoopSession(
    sessionId: string,
    neurolinkInstance: NeuroLink,
    config?: ConversationMemoryConfig,
    sessionVariables?: Record<string, SessionVariableValue>,
  ): void {
    this.loopSession = {
      neurolinkInstance,
      sessionId,
      isActive: true,
      conversationMemoryConfig: config,
      sessionVariables: sessionVariables || {},
    };
  }

  /**
   * Update session variables during restoration
   */
  restoreSessionVariables(
    variables: Record<string, SessionVariableValue>,
  ): void {
    const session = this.getLoopSession();
    if (session) {
      session.sessionVariables = { ...session.sessionVariables, ...variables };
    }
  }

  /**
   * Check if a session is currently active
   */
  hasActiveSession(): boolean {
    return this.loopSession?.isActive ?? false;
  }

  /**
   * Get current session metadata for restoration purposes
   */
  getSessionMetadata(): {
    sessionId?: string;
    conversationMemoryConfig?: ConversationMemoryConfig;
    sessionVariables: Record<string, SessionVariableValue>;
    isActive: boolean;
  } {
    const session = this.getLoopSession();
    return {
      sessionId: session?.sessionId,
      conversationMemoryConfig: session?.conversationMemoryConfig,
      sessionVariables: session?.sessionVariables || {},
      isActive: session?.isActive ?? false,
    };
  }

  /**
   * Update the sessionId of the current session (used during restoration)
   */
  updateSessionId(newSessionId: string): void {
    const session = this.getLoopSession();
    if (session) {
      session.sessionId = newSessionId;
    }
  }

  getLoopSession(): LoopSessionState | null {
    return this.loopSession?.isActive ? this.loopSession : null;
  }

  clearLoopSession(): void {
    if (this.loopSession) {
      this.loopSession.isActive = false;
      this.loopSession = null;
    }
  }

  getOrCreateNeuroLink(): NeuroLink {
    const session = this.getLoopSession();
    if (session) {
      return session.neurolinkInstance;
    }

    // Create new NeuroLink with observability config from environment (CLI usage)
    const observabilityConfig = buildObservabilityConfigFromEnv();
    const mcpOutputLimits = buildMcpOutputLimitsFromEnv();

    const options: NeurolinkConstructorConfig = {};
    if (observabilityConfig) {
      options.observability = observabilityConfig;
    }
    if (mcpOutputLimits) {
      options.mcp = { outputLimits: mcpOutputLimits };
    }

    return new NeuroLink(Object.keys(options).length ? options : undefined);
  }

  getCurrentSessionId(): string | undefined {
    return this.getLoopSession()?.sessionId;
  }

  // Session variable management
  setSessionVariable(key: string, value: SessionVariableValue): void {
    const session = this.getLoopSession();
    if (session) {
      session.sessionVariables[key] = value;
    }
  }

  getSessionVariable(key: string): SessionVariableValue | undefined {
    const session = this.getLoopSession();
    return session?.sessionVariables[key];
  }

  getSessionVariables(): Record<string, SessionVariableValue> {
    const session = this.getLoopSession();
    return session?.sessionVariables || {};
  }

  unsetSessionVariable(key: string): boolean {
    const session = this.getLoopSession();
    if (session && key in session.sessionVariables) {
      delete session.sessionVariables[key];
      return true;
    }
    return false;
  }

  clearSessionVariables(): void {
    const session = this.getLoopSession();
    if (session) {
      session.sessionVariables = {};
    }
  }
}

export const globalSession = GlobalSessionManager.getInstance();
