# Provider Capability Matrix

**Last Updated:** December 2025

This document provides a centralized reference for all AI provider capabilities, limitations, and configuration requirements in NeuroLink.

## Quick Reference Table

| Provider              | Vision             | PDF                | Tools | Streaming | Max Tokens      | Free Tier  | Status     |
| --------------------- | ------------------ | ------------------ | ----- | --------- | --------------- | ---------- | ---------- |
| **OpenAI**            | ✅                 | ✅                 | ✅    | ✅        | 128k            | ❌         | Production |
| **Anthropic**         | ✅                 | ✅                 | ✅    | ✅        | 200k            | ❌         | Production |
| **Google AI Studio**  | ✅                 | ✅                 | ✅    | ✅        | 1M+             | ✅         | Production |
| **Google Vertex AI**  | ✅                 | ✅                 | ✅    | ✅        | 1M+             | ❌         | Production |
| **AWS Bedrock**       | ✅                 | ✅                 | ✅    | ✅        | 200k            | ❌         | Production |
| **Azure OpenAI**      | ✅                 | ❌\*               | ✅    | ✅        | 128k            | ❌         | Production |
| **LiteLLM**           | ✅                 | ✅                 | ✅    | ✅        | Varies          | Varies     | Production |
| **AWS SageMaker**     | Model-dependent    | Model-dependent    | ✅    | ✅        | Custom          | ❌         | Production |
| **Mistral AI**        | ✅                 | ❌                 | ✅    | ✅        | 32k             | ✅         | Production |
| **Hugging Face**      | Model-dependent    | ❌                 | ⚠️    | ✅        | Varies          | ✅         | Production |
| **Ollama**            | ✅                 | ⚠️                 | ⚠️    | ✅        | Model-dependent | ✅ (Local) | Production |
| **OpenAI Compatible** | Endpoint-dependent | Endpoint-dependent | ✅    | ✅        | Varies          | Varies     | Production |

**Legend:**

- ✅ Fully supported
- ⚠️ Partial support (model/configuration dependent)
- ❌ Not supported
- \* Technical limitation (see provider details)

---

## Provider Details

### OpenAI

**Provider ID:** `openai`

#### Supported Models

| Model           | Vision | Tools | Context Window | Best For                    |
| --------------- | ------ | ----- | -------------- | --------------------------- |
| `gpt-4o`        | ✅     | ✅    | 128k           | General purpose, multimodal |
| `gpt-4o-mini`   | ✅     | ✅    | 128k           | Cost-effective tasks        |
| `gpt-4-turbo`   | ✅     | ✅    | 128k           | Complex reasoning           |
| `gpt-4`         | ❌     | ✅    | 8k             | Legacy support              |
| `gpt-3.5-turbo` | ❌     | ✅    | 16k            | Fast, economical            |
| `o1-preview`    | ❌     | ❌    | 128k           | Advanced reasoning          |
| `o1-mini`       | ❌     | ❌    | 128k           | Reasoning (faster)          |

#### Environment Variables

```bash
OPENAI_API_KEY=sk-your-api-key-here    # Required
OPENAI_MODEL=gpt-4o                     # Optional (default: gpt-4o)
OPENAI_MAX_TOOLS=150                    # Optional (default: 150)
```

#### Known Limitations

- No free tier available
- Rate limits vary by API tier (30,000-90,000 TPM)
- o1 models do not support tool calling or streaming

#### Cost Estimates (per 1M tokens)

| Model       | Input  | Output |
| ----------- | ------ | ------ |
| GPT-4o      | $5.00  | $15.00 |
| GPT-4o-mini | $0.15  | $0.60  |
| GPT-4-turbo | $10.00 | $30.00 |

---

### Anthropic (Claude)

**Provider ID:** `anthropic`

#### Supported Models

