# Gateway Provider System - Manual Verification Checklist

Use this checklist to manually verify the Gateway Provider System functionality.

## Pre-Verification Setup

- [ ] Build the project: `pnpm run build`
- [ ] Ensure at least one provider API key is configured
- [ ] Verify CLI is accessible: `node dist/cli/index.js --version`

## CLI Gateway Commands

### 1. Gateway Models

```bash
# List all models
node dist/cli/index.js gateway models

# Expected: Table of models with provider, name, and capabilities
```

- [ ] Models are displayed
- [ ] Provider names are correct
- [ ] Model names match expected format

```bash
# List with JSON format
node dist/cli/index.js gateway models --format=json --limit=5
```

- [ ] Valid JSON output
- [ ] Contains model array
- [ ] Respects limit

```bash
# Filter by provider
node dist/cli/index.js gateway models --provider=openai
```

- [ ] Only OpenAI models shown
- [ ] No other provider models

### 2. Gateway Search

```bash
# Search for GPT models
node dist/cli/index.js gateway search gpt
```

- [ ] Results contain GPT models
- [ ] Search is case-insensitive

```bash
# Search for Claude models
node dist/cli/index.js gateway search claude
```

- [ ] Results contain Claude models
- [ ] Anthropic provider shown

### 3. Gateway Info

```bash
# Get model info
node dist/cli/index.js gateway info openai/gpt-4o
```

- [ ] Model ID shown correctly
- [ ] Capabilities listed
- [ ] Pricing information (if available)

```bash
# Get info for non-existent model
node dist/cli/index.js gateway info fake/model
```

- [ ] Error message shown
- [ ] No crash

### 4. Gateway Providers

```bash
# List providers
node dist/cli/index.js gateway providers
```

- [ ] Major providers listed (OpenAI, Anthropic, Google, etc.)
- [ ] Provider status shown

```bash
# Check API keys
node dist/cli/index.js gateway providers --check-keys
```

- [ ] API key status shown for each provider
- [ ] Configured keys marked as available

### 5. Gateway Refresh

```bash
# Refresh cache
node dist/cli/index.js gateway refresh
```

- [ ] Refresh initiated
- [ ] No errors

### 6. Gateway Cache

```bash
# Show cache stats
node dist/cli/index.js gateway cache
```

- [ ] Cache statistics displayed
- [ ] Hit/miss counts shown

## SDK Verification

### 1. Basic Generation

```typescript
// test-gateway-basic.mjs
import { NeuroLink } from "./dist/index.js";

const sdk = new NeuroLink();
const result = await sdk.generate({
  model: "vertex", // or your configured provider
  input: { text: "Say hello" },
  maxTokens: 100,
});
console.log(result.content);
await sdk.dispose();
```

Run: `node test-gateway-basic.mjs`

- [ ] Response received
- [ ] Content is meaningful
- [ ] No errors

### 2. Gateway Provider (if implemented)

```typescript
// test-gateway-provider.mjs
import { NeuroLink } from "./dist/index.js";

const sdk = new NeuroLink();

// Check if gateway method exists
if (typeof sdk.gateway === "function") {
  const provider = await sdk.gateway("openai/gpt-4o");
  console.log("Gateway provider created:", provider);
}

await sdk.dispose();
```

- [ ] Gateway method exists (or gracefully handles absence)
- [ ] Provider created successfully

### 3. Unified Model String

```typescript
// Verify model string format works
const testStrings = [
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet",
  "google/gemini-1.5-pro",
];

for (const str of testStrings) {
  const [provider, model] = str.split("/");
  console.log(`Provider: ${provider}, Model: ${model}`);
}
```

- [ ] All strings parse correctly
- [ ] Provider extracted correctly
- [ ] Model name extracted correctly

## Integration Verification

### 1. End-to-End Flow

```bash
# Step 1: List models
node dist/cli/index.js gateway models --limit=5

# Step 2: Search for a model
node dist/cli/index.js gateway search gpt-4

# Step 3: Get model info
node dist/cli/index.js gateway info openai/gpt-4o

# Step 4: Generate with model
node dist/cli/index.js generate "Hello world" --provider=vertex
```

- [ ] All commands execute without error
- [ ] Data flows correctly between steps
- [ ] Generation produces output

### 2. Error Handling

```bash
# Invalid model
node dist/cli/index.js gateway info invalid/model

# Missing API key (if not configured)
node dist/cli/index.js generate "test" --provider=openai
```

- [ ] Errors are caught gracefully
- [ ] Error messages are helpful
- [ ] No crashes or stack traces

## Performance Verification

### 1. Response Time

```bash
# Measure model listing time
time node dist/cli/index.js gateway models --limit=10
```

- [ ] Response in < 5 seconds
- [ ] Cache hit on second run

### 2. Memory Usage

```bash
# Check for memory leaks (run multiple times)
for i in {1..10}; do
  node dist/cli/index.js gateway models --limit=5
done
```

- [ ] No increasing memory usage
- [ ] Clean exit each time

## Sign-Off

| Category       | Verified By | Date | Notes |
| -------------- | ----------- | ---- | ----- |
| CLI Commands   |             |      |       |
| SDK Functions  |             |      |       |
| Integration    |             |      |       |
| Performance    |             |      |       |
| Error Handling |             |      |       |

## Issues Found

| Issue | Severity | Description | Status |
| ----- | -------- | ----------- | ------ |
|       |          |             |        |

## Notes

- Record any unexpected behavior
- Note any differences from documentation
- Document any workarounds used
