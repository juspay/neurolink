# NeuroLink Provider Configuration

NeuroLink supports 21+ AI providers through a unified API. This page highlights the most commonly-configured text providers — see the [README provider table](https://github.com/juspay/neurolink/blob/main/README.md#supported-ai-providers) and the [Provider Capabilities Audit](https://github.com/juspay/neurolink/blob/main/docs/reference/provider-capabilities-audit.md) for the full matrix, including newer text providers (DeepSeek, NVIDIA NIM, LM Studio, llama.cpp) and voice providers (OpenAI TTS, ElevenLabs, Deepgram, Azure Speech, Whisper, OpenAI Realtime, Gemini Live).

## Common Providers

| Provider         | Enum Name      | Aliases        | Default Model                           |
| ---------------- | -------------- | -------------- | --------------------------------------- |
| OpenAI           | `openai`       | gpt, chatgpt   | gpt-4o                                  |
| Anthropic        | `anthropic`    | claude         | claude-3-5-sonnet-20241022              |
| Google AI Studio | `google-ai`    | gemini, google | gemini-2.5-flash                        |
| Google Vertex AI | `vertex`       | google-vertex  | gemini-2.5-flash                        |
| AWS Bedrock      | `bedrock`      | aws-bedrock    | anthropic.claude-3-sonnet-20240229-v1:0 |
| Azure OpenAI     | `azure-openai` | azure          | gpt-4o                                  |
| Mistral AI       | `mistral`      | -              | mistral-large                           |
| Ollama           | `ollama`       | -              | llama3                                  |
| LiteLLM          | `litellm`      | -              | varies                                  |
| AWS SageMaker    | `sagemaker`    | -              | custom                                  |
| Hugging Face     | `hugging-face` | hf             | varies                                  |
| OpenRouter       | `openrouter`   | -              | varies                                  |
| Gateway          | `gateway`      | -              | varies                                  |

## OpenAI

```bash
# Environment
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...           # Optional
OPENAI_BASE_URL=...             # Optional, for proxies
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
  model: "gpt-4o", // or gpt-4o-mini, gpt-4-turbo, o1, o1-mini
});
```

**Available Models:**

- `gpt-4o` - Latest GPT-4 Omni
- `gpt-4o-mini` - Faster, cheaper
- `gpt-4-turbo` - GPT-4 Turbo
- `o1` - Reasoning model
- `o1-mini` - Smaller reasoning model

## Anthropic

```bash
# Environment
ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
});
```

**Available Models:**

- `claude-3-5-sonnet-20241022` - Latest Sonnet
- `claude-3-7-sonnet-20250219` - Claude 3.7 Sonnet
- `claude-3-opus-20240229` - Most capable
- `claude-3-haiku-20240307` - Fastest

**Extended Thinking:**

```typescript
const result = await neurolink.generate({
  input: { text: "Complex reasoning task" },
  provider: "anthropic",
  thinkingLevel: "high", // minimal, low, medium, high
});
```

## Google AI Studio

```bash
# Environment
GOOGLE_API_KEY=...
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "google-ai",
  model: "gemini-2.5-flash",
});
```

**Available Models:**

- `gemini-2.5-flash` - Fast and capable
- `gemini-2.5-pro` - Most capable
- `gemini-2.0-flash` - Previous generation
- `gemini-3-flash-preview` - Preview of Gemini 3

## Google Vertex AI

```bash
# Environment
VERTEX_PROJECT_ID=your-project-id
VERTEX_LOCATION=us-central1                    # Optional
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "vertex",
  model: "gemini-3-flash",
});
```

**Available Models:**

- `gemini-3-flash` - Latest Gemini 3
- `gemini-3-pro` - Most capable Gemini 3
- `gemini-2.5-flash` - Fast
- `gemini-2.5-pro` - Previous gen capable

**Extended Thinking (Gemini 3):**

```typescript
const result = await neurolink.generate({
  input: { text: "Complex reasoning task" },
  provider: "vertex",
  model: "gemini-3-flash",
  thinkingLevel: "high", // minimal, low, medium, high
});
```

## AWS Bedrock

```bash
# Environment
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
# Or use AWS profiles
AWS_PROFILE=your-profile
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "bedrock",
  model: "anthropic.claude-3-sonnet-20240229-v1:0",
});
```

**Available Models:**

- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`
- `amazon.titan-text-express-v1`
- `amazon.nova-pro-v1:0`
- `meta.llama3-70b-instruct-v1:0`

## Azure OpenAI

```bash
# Environment
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-02-15-preview  # Optional
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "azure-openai",
  model: "gpt-4o", // Your deployment name
});
```

## Mistral AI

```bash
# Environment
MISTRAL_API_KEY=...
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "mistral",
  model: "mistral-large-latest",
});
```

**Available Models:**

- `mistral-large-latest` - Most capable
- `mistral-small-latest` - Fast
- `codestral-latest` - Code specialized
- `ministral-8b-latest` - Small

## Ollama (Local)

```bash
# No environment variables needed
# Ensure Ollama is running: ollama serve
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "ollama",
  model: "llama3",
});
```

**Setup:**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3

# Start server
ollama serve
```

