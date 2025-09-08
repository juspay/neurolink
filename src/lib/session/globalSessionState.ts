import { nanoid } from "nanoid";
import { NeuroLink } from "../neurolink.js";
import type { ConversationMemoryConfig } from "../types/conversation.js";

// Define a specific type for session variable values
type SessionVariableValue = string | number | boolean;

// Define a type for the options passed to the NeuroLink constructor
interface NeuroLinkInitOptions {
  conversationMemory?: ConversationMemoryConfig;
}

interface LoopSessionState {
  neurolinkInstance: NeuroLink;
  sessionId: string;
  isActive: boolean;
  conversationMemoryConfig?: ConversationMemoryConfig;
  sessionVariables: Record<string, SessionVariableValue>;
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
    const neurolinkOptions: NeuroLinkInitOptions = {};

    if (config?.enabled) {
      neurolinkOptions.conversationMemory = {
        enabled: true,
        maxSessions: config.maxSessions,
        maxTurnsPerSession: config.maxTurnsPerSession,
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
    return session ? session.neurolinkInstance : new NeuroLink();
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
