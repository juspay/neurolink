#!/usr/bin/env node

/**
 * MCP Server Management Commands
 * Real MCP server connectivity and management
 */

import type { Argv } from 'yargs';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import path from 'path';

// MCP Server Configuration
interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  transport: 'stdio' | 'sse';
  url?: string; // for SSE transport
}

interface MCPConfigFile {
  mcpServers: Record<string, MCPServerConfig>;
}

// Default MCP config file location
const MCP_CONFIG_FILE = path.join(process.cwd(), '.mcp-config.json');

// Load MCP configuration
function loadMCPConfig(): MCPConfigFile {
  if (!fs.existsSync(MCP_CONFIG_FILE)) {
    return { mcpServers: {} };
  }

  try {
    const content = fs.readFileSync(MCP_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid MCP config file: ${(error as Error).message}`);
  }
}

// Save MCP configuration
function saveMCPConfig(config: MCPConfigFile): void {
  fs.writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Check if MCP server process is running
async function checkMCPServerStatus(serverConfig: MCPServerConfig): Promise<boolean> {
  try {
    if (serverConfig.transport === 'stdio') {
      // For stdio servers, we need to actually try connecting
      const child = spawn(serverConfig.command, serverConfig.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...serverConfig.env },
        cwd: serverConfig.cwd
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          child.kill();
          resolve(false);
        }, 3000);

        child.on('spawn', () => {
          clearTimeout(timeout);
          child.kill();
          resolve(true);
        });

        child.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });
    } else if (serverConfig.transport === 'sse' && serverConfig.url) {
      // For SSE servers, check if URL is accessible
      try {
        const response = await fetch(serverConfig.url, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// Connect to MCP server and get capabilities
async function getMCPServerCapabilities(serverConfig: MCPServerConfig): Promise<any> {
  if (serverConfig.transport === 'stdio') {
    // Spawn MCP server and send initialize request
    const child = spawn(serverConfig.command, serverConfig.args || [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...serverConfig.env },
      cwd: serverConfig.cwd
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Timeout connecting to MCP server'));
      }, 5000);

      let responseData = '';

      child.stdout?.on('data', (data) => {
        responseData += data.toString();

        // Look for JSON-RPC response
        try {
          const lines = responseData.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('"result"')) {
              const response = JSON.parse(line.trim());
              if (response.result && response.result.capabilities) {
                clearTimeout(timeout);
                child.kill();
                resolve(response.result);
                return;
              }
            }
          }
        } catch {
          // Continue parsing
        }
      });

      child.on('spawn', () => {
        // Send initialize request
        const initRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'neurolink-cli',
              version: '1.0.0'
            }
          }
        };

        child.stdin?.write(JSON.stringify(initRequest) + '\n');
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  throw new Error('SSE transport not yet implemented for capabilities');
}

// List available tools from MCP server
async function listMCPServerTools(serverConfig: MCPServerConfig): Promise<any[]> {
  if (serverConfig.transport === 'stdio') {
    const child = spawn(serverConfig.command, serverConfig.args || [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...serverConfig.env },
      cwd: serverConfig.cwd
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Timeout listing MCP server tools'));
      }, 5000);

      let responseData = '';
      let initialized = false;

      child.stdout?.on('data', (data) => {
        responseData += data.toString();

        try {
          const lines = responseData.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('"result"')) {
              const response = JSON.parse(line.trim());

              if (response.id === 1 && response.result.capabilities) {
                // Initialize successful, now list tools
                initialized = true;
                const listToolsRequest = {
                  jsonrpc: '2.0',
                  id: 2,
                  method: 'tools/list',
                  params: {}
                };
                child.stdin?.write(JSON.stringify(listToolsRequest) + '\n');
              } else if (response.id === 2 && response.result.tools) {
                clearTimeout(timeout);
                child.kill();
                resolve(response.result.tools);
                return;
              }
            }
          }
        } catch {
          // Continue parsing
        }
      });

      child.on('spawn', () => {
        // Send initialize request first
        const initRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'neurolink-cli',
              version: '1.0.0'
            }
          }
        };

        child.stdin?.write(JSON.stringify(initRequest) + '\n');
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  throw new Error('SSE transport not yet implemented for tool listing');
}

// MCP Commands for yargs
export function addMCPCommands(yargs: Argv): Argv {
  return yargs.command('mcp <subcommand>', 'Manage MCP (Model Context Protocol) servers',
    (yargsBuilder) => {
      yargsBuilder
        .usage('Usage: $0 mcp <subcommand> [options]')

        // List MCP servers
        .command('list', 'List configured MCP servers',
          (y) => y
            .usage('Usage: $0 mcp list [options]')
            .option('status', { type: 'boolean', description: 'Check server status' })
            .example('$0 mcp list', 'List all MCP servers')
            .example('$0 mcp list --status', 'List servers with status check'),
          async (argv) => {
            const config = loadMCPConfig();
            const servers = Object.entries(config.mcpServers);

            if (servers.length === 0) {
              console.log(chalk.yellow('📭 No MCP servers configured'));
              console.log(chalk.blue('💡 Add a server with: neurolink mcp add <name> <command>'));
              return;
            }

            console.log(chalk.blue(`📋 Configured MCP servers (${servers.length}):\n`));

            for (const [name, serverConfig] of servers) {
              console.log(chalk.bold(`🔧 ${name}`));
              console.log(`   Command: ${serverConfig.command} ${(serverConfig.args || []).join(' ')}`);
              console.log(`   Transport: ${serverConfig.transport}`);

              if (argv.status) {
                const spinner = ora(`Checking ${name}...`).start();
                try {
                  const isRunning = await checkMCPServerStatus(serverConfig);
                  if (isRunning) {
                    spinner.succeed(`${name}: ${chalk.green('✅ Available')}`);
                  } else {
                    spinner.fail(`${name}: ${chalk.red('❌ Not available')}`);
                  }
                } catch (error) {
                  spinner.fail(`${name}: ${chalk.red('❌ Error')} - ${(error as Error).message}`);
                }
              }

              console.log(); // Empty line
            }
          }
        )

        // Add MCP server
        .command('add <name> <command>', 'Add a new MCP server',
          (y) => y
            .usage('Usage: $0 mcp add <name> <command> [options]')
            .positional('name', { type: 'string', description: 'Server name', demandOption: true })
            .positional('command', { type: 'string', description: 'Command to run server', demandOption: true })
            .option('args', { type: 'array', description: 'Command arguments' })
            .option('transport', { choices: ['stdio', 'sse'], default: 'stdio', description: 'Transport type' })
            .option('url', { type: 'string', description: 'URL for SSE transport' })
            .option('env', { type: 'string', description: 'Environment variables (JSON)' })
            .option('cwd', { type: 'string', description: 'Working directory' })
            .example('$0 mcp add filesystem "npx @modelcontextprotocol/server-filesystem"', 'Add filesystem server')
            .example('$0 mcp add github "npx @modelcontextprotocol/server-github"', 'Add GitHub server'),
          async (argv) => {
            const config = loadMCPConfig();

            const serverConfig: MCPServerConfig = {
              name: argv.name as string,
              command: argv.command as string,
              args: argv.args as string[] || [],
              transport: argv.transport as 'stdio' | 'sse',
              url: argv.url,
              cwd: argv.cwd
            };

            if (argv.env) {
              try {
                serverConfig.env = JSON.parse(argv.env);
              } catch (error) {
                console.error(chalk.red('❌ Invalid JSON for environment variables'));
                process.exit(1);
              }
            }

            config.mcpServers[argv.name as string] = serverConfig;
            saveMCPConfig(config);

            console.log(chalk.green(`✅ Added MCP server: ${argv.name}`));
            console.log(chalk.blue(`💡 Test it with: neurolink mcp test ${argv.name}`));
          }
        )

        // Remove MCP server
        .command('remove <name>', 'Remove an MCP server',
          (y) => y
            .usage('Usage: $0 mcp remove <name>')
            .positional('name', { type: 'string', description: 'Server name to remove', demandOption: true })
            .example('$0 mcp remove filesystem', 'Remove filesystem server'),
          async (argv) => {
            const config = loadMCPConfig();

            if (!config.mcpServers[argv.name as string]) {
              console.error(chalk.red(`❌ MCP server '${argv.name}' not found`));
              process.exit(1);
            }

            delete config.mcpServers[argv.name as string];
            saveMCPConfig(config);

            console.log(chalk.green(`✅ Removed MCP server: ${argv.name}`));
          }
        )

        // Test MCP server
        .command('test <name>', 'Test connection to an MCP server',
          (y) => y
            .usage('Usage: $0 mcp test <name>')
            .positional('name', { type: 'string', description: 'Server name to test', demandOption: true })
            .example('$0 mcp test filesystem', 'Test filesystem server'),
          async (argv) => {
            const config = loadMCPConfig();
            const serverConfig = config.mcpServers[argv.name as string];

            if (!serverConfig) {
              console.error(chalk.red(`❌ MCP server '${argv.name}' not found`));
              process.exit(1);
            }

            console.log(chalk.blue(`🔍 Testing MCP server: ${argv.name}\n`));

            const spinner = ora('Connecting...').start();

            try {
              // Test basic connectivity
              const isRunning = await checkMCPServerStatus(serverConfig);
              if (!isRunning) {
                spinner.fail(chalk.red('❌ Server not available'));
                return;
              }

              spinner.text = 'Getting capabilities...';
              const capabilities = await getMCPServerCapabilities(serverConfig);

              spinner.text = 'Listing tools...';
              const tools = await listMCPServerTools(serverConfig);

              spinner.succeed(chalk.green('✅ Connection successful!'));

              console.log(chalk.blue('\n📋 Server Capabilities:'));
              console.log(`   Protocol Version: ${capabilities.protocolVersion || 'Unknown'}`);
              if (capabilities.capabilities.tools) {
                console.log(`   Tools: ✅ Supported`);
              }
              if (capabilities.capabilities.resources) {
                console.log(`   Resources: ✅ Supported`);
              }

              console.log(chalk.blue('\n🛠️  Available Tools:'));
              if (tools.length === 0) {
                console.log('   No tools available');
              } else {
                tools.forEach((tool: any) => {
                  console.log(`   • ${tool.name}: ${tool.description || 'No description'}`);
                });
              }

            } catch (error) {
              spinner.fail(chalk.red('❌ Connection failed'));
              console.error(chalk.red(`Error: ${(error as Error).message}`));
            }
          }
        )

        // Install popular MCP servers
        .command('install <server>', 'Install popular MCP servers',
          (y) => y
            .usage('Usage: $0 mcp install <server>')
            .positional('server', {
              type: 'string',
              choices: ['filesystem', 'github', 'postgres', 'brave-search', 'puppeteer'],
              description: 'Server to install',
              demandOption: true
            })
            .example('$0 mcp install filesystem', 'Install filesystem server')
            .example('$0 mcp install github', 'Install GitHub server'),
          async (argv) => {
            const serverName = argv.server as string;
            const config = loadMCPConfig();

            // Pre-configured popular MCP servers
            const serverConfigs: Record<string, MCPServerConfig> = {
              filesystem: {
                name: 'filesystem',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
                transport: 'stdio'
              },
              github: {
                name: 'github',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                transport: 'stdio'
              },
              postgres: {
                name: 'postgres',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-postgres'],
                transport: 'stdio'
              },
              'brave-search': {
                name: 'brave-search',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-brave-search'],
                transport: 'stdio'
              },
              puppeteer: {
                name: 'puppeteer',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-puppeteer'],
                transport: 'stdio'
              }
            };

            const serverConfig = serverConfigs[serverName];
            if (!serverConfig) {
              console.error(chalk.red(`❌ Unknown server: ${serverName}`));
              process.exit(1);
            }

            console.log(chalk.blue(`📦 Installing MCP server: ${serverName}`));

            config.mcpServers[serverName] = serverConfig;
            saveMCPConfig(config);

            console.log(chalk.green(`✅ Installed MCP server: ${serverName}`));
            console.log(chalk.blue(`💡 Test it with: neurolink mcp test ${serverName}`));
          }
        )

        // Execute tool from MCP server
        .command('exec <server> <tool>', 'Execute a tool from an MCP server',
          (y) => y
            .usage('Usage: $0 mcp exec <server> <tool> [options]')
            .positional('server', { type: 'string', description: 'Server name', demandOption: true })
            .positional('tool', { type: 'string', description: 'Tool name', demandOption: true })
            .option('params', { type: 'string', description: 'Tool parameters (JSON)' })
            .example('$0 mcp exec filesystem read_file --params \'{"path": "README.md"}\'', 'Read file using filesystem server'),
          async (argv) => {
            const config = loadMCPConfig();
            const serverConfig = config.mcpServers[argv.server as string];

            if (!serverConfig) {
              console.error(chalk.red(`❌ MCP server '${argv.server}' not found`));
              process.exit(1);
            }

            let params = {};
            if (argv.params) {
              try {
                params = JSON.parse(argv.params);
              } catch (error) {
                console.error(chalk.red('❌ Invalid JSON for parameters'));
                process.exit(1);
              }
            }

            console.log(chalk.blue(`🔧 Executing tool: ${argv.tool} on server: ${argv.server}`));

            // This would need full MCP client implementation
            // For now, show what would happen
            console.log(chalk.yellow('⚠️  Tool execution not yet implemented'));
            console.log(`Tool: ${argv.tool}`);
            console.log(`Parameters: ${JSON.stringify(params, null, 2)}`);
          }
        )

        .demandCommand(1, 'Please specify an MCP subcommand')
        .example('$0 mcp list', 'List configured MCP servers')
        .example('$0 mcp install filesystem', 'Install filesystem MCP server')
        .example('$0 mcp test filesystem', 'Test filesystem server connection');
    }
  );
}
