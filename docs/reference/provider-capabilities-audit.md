# Provider Capabilities Audit

Comprehensive audit of all 13 AI providers supported by NeuroLink. This document serves as the source of truth for understanding each provider's capabilities, limitations, and configuration requirements.

**Last Updated:** January 1, 2026
**NeuroLink Version:** 8.26.1

---

## Capability Matrix

| Provider          | Text Gen | Streaming | Tools | Vision | PDF | Thinking | Structured Output | Auth Required      |
| ----------------- | -------- | --------- | ----- | ------ | --- | -------- | ----------------- | ------------------ |
| OpenAI            | ✓        | ✓         | ✓     | ✓      | ✗   | ✗        | ✓                 | API Key            |
| Anthropic         | ✓        | ✓         | ✓     | ✓      | ✓   | ✓        | ✓                 | API Key            |
| Google AI Studio  | ✓        | ✓         | ✓     | ✓      | ✓   | ✓        | ⚠️                | API Key            |
| Google Vertex     | ✓        | ✓         | ✓     | ✓      | ✓   | ✓        | ⚠️                | Service Account    |
| Amazon Bedrock    | ✓        | ✓         | ✓     | ⚠️     | ✓   | ✗        | ✓                 | AWS Credentials    |
| Amazon SageMaker  | ✓        | ⚠️        | ✓     | ✗      | ✗   | ✗        | ✗                 | AWS Credentials    |
| Azure OpenAI      | ✓        | ✓         | ✓     | ✓      | ✗   | ✗        | ✓                 | API Key + Endpoint |
| Mistral           | ✓        | ✓         | ✓     | ⚠️     | ✗   | ✗        | ✓                 | API Key            |
| HuggingFace       | ✓        | ✓         | ⚠️    | ✗      | ✗   | ✗        | ✗                 | API Key            |
| LiteLLM           | ✓        | ✓         | ✓     | ⚠️     | ✗   | ✗        | ✓                 | Custom             |
| Ollama            | ✓        | ✓         | ✓     | ⚠️     | ✗   | ✗        | ✗                 | None               |
| OpenAI Compatible | ✓        | ✓         | ✓     | ⚠️     | ✗   | ✗        | ✓                 | Custom             |
| OpenRouter        | ✓        | ✓         | ⚠️    | ⚠️     | ✗   | ✗        | ✓                 | API Key            |

**Legend:**

- ✓ Full Support
- ⚠️ Partial/Model-Dependent Support
- ✗ Not Supported

---

## 1. OpenAI Provider

**File:** `src/lib/providers/openAI.ts`
**Provider Name:** `openai`
**Default Model:** `gpt-4o`

### Capabilities

#### Text Generation ✓

- Full support for all GPT models
- Supports temperature, maxTokens, top_p parameters
- Multi-turn conversations

#### Streaming ✓

- Real-time token streaming via Server-Sent Events (SSE)
- Chunk-by-chunk response delivery
- Full analytics support

#### Tool Calling ✓

- Native function calling support
- Automatic tool execution
- Multi-step tool workflows
- Tool choice: auto, required, none

#### Vision/Multimodal ✓

**Supported Models:**

- GPT-5.2 series (gpt-5.2, gpt-5.2-pro) - Latest flagship
- GPT-5 series (gpt-5, gpt-5-pro, gpt-5-mini, gpt-5-nano)
- GPT-4.1 series (gpt-4.1, gpt-4.1-mini, gpt-4.1-nano)
- O-series reasoning models (o3, o3-mini, o3-pro, o4, o4-mini)
- GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4-vision-preview

**Image Support:**

- Up to 10 images per request
- Formats: PNG, JPEG, WEBP, GIF
- Base64 and URL input

#### PDF Processing ✗

- Not natively supported
- Requires external preprocessing

#### Extended Thinking ✗

- Standard reasoning only
- No extended thinking capability

#### Structured Output ✓

- JSON schema validation
- Type-safe responses via Zod
- Response format enforcement

