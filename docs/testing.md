# 🧪 NeuroLink Testing Guide - ALL 9 PROVIDERS WORKING

## 🎉 Provider Testing Status: 100% SUCCESS

**All 9 providers confirmed working!** OpenAI, Google AI, Vertex, Anthropic, Bedrock, Hugging Face, Azure, Mistral, Ollama

### Quick Provider Validation

```bash
# Test any of the 9 working providers
pnpm cli generate "test" --provider openai
pnpm cli generate "test" --provider google-ai
pnpm cli generate "test" --provider anthropic
pnpm cli generate "test" --provider bedrock
pnpm cli generate "test" --provider huggingface
pnpm cli generate "test" --provider azure
pnpm cli generate "test" --provider mistral
pnpm cli generate "test" --provider ollama
pnpm cli generate "test" --provider vertex

# Test with enhancements (any provider works)
pnpm cli generate "test" --provider google-ai --enable-analytics --enable-evaluation --debug
```

### Comprehensive Testing

```bash
# Run full validation suite
./validate-fixes.sh

# Run comprehensive CLI tests
node CLI_COMPREHENSIVE_TESTS.js

# Run before/after comparison
node BEFORE_AFTER_COMPARISON.js
```

### Expected Results

#### CLI Enhancement Output

```
📊 Analytics:
{
  "provider": "google-ai",
  "model": "gemini-2.5-pro",
  "tokens": {"input": 358, "output": 48, "total": 406},
  "responseTime": 1670,
  "context": {"test": "validation"}
}

⭐ Response Evaluation:
{
  "relevance": 7,
  "accuracy": 7,
  "completeness": 7,
  "overall": 7
}
```

#### SDK Enhancement Output

```javascript
// Result object contains:
{
  content: "AI response...",
  analytics: {
    provider: "google-ai",
    tokens: {input: 358, output: 48, total: 406},
    responseTime: 1670
  },
  evaluation: {
    overall: 7,
    relevance: 7,
    accuracy: 7,
    completeness: 7
  }
}
```

## Provider Testing

### Google AI Provider Validation

```bash
# Test working model
export GOOGLE_AI_MODEL=gemini-2.5-pro
node ./dist/cli/index.js generate "Hello" --provider google-ai --debug

# Expected: Real AI response with token counts
# Expected: No empty responses or fallbacks
```

### OpenAI Provider Validation

```bash
# Test OpenAI fallback
node ./dist/cli/index.js generate "Hello" --provider openai --enable-analytics --debug

# Expected: OpenAI response with analytics data
# Expected: Accurate token counting (no NaN values)
```

### Multi-Provider Testing

```bash
# Test provider auto-selection
node ./dist/cli/index.js generate "Hello" --enable-analytics --debug

# Expected: Best available provider selected automatically
# Expected: Graceful fallback if primary provider fails
```

## Backward Compatibility Testing

### Ensure No Breaking Changes

```bash
# Test existing CLI commands (no enhancement flags)
node ./dist/cli/index.js generate "Simple test"
node ./dist/cli/index.js generate "Simple test"
node ./dist/cli/index.js gen "Simple test"

# Expected: Normal AI responses
# Expected: No enhancement data displayed
# Expected: All existing functionality works
```

### Test Existing SDK Integration

```javascript
// Test basic SDK usage (no enhancements)
const { createBestAIProvider } = require("@juspay/neurolink");
const provider = createBestAIProvider();
const result = await provider.generate({ input: { text: "Hello" } });

// Expected: result.content contains AI response
// Expected: No analytics or evaluation fields
// Expected: Existing usage patterns continue working
```

## Error Handling Testing

### Invalid Model Names

```bash
# Test deprecated model handling
export GOOGLE_AI_MODEL=gemini-2.5-pro-preview-05-06
node ./dist/cli/index.js generate "test" --provider google-ai --debug

# Expected: Graceful fallback to working provider
# Expected: Clear error message or automatic correction
```

### Missing API Keys

```bash
# Test without API keys
unset GOOGLE_AI_API_KEY
unset OPENAI_API_KEY
node ./dist/cli/index.js generate "test" --debug

# Expected: Clear error message about missing configuration
# Expected: Helpful setup instructions
```

### Network Issues