| Model                        | Vision | Tools | Context Window | Best For                      |
| ---------------------------- | ------ | ----- | -------------- | ----------------------------- |
| `claude-3-5-sonnet-20241022` | ✅     | ✅    | 200k           | Best balance of speed/quality |
| `claude-3-5-haiku-20241022`  | ✅     | ✅    | 200k           | Fast, cost-effective          |
| `claude-3-opus-20240229`     | ✅     | ✅    | 200k           | Most capable                  |
| `claude-3-sonnet-20240229`   | ✅     | ✅    | 200k           | Balanced (legacy)             |
| `claude-3-haiku-20240307`    | ✅     | ✅    | 200k           | Fast (legacy)                 |
| `claude-haiku-4-5-20251001`  | ✅     | ✅    | 200k           | Latest fast model             |

#### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-your-key      # Required
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Optional
```

#### Known Limitations

- No free tier (requires billing)
- Strong safety filtering for sensitive content
- May be more verbose than other providers

#### Cost Estimates (per 1M tokens)

| Model             | Input  | Output |
| ----------------- | ------ | ------ |
| Claude 3.5 Sonnet | $3.00  | $15.00 |
| Claude 3.5 Haiku  | $0.25  | $1.25  |
| Claude 3 Opus     | $15.00 | $75.00 |

---

### Google AI Studio

**Provider ID:** `google-ai`

#### Supported Models

| Model                   | Vision | Tools | Context Window | Best For             |
| ----------------------- | ------ | ----- | -------------- | -------------------- |
| `gemini-2.5-pro`        | ✅     | ✅    | 1M+            | Complex tasks        |
| `gemini-2.5-flash`      | ✅     | ✅    | 1M+            | Fast, cost-effective |
| `gemini-2.5-flash-lite` | ✅     | ✅    | 1M+            | Ultra-fast           |
| `gemini-1.5-pro`        | ✅     | ✅    | 2M             | Long context         |
| `gemini-1.5-flash`      | ✅     | ✅    | 1M             | Balanced             |

#### Environment Variables

```bash
GOOGLE_AI_API_KEY=your-api-key         # Required
# or
GOOGLE_GENERATIVE_AI_API_KEY=your-key  # Alternative
GOOGLE_AI_MODEL=gemini-2.5-flash       # Optional
```

#### Known Limitations

- Rate limits on free tier (15 requests/min)
- Some domain-specific keywords may trigger filtering
- Avoid deprecated models (e.g., `gemini-2.5-pro-preview-05-06`)

#### Cost Estimates (per 1M tokens)

| Model            | Input              | Output            |
| ---------------- | ------------------ | ----------------- |
| Gemini 2.5 Pro   | Free tier / $1.25  | Free tier / $5.00 |
| Gemini 2.5 Flash | Free tier / $0.075 | Free tier / $0.30 |

---

### Google Vertex AI

**Provider ID:** `vertex`

#### Supported Models

| Model                        | Vision | Tools | Context Window | Best For           |
| ---------------------------- | ------ | ----- | -------------- | ------------------ |
| `gemini-2.5-pro`             | ✅     | ✅    | 1M+            | Enterprise Gemini  |
| `gemini-2.5-flash`           | ✅     | ✅    | 1M+            | Fast enterprise    |
| `claude-sonnet-4@20250514`   | ✅     | ✅    | 200k           | Claude 4 via GCP   |
| `claude-3-5-sonnet-20241022` | ✅     | ✅    | 200k           | Claude 3.5 via GCP |

**Note:** Model naming formats vary by source provider. Vertex-specific Claude models use `@` format, while native formats use `-`.

#### Environment Variables

```bash
# Method 1: Service Account File (Recommended)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Method 2: Service Account JSON String
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Method 3: Individual Variables
GOOGLE_AUTH_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_AUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Required for all methods
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-east5         # Optional
VERTEX_MODEL_ID=gemini-2.5-flash        # Optional
```

#### Known Limitations

- Complex authentication setup (15+ minutes)
- Requires GCP account and project
- Region-specific model availability

---

### AWS Bedrock

**Provider ID:** `bedrock`

#### Supported Models

| Model                         | Vision | Tools | Context Window | Best For      |
| ----------------------------- | ------ | ----- | -------------- | ------------- |
| `anthropic.claude-3-7-sonnet` | ✅     | ✅    | 200k           | Latest Claude |
| `anthropic.claude-3-5-sonnet` | ✅     | ✅    | 200k           | Claude 3.5    |
| `anthropic.claude-3-sonnet`   | ✅     | ✅    | 200k           | Claude 3      |
| `anthropic.claude-3-haiku`    | ✅     | ✅    | 200k           | Fast Claude   |
| `amazon.titan-text-*`         | ❌     | ✅    | 8k             | AWS native    |
| `meta.llama3-*`               | ❌     | ⚠️    | 8k             | Open source   |

#### Environment Variables

```bash
AWS_ACCESS_KEY_ID=your-access-key      # Required
AWS_SECRET_ACCESS_KEY=your-secret-key  # Required
AWS_SESSION_TOKEN=your-token           # Optional (for temp credentials)
AWS_REGION=us-east-2                   # Required
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet  # Optional
```

#### Known Limitations

- Complex AWS IAM setup required
- Model access must be enabled in AWS console
- Region-specific model availability
- Higher latency due to enterprise security layers

---

### Azure OpenAI

**Provider ID:** `azure`

#### Supported Models

| Model         | Vision | Tools | Context Window | Best For        |
| ------------- | ------ | ----- | -------------- | --------------- |
| `gpt-4o`      | ✅     | ✅    | 128k           | General purpose |
| `gpt-4o-mini` | ✅     | ✅    | 128k           | Cost-effective  |
| `gpt-4-turbo` | ✅     | ✅    | 128k           | Complex tasks   |
| `gpt-4`       | ❌     | ✅    | 8k             | Enterprise      |

#### Environment Variables

```bash
AZURE_OPENAI_API_KEY=your-32-char-hex-key  # Required
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com  # Required
AZURE_OPENAI_MODEL=gpt-4o                   # Optional
AZURE_OPENAI_DEPLOYMENT=your-deployment     # Optional
AZURE_API_VERSION=2024-02-15-preview        # Optional
```

#### Known Limitations

- **PDF not supported** - Model does not support file content type
- Most complex setup (20+ minutes)
- Requires Azure subscription and deployment creation
- Use Vertex AI or Google AI Studio for PDF processing

---

### LiteLLM

**Provider ID:** `litellm`

#### Supported Models

Access 100+ models from all providers through unified proxy:

```bash
# Format: provider/model-name
openai/gpt-4o
anthropic/claude-3-5-sonnet
google/gemini-2.5-flash
mistral/mistral-large
vertex_ai/gemini-pro
```

#### Environment Variables

```bash
LITELLM_BASE_URL=http://localhost:4000  # Required
LITELLM_API_KEY=sk-anything             # Required
LITELLM_MODEL=openai/gpt-4o-mini        # Optional
LITELLM_TIMEOUT=60000                   # Optional
```

#### Known Limitations

- Requires running LiteLLM proxy server
- Capability depends on underlying provider
- Additional latency from proxy layer

---

### AWS SageMaker

**Provider ID:** `sagemaker`

#### Features

- Deploy custom trained models
- Full control over model versions
- Enterprise-grade infrastructure

#### Environment Variables

```bash
AWS_ACCESS_KEY_ID=your-access-key       # Required
AWS_SECRET_ACCESS_KEY=your-secret-key   # Required
AWS_REGION=us-east-1                    # Required
SAGEMAKER_DEFAULT_ENDPOINT=your-endpoint  # Required
SAGEMAKER_TIMEOUT=30000                 # Optional
SAGEMAKER_MAX_RETRIES=3                 # Optional
```

#### Known Limitations

- Requires existing SageMaker endpoint
- Feature support depends on deployed model
- Additional infrastructure costs

---

### Mistral AI

**Provider ID:** `mistral`

#### Supported Models

| Model            | Vision | Tools | Context Window | Best For         |
| ---------------- | ------ | ----- | -------------- | ---------------- |
| `mistral-large`  | ❌     | ✅    | 32k            | Most capable     |
| `mistral-medium` | ✅     | ✅    | 32k            | Balanced         |
| `mistral-small`  | ✅     | ✅    | 32k            | Fast, economical |
| `pixtral-12b`    | ✅     | ❌    | 32k            | Vision-focused   |
| `pixtral-large`  | ✅     | ❌    | 32k            | Vision (larger)  |

#### Environment Variables

```bash
MISTRAL_API_KEY=your-api-key            # Required
MISTRAL_MODEL=mistral-small             # Optional
MISTRAL_ENDPOINT=https://api.mistral.ai # Optional
```

#### Known Limitations

- **PDF not supported** - API does not support file content parts
- Smaller context windows than competitors
- Less ecosystem support

---

### Hugging Face

**Provider ID:** `huggingface`

#### Features

- Access to 100,000+ open-source models
- Free tier available
- Community-driven ecosystem

#### Environment Variables

```bash
HUGGINGFACE_API_KEY=hf_your-key         # Required
# or
HF_TOKEN=hf_your-key                    # Alternative
HUGGINGFACE_MODEL=microsoft/DialoGPT-large  # Optional
```

#### Known Limitations

- Tool support varies by model
- PDF not supported
- Variable quality across models
- Cold start delays for less popular models
- Rate limits on free tier

---

### Ollama

**Provider ID:** `ollama`

#### Supported Models (Local)

| Model              | Vision | Tools | Best For         |
| ------------------ | ------ | ----- | ---------------- |
| `llama4:scout`     | ✅     | ✅    | Best local model |
| `llama3.2-vision`  | ✅     | ⚠️    | Vision tasks     |
| `gemma3:27b`       | ✅     | ✅    | Vision + tools   |
| `mistral-small3.1` | ✅     | ✅    | Fast local       |
| `llava`            | ✅     | ❌    | Vision-focused   |

#### Environment Variables

```bash
OLLAMA_BASE_URL=http://localhost:11434  # Optional
OLLAMA_MODEL=llama3.2:latest            # Optional
OLLAMA_TIMEOUT=60000                    # Optional
```

#### Known Limitations

- Requires local installation and running service
- Performance depends on local hardware
- Tool support varies significantly by model
- No cloud option (100% local)

---

### OpenAI Compatible

**Provider ID:** `openai-compatible`

#### Use Cases

- OpenRouter
- vLLM
- LiteLLM proxy
- Custom OpenAI-compatible endpoints

#### Environment Variables

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.openrouter.ai/api/v1  # Required
OPENAI_COMPATIBLE_API_KEY=sk-or-v1-your-key                  # Required
OPENAI_COMPATIBLE_MODEL=openai/gpt-4o-mini                   # Optional
```

