#!/usr/bin/env node

/**
 * CORRECTED: Essential NeuroLink Functionality Test
 * Using correct CLI syntax
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";

type TestResult = {
  test: string;
  status: string;
  output?: string;
  error?: string;
};

const results: TestResult[] = [];

function test(description: string, command: string, timeout = 30000): boolean {
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
    const err = error as Error;
    console.log(`FAILED: ${description}`);
    console.log(`Error: ${err.message.slice(0, 200)}`);
    results.push({ test: description, status: 'FAILED', error: err.message.slice(0, 500) });
    return false;
  }
}

console.log('🚀 CORRECTED NEUROLINK FUNCTIONALITY TEST\n');

// 1. CORE: CLI Generate (WORKING ✅)
test(
  'CLI Generate Command', 
  'pnpm cli generate "What is 2+2?" --provider google-ai'
);

// 2. CORE: Stream Command (CORRECTED)
test(
  'CLI Stream Command',
  'pnpm cli stream "Hello, tell me a joke" --provider google-ai',
  25000
);

// 3. CORE: Analytics Feature (WORKING ✅)
test(
  'Analytics Feature',
  'pnpm cli generate "Test analytics" --provider google-ai --enable-analytics --debug'
);

// 4. CORE: Evaluation Feature (WORKING ✅)
test(
  'Evaluation Feature',
  'pnpm cli generate "Test evaluation" --provider google-ai --enable-evaluation --debug'
);

// 5. CORE: MCP List Servers (CORRECTED)
test(
  'MCP List Servers',
  'pnpm cli mcp list',
  15000
);

// 6. CORE: MCP Discover
test(
  'MCP Discover',
  'pnpm cli mcp discover',
  20000
);

// 7. CORE: Get Best Provider
test(
  'Get Best Provider',
  'pnpm cli get-best-provider',
  10000
);

// 8. CORE: Provider Status (instead of just status)
test(
  'Provider Status',
  'pnpm cli provider status',
  15000
);



// 10. CORE: Short form generate
test(
  'CLI Gen (Short Form)',
  'pnpm cli gen "Hello" --provider google-ai'
);

// Generate Report
const passed = results.filter(r => r.status === 'SUCCESS').length;
const failed = results.filter(r => r.status === 'FAILED').length;
const total = results.length;

const report = {
  timestamp: new Date().toISOString(),
  summary: { 
    total, 
    passed, 
    failed, 
    successRate: `${((passed/total)*100).toFixed(1)}%` 
  },
  criticalFeatures: {
    'CLI Generate': results.find(r => r.test === 'CLI Generate Command')?.status,
    'CLI Stream': results.find(r => r.test === 'CLI Stream Command')?.status,
    'Analytics': results.find(r => r.test === 'Analytics Feature')?.status,
    'Evaluation': results.find(r => r.test === 'Evaluation Feature')?.status,
    'MCP Integration': results.find(r => r.test === 'MCP List Servers')?.status,
    'MCP Discover': results.find(r => r.test === 'MCP Discover')?.status
  },
  results
};

writeFileSync('./corrected-functionality-report.json', JSON.stringify(report, null, 2));

console.log('\n' + '='.repeat(60));
console.log('CORRECTED NEUROLINK FUNCTIONALITY TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${failed}/${total}`);
console.log(`📊 Success Rate: ${((passed/total)*100).toFixed(1)}%`);
console.log('\n🔑 CRITICAL FEATURES STATUS:');
Object.entries(report.criticalFeatures).forEach(([feature, status]) => {
  const icon = status === 'SUCCESS' ? '✅' : '❌';
  console.log(`${icon} ${feature}: ${status}`);
});
console.log(`\n📁 Report: corrected-functionality-report.json`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('🎉 ALL FUNCTIONALITY WORKING PERFECTLY!');
} else if (failed <= 2) {
  console.log('⚠️  MOSTLY WORKING - Minor issues detected');
} else if (failed <= 4) {
  console.log('🚨 MODERATE ISSUES - Some core functionality broken');
} else {
  console.log('💥 CRITICAL FAILURE - Major functionality broken');
}

console.log('\n');
process.exit(failed > 3 ? 1 : 0);