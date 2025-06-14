# Phase 1.2 AI Development Workflow Tools - Testing Guide

_Comprehensive Testing and Validation Procedures_

## Overview

This guide provides complete testing procedures for Phase 1.2 AI Development Workflow Tools, covering all 4 specialized tools and their integration with NeuroLink's MCP infrastructure.

## Quick Start Testing

### Prerequisites

```bash
# Environment setup
cp .env.example .env
# Edit .env with your API keys (at least one provider)

# Install and build
pnpm install
pnpm run build
```

### Complete Test Suite

```bash
# Phase 1.2 AI Workflow Tools tests (36 tests)
pnpm test src/test/ai-workflow-tools.test.ts

# All MCP foundation tests (27 tests)
pnpm test src/test/mcp-comprehensive.test.ts

# Phase 1.1 AI Analysis Tools tests (20 tests)
pnpm test src/test/ai-analysis-tools.test.ts

# Complete suite validation
pnpm test --run
```

## Individual Tool Testing

### 1. Generate Test Cases Tool

```bash
node -e "
import { generateTestCasesTool } from './dist/mcp/servers/ai-providers/ai-workflow-tools.js';
const result = await generateTestCasesTool.execute({
  codeSnippet: 'function add(a, b) { return a + b; }',
  language: 'javascript',
  testFramework: 'jest'
}, {
  sessionId: 'test',
  userId: 'user',
  permissions: ['generate'],
  aiProvider: 'openai'
});
console.log('Success:', result.success);
console.log('Test Cases:', result.data?.testSuite?.testCases?.length || 0);
"
```

### 2. Code Refactoring Tool

```bash
node -e "
import { refactorCodeTool } from './dist/mcp/servers/ai-providers/ai-workflow-tools.js';
const result = await refactorCodeTool.execute({
  codeSnippet: 'function calc(x,y){var z=x*y;return z+10;}',
  language: 'javascript',
  refactorGoals: ['readability']
}, {
  sessionId: 'test',
  userId: 'user',
  permissions: ['refactor'],
  aiProvider: 'openai'
});
console.log('Success:', result.success);
console.log('Improvements:', Object.keys(result.data?.improvements || {}));
"
```

### 3. Documentation Generation Tool

```bash
node -e "
import { generateDocumentationTool } from './dist/mcp/servers/ai-providers/ai-workflow-tools.js';
const result = await generateDocumentationTool.execute({
  codeSnippet: 'class UserService { getUser(id) { return {}; } }',
  language: 'javascript',
  docType: 'comprehensive'
}, {
  sessionId: 'test',
  userId: 'user',
  permissions: ['document'],
  aiProvider: 'openai'
});
console.log('Success:', result.success);
console.log('Sections:', result.data?.documentation?.sections?.length || 0);
"
```

### 4. AI Output Debugging Tool

```bash
node -e "
import { debugAIOutputTool } from './dist/mcp/servers/ai-providers/ai-workflow-tools.js';
const result = await debugAIOutputTool.execute({
  aiOutput: 'This is a test AI response that could be improved.',
  originalPrompt: 'Generate a comprehensive guide'
}, {
  sessionId: 'test',
  userId: 'user',
  permissions: ['debug'],
  aiProvider: 'openai'
});
console.log('Success:', result.success);
console.log('Issues Found:', result.data?.issues?.length || 0);
"
```

## Demo Server Testing

### Unified Server Testing

```bash
cd neurolink-demo
npm install
node server.js
```

