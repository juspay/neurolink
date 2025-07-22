# HOW TO RUN ALL TESTS - UPDATED GUIDE (2025-01-21)

## 🚨 IMPORTANT: Test Structure Update

**Test Location**: All unit tests are in `src/test/` directory, integration tests in `test/` directory

**✅ Recommended Testing Method**: Use Vitest for all test execution

## 🚀 VERIFIED WORKING TESTS (Recommended)

### **Option 1: CLI Provider Testing (Most Reliable)**

```bash
# Test individual providers directly (VERIFIED WORKING)
pnpm cli generate "test" --provider openai
pnpm cli generate "test" --provider google-ai
pnpm cli generate "test" --provider vertex
pnpm cli generate "test" --provider anthropic
pnpm cli generate "test" --provider bedrock
```

### **Option 2: Run All Tests**

```bash
# Run all tests with Vitest
pnpm test

# Run tests once (no watch mode)
pnpm test:run
```

### **Option 3: Run Specific Test Categories**

```bash
# Run only provider tests
pnpm vitest src/test/providers-fixed.test.ts --run

# Run only MCP tests
pnpm vitest src/test/mcp-*.test.ts --run

# Run integration tests
pnpm vitest test/ --run
```

---

## 📋 Test Categories

### Unit Tests (src/test/)

```bash
# Provider Tests
pnpm vitest src/test/providers-fixed.test.ts --run

# MCP Tests
pnpm vitest src/test/mcp-comprehensive.test.ts --run
pnpm vitest src/test/mcp-unified.test.ts --run

# CLI Tests
pnpm vitest src/test/cli.test.ts --run
pnpm vitest src/test/cli-comprehensive.test.ts --run

# Feature Tests
pnpm vitest src/test/streaming-enhancements.test.ts --run
pnpm vitest src/test/error-handling.test.ts --run
pnpm vitest src/test/timeout.test.ts --run

# Advanced Features
pnpm vitest src/test/dynamic-chain.test.ts --run
pnpm vitest src/test/session-manager.test.ts --run
pnpm vitest src/test/health-monitor.test.ts --run
```

### Integration Tests (test/)

```bash
# Integration Test Batches
pnpm vitest test/analytics-features.ts --run
pnpm vitest test/evaluation-features.ts --run
pnpm vitest test/streaming-validation.ts --run
pnpm vitest test/error-handling.ts --run
pnpm vitest test/sdk-comprehensive.ts --run
pnpm vitest test/parameter-validation.ts --run

# MCP Integration Tests
pnpm vitest test/mcp/manual-config --run
pnpm vitest test/mcp/tool-integration --run
pnpm vitest test/mcp/providers --run

# Performance Tests
pnpm vitest test/streaming/performance-benchmark.test.ts --run

# Direct Tools Tests (ALL 6 TOOLS)
pnpm vitest test/mcp/tool-integration/direct-tools.test.ts --run
```

---

## 🔌 MCP (Model Context Protocol) Tests

### **Overview**

The MCP test suite validates the Model Context Protocol implementation, including manual configuration loading, tool integration, and provider support.

### **MCP Test Categories**

#### **1. Manual Configuration Tests** (`test/mcp/manual-config/`)

```bash
# Test CLI manual MCP config loading
pnpm vitest test/mcp/manual-config/cli-manual-mcp.test.ts --run

# Test SDK isolation from manual config
pnpm vitest test/mcp/manual-config/sdk-isolation.test.ts --run

# Run all manual config tests
pnpm vitest test/mcp/manual-config --run
```

#### **2. Tool Integration Tests** (`test/mcp/tool-integration/`)

```bash
# Test direct (built-in) tools
pnpm vitest test/mcp/tool-integration/direct-tools.test.ts --run

# Run all tool integration tests
pnpm vitest test/mcp/tool-integration --run
```

#### **3. Provider Support Tests** (`test/mcp/providers/`)

