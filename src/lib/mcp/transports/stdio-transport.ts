/**
 * STDIO Transport Implementation for MCP
 * Handles subprocess communication following Cline's patterns
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { mcpLogger } from '../logging.js';
import type { MCPTransport } from '../mcp-hub.js';
import type { ExternalMCPServerConfig } from '../types/mcp-protocol.js';

interface StdioTransportEvents {
  'message': [any];
  'error': [Error];
  'close': [];
  'stderr': [string];
}

export class StdioTransport extends EventEmitter<StdioTransportEvents> implements MCPTransport {
  readonly type = 'stdio' as const;
  private _status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private process: ChildProcess | null = null;
  private buffer = '';
  private stderrContent = ''; // Accumulate stderr content for tool results
  private messageHandlers: Array<(message: any) => void> = [];
  private errorHandlers: Array<(error: Error) => void> = [];
  private closeHandlers: Array<() => void> = [];

  constructor(private config: ExternalMCPServerConfig) {
    super();
    this.setupEventForwarding();
  }

  get status() {
    return this._status;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected') {
      return;
    }

    mcpLogger.debug(`[StdioTransport] Connecting to ${this.config.name}`);
    this._status = 'connecting';

    try {
      await this.validateCommand();
      await this.spawnProcess();
      this._status = 'connected';
      mcpLogger.info(`[StdioTransport] Connected to ${this.config.name}`);
    } catch (error) {
      this._status = 'error';
      mcpLogger.error(`[StdioTransport] Connection failed for ${this.config.name}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this._status === 'disconnected') {
      return;
    }

    mcpLogger.debug(`[StdioTransport] Closing connection to ${this.config.name}`);

    if (this.process) {
      try {
        // Graceful shutdown first
        if (!this.process.killed) {
          this.process.kill('SIGTERM');
          
          // Wait up to 30 seconds for graceful shutdown (for long-running tools like sequential thinking)
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              if (this.process && !this.process.killed) {
                mcpLogger.warn(`[StdioTransport] Force killing process for ${this.config.name} after 30s timeout`);
                this.process.kill('SIGKILL');
              }
              resolve();
            }, 30000);

            this.process?.on('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });
        }
      } catch (error) {
        mcpLogger.error(`[StdioTransport] Error during process cleanup for ${this.config.name}:`, error);
      }

      this.process = null;
    }

    this._status = 'disconnected';
    this.emit('close');
    this.removeAllListeners();
    mcpLogger.debug(`[StdioTransport] Connection closed for ${this.config.name}`);
  }

  async send(message: any): Promise<void> {
    if (!this.process || !this.process.stdin || this._status !== 'connected') {
      throw new Error(`Transport not connected for ${this.config.name}`);
    }

    return new Promise((resolve, reject) => {
      const messageJson = JSON.stringify(message) + '\n';
      
      this.process!.stdin!.write(messageJson, (error) => {
        if (error) {
          reject(new Error(`Failed to send message to ${this.config.name}: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(handler: (message: any) => void): void {
    this.messageHandlers.push(handler);
    this.on('message', handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
    this.on('error', handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
    this.on('close', handler);
  }

  // Private methods

  private setupEventForwarding(): void {
    // Forward events to handlers for compatibility
    this.on('message', (message) => {
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          mcpLogger.error(`[StdioTransport] Message handler error for ${this.config.name}:`, error);
        }
      });
    });

    this.on('error', (error) => {
      this.errorHandlers.forEach(handler => {
        try {
          handler(error);
        } catch (err) {
          mcpLogger.error(`[StdioTransport] Error handler error for ${this.config.name}:`, err);
        }
      });
    });

    this.on('close', () => {
      this.closeHandlers.forEach(handler => {
        try {
          handler();
        } catch (error) {
          mcpLogger.error(`[StdioTransport] Close handler error for ${this.config.name}:`, error);
        }
      });
    });
  }

  private async validateCommand(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Test command existence with --help
      const testProcess = spawn(this.config.command, ['--help'], {
        stdio: 'ignore',
        timeout: 5000,
      });

      const timeout = setTimeout(() => {
        testProcess.kill();
        reject(new Error(`Command validation timeout: ${this.config.command}`));
      }, 5000);

      testProcess.on('spawn', () => {
        clearTimeout(timeout);
        testProcess.kill();
        resolve();
      });

      testProcess.on('error', (error: any) => {
        clearTimeout(timeout);
        reject(new Error(`Command not found or not executable: ${this.config.command} - ${error.message}`));
      });
    });
  }

  private async spawnProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.command, this.config.args || [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.config.env },
          cwd: this.config.cwd,
        });

        if (!this.process) {
          reject(new Error(`Failed to spawn process for ${this.config.name}`));
          return;
        }

        // Set up stdout data handling
        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleStdoutData(data.toString());
        });

        // Set up stderr monitoring (following Cline's pattern)
        this.process.stderr?.on('data', (data: Buffer) => {
          const output = data.toString().trim();
          if (output) {
            this.handleStderrData(output);
          }
        });

        // Set up process event handlers
        this.process.on('error', (error) => {
          mcpLogger.error(`[StdioTransport] Process error for ${this.config.name}:`, error);
          this._status = 'error';
          this.emit('error', error);
          reject(error);
        });

        this.process.on('exit', (code, signal) => {
          mcpLogger.debug(`[StdioTransport] Process exited for ${this.config.name}: code=${code}, signal=${signal}`);
          this._status = 'disconnected';
          this.emit('close');
        });

        // Consider process ready when spawned successfully
        this.process.on('spawn', () => {
          mcpLogger.debug(`[StdioTransport] Process spawned for ${this.config.name}`);
          resolve();
        });

        // Timeout for spawn
        setTimeout(() => {
          if (this.process && this._status === 'connecting') {
            reject(new Error(`Process spawn timeout for ${this.config.name}`));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleStdoutData(data: string): void {
    this.buffer += data;
    
    mcpLogger.debug(`[StdioTransport] ${this.config.name} received stdout data: ${data.substring(0, 500)}...`);
    
    // Process complete JSON messages (line-delimited)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        try {
          const message = JSON.parse(trimmedLine);
          mcpLogger.debug(`[StdioTransport] ${this.config.name} parsed JSON message: ${JSON.stringify(message, null, 2)}`);
          this.emit('message', message);
        } catch (error) {
          mcpLogger.warn(`[StdioTransport] Failed to parse message from ${this.config.name}: ${trimmedLine.substring(0, 200)}`, error);
          // Don't emit non-JSON lines as errors - they might be tool output
        }
      }
    }
  }

  private handleStderrData(output: string): void {
    // Follow Cline's pattern for stderr handling
    const isInfoLog = /INFO/i.test(output);
    const isToolOutput = /💭|┌|└|├|│/.test(output) || /Thought \d+\/\d+/.test(output);
    const isServerStatus = /server running|listening|started/i.test(output);
    const isWarning = /warn/i.test(output);
    
    // Accumulate stderr content for tool results (especially sequential thinking)
    if (isToolOutput) {
      this.stderrContent += output + '\n';
    }
    
    // Check for completion signals from long-running tools
    const isSequentialThinkingComplete = /Thought \d+\/\d+ │.*Therefore.*will now output/.test(output) || 
                                       /complete.*satisfactory.*response/.test(output);
    
    if (isInfoLog) {
      mcpLogger.info(`[StdioTransport] ${this.config.name} info: ${output}`);
    } else if (isToolOutput) {
      // Sequential thinking and other tool output - log as debug, not error
      mcpLogger.debug(`[StdioTransport] ${this.config.name} tool output: ${output.substring(0, 200)}...`);
      
      // Signal tool completion for graceful shutdown
      if (isSequentialThinkingComplete) {
        mcpLogger.info(`[StdioTransport] ${this.config.name} indicates completion, allowing graceful shutdown`);
        // Use existing event types instead of custom one
        this.emit('stderr', `TOOL_COMPLETE: ${output}`);
      }
    } else if (isServerStatus) {
      mcpLogger.info(`[StdioTransport] ${this.config.name} status: ${output}`);
    } else if (isWarning) {
      mcpLogger.warn(`[StdioTransport] ${this.config.name} warning: ${output}`);
    } else {
      mcpLogger.error(`[StdioTransport] ${this.config.name} stderr: ${output}`);
      
      // Emit stderr data for error accumulation
      this.emit('stderr', output);
      
      // Only emit error for actual error messages, not tool output
      if (/\berror\b|\bfailed\b|\bexception\b|\bcrash\b/i.test(output) && !isToolOutput) {
        this.emit('error', new Error(`Server error: ${output}`));
      }
    }
  }

  // Method to get accumulated stderr content (for tools that write output to stderr)
  getStderrContent(): string {
    return this.stderrContent;
  }

  // Method to clear stderr content (called after tool execution)
  clearStderrContent(): void {
    this.stderrContent = '';
  }
}