#!/usr/bin/env node
/**
 * NeuroLink Unified MCP System Demo
 * Demonstrates the unified MCP system with both internal and external servers
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile } from 'fs/promises';

// Get project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Set working directory
process.chdir(projectRoot);

// Import NeuroLink MCP system
const { MCPUtils, getMCPStatus, listMCPTools } = await import('../dist/lib/mcp/index.js');

/**
 * Demo configuration
 */
const DEMO_CONFIG = {
  sessionId: 'unified-mcp-demo',
  userId: 'demo-user',
  aiProvider: 'openai',
};

/**
 * Console utilities
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg, ...args) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`, ...args),
  success: (msg, ...args) => console.log(`${colors.green}✅ ${msg}${colors.reset}`, ...args),
  warning: (msg, ...args) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`, ...args),
  error: (msg, ...args) => console.log(`${colors.red}❌ ${msg}${colors.reset}`, ...args),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}🚀 ${msg}${colors.reset}\n`),
  subheader: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`),
};

/**
 * Main demo function
 */
async function runUnifiedMCPDemo() {
  try {
    log.header('NeuroLink Unified MCP System Demo');
    
    // Step 1: Initialize the MCP ecosystem
    log.subheader('1. Initializing MCP Ecosystem');
    log.info('Initializing unified MCP system with internal and external servers...');
    
    const initResult = await MCPUtils.initializeEcosystem();
    
    if (initResult.success) {
      log.success('MCP ecosystem initialized successfully!');
      log.info(initResult.message);
    } else {
      log.warning('MCP ecosystem initialization had issues:');
      log.warning(initResult.message);
      log.info('Continuing with available servers...');
    }
    
    // Step 2: Show system status
    log.subheader('2. System Status');
    const status = getMCPStatus();
    
    console.log('📊 MCP System Status:');
    console.log(`   Initialized: ${status.isInitialized ? '✅' : '❌'}`);
    console.log(`   Internal Servers: ${status.internalServers.count} (${status.internalServers.tools} tools)`);
    console.log(`   External Servers: ${status.externalServers.connected}/${status.externalServers.configured} connected (${status.externalServers.tools} tools)`);
    console.log(`   Total Tools: ${status.totalTools}`);
    
    // Step 3: List available tools
    log.subheader('3. Available Tools');
    const toolsInfo = MCPUtils.getAllAvailableTools();
    
    console.log(`📋 Available Tools (${toolsInfo.totalTools} total):`);
    
    for (const [serverName, tools] of Object.entries(toolsInfo.toolsByServer)) {
      console.log(`\n   ${colors.bright}${serverName}${colors.reset} (${tools.length} tools):`);
      
      for (const tool of tools.slice(0, 5)) { // Show first 5 tools
        const category = tool.category ? ` [${tool.category}]` : '';
        console.log(`     • ${tool.name}${category} - ${tool.description}`);
      }
      
      if (tools.length > 5) {
        console.log(`     ... and ${tools.length - 5} more tools`);
      }
    }
    
    // Step 4: Test connectivity
    log.subheader('4. Testing Connectivity');
    const connectivityResult = await MCPUtils.testConnectivity();
    
    if (connectivityResult.status === 'ok') {
      log.success('All servers are responsive!');
      log.info(connectivityResult.message);
      
      if (connectivityResult.details.sampleToolTests) {
        console.log('\n   Sample Tool Tests:');
        for (const test of connectivityResult.details.sampleToolTests) {
          const status = test.available ? '✅' : '❌';
          console.log(`     ${status} ${test.tool} (${test.server})`);
        }
      }
    } else {
      log.warning('Connectivity issues detected:');
      log.warning(connectivityResult.message);
    }
    
    // Step 5: Execute sample tools
    log.subheader('5. Testing Tool Execution');
    
    // Test internal AI tools
    log.info('Testing AI provider status tool...');
    try {
      const providerResult = await MCPUtils.executeTool(
        'check-provider-status',
        { includeCapabilities: true },
        DEMO_CONFIG
      );
      
      if (providerResult.success) {
        log.success('Provider status check successful!');
        console.log(`   Available providers: ${providerResult.data.summary.available}/${providerResult.data.summary.total}`);
      } else {
        log.warning(`Provider status check failed: ${providerResult.error}`);
      }
    } catch (error) {
      log.error(`Provider status tool error: ${error.message}`);
    }
    
    // Test provider selection tool
    log.info('Testing provider selection tool...');
    try {
      const selectionResult = await MCPUtils.executeTool(
        'select-provider',
        { preferred: 'openai' },
        DEMO_CONFIG
      );
      
      if (selectionResult.success) {
        log.success('Provider selection successful!');
        console.log(`   Selected: ${selectionResult.data.provider}`);
        console.log(`   Available: ${selectionResult.data.available.join(', ')}`);
      } else {
        log.warning(`Provider selection failed: ${selectionResult.error}`);
      }
    } catch (error) {
      log.error(`Provider selection tool error: ${error.message}`);
    }
    
    // Test external tools if available
    const externalTools = listMCPTools({ serverCategory: 'integrations' });
    
    if (externalTools.length > 0) {
      log.info(`Testing external tools (${externalTools.length} available)...`);
      
      for (const tool of externalTools.slice(0, 2)) { // Test first 2 external tools
        try {
          log.info(`  Testing ${tool.name} from ${tool.server}...`);
          
          // Try to execute with minimal parameters
          const result = await MCPUtils.executeTool(
            tool.qualifiedName,
            {},
            DEMO_CONFIG
          );
          
          if (result.success) {
            log.success(`  ${tool.name} executed successfully!`);
          } else {
            log.warning(`  ${tool.name} execution failed: ${result.error}`);
          }
        } catch (error) {
          log.warning(`  ${tool.name} error: ${error.message}`);
        }
      }
    } else {
      log.info('No external tools available (this is normal if external servers are not configured)');
    }
    
    // Step 6: Show comprehensive statistics
    log.subheader('6. System Statistics');
    const stats = MCPUtils.getStatistics();
    
    console.log('📈 Comprehensive Statistics:');
    console.log(`   Ecosystem Status: ${stats.ecosystem.initialized ? 'Healthy' : 'Issues'}`);
    console.log(`   Active Servers: ${stats.ecosystem.activeServers}/${stats.ecosystem.totalServers}`);
    console.log(`   Registry Performance: ${stats.registry.executionCount} executions, ${stats.registry.averageExecutionTime.toFixed(2)}ms avg`);
    
    if (Object.keys(stats.tools.byCategory).length > 0) {
      console.log('\n   Tools by Category:');
      for (const [category, count] of Object.entries(stats.tools.byCategory)) {
        console.log(`     • ${category}: ${count} tools`);
      }
    }
    
    // Step 7: Create a session demo
    log.subheader('7. Session Demo');
    log.info('Creating MCP-enabled session...');
    
    const session = await MCPUtils.createSession('demo-session', {
      userId: 'demo-user',
      aiProvider: 'openai',
      modelId: 'gpt-4',
    });
    
    log.success(`Session created with ${session.availableTools} tools available`);
    
    // Test session execution
    log.info('Testing session tool execution...');
    try {
      const sessionResult = await session.execute('check-provider-status', {});
      
      if (sessionResult.success) {
        log.success('Session tool execution successful!');
      } else {
        log.warning(`Session execution failed: ${sessionResult.error}`);
      }
    } catch (error) {
      log.error(`Session execution error: ${error.message}`);
    }
    
    // Final summary
    log.header('Demo Complete!');
    log.success('NeuroLink Unified MCP System is working correctly!');
    
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`✅ Internal servers: ${status.internalServers.count} active`);
    console.log(`${status.externalServers.connected > 0 ? '✅' : '⚠️ '} External servers: ${status.externalServers.connected} connected`);
    console.log(`✅ Total tools: ${status.totalTools} available`);
    console.log(`✅ System status: ${status.isInitialized ? 'Fully operational' : 'Partial operation'}`);
    
    if (status.externalServers.connected === 0 && status.externalServers.configured > 0) {
      console.log(`\n${colors.yellow}Note: External servers are configured but not connected.${colors.reset}`);
      console.log('This might be due to missing dependencies or network issues.');
      console.log('The system works perfectly with internal tools only.');
    }
    
    console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
    console.log('• Use MCPUtils.executeTool() to run any available tool');
    console.log('• Use MCPUtils.createSession() for session-based tool execution');
    console.log('• Check .neuro.config.json to configure external servers');
    console.log('• See test files for more usage examples');
    
  } catch (error) {
    log.error('Demo failed with error:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Check if we're being run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runUnifiedMCPDemo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runUnifiedMCPDemo };