# Gateway Provider System - Testing Guide

This document describes how to run and extend the test suite for the NeuroLink Gateway Provider System.

## Quick Start

```bash
# Build the project first
pnpm run build

# Run the continuous integration test suite
npx tsx test/continuous-test-suite-gateway.ts

# Run with specific provider
npx tsx test/continuous-test-suite-gateway.ts --provider=anthropic

# Run with specific model
npx tsx test/continuous-test-suite-gateway.ts --provider=openai --model=gpt-4o
```

## Test Categories

### 1. CLI Gateway Commands

Tests for all gateway CLI subcommands:

| Command                  | Description           | Test Coverage |
| ------------------------ | --------------------- | ------------- |
| `gateway models`         | List available models | Full          |
| `gateway search <query>` | Search models         | Full          |
| `gateway info <model>`   | Get model details     | Full          |
| `gateway providers`      | List providers        | Full          |
| `gateway refresh`        | Refresh cache         | Basic         |
| `gateway cache`          | Cache statistics      | Basic         |

### 2. SDK Gateway Tests

Tests for the SDK's gateway functionality:

- **Provider Creation**: Create GatewayProvider with unified model strings
- **Model String Parsing**: Validate `provider/model` format parsing
- **Fallback Configuration**: Test fallback chain setup
- **Generation**: Test text generation through gateway

### 3. Integration Tests

End-to-end tests that combine CLI and SDK functionality:

- Full flow from model listing to generation
- Cross-provider fallback scenarios
- Registry caching behavior

## Test Configuration

### Environment Variables

```bash
# Required for direct routing
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_STUDIO_API_KEY=...
GOOGLE_CLOUD_PROJECT=your-project-id

# Required for gateway routing
OPENROUTER_API_KEY=sk-or-...

# Optional
MISTRAL_API_KEY=...
GROQ_API_KEY=...
COHERE_API_KEY=...
```

### CLI Arguments

| Argument            | Description                  | Default          |
| ------------------- | ---------------------------- | ---------------- |
| `--provider=<name>` | Provider to test with        | `vertex`         |
| `--model=<name>`    | Specific model to use        | Provider default |
| `--timeout=<ms>`    | Test timeout in milliseconds | `60000`          |

### Provider-Specific Settings

| Provider  | Max Tokens | Rate Limit Delay | Default Model        |
| --------- | ---------- | ---------------- | -------------------- |
| vertex    | 8192       | 10s              | gemini-1.5-flash     |
| anthropic | 4096       | 10s              | claude-3-5-sonnet    |
| openai    | 4096       | 60s              | gpt-4o-mini          |
| mistral   | 4096       | 10s              | mistral-large-latest |
| groq      | 4096       | 5s               | llama-3.1-70b        |

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all gateway unit tests
pnpm test -- test/gateway/

# Run specific test file
pnpm test -- test/gateway/modelStringParser.test.ts

# Run with coverage
pnpm test:coverage -- test/gateway/
```

### Integration Tests (Vitest)

```bash
# Run gateway integration tests
pnpm test -- test/gateway/integration/
```

### Continuous Integration Suite

```bash
# Full test suite with vertex provider
npx tsx test/continuous-test-suite-gateway.ts

# Test with OpenAI (longer delays for rate limits)
npx tsx test/continuous-test-suite-gateway.ts --provider=openai

# Test with Anthropic
npx tsx test/continuous-test-suite-gateway.ts --provider=anthropic --model=claude-3-5-sonnet
```

## Test Output

Tests produce colored output with status indicators:

- ✅ **PASS** - Test passed successfully
- ❌ **FAIL** - Test failed
- ⏭️ **SKIP** - Test skipped (feature not available)
- ⚠️ **TESTING** - Test in progress

### Example Output

```
======================================================================
  NEUROLINK GATEWAY PROVIDER SYSTEM - CONTINUOUS INTEGRATION TEST SUITE
======================================================================
  Provider: vertex
  Model: gemini-1.5-flash
  Timeout: 60000ms
  Rate Limit Delay: 10000ms
======================================================================

======================================================================
  CLI Gateway: Models Command
======================================================================
Test 1: Listing all gateway models...
✅ CLI Gateway Models - List All
   Models listed successfully
Test 2: Filtering models by provider...
✅ CLI Gateway Models - Filter by Provider
   Provider filtering works

...

======================================================================
  TEST SUITE SUMMARY
======================================================================
  Total Tests: 10
  Passed: 10
  Failed: 0
  Duration: 45.32s
  Provider: vertex
======================================================================

  RESULT: ALL TESTS PASSED
```

## Extending Tests

### Adding New CLI Tests

1. Add test function in `continuous-test-suite-gateway.ts`:

```typescript
async function testCLIGatewayNewFeature(): Promise<boolean> {
  logSection("CLI Gateway: New Feature");

  try {
    const result = await runCommand("node", [
      "dist/cli/index.js",
      "gateway",
      "new-command",
      "--format=json",
    ]);

    if (result.success) {
      logTest("CLI Gateway New Feature", "PASS", "Feature works");
      return true;
    } else {
      logTest("CLI Gateway New Feature", "FAIL", result.stderr);
      return false;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("CLI Gateway New Feature", "FAIL", msg);
    return false;
  }
}
```

2. Add to test runner in `runAllTests()`:

```typescript
const cliTests = [
  // ... existing tests
  { name: "Gateway New Feature", fn: testCLIGatewayNewFeature },
];
```

### Adding New SDK Tests

Use the dynamic script generation pattern:

```typescript
async function testSDKGatewayNewFeature(): Promise<boolean> {
  const tempDir = os.tmpdir();
  const testScript = path.join(tempDir, `gateway-new-test-${Date.now()}.mjs`);

  const scriptContent = `
import { NeuroLink } from '${cwd}/dist/index.js';

async function runTest() {
  // Your test logic here
  console.log('TEST_PASSED');
}

runTest();
`;

  fs.writeFileSync(testScript, scriptContent);
  const result = await runCommand("node", [testScript]);
  fs.unlinkSync(testScript);

  return result.stdout.includes("TEST_PASSED");
}
```

## Troubleshooting

### Common Issues

1. **Tests timeout**: Increase timeout with `--timeout=120000`
2. **Rate limiting**: Use a provider with lower rate limits (e.g., vertex)
3. **API key errors**: Verify environment variables are set
4. **Build errors**: Run `pnpm run build` before testing

### Debug Mode

Enable debug output:

```bash
DEBUG=neurolink:* npx tsx test/continuous-test-suite-gateway.ts
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Gateway Tests
  env:
    GOOGLE_CLOUD_PROJECT: ${{ secrets.GOOGLE_CLOUD_PROJECT }}
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    pnpm run build
    npx tsx test/continuous-test-suite-gateway.ts --provider=vertex
```

### Local CI Simulation

```bash
# Run full test pipeline
pnpm run build && \
pnpm test -- test/gateway/ && \
npx tsx test/continuous-test-suite-gateway.ts
```