#### Known Limitations

- Capability depends on underlying endpoint
- Auto-discovery of available models

---

## Feature Compatibility Summary

### Multimodal Support (Vision)

**Full Support:** OpenAI, Anthropic, Google AI Studio, Vertex AI, Bedrock, Mistral (select models)

**Partial Support:** Ollama (model-dependent), Hugging Face (model-dependent)

**Vision-capable models must be explicitly selected for image processing.**

### PDF Processing

| Provider         | PDF Support | Notes                         |
| ---------------- | ----------- | ----------------------------- |
| Google AI Studio | ✅          | Native visual analysis        |
| Vertex AI        | ✅          | Native visual analysis        |
| Anthropic        | ✅          | Native support                |
| Bedrock          | ✅          | Via Claude models             |
| OpenAI           | ✅          | Supported                     |
| LiteLLM          | ✅          | Via underlying providers      |
| Azure OpenAI     | ❌          | Model architecture limitation |
| Mistral          | ❌          | API limitation                |

### Tool/Function Calling

**Full Support:** OpenAI, Anthropic, Google AI, Vertex, Bedrock, Azure, LiteLLM, Mistral

**Partial Support:** Ollama (model-dependent), Hugging Face (model-dependent)

**Not Supported:** o1 models (OpenAI)

---