### Configuration

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1  # For proxy/custom endpoints
```

### Known Limitations

- PDF files require preprocessing to text/images
- No native extended thinking mode
- Rate limits apply per API key tier
- Context window varies by model (128K for GPT-4o)

---

## 2. Anthropic Provider

**File:** `src/lib/providers/anthropic.ts`
**Provider Name:** `anthropic`
**Default Model:** `claude-sonnet-4-5-20250929`

### Capabilities

#### Text Generation ✓

- All Claude models (3.x, 4.x, 4.5)
- Advanced reasoning capabilities
- Long context support (200K tokens)

#### Streaming ✓

- Real-time streaming with SSE
- Tool execution during streaming
- Analytics tracking

#### Tool Calling ✓

- Native tool use support
- Multi-step agentic workflows
- Tool result caching
- Parallel tool execution

#### Vision/Multimodal ✓

**Supported Models:**

- Claude 4.5 series (Sonnet, Opus, Haiku)
- Claude 4.1 and 4.0 series
- Claude 3.7 series
- Claude 3.5 series
- Claude 3 series (Opus, Sonnet, Haiku)

**Image Support:**

- Up to 20 images per request
- Formats: PNG, JPEG, WEBP, GIF
- Base64 encoding required

#### PDF Processing ✓

- Native PDF document understanding
- No preprocessing required
- Extract text, tables, and structure
- Visual analysis of PDF pages

#### Extended Thinking ✓

**Supported Models:**

- Claude 4.5 Sonnet (latest)
- Claude 4.5 Opus
- Claude 4.1 Opus
- Claude 3.7 Sonnet

**Thinking Levels:**

- `minimal` - Fast responses
- `low` - Basic reasoning
- `medium` - Moderate reasoning (default)
- `high` - Deep reasoning and analysis

#### Structured Output ✓

- JSON schema validation
- Type-safe responses
- Zod schema support

### Configuration

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_VERSION=2023-06-01
```

### Known Limitations

- 200K token context window (generous but finite)
- API rate limits based on tier
- Extended thinking increases latency
- PDF processing has file size limits

---

## 3. Google AI Studio Provider

**File:** `src/lib/providers/googleAiStudio.ts`
**Provider Name:** `google-ai` / `googleAiStudio`
**Default Model:** `gemini-2.5-flash`

### Capabilities

#### Text Generation ✓

- Gemini 1.5, 2.0, 2.5, and 3.0 models
- Fast inference
- Free tier available

#### Streaming ✓

- Real-time streaming
- Tool execution during streaming
- Analytics support

#### Tool Calling ✓

- Native function calling
- Parallel tool execution
- Tool result integration

#### Vision/Multimodal ✓

**Supported Models:**

- Gemini 3 series (Pro, Flash) - Preview
- Gemini 2.5 series (Pro, Flash, Flash Lite)
- Gemini 2.0 series (Flash)
- Gemini 1.5 series (Pro, Flash)

**Image Support:**

- Up to 16 images per request
- Formats: PNG, JPEG, WEBP
- Base64 and Google Cloud Storage URLs

#### PDF Processing ✓

- Native PDF understanding
- Text and visual extraction
- Document structure analysis

#### Extended Thinking ✓

**Supported Models:**

- Gemini 3 Pro (Preview)
- Gemini 2.5 Pro
- Gemini 2.5 Flash

**Thinking Levels:**

- `minimal`, `low`, `medium`, `high`
- Configurable thinking budget

#### Structured Output ⚠️

- JSON schema support
- **CRITICAL LIMITATION:** Cannot use tools AND structured output simultaneously
- When using JSON schema, must set `disableTools: true`
- Error: "Function calling with response mime type 'application/json' is unsupported"

### Configuration

```bash
# Required
GOOGLE_AI_API_KEY=AIza...

# Optional
GOOGLE_AI_MODEL=gemini-2.5-flash
```

### Known Limitations

- **Cannot combine tools + JSON schema** (Gemini limitation)
- Tools OR structured output, not both
- Free tier has rate limits
- Some features in preview/experimental

---

## 4. Google Vertex AI Provider

**File:** `src/lib/providers/googleVertex.ts`
**Provider Name:** `vertex`
**Default Model:** `gemini-2.5-flash`

### Capabilities

Same as Google AI Studio, plus:

#### Dual Provider Support

- **Gemini models** - Same as AI Studio
- **Claude models via Vertex** - Anthropic models hosted on GCP

**Anthropic on Vertex:**

