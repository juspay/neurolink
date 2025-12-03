# Health Monitoring & Auto-Recovery Guide

**NeuroLink Enhanced MCP Platform - Health Monitoring**

---

## 🏥 **Overview: Connection Health Management**

The NeuroLink MCP platform includes sophisticated health monitoring that provides real-time connection status tracking, automatic failure detection, and intelligent recovery mechanisms for all MCP servers.

### **Key Features**

- **6-State Connection Lifecycle**: Complete connection status management
- **Periodic Health Checks**: Configurable monitoring with latency tracking
- **Auto-Recovery Logic**: Exponential backoff with intelligent retry strategies
- **Event-Driven Architecture**: Real-time status notifications
- **Performance Monitoring**: Health metrics and trend analysis

---

## 🏗️ **Architecture & Components**

### **Connection Status States**

```typescript
export enum ConnectionStatus {
  DISCONNECTED = "DISCONNECTED", // No connection established
  CONNECTING = "CONNECTING", // Connection attempt in progress
  CONNECTED = "CONNECTED", // Successfully connected and operational
  CHECKING = "CHECKING", // Health check in progress
  ERROR = "ERROR", // Connection error detected
  RECOVERING = "RECOVERING", // Auto-recovery in progress
}
```

### **Health Monitor Core**

```typescript
export class HealthMonitor extends EventEmitter {
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private serverStatus: Map<string, ServerHealth> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();

  async startHealthMonitoring(registry: MCPRegistry): Promise<void> {
    const servers = await registry.listServers();

    for (const serverId of servers) {
      await this.initializeServerMonitoring(serverId);
    }

    this.emit("monitoring-started", { serverCount: servers.length });
  }

  async performHealthCheck(serverId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      this.updateServerStatus(serverId, ConnectionStatus.CHECKING);

      const server = await this.registry.getServer(serverId);
      await server.ping(); // Custom ping implementation

      const result: HealthCheckResult = {
        success: true,
        status: ConnectionStatus.CONNECTED,
        latency: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.updateServerStatus(serverId, ConnectionStatus.CONNECTED);
      this.emit("health-check-success", { serverId, result });

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        success: false,
        status: ConnectionStatus.ERROR,
        error: error as Error,
        timestamp: Date.now(),
      };

      this.updateServerStatus(serverId, ConnectionStatus.ERROR);
      this.emit("health-check-failed", { serverId, result });

      // Trigger auto-recovery
      await this.attemptRecovery(serverId);

      return result;
    }
  }
}
```

### **Health Check Interface**

```typescript
export interface HealthCheckResult {
  success: boolean;
  status: ConnectionStatus;
  message?: string;
  latency?: number;
  error?: Error;
  timestamp: number;
  metadata?: {
    serverVersion?: string;
    capabilities?: string[];
    resourceUsage?: ResourceMetrics;
  };
}

export interface ServerHealth {
  serverId: string;
  status: ConnectionStatus;
  lastHealthCheck: HealthCheckResult;
  healthHistory: HealthCheckResult[];
  recoveryAttempts: number;
  uptime: number;
  lastSuccessfulConnection: number;
}
```

---

## 🔄 **Auto-Recovery Mechanisms**

### **Intelligent Recovery Logic**

```typescript
export class RecoveryManager {
  private maxRecoveryAttempts: number = 3;
  private baseRetryInterval: number = 5000; // 5 seconds
  private maxRetryInterval: number = 60000; // 1 minute

  async attemptRecovery(serverId: string): Promise<boolean> {
    const attempts = this.recoveryAttempts.get(serverId) || 0;

    if (attempts >= this.maxRecoveryAttempts) {
      console.warn(`Max recovery attempts reached for server ${serverId}`);
      this.emit("recovery-failed", { serverId, attempts });
      return false;
    }

    this.updateServerStatus(serverId, ConnectionStatus.RECOVERING);
    this.recoveryAttempts.set(serverId, attempts + 1);

    // Exponential backoff with jitter
    const delay =
      Math.min(
        this.baseRetryInterval * Math.pow(2, attempts),
        this.maxRetryInterval,
      ) +
      Math.random() * 1000; // Add jitter

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.reconnectServer(serverId);

      // Reset recovery attempts on success
      this.recoveryAttempts.delete(serverId);
      this.updateServerStatus(serverId, ConnectionStatus.CONNECTED);

      this.emit("recovery-success", { serverId, attempts: attempts + 1 });
      return true;
    } catch (error) {
      console.error(
        `Recovery attempt ${attempts + 1} failed for ${serverId}:`,
        error,
      );

      // Schedule next recovery attempt
      setTimeout(() => {
        this.attemptRecovery(serverId);
      }, delay);

      return false;
    }
  }
}
```

