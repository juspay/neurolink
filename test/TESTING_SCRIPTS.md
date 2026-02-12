# NeuroLink Testing Scripts

This directory contains automated testing scripts for validating NeuroLink functionality across multiple AI providers.

## 📁 Available Scripts

### 1. `continuous-test-suite.ts`

**Type:** TypeScript test suite
**Purpose:** Comprehensive integration tests for SDK and CLI across all providers

#### Usage

```bash
# Test a single provider
npx tsx test/continuous-test-suite.ts --provider openai
npx tsx test/continuous-test-suite.ts --provider anthropic
npx tsx test/continuous-test-suite.ts --provider vertex

# Run from project root
npx tsx test/continuous-test-suite.ts --provider <provider-name>
```

#### Supported Providers

- `openai` - OpenAI (GPT-4, GPT-4o, etc.)
- `anthropic` - Anthropic Claude
- `vertex` - Google Vertex AI
- `google-ai-studio` - Google AI Studio (Gemini)
- `bedrock` - AWS Bedrock
- `azure` - Azure OpenAI
- `mistral` - Mistral AI
- `huggingface` - Hugging Face
- `ollama` - Ollama (local models)
- `litellm` - LiteLLM proxy
- `sagemaker` - AWS SageMaker

#### Test Coverage

- ✅ SDK text generation
- ✅ SDK streaming
- ✅ CLI text generation
- ✅ CLI streaming
- ✅ Multimodal: Images
- ✅ Multimodal: PDFs
- ✅ Multimodal: CSV files
- ✅ Combined multimodal (PDF + CSV)
- ✅ External tool integration (MCP)
- ✅ System prompts
- ✅ Conversation history

---

### 2. `run-all-providers-sequential.sh`

**Type:** Bash script
**Purpose:** Sequential comprehensive testing of ALL 11 providers with delays to avoid rate limits

#### Usage

```bash
# From project root
cd test
./run-all-providers-sequential.sh

# Or from project root
bash test/run-all-providers-sequential.sh
```

#### Features

- ✅ Tests 11 providers sequentially (one at a time)
- ✅ 15-second delay between providers (cooldown to avoid rate limits)
- ✅ Saves individual logs to `/tmp/neurolink-sequential-tests/`
- ✅ Generates summary report with pass rates
- ✅ Tracks total duration
- ✅ macOS bash 3.x compatible

#### Output

```
============================================================
Sequential Multi-Provider Test Suite
============================================================

Testing 11 providers sequentially with 15s delays between tests
Logs will be saved to: /tmp/neurolink-sequential-tests

------------------------------------------------------------
[1/11] Testing provider: openai
------------------------------------------------------------
✅ openai: 19/19 tests passed (45s)

⏳ Waiting 15s before next provider (cooldown)...

[2/11] Testing provider: anthropic
------------------------------------------------------------
✅ anthropic: 19/19 tests passed (52s)
...

============================================================
Test Results Summary
============================================================

✅ openai: 19/19 tests passed (45s)
✅ anthropic: 19/19 tests passed (52s)
✅ vertex: 19/19 tests passed (48s)
...

------------------------------------------------------------
Total Duration: 850s (14m 10s)
Logs saved to: /tmp/neurolink-sequential-tests
Results file: /tmp/neurolink-sequential-tests/results-summary.txt
============================================================
```

#### Log Files

Individual provider logs are saved to:

- `/tmp/neurolink-sequential-tests/test-openai.log`
- `/tmp/neurolink-sequential-tests/test-anthropic.log`
- `/tmp/neurolink-sequential-tests/test-vertex.log`
- etc.

Summary results:

- `/tmp/neurolink-sequential-tests/results-summary.txt`

---

### 3. `test-all-providers.sh`

**Type:** Bash script
**Purpose:** Quick smoke test of CLI functionality across 6 major providers

#### Usage

```bash
# From project root (requires build first)
pnpm run build:cli
cd test
./test-all-providers.sh

# Or from project root
bash test/test-all-providers.sh
```

#### Features

- ✅ Quick CLI smoke test (6 providers)
- ✅ 120-second timeout per provider
- ✅ Simple "Hello" test for each provider
- ✅ Fast validation (< 5 minutes total)

#### Tested Providers (Quick Test)

1. OpenAI
2. Anthropic
3. Vertex AI
4. Google AI Studio
5. AWS Bedrock
6. Ollama

#### Output

```
Testing all providers with a simple generate command...
========================================================

Testing provider: openai
----------------------------
Hello from OpenAI! I'm ready to assist you.
✅ openai: PASSED

Testing provider: anthropic
----------------------------
Hello from Anthropic! How can I help you today?
✅ anthropic: PASSED
...
========================================================
Provider test summary complete
```

---

## 🚀 Quick Start Guide

### Prerequisites

1. **Build the project:**

```bash
pnpm install
pnpm run build
pnpm run build:cli
```

2. **Configure environment variables:**

```bash
# Copy example env file
cp .env.example .env

# Add your API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
# ... etc
```

3. **Ensure test fixtures exist:**

```bash
ls -la test/fixtures/
# Should contain: test.csv, sample.pdf, test-image.jpg, etc.
```

---

## 📊 Recommended Testing Workflow

### 1. Quick Validation (2-5 minutes)

Test core providers quickly to ensure basic functionality:

```bash
# Build CLI
pnpm run build:cli

# Quick smoke test
cd test
./test-all-providers.sh
```

### 2. Single Provider Deep Test (1-2 minutes each)

Test one provider comprehensively:

```bash
# Test OpenAI thoroughly
npx tsx test/continuous-test-suite.ts --provider openai

# Test Vertex AI thoroughly
npx tsx test/continuous-test-suite.ts --provider vertex
```

### 3. Full Suite (15-20 minutes)

Run comprehensive tests on all providers:

```bash
# Sequential testing with delays
cd test
./run-all-providers-sequential.sh

# Review results
cat /tmp/neurolink-sequential-tests/results-summary.txt
```

---

## 🧪 Model-Specific Testing

### Testing with Gemini 3 Models

To test with specific Gemini 3 models on Vertex AI, use environment variables with the legacy test suite:

```bash
# Test with Gemini 3 Flash Preview
TEST_PROVIDER=vertex TEST_MODEL=gemini-3-flash-preview pnpm test:legacy

# Test with Gemini 3 Pro Preview
TEST_PROVIDER=vertex TEST_MODEL=gemini-3-pro-preview pnpm test:legacy
```

#### Known Limitations

**Zod Schema Tests with Gemini Models:**

The Zod schema validation tests are automatically skipped when testing with Gemini models. This is due to a known limitation where Gemini does not currently support combining tool usage with JSON schema output constraints in the same request.

When you see tests skipped with messages like:

```
⏭️ Skipping Zod schema test (Gemini does not support tools + JSON schema together)
```

This is expected behavior and not a test failure.

---

## 🔍 Debugging Failed Tests

### View Detailed Logs

```bash
# Sequential test logs
cat /tmp/neurolink-sequential-tests/test-openai.log
cat /tmp/neurolink-sequential-tests/test-vertex.log

# Single provider test (run manually with output)
npx tsx test/continuous-test-suite.ts --provider openai 2>&1 | tee test-output.log
```

### Common Issues

#### 1. Missing API Keys

```
Error: Missing API key for provider 'openai'
```

**Fix:** Add `OPENAI_API_KEY` to `.env` file

#### 2. Rate Limits

```
Error: Rate limit exceeded
```

**Fix:** Use `run-all-providers-sequential.sh` which has 15s delays

#### 3. Missing Test Fixtures

```
Error: File not found: test/fixtures/test.csv
```

**Fix:** Ensure all fixtures exist in `test/fixtures/`

#### 4. CLI Not Built

```
Error: Cannot find module 'dist/cli/index.js'
```

**Fix:** Run `pnpm run build:cli`

---

## 📝 Test Script Comparison

| Feature              | continuous-test-suite.ts | run-all-providers-sequential.sh | test-all-providers.sh |
| -------------------- | ------------------------ | ------------------------------- | --------------------- |
| **Test Depth**       | Comprehensive (19 tests) | Comprehensive (19 tests)        | Quick smoke test      |
| **Providers**        | 1 provider per run       | All 11 providers                | 6 providers           |
| **Duration**         | 1-2 min per provider     | 15-20 min total                 | 2-5 min total         |
| **Rate Limit Safe**  | ⚠️ Manual spacing        | ✅ 15s delays                   | ⚠️ May hit limits     |
| **Logs**             | Console output           | Saved to /tmp                   | Console output        |
| **Use Case**         | Single provider testing  | Full regression test            | Quick validation      |
| **Multimodal Tests** | ✅ Yes                   | ✅ Yes                          | ❌ No                 |
| **Tool Integration** | ✅ Yes                   | ✅ Yes                          | ❌ No                 |

---

## 🎯 Testing Best Practices

### Before Commits

```bash
# Quick validation
./test/test-all-providers.sh
```

### Before Releases

```bash
# Full comprehensive test
./test/run-all-providers-sequential.sh
```

### During Development

```bash
# Test specific provider you're working on
npx tsx test/continuous-test-suite.ts --provider <your-provider>
```

### CI/CD Integration

```bash
# Sequential for PR validation
./test/run-all-providers-sequential.sh
```

---

## 🛠️ Script Maintenance

### Adding New Providers

**Update `continuous-test-suite.ts`:**

```typescript
// Add provider to supported list
const supportedProviders = [
  "openai",
  "anthropic",
  "vertex",
  "your-new-provider", // Add here
];
```

**Update `run-all-providers-sequential.sh`:**

```bash
# Line 14: Add to PROVIDERS list
PROVIDERS="openai anthropic vertex your-new-provider"

# Line 55: Update TOTAL_PROVIDERS count
TOTAL_PROVIDERS=12  # Increment count
```

**Update `test-all-providers.sh`:**

```bash
# Line 4: Add to PROVIDERS array
PROVIDERS=("openai" "anthropic" "vertex" "your-new-provider")
```

### Modifying Test Coverage

Edit `test/continuous-test-suite.ts` to add/remove test cases:

```typescript
// Add new test
async function testNewFeature(provider: string) {
  console.log(`\n✨ Testing New Feature...`);
  // Your test implementation
}

// Add to main test sequence
await testNewFeature(provider);
```

---

## 📞 Support

- **Issues:** Report test failures in GitHub Issues
- **Logs:** Always attach log files from `/tmp/neurolink-sequential-tests/`
- **Questions:** Check `CLAUDE.md` for architecture details

---

## 🔗 Related Documentation

- `../COMPREHENSIVE_REFACTORING_PLAN.md` - Architecture and refactoring details
- `../PHASE_1_COMPLETION.md` - Phase 1 completion status
- [`../CLAUDE.md`](../CLAUDE.md) - Developer guide for Claude Code
- [`../README.md`](../README.md) - Main project documentation

---

**Last Updated:** November 2, 2025
**Maintained By:** NeuroLink Core Team
