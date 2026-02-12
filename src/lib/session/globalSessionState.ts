import { nanoid } from "nanoid";
import { NeuroLink } from "../neurolink.js";
import type {
  ConversationMemoryConfig,
  NeurolinkOptions,
} from "../types/conversation.js";
import { buildObservabilityConfigFromEnv } from "../utils/observabilityHelpers.js";

// Define a specific type for session variable values
type SessionVariableValue = string | number | boolean;

type LoopSessionState = {
  neurolinkInstance: NeuroLink;
  sessionId: string;
  isActive: boolean;
  conversationMemoryConfig?: ConversationMemoryConfig;
  sessionVariables: Record<string, SessionVariableValue>;
};

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
    const neurolinkOptions: NeurolinkOptions = {};

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
    return new NeuroLink(
      observabilityConfig ? { observability: observabilityConfig } : undefined,
    );
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