### **Connection Lifecycle Management**

```typescript
// State transition logic
const connectionLifecycle = {
  async connect(serverId: string): Promise<void> {
    this.updateStatus(serverId, ConnectionStatus.CONNECTING);

    try {
      await this.establishConnection(serverId);
      this.updateStatus(serverId, ConnectionStatus.CONNECTED);
      this.startPeriodicHealthChecks(serverId);
    } catch (error) {
      this.updateStatus(serverId, ConnectionStatus.ERROR);
      await this.attemptRecovery(serverId);
    }
  },

  async disconnect(serverId: string): Promise<void> {
    this.stopHealthChecks(serverId);
    await this.closeConnection(serverId);
    this.updateStatus(serverId, ConnectionStatus.DISCONNECTED);
  },
};
```

---

## 🚀 **Usage Examples**

### **Basic Health Monitoring Setup**

```typescript
import { HealthMonitor } from "@juspay/neurolink/mcp";

// Initialize health monitor
const healthMonitor = new HealthMonitor({
  healthCheckInterval: 30000, // 30 seconds
  recoveryRetryInterval: 5000, // 5 seconds
  maxRecoveryAttempts: 3,
  enableEventLogging: true,
});

// Start monitoring all servers
await healthMonitor.startHealthMonitoring(mcpRegistry);

// Listen for health events
healthMonitor.on("health-check-failed", ({ serverId, result }) => {
  console.warn(`Health check failed for ${serverId}:`, result.error?.message);
});

healthMonitor.on("recovery-success", ({ serverId, attempts }) => {
  console.log(`Server ${serverId} recovered after ${attempts} attempts`);
});
```

### **Custom Health Check Implementation**

```typescript
// Implement custom health checks
class CustomHealthMonitor extends HealthMonitor {
  async performAdvancedHealthCheck(
    serverId: string,
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const server = await this.registry.getServer(serverId);

      // Basic connectivity check
      await server.ping();

      // Advanced checks
      const capabilities = await server.listCapabilities();
      const resourceUsage = await server.getResourceUsage();
      const version = await server.getVersion();

      return {
        success: true,
        status: ConnectionStatus.CONNECTED,
        latency: Date.now() - startTime,
        timestamp: Date.now(),
        metadata: {
          serverVersion: version,
          capabilities: capabilities,
          resourceUsage: resourceUsage,
        },
      };
    } catch (error) {
      return {
        success: false,
        status: ConnectionStatus.ERROR,
        error: error as Error,
        timestamp: Date.now(),
      };
    }
  }
}
```

### **Health-Aware Tool Execution**

```typescript
// Execute tools with health awareness
const healthAwareExecution = async (
  toolName: string,
  args: any,
  context: any,
) => {
  const serverId = await registry.getServerForTool(toolName);
  const serverHealth = await healthMonitor.getServerHealth(serverId);

  if (serverHealth.status !== ConnectionStatus.CONNECTED) {
    // Try to recover connection first
    const recovered = await healthMonitor.attemptRecovery(serverId);

    if (!recovered) {
      throw new Error(`Server ${serverId} is unavailable for tool ${toolName}`);
    }
  }

  // Execute tool with health monitoring
  try {
    const result = await registry.executeTool(toolName, args, context);

    // Update health status on successful execution
    healthMonitor.recordSuccessfulOperation(serverId);

    return result;
  } catch (error) {
    // Report health issue on tool execution failure
    healthMonitor.recordFailedOperation(serverId, error);
    throw error;
  }
};
```

---

## 📊 **Health Analytics & Monitoring**

### **Health Metrics Collection**