- Claude 4.5 series (Sonnet, Opus, Haiku)
- Claude 4.x and 3.x series
- Full tool calling support
- No structured output limitation (unlike Gemini)

#### Text Generation ✓

- All Gemini models
- All Claude models via Vertex Anthropic
- Enterprise-grade reliability

#### Streaming ✓

- Same as AI Studio
- Works for both Gemini and Claude models

#### Tool Calling ✓

- Gemini: Full tool support (but not with schemas)
- Claude: Full tool support (can combine with schemas)

#### Vision/Multimodal ✓

- Gemini: Up to 16 images
- Claude: Up to 20 images

#### PDF Processing ✓

- Both Gemini and Claude models support PDF

#### Extended Thinking ✓

- Gemini 2.5+, Gemini 3: Full support
- Claude models: Not supported via Vertex

#### Structured Output ⚠️

- Gemini: Cannot combine with tools
- Claude: Can combine with tools

### Configuration

```bash
# Required (Option 1: Service Account File)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
VERTEX_PROJECT_ID=my-project

# Required (Option 2: Environment Variables)
GOOGLE_AUTH_CLIENT_EMAIL=...
GOOGLE_AUTH_PRIVATE_KEY=...
VERTEX_PROJECT_ID=my-project

# Optional
VERTEX_LOCATION=us-central1
VERTEX_MODEL=gemini-2.5-flash
```

### Known Limitations

- Requires Google Cloud project setup
- Service account authentication complexity
- Gemini tools + schema limitation applies
- Regional endpoint configuration

---

## 5. Amazon Bedrock Provider

**File:** `src/lib/providers/amazonBedrock.ts`
**Provider Name:** `bedrock`
**Default Model:** `anthropic.claude-3-sonnet-20240229-v1:0`

### Capabilities

#### Text Generation ✓

- Claude models on Bedrock
- Amazon Titan models
- Cohere models
- Meta Llama models
- AI21 Jurassic models

#### Streaming ✓

- Real-time streaming via AWS SDK
- Native conversation loop
- Tool execution during streaming

#### Tool Calling ✓

- Native tool support via Bedrock Converse API
- Multi-step tool workflows
- Automatic tool execution

#### Vision/Multimodal ⚠️

**Model-Dependent:**

- Claude models: Full vision support
- Titan models: Limited vision support
- Other models: Varies by model

#### PDF Processing ✓

- Claude models: Native PDF support
- Document extraction and analysis

#### Extended Thinking ✗

- Not supported via Bedrock
- Standard reasoning only

#### Structured Output ✓

- JSON schema validation
- Type-safe responses

### Configuration

```bash
# Required
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Optional
BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
```

### Known Limitations

- Requires AWS account with Bedrock access
- Model availability varies by region
- IAM permissions required
- No extended thinking support
- Vision support depends on model

---

## 6. Amazon SageMaker Provider

**File:** `src/lib/providers/amazonSagemaker.ts`
**Provider Name:** `sagemaker`
**Default Model:** Custom endpoint

### Capabilities

#### Text Generation ✓

- Custom SageMaker endpoints
- Fine-tuned models
- Enterprise model deployments

#### Streaming ⚠️

- **Not fully implemented** (as of v8.26.1)
- Coming in next phase
- Returns 501 error currently

#### Tool Calling ✓

- Supported for compatible models
- Depends on endpoint configuration

#### Vision/Multimodal ✗

- Not supported
- Depends on custom endpoint

#### PDF Processing ✗

- Not supported

#### Extended Thinking ✗

- Not supported

#### Structured Output ✗

- Not supported via provider
- May work with custom endpoints

### Configuration

```bash
# Required
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
SAGEMAKER_ENDPOINT_NAME=my-endpoint

# Optional
SAGEMAKER_MODEL=custom-model
```

### Known Limitations

- **Streaming not fully implemented**
- Requires SageMaker endpoint deployment
- Custom model-dependent capabilities
- No built-in multimodal support
- Enterprise AWS setup required

---

## 7. Azure OpenAI Provider

**File:** `src/lib/providers/azureOpenai.ts`
**Provider Name:** `azure`
**Default Model:** `gpt-4o`

### Capabilities

#### Text Generation ✓