**Web Interface Testing** (http://localhost:3001):

- `/ai/generate-test-cases` - Test case generation form
- `/ai/refactor-code` - Code refactoring interface
- `/ai/generate-documentation` - Documentation generation
- `/ai/debug-ai-output` - AI output analysis

### API Endpoint Testing

```bash
# Generate Test Cases
curl -X POST http://localhost:3001/api/ai/generate-test-cases \
  -H "Content-Type: application/json" \
  -d '{"codeSnippet": "function multiply(a, b) { return a * b; }", "language": "javascript"}'

# Refactor Code
curl -X POST http://localhost:3001/api/ai/refactor-code \
  -H "Content-Type: application/json" \
  -d '{"codeSnippet": "function calc(x,y){var z=x*y;return z+10;}", "refactorGoals": ["readability"]}'

# Generate Documentation
curl -X POST http://localhost:3001/api/ai/generate-documentation \
  -H "Content-Type: application/json" \
  -d '{"codeSnippet": "class Calculator { add(a, b) { return a + b; } }", "docType": "api"}'

# Debug AI Output
curl -X POST http://localhost:3001/api/ai/debug-ai-output \
  -H "Content-Type: application/json" \
  -d '{"aiOutput": "This is a short response.", "originalPrompt": "Write a comprehensive guide"}'
```

## CLI Testing

### Core CLI Functionality

```bash
# Basic text generation
./dist/cli/index.js generate "Write a simple function"

# Provider status
./dist/cli/index.js status

# MCP functionality
./dist/cli/index.js mcp list
./dist/cli/index.js mcp test
```

## Visual Validation

### Screenshots Verification

- `neurolink-demo/screenshots/08-phase-1-2-overview.png` - Overview page
- `neurolink-demo/screenshots/09-phase-1-2-tools.png` - Tools section
- `neurolink-demo/screenshots/10-test-cases-result.png` - Test generation results
- `neurolink-demo/screenshots/11-refactor-code-result.png` - Refactoring results
- `neurolink-demo/screenshots/12-documentation-result.png` - Documentation results
- `neurolink-demo/screenshots/13-debug-output-result.png` - Debug analysis results

### Video Validation

- `docs/visual-content/cli-videos/phase-1-2-cli-demo/phase-1-2-cli-demo.mp4` - CLI demonstration
- `neurolink-demo/videos/phase-1-2-demo/` - Web demo videos

## Success Criteria

### Test Results Expected:

- ✅ **36/36 Phase 1.2 tests passing** (100% success rate)
- ✅ **4 AI workflow tools functioning**:
  - Generate Test Cases Tool (7/7 tests)
  - Code Refactoring Tool (7/7 tests)
  - Documentation Generation Tool (8/8 tests)
  - AI Output Debugging Tool (10/10 tests)
- ✅ **Integration tests** (4/4 tests)
- ✅ **Performance standards** (all tools < 100ms)

### Functional Validation:

- Demo server starts on port 3001 without errors
- All 4 tools return `success: true` with realistic data
- Web interface displays proper JSON responses
- CLI commands execute without errors
- Screenshots show actual AI-generated content

## Troubleshooting

### Common Issues:

1. **Test failures**: Check environment variables, rebuild project (`pnpm run build`)
2. **Demo server issues**: Verify port 3001 availability, check dependencies
3. **Import errors**: Tests import from `dist/` directory after build
4. **Network timeouts**: Provider API connectivity issues

### Environment Requirements:

```bash
# Minimum configuration (choose at least one provider)
export OPENAI_API_KEY="your-key-here"
# OR
export GOOGLE_VERTEX_PROJECT="your-project"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
# OR
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
```

## Complete Validation Script

```bash
#!/bin/bash
echo "🧪 Running Complete Phase 1.2 Validation..."

# Build and test
pnpm run build
pnpm test --run

# CLI testing
./dist/cli/index.js status

# Demo server testing
cd neurolink-demo && node server.js &
SERVER_PID=$!
sleep 5

# API testing
curl -s http://localhost:3001/api/ai/generate-test-cases \
  -H "Content-Type: application/json" \
  -d '{"codeSnippet":"function test(){}","language":"javascript"}' | jq .

# Cleanup
kill $SERVER_PID
echo "✅ Phase 1.2 validation complete!"
```

This guide provides comprehensive testing validation for NeuroLink's transformation into a Comprehensive AI Development Workflow Platform with 10 specialized tools across all interfaces.