```typescript
interface HealthMetrics {
  serverCount: number;
  healthyServers: number;
  unhealthyServers: number;
  recoveringServers: number;
  averageLatency: number;
  uptimePercentage: number;
  totalHealthChecks: number;
  failedHealthChecks: number;
  successfulRecoveries: number;
  failedRecoveries: number;
}

export class HealthAnalytics {
  async collectHealthMetrics(): Promise<HealthMetrics> {
    const allServers = await this.healthMonitor.getAllServerHealth();
    const now = Date.now();

    const healthyServers = allServers.filter(
      (s) => s.status === ConnectionStatus.CONNECTED,
    ).length;
    const unhealthyServers = allServers.filter(
      (s) => s.status === ConnectionStatus.ERROR,
    ).length;
    const recoveringServers = allServers.filter(
      (s) => s.status === ConnectionStatus.RECOVERING,
    ).length;

    const totalLatency = allServers.reduce((sum, server) => {
      return sum + (server.lastHealthCheck.latency || 0);
    }, 0);

    const uptimePercentage =
      allServers.reduce((sum, server) => {
        const uptime =
          (now - server.lastSuccessfulConnection) / (now - server.createdAt);
        return sum + Math.max(0, Math.min(1, uptime));
      }, 0) / allServers.length;

    return {
      serverCount: allServers.length,
      healthyServers,
      unhealthyServers,
      recoveringServers,
      averageLatency: totalLatency / allServers.length,
      uptimePercentage,
      totalHealthChecks: this.getTotalHealthChecks(),
      failedHealthChecks: this.getFailedHealthChecks(),
      successfulRecoveries: this.getSuccessfulRecoveries(),
      failedRecoveries: this.getFailedRecoveries(),
    };
  }
}
```

### **Real-time Health Dashboard**

```typescript
// Real-time health monitoring dashboard
export class HealthDashboard {
  private metrics: HealthMetrics;
  private updateInterval: NodeJS.Timeout;

  start(): void {
    this.updateInterval = setInterval(async () => {
      await this.updateDashboard();
    }, 5000); // Update every 5 seconds
  }

  private async updateDashboard(): Promise<void> {
    this.metrics = await this.healthAnalytics.collectHealthMetrics();

    console.clear();
    console.log("=== NeuroLink MCP Health Dashboard ===");
    console.log(
      `Servers: ${this.metrics.healthyServers}/${this.metrics.serverCount} healthy`,
    );
    console.log(`Average Latency: ${this.metrics.averageLatency.toFixed(2)}ms`);
    console.log(`Uptime: ${(this.metrics.uptimePercentage * 100).toFixed(2)}%`);
    console.log(
      `Recovery Success Rate: ${this.getRecoverySuccessRate().toFixed(2)}%`,
    );

    // Display server status
    const serverHealth = await this.healthMonitor.getAllServerHealth();
    console.log("\nServer Status:");
    serverHealth.forEach((server) => {
      const statusIcon = this.getStatusIcon(server.status);
      const latency = server.lastHealthCheck.latency || 0;
      console.log(
        `  ${statusIcon} ${server.serverId}: ${server.status} (${latency}ms)`,
      );
    });
  }

  private getStatusIcon(status: ConnectionStatus): string {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return "🟢";
      case ConnectionStatus.CONNECTING:
        return "🟡";
      case ConnectionStatus.CHECKING:
        return "🔵";
      case ConnectionStatus.RECOVERING:
        return "🟠";
      case ConnectionStatus.ERROR:
        return "🔴";
      case ConnectionStatus.DISCONNECTED:
        return "⚫";
      default:
        return "❓";
    }
  }
}
```

---

## 🧪 **Testing & Validation**

### **Health Check Testing**

```typescript
// Test health monitoring functionality
const testHealthMonitoring = async () => {
  console.log("=== Testing Health Monitoring ===");

  // Test basic health check
  const result = await healthMonitor.performHealthCheck("test-server");
  console.log("Health check result:", result);

  // Test recovery mechanism
  console.log("Testing recovery mechanism...");
  await healthMonitor.simulateServerFailure("test-server");

  // Wait for auto-recovery
  await new Promise((resolve) => {
    healthMonitor.once("recovery-success", () => {
      console.log("✅ Auto-recovery successful");
      resolve(undefined);
    });

    healthMonitor.once("recovery-failed", () => {
      console.log("❌ Auto-recovery failed");
      resolve(undefined);
    });
  });
};
```

### **Performance Testing**