- All Azure OpenAI models
- GPT-4, GPT-4o, GPT-3.5-turbo
- Enterprise security and compliance

#### Streaming ✓

- Real-time streaming
- Tool execution during streaming
- Analytics support

#### Tool Calling ✓

- Full tool support
- Same as OpenAI provider
- Multi-step workflows

#### Vision/Multimodal ✓

**Supported Models:**

- GPT-5.1 series
- GPT-5 series
- GPT-4.1 series
- O-series (o3, o4)
- GPT-4o, GPT-4o-mini, GPT-4-turbo

**Image Support:**

- Up to 10 images per request
- Same formats as OpenAI

#### PDF Processing ✗

- Not natively supported

#### Extended Thinking ✗

- Not supported

#### Structured Output ✓

- JSON schema validation
- Type-safe responses

### Configuration

```bash
# Required
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Optional
AZURE_API_VERSION=2024-05-01-preview
```

### Known Limitations

- Requires Azure subscription
- Deployment configuration required
- Regional model availability varies
- No PDF or extended thinking support

---

## 8. Mistral Provider

**File:** `src/lib/providers/mistral.ts`
**Provider Name:** `mistral`
**Default Model:** `mistral-small-2506`

### Capabilities

#### Text Generation ✓

- Mistral Small, Medium, Large models
- Fast inference
- Cost-effective

#### Streaming ✓

- Real-time streaming
- Tool execution support

#### Tool Calling ✓

- Native function calling
- Tool execution workflows

#### Vision/Multimodal ⚠️

**Supported Models:**

- Mistral Small 2506 (June 2025) - Vision-capable
- Mistral Pixtral - Multimodal model

**Image Support:**

- Up to 10 images per request (conservative limit)
- Model-dependent capability

#### PDF Processing ✗

- Not supported

#### Extended Thinking ✗

- Not supported

#### Structured Output ✓

- JSON schema support
- Type-safe responses

### Configuration

```bash
# Required
MISTRAL_API_KEY=...

# Optional
MISTRAL_MODEL=mistral-small-2506
```

### Known Limitations

- Vision only on specific models (Small 2506+)
- No PDF support
- No extended thinking
- Limited multimodal compared to GPT-4o/Claude

---

## 9. HuggingFace Provider

**File:** `src/lib/providers/huggingFace.ts`
**Provider Name:** `huggingface`
**Default Model:** `microsoft/DialoGPT-medium`

### Capabilities

#### Text Generation ✓

- Access to 100,000+ models
- Open-source models
- Custom fine-tuned models

#### Streaming ✓

- Real-time streaming via unified router
- OpenAI-compatible endpoint

#### Tool Calling ⚠️

**Model-Dependent Support:**

**Supported Models:**

- Llama 3.1 series (8B, 70B, 405B Instruct)
- Llama 3.1 Nemotron Ultra
- Hermes 3 Llama 3.2
- CodeLlama 34B Instruct
- Mistral 7B Instruct v0.3

**Unsupported Models:**

- DialoGPT variants (treats tools as conversation)
- GPT-2, BERT, RoBERTa variants
- Most pre-2024 models

#### Vision/Multimodal ✗

- Not supported via unified router
- Individual model APIs may support

#### PDF Processing ✗

- Not supported

#### Extended Thinking ✗

- Not supported

#### Structured Output ✗

- Not supported via provider

### Configuration

```bash
# Required
HUGGINGFACE_API_KEY=hf_...

# Optional
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

### Known Limitations

- Tool calling only on specific models
- No vision/multimodal support
- No PDF processing
- Model quality varies significantly
- Some models require approval/licensing

---

## 10. LiteLLM Provider

**File:** `src/lib/providers/litellm.ts`
**Provider Name:** `litellm`
**Default Model:** `openai/gpt-4o-mini`

### Capabilities

#### Text Generation ✓

- Access to 100+ models via proxy
- Unified interface for all providers
- Cost tracking and analytics

#### Streaming ✓

- Real-time streaming
- Proxies to underlying provider streams

#### Tool Calling ✓

- Full tool support
- Depends on backend model capabilities

#### Vision/Multimodal ⚠️

- Depends on backend model
- If proxying to GPT-4o: Vision supported
- If proxying to Gemini: Vision supported
- Varies by configured model

#### PDF Processing ✗

- Not supported via LiteLLM proxy

#### Extended Thinking ✗

- Not supported

#### Structured Output ✓

- JSON schema support
- Type-safe responses

### Configuration

```bash
# Required
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=sk-anything

