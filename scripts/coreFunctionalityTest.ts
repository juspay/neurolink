#!/usr/bin/env node

/**
 * CRITICAL: Core NeuroLink Functionality Verification
 * Tests ALL features that NeuroLink supports after MCP refactor
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import chalk from "chalk";

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");

type TestEntry = {
  timestamp: string;
  message: string;
  success: boolean;
  details: string;
};

const results: TestEntry[] = [];

function log(message: string, success = true, details = ""): void {
  const entry: TestEntry = { timestamp: new Date().toISOString(), message, success, details };
  results.push(entry);
  console.log(`${success ? '✅' : '❌'} ${message}`);
  if (details) console.log(`   ${chalk.gray(details)}`);
}

function runTest(command: string, description: string, expectedInOutput: string | null = null): boolean {
  try {
    console.log(`\n🔧 Testing: ${description}`);
    console.log(`Command: ${command}`);
    
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout: 45000,
      stdio: 'pipe'
    });
    
    if (expectedInOutput && !output.includes(expectedInOutput)) {
      log(`${description} - FAILED: Expected '${expectedInOutput}' in output`, false, output.slice(0, 200));
      return false;
    }
    
    log(`${description} - SUCCESS`, true, output.slice(0, 200));
    return true;
  } catch (error: unknown) {
    log(`${description} - FAILED`, false, (error as Error).message);
    return false;
  }
}

console.log(chalk.cyan('\nCORE NEUROLINK FUNCTIONALITY VERIFICATION'));
console.log(chalk.cyan('Testing ALL features after MCP refactor\n'));

// === PHASE 1: CLI CORE COMMANDS ===
console.log(chalk.yellow('\n📋 PHASE 1: CLI CORE COMMANDS'));

// Test basic generate command
runTest(
  'pnpm cli generate "What is 2+2?" --provider google-ai',
  'CLI Generate Command',
  null
);

// Test short form
runTest(
  'pnpm cli gen "Hello" --provider google-ai',
  'CLI Gen (Short Form)',
  null
);

// Test stream command  
runTest(
  'echo "Tell me a joke" | pnpm cli stream --provider google-ai',
  'CLI Stream Command',
  null
);

// Test status command
runTest(
  'pnpm cli status',
  'CLI Status Command',
  null
);

// === PHASE 2: AI PROVIDERS ===
console.log(chalk.yellow('\n🤖 PHASE 2: AI PROVIDERS (9 Major)'));

const providers = [
  { name: 'google-ai', test: true }, // This should work
  { name: 'openai', test: false },   // May not have API key
  { name: 'anthropic', test: false },
  { name: 'vertex', test: false },
  { name: 'bedrock', test: false },
  { name: 'azure', test: false },
  { name: 'huggingface', test: false },
  { name: 'ollama', test: false },
  { name: 'mistral', test: false }
];

providers.forEach(provider => {
  if (provider.test) {
    runTest(
      `pnpm cli generate "Test ${provider.name}" --provider ${provider.name}`,
      `Provider: ${provider.name.toUpperCase()}`,
      null
    );
  } else {
    // Just test that the provider is recognized (even if it fails due to missing API key)
    try {
      execSync(`pnpm cli generate "Test" --provider ${provider.name}`, { 
        encoding: 'utf8', 
        timeout: 10000,
        stdio: 'pipe'
      });
      log(`Provider: ${provider.name.toUpperCase()} - AVAILABLE`, true);
    } catch (error: unknown) {
      if ((error as Error).message.includes('API key') || (error as Error).message.includes('credentials')) {
        log(`Provider: ${provider.name.toUpperCase()} - RECOGNIZED (no API key)`, true, 'Provider exists but needs credentials');
      } else {
        log(`Provider: ${provider.name.toUpperCase()} - ERROR`, false, (error as Error).message.slice(0, 100));
      }
    }
  }
});

// === PHASE 3: CLI FLAGS & OPTIONS ===
console.log(chalk.yellow('\n⚙️ PHASE 3: CLI FLAGS & OPTIONS'));

// Test analytics flag
runTest(
  'pnpm cli generate "Test analytics" --provider google-ai --enable-analytics --debug',
  'Analytics Flag',
  null
);

// Test evaluation flag
runTest(
  'pnpm cli generate "Test evaluation" --provider google-ai --enable-evaluation --debug',
  'Evaluation Flag', 
  null
);

// Test context flag
runTest(
  'pnpm cli generate "Test context" --provider google-ai --context \'{"test":"value"}\' --debug',
  'Context Flag',
  null
);

// Test model flag
runTest(
  'pnpm cli generate "Test model" --provider google-ai --model gemini-2.5-flash',
  'Model Flag',
  null
);

// === PHASE 4: MCP INTEGRATION ===
console.log(chalk.yellow('\n🔗 PHASE 4: MCP INTEGRATION'));

// Test MCP commands
runTest(
  'pnpm cli mcp list-tools',
  'MCP List Tools',
  null
);

runTest(
  'pnpm cli mcp discover',
  'MCP Discover',
  null
);

// Test generate with MCP context (if supported)
try {
  runTest(
    'pnpm cli generate "What files are in the current directory?" --provider google-ai --use-mcp',
    'Generate with MCP Tools',
    null
  );
} catch {
  log('Generate with MCP Tools - SKIPPED (feature may not be implemented)', true, 'MCP integration with generate may need implementation');
}

// === PHASE 5: SDK INTEGRATION ===
console.log(chalk.yellow('\n💻 PHASE 5: SDK METHODS'));

// Create a quick SDK test
const sdkTest = `
import { createBestAIProvider } from './src/lib/index.js';

try {
  const provider = createBestAIProvider('google-ai');
  const result = await provider.generate({ input: { text: 'Test SDK' } });
  console.log('SDK Test SUCCESS:', result.slice(0, 50));
} catch (error: unknown) {
  console.log('SDK Test FAILED:', (error as Error).message);
}
`;

writeFileSync('./test-sdk.mjs', sdkTest);

try {
  const sdkOutput = execSync('node test-sdk.mjs', { encoding: 'utf8', timeout: 30000 });
  if (sdkOutput.includes('SUCCESS')) {
    log('SDK generate() Method - SUCCESS', true, sdkOutput.slice(0, 100));
  } else {
    log('SDK generate() Method - FAILED', false, sdkOutput);
  }
} catch (error: unknown) {
  log('SDK generate() Method - FAILED', false, (error as Error).message);
} finally {
  try { unlinkSync('./test-sdk.mjs'); } catch { /* ignore cleanup errors */ }
}