## Timeout Recommendations

| Provider     | Recommended Timeout | Notes                        |
| ------------ | ------------------- | ---------------------------- |
| OpenAI       | 30-60s              | Longer for complex prompts   |
| Anthropic    | 30-60s              | May be verbose               |
| Google AI    | 30s                 | Generally fast               |
| Vertex AI    | 60s                 | Enterprise security overhead |
| Bedrock      | 60s                 | AWS infrastructure           |
| Azure        | 30-60s              | Similar to OpenAI            |
| LiteLLM      | 60s                 | Proxy overhead               |
| SageMaker    | 30s                 | Custom endpoints             |
| Mistral      | 30s                 | Generally fast               |
| Hugging Face | 120s                | Cold starts possible         |
| Ollama       | 60s                 | Hardware-dependent           |

---

## Rate Limits

| Provider         | Typical Limits     | Notes                  |
| ---------------- | ------------------ | ---------------------- |
| OpenAI           | 30,000-90,000 TPM  | Varies by tier         |
| Anthropic        | 40,000-100,000 TPM | Varies by tier         |
| Google AI Studio | 15 req/min (free)  | Higher on paid         |
| Vertex AI        | High               | Enterprise quotas      |
| Bedrock          | High               | AWS quotas             |
| Azure            | High               | Enterprise quotas      |
| Mistral          | Medium             | GDPR compliant         |
| Hugging Face     | Low (free tier)    | Higher on Pro          |
| Ollama           | None               | Local resource limited |

