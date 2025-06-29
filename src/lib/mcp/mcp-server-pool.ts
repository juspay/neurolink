/**
 * MCP Server Pool - Manages stdio-based MCP server instances
 * Handles spawning, lifecycle management, and cleanup of external MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { mcpLogger } from './logging.js';
import {
  MCPServerInstance,
  ExternalMCPServerConfig,
  MCPConnectionError,
  MCPTimeoutError,
} from './types/mcp-protocol.js';

interface ServerPoolEvents {
  'server-ready': [MCPServerInstance];
  'server-error': [string, Error];
  'server-terminated': [string];
}

interface ServerPoolOptions {
  maxIdleTime?: number; // Default: 5 minutes
  maxServers?: number; // Default: 10
  cleanupInterval?: number; // Default: 1 minute
  serverTimeout?: number; // Default: 30 seconds
}

export class MCPServerPool extends EventEmitter<ServerPoolEvents> {
  private servers = new Map<string, MCPServerInstance>();
  private options: Required<ServerPoolOptions>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private nextServerId = 1;

  constructor(options: ServerPoolOptions = {}) {
    super();
    this.options = {
      maxIdleTime: options.maxIdleTime ?? 300000, // 5 minutes
      maxServers: options.maxServers ?? 10,
      cleanupInterval: options.cleanupInterval ?? 60000, // 1 minute
      serverTimeout: options.serverTimeout ?? 10000, // Reduce to 10 seconds for faster feedback
    };

    this.startCleanupTimer();

    // Cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
    process.on('uncaughtException', () => {
      this.cleanup();
      process.exit(1);
    });
    process.on('unhandledRejection', () => {
      this.cleanup();
      process.exit(1);
    });
  }

  /**
   * Get or create a server instance
   */
  async getServer(config: ExternalMCPServerConfig): Promise<MCPServerInstance> {
    const serverKey = this.getServerKey(config);

    // Check if server already exists and is ready
    const existing = this.servers.get(serverKey);
    if (existing) {
      if (existing.status === 'ready') {
        existing.lastUsed = Date.now();
        mcpLogger.debug(`[MCPServerPool] Reusing existing server: ${config.name}`);
        return existing;
      } else if (existing.status === 'starting' || existing.status === 'initializing') {
        mcpLogger.debug(`[MCPServerPool] Waiting for server to be ready: ${config.name}`);
        return this.waitForServerReady(existing);
      } else if (existing.status === 'error' || existing.status === 'terminated') {
        mcpLogger.debug(`[MCPServerPool] Removing failed server: ${config.name}`);
        await this.terminateServer(existing.id);
      }
    }

    // Check server limit
    if (this.servers.size >= this.options.maxServers) {
      await this.cleanupIdleServers();
      if (this.servers.size >= this.options.maxServers) {
        throw new MCPConnectionError(
          `Maximum number of servers (${this.options.maxServers}) reached`,
          config.name
        );
      }
    }

    // Spawn new server
    return this.spawnServer(config);
  }

  /**
   * Spawn a new MCP server process
   */
  private async spawnServer(config: ExternalMCPServerConfig): Promise<MCPServerInstance> {
    const serverId = `mcp-server-${this.nextServerId++}`;
    mcpLogger.info(`[MCPServerPool] Spawning new server: ${config.name} (${serverId})`);

    const serverInstance: MCPServerInstance = {
      id: serverId,
      name: config.name,
      config,
      status: 'starting',
      tools: [],
      lastUsed: Date.now(),
      errorCount: 0,
      maxErrors: 3,
    };

    this.servers.set(this.getServerKey(config), serverInstance);

    try {
      // Validate command exists
      await this.validateCommand(config);

      // Spawn the process
      const childProcess = spawn(config.command, config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...config.env },
        cwd: config.cwd,
        timeout: config.timeout || this.options.serverTimeout,
      });

      serverInstance.process = childProcess;
      serverInstance.status = 'initializing';

      // Set up process event handlers
      this.setupProcessHandlers(serverInstance);

      // Wait for process to be ready
      await this.waitForProcessReady(serverInstance);

      serverInstance.status = 'ready';
      serverInstance.lastUsed = Date.now();

      mcpLogger.info(`[MCPServerPool] Server ready: ${config.name} (${serverId})`);
      this.emit('server-ready', serverInstance);

      return serverInstance;

    } catch (error) {
      serverInstance.status = 'error';
      const mcpError = new MCPConnectionError(
        `Failed to spawn server: ${error instanceof Error ? error.message : String(error)}`,
        config.name,
        error instanceof Error ? error : undefined
      );

      mcpLogger.error(`[MCPServerPool] Server spawn failed: ${config.name}`, mcpError);
      this.emit('server-error', serverId, mcpError);

      // Clean up failed server
      await this.terminateServer(serverId);
      throw mcpError;
    }
  }

  /**
   * Validate that the command exists and is executable
   */
  private async validateCommand(config: ExternalMCPServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // spawn is already imported at the top of the file

      // Try to spawn with --help or --version to validate
      const testProcess = spawn(config.command, ['--help'], {
        stdio: 'ignore',
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        testProcess.kill();
        reject(new Error(`Command validation timeout: ${config.command}`));
      }, 5000);

      testProcess.on('spawn', () => {
        clearTimeout(timeout);
        testProcess.kill();
        resolve();
      });

      testProcess.on('error', (error: any) => {
        clearTimeout(timeout);
        reject(new Error(`Command not found or not executable: ${config.command} - ${error.message}`));
      });
    });
  }

  /**
   * Set up event handlers for the spawned process
   */
  private setupProcessHandlers(server: MCPServerInstance): void {
    if (!server.process) return;

    const process = server.process;

    process.on('error', (error: any) => {
      mcpLogger.error(`[MCPServerPool] Process error for ${server.name}:`, error);
      server.status = 'error';
      server.errorCount++;
      this.emit('server-error', server.id, error);
    });

    process.on('exit', (code, signal) => {
      mcpLogger.info(`[MCPServerPool] Process exited for ${server.name}: code=${code}, signal=${signal}`);
      server.status = 'terminated';
      this.emit('server-terminated', server.id);
      this.servers.delete(this.getServerKey(server.config));
    });

    // Handle stderr for debugging
    process.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        mcpLogger.debug(`[MCPServerPool] ${server.name} stderr: ${message}`);
      }
    });
  }

  /**
   * Wait for process to be ready for communication
   */
  private async waitForProcessReady(server: MCPServerInstance): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!server.process) {
        reject(new Error('No process to wait for'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new MCPTimeoutError(
          `Server initialization timeout: ${server.name}`,
          this.options.serverTimeout
        ));
      }, this.options.serverTimeout);

      // Consider process ready when it's successfully spawned and hasn't errored
      const checkReady = () => {
        if (server.status === 'error') {
          clearTimeout(timeout);
          reject(new Error(`Server failed during initialization: ${server.name}`));
        } else if (server.process && !server.process.killed) {
          clearTimeout(timeout);
          resolve();
        }
      };

      // Check immediately
      checkReady();

      // Also check periodically
      const checkInterval = setInterval(() => {
        checkReady();
        if (server.status === 'ready' || server.status === 'error') {
          clearInterval(checkInterval);
        }
      }, 100);

      // Clean up interval on completion
      const originalResolve = resolve;
      const originalReject = reject;
      resolve = (...args) => {
        clearInterval(checkInterval);
        originalResolve(...args);
      };
      reject = (...args) => {
        clearInterval(checkInterval);
        originalReject(...args);
      };
    });
  }

  /**
   * Wait for an existing server to become ready
   */
  private async waitForServerReady(server: MCPServerInstance): Promise<MCPServerInstance> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new MCPTimeoutError(
          `Timeout waiting for server to be ready: ${server.name}`,
          this.options.serverTimeout
        ));
      }, this.options.serverTimeout);

      const checkStatus = () => {
        if (server.status === 'ready') {
          clearTimeout(timeout);
          resolve(server);
        } else if (server.status === 'error' || server.status === 'terminated') {
          clearTimeout(timeout);
          reject(new Error(`Server failed: ${server.name}`));
        }
      };

      // Check immediately
      checkStatus();

      // Poll for status changes
      const interval = setInterval(checkStatus, 100);

      // Clean up on completion
      const cleanup = () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    });
  }

  /**
   * Terminate a specific server
   */
  async terminateServer(serverId: string): Promise<void> {
    const server = Array.from(this.servers.values()).find(s => s.id === serverId);
    if (!server) {
      mcpLogger.debug(`[MCPServerPool] Server not found for termination: ${serverId}`);
      return;
    }

    mcpLogger.info(`[MCPServerPool] Terminating server: ${server.name} (${serverId})`);

    if (server.process && !server.process.killed) {
      server.process.kill('SIGTERM');

      // Force kill if it doesn't terminate gracefully
      setTimeout(() => {
        if (server.process && !server.process.killed) {
          mcpLogger.warn(`[MCPServerPool] Force killing server: ${server.name}`);
          server.process.kill('SIGKILL');
        }
      }, 5000);
    }

    server.status = 'terminated';
    this.servers.delete(this.getServerKey(server.config));
  }

  /**
   * Clean up idle servers
   */
  private async cleanupIdleServers(): Promise<void> {
    const now = Date.now();
    const serversToTerminate: string[] = [];

    for (const [key, server] of this.servers) {
      const idleTime = now - server.lastUsed;
      if (idleTime > this.options.maxIdleTime || server.errorCount >= server.maxErrors) {
        serversToTerminate.push(server.id);
      }
    }

    mcpLogger.debug(`[MCPServerPool] Cleaning up ${serversToTerminate.length} idle servers`);

    for (const serverId of serversToTerminate) {
      await this.terminateServer(serverId);
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleServers().catch(error => {
        mcpLogger.error('[MCPServerPool] Cleanup timer error:', error);
      });
    }, this.options.cleanupInterval);
  }

  /**
   * Get server key for map storage
   */
  private getServerKey(config: ExternalMCPServerConfig): string {
    return `${config.name}-${config.command}-${(config.args || []).join('-')}`;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const stats = {
      totalServers: this.servers.size,
      byStatus: {
        starting: 0,
        initializing: 0,
        ready: 0,
        error: 0,
        terminated: 0,
      },
      oldestServer: 0,
      newestServer: 0,
    };

    let oldest = Date.now();
    let newest = 0;

    for (const server of this.servers.values()) {
      stats.byStatus[server.status]++;
      oldest = Math.min(oldest, server.lastUsed);
      newest = Math.max(newest, server.lastUsed);
    }

    stats.oldestServer = oldest;
    stats.newestServer = newest;

    return stats;
  }

  /**
   * Clean up all servers and resources
   */
  async cleanup(): Promise<void> {
    mcpLogger.info('[MCPServerPool] Cleaning up all servers...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const serverIds = Array.from(this.servers.values()).map(s => s.id);
    await Promise.all(serverIds.map(id => this.terminateServer(id)));

    this.servers.clear();
    this.removeAllListeners();

    mcpLogger.info('[MCPServerPool] Cleanup complete');
  }
}