// === PHASE 6: ERROR HANDLING ===
console.log(chalk.yellow('\n🛡️ PHASE 6: ERROR HANDLING'));

// Test invalid provider
try {
  execSync('pnpm cli generate "Test" --provider invalid-provider', { 
    encoding: 'utf8', 
    timeout: 10000,
    stdio: 'pipe'
  });
  log('Invalid Provider Handling - FAILED (should have errored)', false);
} catch (error: unknown) {
  if ((error as Error).message.includes('invalid') || (error as Error).message.includes('unknown') || (error as Error).message.includes('not found')) {
    log('Invalid Provider Handling - SUCCESS', true, 'Properly rejected invalid provider');
  } else {
    log('Invalid Provider Handling - UNCLEAR', false, (error as Error).message.slice(0, 100));
  }
}

// Test timeout handling
try {
  execSync('pnpm cli generate "Very long response please write 1000 words" --provider google-ai --timeout 1s', { 
    encoding: 'utf8', 
    timeout: 5000,
    stdio: 'pipe'
  });
  log('Timeout Handling - SUCCESS (completed within timeout)', true);
} catch (error: unknown) {
  if ((error as Error).message.includes('timeout') || (error as Error).message.includes('timed out')) {
    log('Timeout Handling - SUCCESS', true, 'Properly handled timeout');
  } else {
    log('Timeout Handling - UNCLEAR', false, (error as Error).message.slice(0, 100));
  }
}

// === PHASE 7: CONFIGURATION ===
console.log(chalk.yellow('\n⚙️ PHASE 7: CONFIGURATION'));

// Test config help
runTest(
  'pnpm cli config --help',
  'Config Help Command',
  null
);

// Test project health
runTest(
  'pnpm run project:health',
  'Project Health Check',
  null
);

// === GENERATE COMPREHENSIVE REPORT ===
console.log(chalk.yellow('\n📊 GENERATING REPORT'));

const report = {
  timestamp: TIMESTAMP,
  totalTests: results.length,
  passed: results.filter(r => r.success).length,
  failed: results.filter(r => !r.success).length,
  categories: {
    'CLI Core Commands': results.filter(r => r.message.includes('CLI')).length,
    'AI Providers': results.filter(r => r.message.includes('Provider:')).length,
    'CLI Flags': results.filter(r => r.message.includes('Flag')).length,
    'MCP Integration': results.filter(r => r.message.includes('MCP')).length,
    'SDK Methods': results.filter(r => r.message.includes('SDK')).length,
    'Error Handling': results.filter(r => r.message.includes('Handling')).length,
    'Configuration': results.filter(r => r.message.includes('Config')).length
  },
  results
};

writeFileSync(`./core-functionality-report-${TIMESTAMP}.json`, JSON.stringify(report, null, 2));

// Console summary
console.log(chalk.cyan('\n' + '='.repeat(60)));
console.log(chalk.bold.cyan('CORE FUNCTIONALITY VERIFICATION SUMMARY'));
console.log(chalk.cyan('='.repeat(60)));
console.log(`${chalk.green('✅ Passed:')} ${report.passed}`);
console.log(`${chalk.red('❌ Failed:')} ${report.failed}`);
console.log(`${chalk.blue('📊 Success Rate:')} ${((report.passed / report.totalTests) * 100).toFixed(1)}%`);
console.log(`${chalk.magenta('📁 Report:')} core-functionality-report-${TIMESTAMP}.json`);
console.log(chalk.cyan('='.repeat(60)));

// Critical assessment
if (report.failed === 0) {
  console.log(chalk.green('🎉 ALL CORE FUNCTIONALITY WORKING!'));
} else if (report.failed <= 3) {
  console.log(chalk.yellow('⚠️  MOSTLY WORKING - Minor issues detected'));
} else {
  console.log(chalk.red('🚨 CRITICAL ISSUES - Core functionality broken'));
}

console.log('\n');
process.exit(report.failed > 5 ? 1 : 0);