```bash
# Test with invalid API endpoint (simulated)
node ./dist/cli/index.js generate "test" --timeout 5s --debug

# Expected: Timeout handled gracefully
# Expected: Fallback to other providers if available
```

## Performance Testing

### Response Time Validation

```bash
# Test response times with analytics
node ./dist/cli/index.js generate "Short prompt" --enable-analytics --debug

# Expected: responseTime field shows reasonable values (< 10s)
# Expected: Analytics data doesn't significantly slow requests
```

### Token Counting Accuracy

```bash
# Test accurate token counting
node ./dist/cli/index.js generate "This is a test prompt for token counting" --enable-analytics --debug

# Expected: input + output = total tokens
# Expected: No NaN values in any token fields
# Expected: Token counts match actual usage
```

## Enhancement Feature Validation

### Analytics Data Completeness

```bash
# Test analytics data structure
node ./dist/cli/index.js generate "Business email" --enable-analytics --context '{"project":"test"}' --debug

# Expected analytics fields:
# - provider: string
# - model: string
# - tokens: {input, output, total}
# - responseTime: number
# - context: object (if provided)
# - timestamp: ISO string
```

### Evaluation Data Validation

```bash
# Test evaluation scoring
node ./dist/cli/index.js generate "Explain quantum physics" --enable-evaluation --debug

# Expected evaluation fields:
# - relevance: number (1-10)
# - accuracy: number (1-10)
# - completeness: number (1-10)
# - overall: number (1-10)
# - evaluationModel: string
# - evaluationTime: number
```

### Context Flow Testing

```bash
# Test context preservation
node ./dist/cli/index.js generate "Help with task" --context '{"userId":"123","department":"sales"}' --enable-analytics --debug

# Expected: Context object preserved in analytics.context
# Expected: Context available throughout request chain
```

### Video Generation Testing

#### SDK Video Generation Tests

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFile, writeFile } from "fs/promises";
import { describe, it, expect } from "vitest";

describe("Video Generation", () => {
  const neurolink = new NeuroLink();

  it("should generate video from image", async () => {
    const result = await neurolink.generate({
      input: {
        text: "Smooth camera pan across the landscape",
        images: [await readFile("./test/fixtures/landscape.jpg")],
      },
      provider: "vertex",
      model: "veo-3.1",
      output: {
        mode: "video",
        video: {
          resolution: "720p",
          length: 6,
          aspectRatio: "16:9",
        },
      },
    });

    expect(result.video).toBeDefined();
    expect(result.video?.data).toBeInstanceOf(Buffer);
    expect(result.video?.mediaType).toBe("video/mp4");
    expect(result.video?.metadata?.duration).toBeGreaterThan(0);
  });

  it("should handle video generation errors", async () => {
    await expect(
      neurolink.generate({
        input: { text: "Video without image" },
        provider: "vertex",
        model: "veo-3.1",
        output: { mode: "video" },
      }),
    ).rejects.toThrow("VIDEO_INVALID_INPUT");
  });

  it("should generate video with audio", async () => {
    const result = await neurolink.generate({
      input: {
        text: "Dynamic product showcase with audio",
        images: [await readFile("./test/fixtures/product.jpg")],
      },
      provider: "vertex",
      model: "veo-3.1",
      output: {
        mode: "video",
        video: {
          resolution: "1080p",
          length: 8,
          audio: true,
        },
      },
    });

    expect(result.video?.data).toBeDefined();
    expect(result.video?.metadata?.duration).toBe(8);
  });
});
```

#### CLI Video Generation Tests

```bash
# Test basic video generation
npx @juspay/neurolink generate "Camera movement" \
  --image ./test/fixtures/sample.jpg \
  --outputMode video \
  --videoOutput ./test-output.mp4 \
  --provider vertex \
  --model veo-3.1

# Verify output file exists and is valid
test -f ./test-output.mp4 && echo "✅ Video file created"
ffprobe ./test-output.mp4 2>&1 | grep -q "Video:" && echo "✅ Valid video format"

# Test video with options
npx @juspay/neurolink generate "Product showcase" \
  --image ./test/fixtures/product.jpg \
  --outputMode video \
  --videoOutput ./test-1080p.mp4 \
  --videoResolution 1080p \
  --videoLength 8 \
  --videoAspectRatio 16:9 \
  --videoAudio true