```bash
# Test MCP tool support across providers
pnpm vitest test/mcp/providers/provider-tools.test.ts --run

# Run all provider MCP tests
pnpm vitest test/mcp/providers --run
```

### **Quick MCP Test Commands**

```bash
# Run ALL MCP tests
pnpm vitest test/mcp --run

# Run MCP tests in watch mode
pnpm vitest test/mcp

# Run with coverage
pnpm vitest test/mcp --run --coverage
```

### **Manual MCP Testing**

#### **CLI with Tools (Default)**

```bash
# Generate with tools enabled
pnpm cli generate "What time is it?" --provider google-ai

# Stream with tools enabled
pnpm cli stream "Calculate 100 + 200" --provider google-ai
```

#### **CLI without Tools**

```bash
# Generate with tools disabled
pnpm cli generate "What is 2+2?" --provider google-ai --disable-tools

# Stream with tools disabled
pnpm cli stream "Count to 5" --provider google-ai --disable-tools
```

#### **SDK Tool Testing**

```bash
# Test SDK with direct tools only
node -e "
import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
  const sdk = new NeuroLink();
  return sdk.generate({
    input: {text: 'What time is it?'},
    provider: 'google-ai'
  });
}).then(r => {
  console.log('✅ Content:', r.content);
  console.log('🔧 Tools available:', r.availableTools?.length || 0);
}).catch(e => console.log('❌ Error:', e.message));
"

# Test direct tool execution
node -e "
import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
  const sdk = new NeuroLink();
  return sdk.executeTool('calculateMath', {expression: '42 * 10'});
}).then(r => {
  console.log('✅ Result:', r);
}).catch(e => console.log('❌ Error:', e.message));
"
```

### **MCP Test Environment Setup**

1. **Manual MCP Config** (`.mcp-config.json`):

   - CLI will load this when tools are enabled
   - SDK will NEVER load this (security by design)

2. **Available Direct Tools** (Always available):

   - `getCurrentTime` - Get current time
   - `readFile` - Read file contents
   - `listDirectory` - List directory contents
   - `calculateMath` - Perform calculations
   - `writeFile` - Write to files
   - `searchFiles` - Search for files

   **Note**: All 6 tools are now fully tested in the test suite!

3. **Custom Tools** (SDK only):
   ```javascript
   sdk.registerTool("myTool", {
     description: "Custom tool",
     execute: async (args) => ({ result: "success" }),
   });
   ```

---

## 🎯 Manual CLI/SDK Testing

### **CLI Testing Commands**

```bash
# Test basic generation
pnpm cli generate "Hello world" --provider google-ai --max-tokens 2000

# Test analytics
pnpm cli generate "Test analytics" --provider google-ai --enable-analytics --output-format json

# Test streaming
pnpm cli stream "Count to 5" --provider google-ai --max-tokens 2000

# Test evaluation
pnpm cli generate "Test evaluation" --provider google-ai --enable-evaluation --output-format json
```

### **SDK Testing Commands**

```bash
# Test SDK directly with Node.js
node -e "
require('dotenv').config();
import('./dist/lib/neurolink.js').then(({NeuroLink}) => {
  const sdk = new NeuroLink();
  return sdk.generate({
    input: {text: 'Hello SDK'},
    provider: 'google-ai',
    enableAnalytics: true
  });
}).then(r => {
  console.log('✅ Content:', r.content.slice(0, 50));
  console.log('✅ Analytics:', !!r.analytics);
}).catch(e => console.log('❌ Error:', e.message));
"
```

---

## 📊 Test Execution Options

### **Development Mode (Watch)**

```bash
# Run tests in watch mode for development
vitest

# Watch specific batch
vitest test/basic-functionality.ts
```

### **CI/CD Mode (Non-interactive)**

```bash
# Run all tests without interaction
pnpm vitest test --run --reporter=basic

# With coverage
pnpm vitest test --run --coverage

# With JSON output
pnpm vitest test --run --reporter=json
```

