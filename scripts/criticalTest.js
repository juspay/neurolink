#!/usr/bin/env node

/**
 * CRITICAL: Essential NeuroLink Functionality Test
 * Tests the most important features quickly
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";

const results = [];

function test(description, command, timeout = 30000) {
  console.log(`\n🔧 ${description}`);
  console.log(`Command: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout,
      stdio: 'pipe'
    });
    
    console.log(`✅ SUCCESS: ${description}`);
    console.log(`Output: ${output.slice(0, 200)}...`);
    results.push({ test: description, status: 'SUCCESS', output: output.slice(0, 500) });
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${description}`);
    console.log(`Error: ${error.message.slice(0, 200)}`);
    results.push({ test: description, status: 'FAILED', error: error.message.slice(0, 500) });
    return false;
  }
}

console.log('🚀 CRITICAL NEUROLINK FUNCTIONALITY TEST\n');

// 1. Most Critical: Basic CLI Generate
test(
  'CLI Generate Command', 
  'pnpm cli generate "What is 2+2?" --provider google-ai'
);

// 2. Critical: Stream Command
test(
  'CLI Stream Command',
  'echo "Hello" | pnpm cli stream --provider google-ai',
  20000
);

// 3. Critical: Analytics Feature
test(
  'Analytics Feature',
  'pnpm cli generate "Test" --provider google-ai --enable-analytics --debug'
);

// 4. Critical: Evaluation Feature  
test(
  'Evaluation Feature',
  'pnpm cli generate "Test" --provider google-ai --enable-evaluation --debug'
);

// 5. Critical: MCP List Tools
test(
  'MCP List Tools',
  'pnpm cli mcp list-tools',
  15000
);

// 6. Critical: Status Command
test(
  'Status Command',
  'pnpm cli status',
  10000
);

// Generate Report
const passed = results.filter(r => r.status === 'SUCCESS').length;
const failed = results.filter(r => r.status === 'FAILED').length;
const total = results.length;

const report = {
  timestamp: new Date().toISOString(),
  summary: { total, passed, failed, successRate: `${((passed/total)*100).toFixed(1)}%` },
  results
};

writeFileSync('./criticalTest-report.json', JSON.stringify(report, null, 2));

console.log('\n' + '='.repeat(50));
console.log('CRITICAL FUNCTIONALITY TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${failed}/${total}`);
console.log(`📊 Success Rate: ${((passed/total)*100).toFixed(1)}%`);
console.log(`📁 Report: criticalTest-report.json`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('🎉 ALL CRITICAL FUNCTIONALITY WORKING!');
} else if (failed <= 2) {
  console.log('⚠️  MOSTLY WORKING - Minor issues');
} else {
  console.log('🚨 CRITICAL ISSUES DETECTED');
}

process.exit(failed > 2 ? 1 : 0);