# Optional
LITELLM_MODEL=openai/gpt-4o-mini
```

### Known Limitations

- Requires LiteLLM proxy server running
- Capabilities depend on backend provider
- Model format: `provider/model`
- Configuration complexity for enterprise setups

---

## 11. Ollama Provider

**File:** `src/lib/providers/ollama.ts`
**Provider Name:** `ollama`
**Default Model:** `llama3.1:8b`

### Capabilities

#### Text Generation ✓

- Local model execution
- Privacy-first (no data sent to cloud)
- Custom model support

#### Streaming ✓

- Real-time streaming
- Dual API mode:
  - Native Ollama API (`/api/generate`)
  - OpenAI-compatible API (`/v1/chat/completions`)

#### Tool Calling ✓

- Supported on compatible models
- Llama 3.1+ models
- Gemma 3 models with tool training

#### Vision/Multimodal ⚠️

**Model-Dependent:**

- LLaVA models - Vision support
- Gemini models - Vision support
- Llama 3.2 Vision - Vision support

**Image Support:**

- Up to 10 images (conservative limit)
- Depends on model capabilities

#### PDF Processing ✗

- Not supported

#### Extended Thinking ✗

- Not supported

#### Structured Output ✗

- Limited structured output support

### Configuration

```bash
# Optional
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=240000
OLLAMA_OPENAI_COMPATIBLE=false
```

### Known Limitations

- Local compute requirements
- Model quality varies
- No PDF support
- Vision only on specific models
- Slower inference than cloud providers

---

## 12. OpenAI Compatible Provider

**File:** `src/lib/providers/openaiCompatible.ts`
**Provider Name:** `openai-compatible`
**Default Model:** Auto-discovered or `gpt-3.5-turbo`

### Capabilities

#### Text Generation ✓

- Any OpenAI-compatible endpoint
- vLLM, FastChat, LocalAI, etc.
- Custom deployment support

#### Streaming ✓

- Real-time streaming
- OpenAI-compatible SSE

#### Tool Calling ✓

- Full tool support
- Depends on backend compatibility

#### Vision/Multimodal ⚠️

- Depends on backend endpoint
- Auto-discovery not available for capabilities

#### PDF Processing ✗

- Not supported

#### Extended Thinking ✗

- Not supported

#### Structured Output ✓

- JSON schema support
- Type-safe responses

### Configuration

```bash
# Required
OPENAI_COMPATIBLE_BASE_URL=https://api.custom.com/v1
OPENAI_COMPATIBLE_API_KEY=...

# Optional
OPENAI_COMPATIBLE_MODEL=model-name  # Auto-discovers if not set
```

### Known Limitations

- Capabilities depend entirely on backend
- No standardized capability detection
- Authentication varies by provider
- Model discovery may fail

---

## 13. OpenRouter Provider

**File:** `src/lib/providers/openRouter.ts`
**Provider Name:** `openrouter`
**Default Model:** `anthropic/claude-3-5-sonnet`

### Capabilities

#### Text Generation ✓

- Access to 300+ models from 60+ providers
- Unified API for all models
- Automatic failover
- Cost tracking

#### Streaming ✓

- Real-time streaming
- Proxies to underlying provider

#### Tool Calling ⚠️

**Model-Dependent Support:**

**Supported Models:**

- Anthropic Claude models
- OpenAI GPT-4 models
- Google Gemini models
- Mistral Large/Small models
- Meta Llama 3.3, 3.2

**Unsupported Models:**

- Many older/smaller models
- Check model page for tool support

#### Vision/Multimodal ⚠️

- Depends on selected model
- GPT-4o, Claude, Gemini support vision
- Check model-specific capabilities

#### PDF Processing ✗

- Not supported via OpenRouter

#### Extended Thinking ✗

- Not supported

#### Structured Output ✓

- JSON schema support
- Type-safe responses

### Configuration

```bash
# Required
OPENROUTER_API_KEY=sk-or-...

