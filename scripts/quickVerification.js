#!/usr/bin/env node

/**
 * Quick End-to-End Verification
 * Tests core functionality and records results
 */

import { execSync } from "child_process";
import { writeFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const results = [];

function log(message, success = true) {
  const entry = { timestamp: new Date().toISOString(), message, success };
  results.push(entry);
  console.log(`${success ? '✅' : '❌'} ${message}`);
}

function runQuickTest(command, description) {
  try {
    const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
    log(`${description} - SUCCESS`);
    return true;
  } catch (error) {
    log(`${description} - FAILED: ${error.message}`, false);
    return false;
  }
}

// Check project structure
console.log('\n🔍 VERIFYING PROJECT STRUCTURE');
const requiredFiles = [
  'src/lib/mcp/healthMonitor.ts',
  'src/lib/mcp/dynamic-chain-executor.ts', 
  'src/lib/mcp/session-manager.ts',
  'src/lib/mcp/semaphore-manager.ts',
  'src/lib/mcp/error-manager.ts',
  'test/continuous-test-suite.ts'
];

requiredFiles.forEach(file => {
  if (existsSync(file)) {
    log(`Found: ${file}`);
  } else {
    log(`Missing: ${file}`, false);
  }
});

// Test build
console.log('\n🏗️ TESTING BUILD');
runQuickTest('pnpm run build', 'TypeScript Build');
runQuickTest('pnpm run lint --max-warnings 0', 'Linting');

// Test core functionality
console.log('\n🧪 TESTING CORE FEATURES');
runQuickTest('pnpm run test:providers', 'Continuous Test Suite');

// Test CLI basics
console.log('\n💻 TESTING CLI');
runQuickTest('pnpm cli generate "test" --provider google-ai', 'CLI Generation');

// Check demo files
console.log('\n🎭 CHECKING DEMO FILES');
const demoFiles = [
  'scripts/examples/healthMonitoring-demo.js',
  'scripts/examples/dynamic-chain-demo.js'
];

demoFiles.forEach(file => {
  if (existsSync(file)) {
    log(`Demo available: ${file}`);
  } else {
    log(`Demo missing: ${file}`, false);
  }
});

// Generate report
const report = {
  timestamp: TIMESTAMP,
  total: results.length,
  passed: results.filter(r => r.success).length,
  failed: results.filter(r => !r.success).length,
  results
};

writeFileSync(`./verification-report-${TIMESTAMP}.json`, JSON.stringify(report, null, 2));

console.log('\n📊 VERIFICATION SUMMARY');
console.log(`Total: ${report.total}`);
console.log(`Passed: ${report.passed}`);
console.log(`Failed: ${report.failed}`);
console.log(`Success Rate: ${((report.passed / report.total) * 100).toFixed(1)}%`);
console.log(`Report saved: verification-report-${TIMESTAMP}.json`);

process.exit(report.failed > 0 ? 1 : 0);