**Available Models:**

- `llama3` - Meta Llama 3
- `llama3:70b` - Larger Llama 3
- `mistral` - Mistral 7B
- `codellama` - Code specialized
- `phi3` - Microsoft Phi-3

## LiteLLM

```bash
# Environment
LITELLM_API_KEY=...
LITELLM_API_BASE=https://your-litellm-proxy.com
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "litellm",
  model: "gpt-4", // LiteLLM model format
});
```

## AWS SageMaker

```bash
# Environment
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2
SAGEMAKER_ENDPOINT_NAME=your-endpoint
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "sagemaker",
  model: "your-endpoint-name",
});
```

## Hugging Face

```bash
# Environment
HF_TOKEN=hf_...
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "hugging-face",
  model: "meta-llama/Meta-Llama-3-8B-Instruct",
});
```

## OpenRouter

```bash
# Environment
OPENROUTER_API_KEY=sk-or-...
```

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openrouter",
  model: "anthropic/claude-3-opus",
});
```

## Provider Fallback

Configure automatic fallback to another provider:

```typescript
import { createAIProviderWithFallback } from "@juspay/neurolink";

const { primary, fallback } = await createAIProviderWithFallback(
  "openai", // Primary
  "anthropic", // Fallback
  "gpt-4o",
);
```

## Check Provider Status

```typescript
// Check all configured providers
const status = await neurolink.getProviderStatus();
console.log(status);
// { provider: 'openai', status: 'working', configured: true, authenticated: true }

// Get list of available providers
const available = await neurolink.getAvailableProviders();
console.log(available);
// ['openai', 'anthropic', 'vertex']

// Get health summary
const health = await neurolink.getProviderHealthSummary();
console.log(health);
```

## Provider-Specific Options

### Temperature and Sampling

```typescript
const result = await neurolink.generate({
  input: { text: "Hello" },
  temperature: 0.7, // 0.0 - 2.0
  topP: 0.9, // Nucleus sampling
  topK: 40, // Top-K sampling
  maxTokens: 1000,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
});
```

### System Prompts

```typescript
const result = await neurolink.generate({
  input: { text: "Write code for me" },
  systemPrompt:
    "You are an expert TypeScript developer. Always use proper types.",
});
```

## Vision-Capable Models

Not all models support image inputs:

| Provider  | Vision Models         |
| --------- | --------------------- |
| OpenAI    | gpt-4o, gpt-4-turbo   |
| Anthropic | All Claude 3 models   |
| Vertex    | Gemini 2.5+, Gemini 3 |
| Google AI | Gemini 2.5+, Gemini 3 |
| Bedrock   | Claude 3 models       |

```typescript
const result = await neurolink.generate({
  input: {
    text: "Describe this image",
    images: ["./photo.jpg"],
  },
  provider: "openai",
  model: "gpt-4o", // Must be vision-capable
});
```

## Next Steps

- Multimodal inputs - Work with images and documents
- MCP tools - Add external tools
- RAG integration - Document-grounded generation