---

## Quick Selection Guide

### By Use Case

| Use Case             | Recommended Provider      | Reason                 |
| -------------------- | ------------------------- | ---------------------- |
| Prototyping          | Google AI Studio          | Free tier, fast setup  |
| Production (General) | OpenAI, Anthropic         | Proven stability       |
| Enterprise           | Vertex AI, Bedrock, Azure | SLA, compliance        |
| Privacy-Critical     | Ollama                    | 100% local             |
| EU Compliance        | Mistral AI                | GDPR, European hosting |
| Multi-Provider       | LiteLLM                   | 100+ model access      |
| Custom Models        | SageMaker                 | Full control           |
| Research             | Hugging Face              | 100,000+ models        |

### By Feature Need

| Need              | Best Providers                            |
| ----------------- | ----------------------------------------- |
| Vision/Images     | OpenAI, Anthropic, Google AI, Vertex      |
| PDF Processing    | Google AI, Vertex, Anthropic, Bedrock     |
| Long Context      | Google AI, Vertex (1M+ tokens)            |
| Tool Calling      | OpenAI, Anthropic, Google AI, Mistral     |
| Streaming         | All providers                             |
| Cost Optimization | Google AI (free), Ollama (local), Mistral |

---

## See Also

- [Provider Comparison Guide](../reference/provider-comparison.md) - Use case recommendations
- [Provider Behavior Guide](../provider-behavior.md) - Provider-specific quirks
- [Provider Feature Compatibility](../reference/provider-feature-compatibility.md) - Test results
- [Getting Started - Provider Setup](../getting-started/provider-setup.md) - Setup guides
- [Troubleshooting](../reference/troubleshooting.md) - Common issues

---

_This document is maintained as part of the NeuroLink AI platform. For updates or corrections, please open an issue in the [GitHub repository](https://github.com/juspay/neurolink)._