# Optional
OPENROUTER_MODEL=anthropic/claude-3-5-sonnet
OPENROUTER_REFERER=https://your-app.com
OPENROUTER_APP_NAME=YourApp
```

### Known Limitations

- Tool support varies by model
- Vision support varies by model
- Credit-based pricing system
- Model availability can change
- No PDF support

---

## Summary Tables

### Provider Comparison by Use Case

#### Best for Production Text Generation

1. **OpenAI** - Most reliable, best quality
2. **Anthropic** - Long context, advanced reasoning
3. **Google Vertex** - Enterprise-grade, multi-model

#### Best for Multimodal (Vision + Text)

1. **Anthropic** - Best vision + PDF support
2. **OpenAI** - Strong vision, no PDF
3. **Google AI Studio** - Good vision + PDF, free tier

#### Best for Tool Calling

1. **Anthropic** - Most advanced agentic workflows
2. **OpenAI** - Reliable function calling
3. **Google Vertex** - Dual provider (Gemini + Claude)

#### Best for Local/Privacy

1. **Ollama** - Fully local, no cloud
2. N/A - Only Ollama provides local execution

#### Best for Cost Optimization

1. **Google AI Studio** - Free tier available
2. **OpenRouter** - Access to free models
3. **LiteLLM** - Cost tracking, routing

#### Best for Extended Thinking

1. **Anthropic** - Native extended thinking
2. **Google AI Studio** - Gemini 2.5+, 3.0 thinking
3. **Google Vertex** - Same as AI Studio

### Authentication Quick Reference

| Provider          | Auth Type          | Env Vars                                                  | Complexity |
| ----------------- | ------------------ | --------------------------------------------------------- | ---------- |
| OpenAI            | API Key            | `OPENAI_API_KEY`                                          | Low        |
| Anthropic         | API Key            | `ANTHROPIC_API_KEY`                                       | Low        |
| Google AI Studio  | API Key            | `GOOGLE_AI_API_KEY`                                       | Low        |
| Google Vertex     | Service Account    | `GOOGLE_APPLICATION_CREDENTIALS`                          | High       |
| Amazon Bedrock    | AWS Credentials    | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`              | Medium     |
| Amazon SageMaker  | AWS Credentials    | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`              | High       |
| Azure OpenAI      | API Key + Endpoint | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`           | Medium     |
| Mistral           | API Key            | `MISTRAL_API_KEY`                                         | Low        |
| HuggingFace       | API Key            | `HUGGINGFACE_API_KEY`                                     | Low        |
| LiteLLM           | Custom             | `LITELLM_BASE_URL`, `LITELLM_API_KEY`                     | Medium     |
| Ollama            | None               | Optional `OLLAMA_BASE_URL`                                | Low        |
| OpenAI Compatible | Custom             | `OPENAI_COMPATIBLE_BASE_URL`, `OPENAI_COMPATIBLE_API_KEY` | Medium     |
| OpenRouter        | API Key            | `OPENROUTER_API_KEY`                                      | Low        |

---

## Provider Implementation Notes

### BaseProvider Architecture

All providers extend `BaseProvider` class which provides:

- Unified interface for text generation and streaming
- Tool registration and execution
- Middleware support
- Analytics and telemetry
- Error handling
- Message building for multimodal content

### Dynamic Provider Loading

Providers are registered via dynamic imports in `ProviderRegistry`:

- Avoids circular dependencies
- Lazy loading for better performance
- Clean provider isolation

### Tool Execution Flow

1. Tools registered with `MCPToolRegistry`
2. Provider calls `getAllTools()` to get available tools
3. AI model receives tool definitions
4. Model calls tools during generation
5. Tool results sent back to model
6. Process repeats until completion

---

## Version History

- **v8.26.1** (January 2026) - Current version, 13 providers
- **v8.26.0** - Added video output types
- **v8.25.0** - Gemini 3 support improvements
- **v8.24.0** - Enhanced provider capabilities

---

**Next Steps:**

- See [Provider Comparison Guide](./provider-comparison.md) for feature matrix
- See [Provider Selection Wizard](../guides/provider-selection.md) for recommendations
- See [API Reference](../sdk/api-reference.md) for usage examples