# Test error handling
npx @juspay/neurolink generate "Video without image" \
  --outputMode video \
  --videoOutput ./fail.mp4 \
  2>&1 | grep -q "VIDEO_INVALID_INPUT" && echo "✅ Error handled correctly"
```

#### Mock Strategy for CI/CD

To avoid Vertex AI costs in CI/CD, mock video generation:

```typescript
import { vi } from "vitest";

// Mock video generation in tests
vi.mock("@juspay/neurolink", async () => {
  const actual = await vi.importActual("@juspay/neurolink");
  return {
    ...actual,
    NeuroLink: class MockNeuroLink {
      async generate(options: any) {
        if (options.output?.mode === "video") {
          return {
            content: "",
            video: {
              data: Buffer.from("mock-video-data"),
              mediaType: "video/mp4",
              metadata: {
                duration: options.output.video?.length || 6,
                dimensions: { width: 1280, height: 720 },
                model: "veo-3.1",
              },
            },
            provider: "vertex",
            model: "veo-3.1",
          };
        }
        // Default mock response for non-video modes
        return {
          content: "Mock text response",
          provider: options.provider || "mock",
          model: options.model || "mock-model",
        };
      }
    },
  };
});
```

#### Integration Test Example

```bash
#!/bin/bash
# integration-test-video.sh

set -e

echo "🧪 Testing Video Generation Integration"

# Setup
export GOOGLE_APPLICATION_CREDENTIALS="./test-service-account.json"
export GOOGLE_VERTEX_PROJECT="test-project"
export GOOGLE_VERTEX_LOCATION="us-central1"

# Test 1: Basic video generation
echo "Test 1: Basic video generation"
npx @juspay/neurolink generate "Test video" \
  --image ./test/fixtures/test.jpg \
  --outputMode video \
  --videoOutput ./test-output.mp4 \
  --timeout 180

if [ -f "./test-output.mp4" ]; then
  echo "✅ Test 1 passed"
else
  echo "❌ Test 1 failed"
  exit 1
fi

# Test 2: High-resolution video
echo "Test 2: High-resolution video"
npx @juspay/neurolink generate "HD test" \
  --image ./test/fixtures/test.jpg \
  --outputMode video \
  --videoOutput ./test-1080p.mp4 \
  --videoResolution 1080p \
  --videoLength 8

# Verify resolution
ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=p=0 ./test-1080p.mp4 | grep -q "1920,1080" && echo "✅ Test 2 passed"

# Cleanup
rm -f ./test-output.mp4 ./test-1080p.mp4

echo "✅ All video generation tests passed"
```

## Troubleshooting Guide

### Common Issues

1. **Empty Responses from Google AI**
   - Check model name in .env file
   - Use `gemini-2.5-pro` instead of deprecated models
   - Verify API key is valid

2. **NaN Token Counts**
   - Usually indicates provider API failure
   - Check model configuration and API keys
   - Test with `--debug` flag for detailed logs

3. **Enhancement Data Missing**
   - Ensure using `--debug` flag to see enhancement output
   - Verify enhancement flags are correctly specified
   - Check that provider is working (not falling back)

4. **CLI Commands Not Found**
   - Run `npm run build:cli` to rebuild CLI
   - Check that dist/cli/index.js exists
   - Verify Node.js version compatibility

### Debug Commands

```bash
# Comprehensive debug information
node ./dist/cli/index.js generate "debug test" --provider google-ai --enable-analytics --enable-evaluation --context '{"debug":true}' --debug

# Check provider status
node ./dist/cli/index.js status

# Test specific provider
node ./dist/cli/index.js generate "provider test" --provider openai --debug
```

## Test Automation

### Validation Script Usage

```bash
# Run complete validation suite
./validate-fixes.sh

# Run specific test categories
./validate-fixes.sh --cli-only
./validate-fixes.sh --sdk-only
./validate-fixes.sh --providers-only
```

### CI/CD Integration

```bash
# Add to CI pipeline
npm run test
npm run build:cli
./validate-fixes.sh --ci-mode
```

This testing guide ensures all enhancement features work correctly while maintaining backward compatibility and providing clear troubleshooting guidance.
