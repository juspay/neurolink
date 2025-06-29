/**
 * Hierarchical Configuration System
 * Based on VS Code's multi-level configuration pattern
 * User > Workspace > Project precedence
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { ExternalMCPServerConfig } from '../mcp/types/mcp-protocol.js';

export interface MCPInputConfig {
  type: 'promptString' | 'env' | 'file';
  id: string;
  description: string;
  password?: boolean;
  default?: string;
}

export interface MCPServerConfig {
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  timeout?: number;
}

export interface MCPConfiguration {
  inputs?: MCPInputConfig[];
  servers: Record<string, MCPServerConfig>;
  globalSettings?: {
    enableAutoDiscovery?: boolean;
    defaultTimeout?: number;
    maxRetries?: number;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface ConfigurationLevel {
  name: string;
  path: string;
  config?: MCPConfiguration;
  exists: boolean;
}

export class HierarchicalConfigManager {
  private userConfigPath: string;
  private workspaceConfigPath: string;
  private projectConfigPath: string;
  private resolvedInputs = new Map<string, string>();

  constructor(
    projectRoot: string = process.cwd(),
    userConfigDir?: string
  ) {
    // User-level configuration (highest precedence)
    this.userConfigPath = userConfigDir 
      ? join(userConfigDir, '.neuro.config.json')
      : join(require('os').homedir(), '.neuro', 'config.json');
    
    // Workspace-level configuration
    this.workspaceConfigPath = join(projectRoot, '.vscode', 'neuro.config.json');
    
    // Project-level configuration (lowest precedence)
    this.projectConfigPath = join(projectRoot, '.neuro.config.json');
  }

  /**
   * Load and merge configuration from all levels
   */
  async loadConfiguration(): Promise<MCPConfiguration> {
    const levels = await this.loadAllLevels();
    return this.mergeConfigurations(levels);
  }

  /**
   * Load configuration from all levels
   */
  private async loadAllLevels(): Promise<ConfigurationLevel[]> {
    const levels: ConfigurationLevel[] = [
      {
        name: 'project',
        path: this.projectConfigPath,
        exists: false
      },
      {
        name: 'workspace', 
        path: this.workspaceConfigPath,
        exists: false
      },
      {
        name: 'user',
        path: this.userConfigPath,
        exists: false
      }
    ];

    // Load each configuration level
    for (const level of levels) {
      try {
        const content = await fs.readFile(level.path, 'utf-8');
        level.config = JSON.parse(content);
        level.exists = true;
      } catch (error) {
        // Config file doesn't exist or is invalid - use defaults
        level.config = { servers: {} };
        level.exists = false;
      }
    }

    return levels;
  }

  /**
   * Merge configurations with proper precedence
   * User > Workspace > Project
   */
  private mergeConfigurations(levels: ConfigurationLevel[]): MCPConfiguration {
    const merged: MCPConfiguration = {
      inputs: [],
      servers: {},
      globalSettings: {}
    };

    // Start with project level (lowest precedence)
    for (const level of levels) {
      if (level.config) {
        // Merge global settings
        if (level.config.globalSettings) {
          merged.globalSettings = {
            ...merged.globalSettings,
            ...level.config.globalSettings
          };
        }

        // Merge inputs (higher levels override lower)
        if (level.config.inputs) {
          const inputMap = new Map(merged.inputs?.map(input => [input.id, input]) || []);
          
          for (const input of level.config.inputs) {
            inputMap.set(input.id, input);
          }
          
          merged.inputs = Array.from(inputMap.values());
        }

        // Merge servers (higher levels override lower)
        if (level.config.servers) {
          merged.servers = {
            ...merged.servers,
            ...level.config.servers
          };
        }
      }
    }

    return merged;
  }

  /**
   * Resolve input placeholders in configuration
   */
  async resolveInputs(config: MCPConfiguration): Promise<MCPConfiguration> {
    if (!config.inputs) {
      return config;
    }

    // Collect input values
    for (const input of config.inputs) {
      const value = await this.resolveInputValue(input);
      if (value) {
        this.resolvedInputs.set(input.id, value);
      }
    }

    // Replace placeholders in server configurations
    const resolvedConfig = JSON.parse(JSON.stringify(config));
    
    for (const [serverName, serverConfig] of Object.entries(resolvedConfig.servers)) {
      this.replacePlaceholders(serverConfig);
    }

    return resolvedConfig;
  }

  /**
   * Resolve individual input value
   */
  private async resolveInputValue(input: MCPInputConfig): Promise<string | undefined> {
    switch (input.type) {
      case 'env':
        return process.env[input.id] || input.default;
      
      case 'file':
        try {
          return await fs.readFile(input.default || '', 'utf-8');
        } catch {
          return undefined;
        }
      
      case 'promptString':
        // In CLI context, use environment or default
        // In interactive context, could prompt user
        return process.env[input.id] || input.default;
      
      default:
        return input.default;
    }
  }

  /**
   * Replace ${input:id} placeholders with resolved values
   */
  private replacePlaceholders(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{input:([^}]+)\}/g, (match, inputId) => {
        return this.resolvedInputs.get(inputId) || match;
      });
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = this.replacePlaceholders(obj[i]);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        obj[key] = this.replacePlaceholders(value);
      }
    }

    return obj;
  }

  /**
   * Convert MCP configuration to external server configs
   */
  convertToExternalConfigs(config: MCPConfiguration): ExternalMCPServerConfig[] {
    const configs: ExternalMCPServerConfig[] = [];

    for (const [name, serverConfig] of Object.entries(config.servers)) {
      if (serverConfig.enabled === false) {
        continue;
      }

      const externalConfig: ExternalMCPServerConfig = {
        name,
        command: serverConfig.command || '',
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        timeout: serverConfig.timeout || config.globalSettings?.defaultTimeout || 30000,
        transport: serverConfig.type === 'stdio' ? 'stdio' : 'sse' // Default to stdio
      };

      configs.push(externalConfig);
    }

    return configs;
  }

  /**
   * Validate configuration structure
   */
  validateConfiguration(config: MCPConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate servers
    for (const [name, server] of Object.entries(config.servers)) {
      if (server.type === 'stdio' && !server.command) {
        errors.push(`Server "${name}": stdio type requires command`);
      }
      
      if (server.type === 'http' && !server.url) {
        errors.push(`Server "${name}": http type requires url`);
      }
      
      if (server.timeout && (server.timeout < 1000 || server.timeout > 300000)) {
        errors.push(`Server "${name}": timeout must be between 1000ms and 300000ms`);
      }
    }

    // Validate inputs
    if (config.inputs) {
      for (const input of config.inputs) {
        if (!input.id || !input.type || !input.description) {
          errors.push(`Input missing required fields: id, type, description`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration source information
   */
  async getConfigurationSources(): Promise<{ level: string; path: string; exists: boolean }[]> {
    const levels = await this.loadAllLevels();
    return levels.map(level => ({
      level: level.name,
      path: level.path,
      exists: level.exists
    }));
  }
}

// Export convenience functions
export async function loadHierarchicalConfig(projectRoot?: string): Promise<MCPConfiguration> {
  const manager = new HierarchicalConfigManager(projectRoot);
  const config = await manager.loadConfiguration();
  return manager.resolveInputs(config);
}

export async function getExternalServerConfigs(projectRoot?: string): Promise<ExternalMCPServerConfig[]> {
  const manager = new HierarchicalConfigManager(projectRoot);
  const config = await manager.loadConfiguration();
  const resolvedConfig = await manager.resolveInputs(config);
  return manager.convertToExternalConfigs(resolvedConfig);
}