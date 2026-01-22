# 🖥️ CLI Reference Guide

## ✅ IMPLEMENTATION STATUS: COMPLETE (2025-01-07)

**Generate Function Migration completed - CLI now supports both primary and legacy commands**

- ✅ New `generate` command established as primary
- ✅ All options and functionality maintained
- ✅ Zero breaking changes for existing scripts

> **Migration Note**: Use `generate` for new scripts. Existing `generate` scripts continue working with deprecation warnings.

---

## Complete Command Reference

### Primary Usage (Recommended)

```bash
# NEW: Primary command
npx @juspay/neurolink generate "Your prompt here" [options]
npx @juspay/neurolink gen "Your prompt here" [options]    # Short form

```

### Migration Examples

```bash
# ✅ NEW: Recommended usage
npx @juspay/neurolink generate "Explain AI" --provider google-ai
npx @juspay/neurolink gen "Write code" --provider openai
```

### Core Options

| Flag            | Type    | Default          | Description                                                                                                                |
| --------------- | ------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `--provider`    | string  | `auto`           | AI provider (`auto`, `openai`, `bedrock`, `vertex`, `anthropic`, `azure`, `google-ai`, `huggingface`, `ollama`, `mistral`) |
| `--model`       | string  | provider default | Specific model (e.g., `gemini-2.5-pro`, `gpt-4o`, `claude-3-sonnet`)                                                       |
| `--temperature` | number  | `0.7`            | Creativity level (0.0 = focused, 1.0 = creative)                                                                           |
| `--max-tokens`  | number  | `1000`           | Maximum tokens to generate                                                                                                 |
| `--system`      | string  | none             | System prompt to guide AI behavior                                                                                         |
| `--format`      | string  | `text`           | Output format (`text`, `json`)                                                                                             |
| `--timeout`     | number  | `120`            | Maximum execution time in seconds                                                                                          |
| `--debug`       | boolean | `false`          | Enable debug mode with verbose output                                                                                      |

### Enhancement Features

| Flag                  | Type    | Default | Description                                        |
| --------------------- | ------- | ------- | -------------------------------------------------- |
| `--enable-analytics`  | boolean | `false` | Enable usage analytics (tokens, cost, performance) |
| `--enable-evaluation` | boolean | `false` | Enable AI response quality evaluation              |
| `--context`           | string  | none    | JSON context object for custom data                |

### Universal Evaluation System

| Flag                   | Type    | Default | Description                                                   |
| ---------------------- | ------- | ------- | ------------------------------------------------------------- |
| `--evaluation-domain`  | string  | none    | Domain expertise for evaluation (e.g., 'AI coding assistant') |
| `--tool-usage-context` | string  | none    | Tool usage context for evaluation                             |
| `--lighthouse-style`   | boolean | `false` | Use Lighthouse-compatible domain-aware evaluation             |

### MCP Integration

| Flag              | Type    | Default | Description                                             |
| ----------------- | ------- | ------- | ------------------------------------------------------- |
| `--disable-tools` | boolean | `false` | Disable MCP tool integration (tools enabled by default) |

### Video Generation (Veo 3.1)

| Flag                   | Type    | Default | Description                                                               |
| ---------------------- | ------- | ------- | ------------------------------------------------------------------------- |
| `--outputMode`         | string  | `text`  | Output mode: 'text' or 'video'                                            |
| `--image`              | string  | none    | Path to an input image to base the generated video on (e.g., ./input.png) |
| `--videoOutput`, `-vo` | string  | none    | Path to save generated video (e.g., ./output.mp4)                         |
| `--videoResolution`    | string  | `720p`  | Video resolution: '720p' or '1080p'                                       |
| `--videoLength`        | number  | `6`     | Video duration in seconds: 4, 6, or 8                                     |
| `--videoAspectRatio`   | string  | `16:9`  | Aspect ratio: '9:16' (portrait) or '16:9' (landscape)                     |
| `--videoAudio`         | boolean | `true`  | Include synchronized audio                                                |

## Usage Examples

### Basic Text Generation

```bash
# Simple generation
npx @juspay/neurolink generate "Write a haiku about AI"

# With specific provider
npx @juspay/neurolink generate "Explain quantum computing" --provider openai

# With model selection
npx @juspay/neurolink generate "Write code" --provider google-ai --model gemini-2.5-pro
```

### Enhanced Analytics & Evaluation

```bash
# Basic analytics
npx @juspay/neurolink generate "What is machine learning?" --enable-analytics

# Analytics + evaluation
npx @juspay/neurolink generate "Explain AI ethics" --enable-analytics --enable-evaluation

# With custom context
npx @juspay/neurolink generate "Create a proposal" \
  --enable-analytics --enable-evaluation \
  --context '{"company":"TechCorp","department":"AI"}'
```

### Domain-Aware Evaluation

```bash
# Basic domain evaluation
npx @juspay/neurolink generate "Fix this Python code" \
  --enable-evaluation --evaluation-domain "Python coding assistant"

# Lighthouse-style evaluation
npx @juspay/neurolink generate "Create a business plan" \
  --lighthouse-style --evaluation-domain "Business consultant" \
  --tool-usage-context "Used market-research and financial-analysis tools"

# Enterprise evaluation with context
npx @juspay/neurolink generate "Analyze sales data" \
  --enable-analytics --lighthouse-style \
  --evaluation-domain "Data analyst" \
  --context '{"role":"senior_analyst","access_level":"full"}'
```

