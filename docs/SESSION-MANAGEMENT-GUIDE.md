# Session Management & Persistence Guide

**NeuroLink Enhanced MCP Platform - Session Management**

---

## 🗄️ **Overview: Persistent State Management**

The NeuroLink MCP platform provides sophisticated session management capabilities that enable long-running operations, state persistence across process restarts, and comprehensive workflow tracking.

### **Key Features**

- **UUID-based Sessions**: Cryptographically secure session identification
- **Cross-restart Persistence**: State recovery after process restarts
- **TTL Management**: Configurable session expiration with automatic cleanup
- **Tool History**: Complete execution history maintained per session
- **Metadata Tracking**: User agent, origin, tags, and custom metadata support

---

## 🏗️ **Architecture & Components**

### **Session Manager Core**

```typescript
export class SessionManager {
  private sessions: Map<string, OrchestratorSession> = new Map();
  private persistence: SessionPersistence;
  private cleanupScheduler: NodeJS.Timeout;

  async createSession(
    context: NeuroLinkExecutionContext,
    options?: SessionOptions,
  ): Promise<OrchestratorSession> {
    const session: OrchestratorSession = {
      id: uuidv4(),
      context,
      toolHistory: [],
      state: new Map(),
      metadata: options?.metadata || {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + (options?.ttl || 3600000), // 1 hour default
    };

    this.sessions.set(session.id, session);
    await this.persistence.saveSession(session);

    return session;
  }
}
```

### **Session Data Structure**

```typescript
export interface OrchestratorSession {
  id: string; // UUID v4 identifier
  context: NeuroLinkExecutionContext; // Execution context
  toolHistory: ToolResult[]; // Complete tool execution history
  state: Map<string, any>; // Session-specific state
  metadata: {
    userAgent?: string; // Client user agent
    origin?: string; // Request origin
    tags?: string[]; // Custom tags
    [key: string]: any; // Custom metadata
  };
  createdAt: number; // Creation timestamp
  lastActivity: number; // Last activity timestamp
  expiresAt: number; // Expiration timestamp
}
```

---

## 💾 **Persistence Mechanisms**

### **File-based Persistence**

```typescript
export class SessionPersistence {
  async saveSession(session: OrchestratorSession): Promise<void> {
    const sessionPath = this.getSessionPath(session.id);
    const sessionData = this.serializeSession(session);

    // Atomic write with temporary file
    const tempPath = `${sessionPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(sessionData, null, 2));
    await fs.rename(tempPath, sessionPath);

    // Create checksum for integrity verification
    const checksum = await this.calculateChecksum(sessionData);
    await fs.writeFile(`${sessionPath}.checksum`, checksum);
  }

  async loadSession(sessionId: string): Promise<OrchestratorSession | null> {
    try {
      const sessionPath = this.getSessionPath(sessionId);
      const sessionData = JSON.parse(await fs.readFile(sessionPath, "utf8"));
      return this.deserializeSession(sessionData);
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  }
}
```

---

## 🚀 **Usage Examples**

### **Basic Session Usage**

```typescript
// Create session with metadata
const session = await sessionManager.createSession(
  {
    userId: "user123",
    aiProvider: "google-ai",
    permissions: ["read-data", "analyze"],
  },
  {
    ttl: 7200000, // 2 hours
    metadata: {
      userAgent: "NeuroLink-CLI/1.0",
      tags: ["analysis", "urgent"],
    },
  },
);
```

### **Long-running Workflow**

```typescript
// Execute multi-step workflow with session state
const executeLongWorkflow = async (sessionId: string) => {
  const session = await sessionManager.getSession(sessionId);

  // Step 1: Fetch data (if not already done)
  if (!session.state.has("dataFetched")) {
    const userData = await orchestrator.executeTool(
      "database-query",
      {},
      session.context,
    );
    session.state.set("userData", userData);
    session.state.set("dataFetched", true);
    await sessionManager.updateSession(session);
  }

  // Continue workflow...
};
```

---

## ⏰ **TTL Management & Cleanup**

### **Automatic Cleanup**

```typescript
export class SessionCleanupManager {
  async performCleanup(): Promise<CleanupResult> {
    const allSessions = await this.sessionManager.getAllSessions();
    const now = Date.now();
    let cleanedSessions = 0;

    for (const session of allSessions) {
      if (session.expiresAt < now) {
        await this.sessionManager.removeSession(session.id);
        cleanedSessions++;
      }
    }

    return { cleanedSessions, duration: Date.now() - now };
  }
}
```

---

## 📊 **Session Analytics**

### **Usage Metrics**

```typescript
interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  toolUsageStats: Map<string, number>;
}

// Collect session metrics
const analytics = await sessionAnalyticsCollector.collectSessionMetrics();
console.log("Active sessions:", analytics.activeSessions);
console.log("Average duration:", analytics.averageSessionDuration);
```

---

## 🧪 **Testing Examples**

### **Persistence Testing**

```typescript
// Test session recovery after restart
const testPersistence = async () => {
  // Create session with state
  const session = await sessionManager.createSession(context);
  session.state.set("testData", { value: 42 });
  await sessionManager.updateSession(session);

  // Simulate restart
  const newSessionManager = new SessionManager({ persistenceStrategy: "file" });
  const recovered = await newSessionManager.getSession(session.id);

  console.log("Recovery successful:", !!recovered);
  console.log("Data intact:", recovered?.state.get("testData")?.value === 42);
};
```

---

## 🔧 **Configuration**

### **Advanced Setup**

```typescript
const sessionManager = new SessionManager({
  persistenceStrategy: "file",
  persistence: {
    basePath: "./sessions",
    encryptionKey: process.env.SESSION_ENCRYPTION_KEY,
  },
  defaults: {
    ttl: 3600000, // 1 hour
    maxSessions: 1000, // Max concurrent sessions
    cleanupInterval: 300000, // 5 minutes
  },
});
```

---

## 🎯 **Best Practices**

### **Session Safety**

```typescript
// Always check session validity
const safeSessionOperation = async (sessionId: string, operation: Function) => {
  const session = await sessionManager.getSession(sessionId);
  if (!session) {
    throw new Error("Session not found or expired");
  }

  session.lastActivity = Date.now();
  const result = await operation(session);
  await sessionManager.updateSession(session);
  return result;
};
```

### **Resource Management**

```typescript
// Implement graceful shutdown
const gracefulShutdown = async () => {
  const activeSessions = await sessionManager.getActiveSessions();
  for (const session of activeSessions) {
    await sessionManager.updateSession(session);
  }
  sessionManager.stopCleanup();
};
```

---

**STATUS**: Production-ready session management system with comprehensive persistence, TTL management, and analytics capabilities. Enables long-running operations with full state recovery across process restarts.