### **Debugging Mode**

```bash
# Run with verbose output
pnpm vitest test/basic-functionality.ts --run --reporter=verbose

# Run single test file with debug info
DEBUG=* pnpm vitest test/basic-functionality.ts --run
```

---

## ⚡ Performance Expectations

| Method                 | Tests          | Expected Time | Use Case                |
| ---------------------- | -------------- | ------------- | ----------------------- |
| Simple Integration     | 4 core tests   | 30 seconds    | Quick validation        |
| Parallel Orchestration | 36 tests       | 5-8 minutes   | Full validation         |
| Individual Batches     | 4-7 tests each | 1-2 min each  | Debugging               |
| Sequential Execution   | 36 tests       | 15-20 minutes | Legacy/fallback         |
| MCP Manual Config      | 5 tests        | 1-2 minutes   | CLI/SDK isolation       |
| MCP Tool Integration   | 8+ tests       | 2-3 minutes   | Tool functionality      |
| MCP Provider Tests     | Varies         | 2-5 minutes   | Provider support        |
| Full MCP Suite         | 15-20 tests    | 5-10 minutes  | Complete MCP validation |
| Streaming Performance  | 5 tests        | 3-5 minutes   | Provider benchmarking   |
| Complete Tools Suite   | 12+ tests      | 3-4 minutes   | All 6 tools validated   |

---

## 🔧 Environment Setup

Before running tests, ensure:

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm build

# 3. Verify environment variables
echo $GOOGLE_AI_API_KEY | head -c 20 && echo "..."

# 4. Test basic CLI
pnpm cli --version
```

---

## 🛠️ Test Utilities (NEW)

### **Streaming Debug Utilities** (`test/utils/streaming-debug.ts`)

- Analyze stream behavior and performance
- Detect progressive vs synthetic streaming
- Validate chunk structure
- Compare provider streaming implementations

```typescript
import {
  analyzeStream,
  createDebugStream,
} from "./test/utils/streaming-debug.js";

// Analyze a stream
const analysis = await analyzeStream(stream);
console.log(`Progressive: ${analysis.isProgressive}`);
console.log(`Chunks/sec: ${analysis.chunksPerSecond}`);

// Debug stream with logging
const debugStream = createDebugStream(originalStream, {
  logChunks: true,
  logTiming: true,
  logContent: false,
});
```

### **Visual Test Runner** (`test/utils/visual-runner.ts`)

- Color-coded test output
- Progress tracking
- Detailed test summaries
- Markdown report generation

```typescript
import { VisualTestRunner } from "./test/utils/visual-runner.js";

const runner = new VisualTestRunner();
runner.startSuite("My Test Suite");

await runner.runTest("test name", async () => {
  // Your test code here
});

runner.endSuite();
runner.printSummary();
```

---

## 🎯 Recommended Workflow

### **For Quick Validation:**

```bash
# Start here - fastest validation
node test-integration-simple.cjs
```

### **For Full Testing:**

```bash
# If quick test passes, run full suite
node run-parallel-tests.js
```

### **For Development:**

```bash
# Start vitest in watch mode
vitest
```

### **For CI/CD:**

```bash
# Non-interactive full execution
pnpm vitest test --run --reporter=basic
```

---

## ❗ Troubleshooting

### **If Tests Timeout:**

```bash
# Run individual batches
pnpm vitest test/basic-functionality.ts --run

# Or use simple integration test
node test-integration-simple.cjs
```

### **If Environment Issues:**

```bash
# Check API key
echo $GOOGLE_AI_API_KEY

# Reload environment
source .env

# Test CLI directly
pnpm cli generate "test" --provider google-ai
```

### **If Build Issues:**

```bash
# Clean and rebuild
pnpm clean
pnpm build
```

---

**🎉 START HERE: `node test-integration-simple.cjs` - Your fastest path to validation!**
