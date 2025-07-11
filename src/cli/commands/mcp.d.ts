#!/usr/bin/env node
/**
 * MCP Server Management Commands
 * Real MCP server connectivity and management
 */
import type { Argv } from "yargs";
interface MCPServerConfig {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    transport: "stdio" | "sse";
    url?: string;
}
export declare function executeMCPTool(serverConfig: MCPServerConfig, toolName: string, toolParams: any): Promise<any>;
export declare function mcpExecuteTool(serverName: string, toolName: string, toolParams: any): Promise<any>;
export declare function addMCPCommands(yargs: Argv): Argv;
export {};