```typescript
// Test health monitoring performance
const testHealthPerformance = async () => {
  const serverCount = 50;
  const healthCheckCount = 100;

  console.log(`Testing health checks for ${serverCount} servers...`);

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < serverCount; i++) {
    for (let j = 0; j < healthCheckCount; j++) {
      promises.push(healthMonitor.performHealthCheck(`server-${i}`));
    }
  }

  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  const successCount = results.filter((r) => r.success).length;
  const averageLatency =
    results.reduce((sum, r) => sum + (r.latency || 0), 0) / results.length;

  console.log("Performance Results:");
  console.log(`- Total checks: ${results.length}`);
  console.log(
    `- Success rate: ${((successCount / results.length) * 100).toFixed(2)}%`,
  );
  console.log(`- Average latency: ${averageLatency.toFixed(2)}ms`);
  console.log(`- Total duration: ${duration}ms`);
  console.log(
    `- Checks per second: ${((results.length / duration) * 1000).toFixed(2)}`,
  );
};
```

---

## 🔧 **Configuration & Customization**

### **Advanced Configuration**

```typescript
interface HealthMonitorConfig {
  intervals: {
    healthCheck: number; // Health check interval (ms)
    recovery: number; // Recovery retry interval (ms)
    cleanup: number; // Cleanup interval for old data (ms)
  };
  thresholds: {
    maxRecoveryAttempts: number; // Max recovery attempts before giving up
    maxLatency: number; // Max acceptable latency (ms)
    minUptime: number; // Minimum uptime percentage
  };
  recovery: {
    strategy: "exponential" | "linear" | "custom";
    baseDelay: number; // Base delay for recovery attempts
    maxDelay: number; // Maximum delay between attempts
    jitter: boolean; // Add random jitter to delays
  };
  alerting: {
    enableAlerts: boolean; // Enable health alerts
    alertThresholds: {
      consecutiveFailures: number; // Alert after N consecutive failures
      uptimeBelow: number; // Alert when uptime drops below percentage
      latencyAbove: number; // Alert when latency exceeds threshold
    };
  };
}

const healthMonitor = new HealthMonitor({
  intervals: {
    healthCheck: 30000, // 30 seconds
    recovery: 5000, // 5 seconds
    cleanup: 3600000, // 1 hour
  },
  thresholds: {
    maxRecoveryAttempts: 5,
    maxLatency: 5000, // 5 seconds
    minUptime: 0.95, // 95%
  },
  recovery: {
    strategy: "exponential",
    baseDelay: 1000, // 1 second
    maxDelay: 60000, // 1 minute
    jitter: true,
  },
  alerting: {
    enableAlerts: true,
    alertThresholds: {
      consecutiveFailures: 3,
      uptimeBelow: 0.9, // 90%
      latencyAbove: 3000, // 3 seconds
    },
  },
});
```

---

## 🎯 **Best Practices**

### **Monitoring Strategy**

```typescript
// Implement tiered monitoring
const tieredMonitoring = {
  // Critical servers: frequent monitoring
  critical: {
    interval: 15000, // 15 seconds
    maxLatency: 1000, // 1 second
    immediateRecovery: true,
  },

  // Important servers: standard monitoring
  important: {
    interval: 30000, // 30 seconds
    maxLatency: 3000, // 3 seconds
    recoveryDelay: 5000, // 5 seconds
  },

  // Background servers: light monitoring
  background: {
    interval: 60000, // 1 minute
    maxLatency: 10000, // 10 seconds
    recoveryDelay: 30000, // 30 seconds
  },
};
```

### **Resource Optimization**

```typescript
// Optimize health monitoring resources
const optimizeMonitoring = {
  // Batch health checks
  async batchHealthChecks(serverIds: string[]): Promise<HealthCheckResult[]> {
    const batchSize = 10;
    const results: HealthCheckResult[] = [];

    for (let i = 0; i < serverIds.length; i += batchSize) {
      const batch = serverIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((id) => this.performHealthCheck(id)),
      );
      results.push(...batchResults);
    }

    return results;
  },

  // Adaptive monitoring intervals
  adjustMonitoringInterval(
    serverId: string,
    healthHistory: HealthCheckResult[],
  ): number {
    const recentFailures = healthHistory
      .slice(-5)
      .filter((h) => !h.success).length;
    const baseInterval = 30000;

    if (recentFailures === 0) {
      return baseInterval * 2; // Healthy servers need less frequent checks
    } else if (recentFailures >= 3) {
      return baseInterval / 2; // Unhealthy servers need more frequent checks
    }

    return baseInterval;
  },
};
```

---

**STATUS**: Production-ready health monitoring system with comprehensive connection management, intelligent auto-recovery, and real-time analytics. Provides enterprise-grade reliability monitoring for all MCP servers with configurable thresholds and recovery strategies.