### Debug & Development

```bash
# Debug mode with full output
npx @juspay/neurolink generate "Test prompt" --debug

# Debug with enhancements
npx @juspay/neurolink generate "Test analytics" \
  --enable-analytics --enable-evaluation --debug

# Disable MCP tools for testing
npx @juspay/neurolink generate "Simple test" --disable-tools
```

### Advanced Examples

```bash
# Enterprise AI assistant with full features
npx @juspay/neurolink generate "Create quarterly AI strategy" \
  --provider openai --model gpt-4o \
  --enable-analytics --lighthouse-style \
  --evaluation-domain "AI strategy consultant" \
  --tool-usage-context "Market research, competitor analysis, financial modeling" \
  --context '{"company":"Fortune500","quarter":"Q1-2025","budget":"$5M"}' \
  --debug

# Cost-optimized evaluation
npx @juspay/neurolink generate "Quick code review" \
  --provider google-ai --model gemini-2.5-flash \
  --enable-evaluation --evaluation-domain "Code reviewer" \
  --max-tokens 500

# High-quality content generation
npx @juspay/neurolink generate "Write technical documentation" \
  --provider anthropic --model claude-3-opus \
  --enable-analytics --enable-evaluation \
  --evaluation-domain "Technical writer" \
  --temperature 0.3 --max-tokens 2000
```

## Output Examples

### Basic Output

```
✨ Generated text:
Artificial Intelligence (AI) refers to...

✅ Text generated successfully!
```

### Enhanced Output (with --enable-analytics --enable-evaluation)

```
✨ Generated text:
Artificial Intelligence (AI) refers to...

📊 Analytics:
   Provider: google-ai
   Model: gemini-2.5-flash
   Tokens: 245 (input: 12, output: 233)
   Cost: $0.0012
   Response Time: 3247ms
   Context: {"domain":"education"}

⭐ Response Quality Evaluation:
   🎯 Relevance: 9/10
   ✅ Accuracy: 8/10
   📋 Completeness: 9/10
   🏆 Overall Quality: 9/10
   🤖 Evaluated by: gemini-2.5-flash (1247ms)

✅ Text generated successfully!
```

### Debug Output (with --debug)

```
🔍 Debug: Provider selection started
🔍 Debug: Selected provider: google-ai (model: gemini-2.5-flash)
🔍 Debug: Analytics enabled: true
🔍 Debug: Evaluation enabled: true
🔍 Debug: Request started at 2025-01-06T12:00:00.000Z

✨ Generated text:
...

🔍 Debug: Raw analytics data:
{
  "provider": "google-ai",
  "tokens": {"input": 12, "output": 233, "total": 245},
  "cost": 0.0012,
  "responseTime": 3247,
  "context": {"domain": "education"}
}

🔍 Debug: Raw evaluation data:
{
  "relevance": 9,
  "accuracy": 8,
  "completeness": 9,
  "overall": 9,
  "model": "gemini-2.5-flash",
  "evaluationTime": 1247
}

✅ Text generated successfully!
```

## Error Handling

### Common Errors & Solutions

**Provider not available:**

```
❌ Error: Provider 'openai' not available (missing API key)
💡 Solution: Set OPENAI_API_KEY in your .env file
```

**Invalid context JSON:**

```
❌ Error: Invalid JSON in --context parameter
💡 Solution: Use proper JSON format: --context '{"key":"value"}'
```

**Model not found:**

```
❌ Error: Model 'invalid-model' not found for provider 'openai'
💡 Solution: Use valid model names (see provider documentation)
```

**Evaluation failed:**

```
⚠️  Warning: Evaluation failed, continuing without quality scores
💡 Reason: Evaluation provider unavailable, set NEUROLINK_EVALUATION_MODEL
```

## Performance Tips

1. **Fast Evaluation**: Use `--model gemini-2.5-flash` for quick, cost-effective evaluation
2. **Quality Content**: Use `--provider anthropic --model claude-3-opus` for high-quality generation
3. **Cost Optimization**: Set `NEUROLINK_EVALUATION_PREFER_CHEAP=true` for automatic cost optimization
4. **Debug Efficiently**: Use `--debug` only when troubleshooting to avoid verbose output
5. **Context Size**: Keep `--context` objects small to minimize token usage

## Video Generation Examples

Generate videos from images using Veo 3.1 via Vertex AI:

```bash
# Basic video generation
npx @juspay/neurolink generate "Product showcase with smooth camera movement" \
  --image ./product.jpg \
  --outputMode video \
  --videoOutput ./output.mp4

# Full options
npx @juspay/neurolink generate "Cinematic reveal with dramatic lighting" \
  --image ./hero-image.png \
  --provider vertex \
  --model veo-3.1 \
  --outputMode video \
  --videoResolution 1080p \
  --videoLength 8 \
  --videoAspectRatio 16:9 \
  --videoOutput ./cinematic.mp4

# Portrait video for social media
npx @juspay/neurolink generate "Vertical scroll animation" \
  --image ./mobile-screenshot.jpg \
  --outputMode video \
  --videoResolution 720p \
  --videoAspectRatio 9:16 \
  --videoOutput ./story.mp4
```

> **Note:** Video generation requires Vertex AI credentials. See [Video Generation Guide](./features/video-generation.md).

## Environment Variables

See the [Environment Variables](./getting-started/environment-variables.md) documentation for complete configuration options.

## API Integration

For programmatic usage, see the [API Reference](./api-reference.md) documentation.
