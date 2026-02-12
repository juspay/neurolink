#!/usr/bin/env node
/**
 * MCP Server Management Commands
 * Real MCP server connectivity and management
 */
import type { Argv } from "yargs";
import type { JsonValue } from "../../lib/types/common.js";
type MCPServerConfig = {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    transport: "stdio" | "sse";
    url?: string;
};
export declare function executeMCPTool(serverConfig: MCPServerConfig, toolName: string, toolParams: JsonValue): Promise<JsonValue>;
export declare function mcpExecuteTool(serverName: string, toolName: string, toolParams: JsonValue): Promise<JsonValue>;
export declare function addMCPCommands(yargs: Argv): Argv;
export {};
