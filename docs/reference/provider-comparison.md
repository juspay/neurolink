# AI Provider Comparison Guide

**Last Updated:** February 28, 2026
**NeuroLink Version:** 9.14.0

Complete comparison of all 17 AI providers supported by NeuroLink, including capabilities, pricing, and use case recommendations.

---

## Complete Overview Matrix

| Provider          | Text | Stream | Tools | Vision | PDF | Thinking | Struct Out | Free Tier | Setup Time |
| ----------------- | ---- | ------ | ----- | ------ | --- | -------- | ---------- | --------- | ---------- |
| OpenAI            | ✓    | ✓      | ✓     | ✓      | ✗   | ✗        | ✓          | ✗         | 2 min      |
| Anthropic ^1^     | ✓    | ✓      | ✓     | ✓      | ✓   | ✓        | ✓          | ⚠️        | 2 min      |
| Google AI Studio  | ✓    | ✓      | ✓     | ✓      | ✓   | ✓        | ⚠️         | ✓         | 2 min      |
| Google Vertex     | ✓    | ✓      | ✓     | ✓      | ✓   | ✓        | ⚠️         | ✗         | 15 min     |
| Amazon Bedrock    | ✓    | ✓      | ✓     | ⚠️     | ✓   | ✗        | ✓          | ✗         | 10 min     |
| Amazon SageMaker  | ✓    | ⚠️     | ✓     | ✗      | ✗   | ✗        | ✗          | ✗         | 30 min     |
| Azure OpenAI      | ✓    | ✓      | ✓     | ✓      | ✗   | ✗        | ✓          | ✗         | 20 min     |
| Mistral           | ✓    | ✓      | ✓     | ⚠️     | ✗   | ✗        | ✓          | ✓         | 2 min      |
| HuggingFace       | ✓    | ✓      | ⚠️    | ✗      | ✗   | ✗        | ✗          | ✓         | 2 min      |
| LiteLLM           | ✓    | ✓      | ✓     | ⚠️     | ✗   | ✗        | ✓          | ⚠️        | 5 min      |
| Ollama            | ✓    | ✓      | ✓     | ⚠️     | ✗   | ✗        | ✗          | ✓         | 5 min      |
| OpenAI Compatible | ✓    | ✓      | ✓     | ⚠️     | ✗   | ✗        | ✓          | ⚠️        | 5 min      |
| OpenRouter        | ✓    | ✓      | ⚠️    | ⚠️     | ✗   | ✗        | ✓          | ⚠️        | 2 min      |
| DeepSeek          | ✓    | ✓      | ✓     | ✗      | ✗   | ✓        | ✓          | ✗         | 2 min      |
| NVIDIA NIM        | ✓    | ✓      | ✓     | ⚠️     | ✗   | ✓        | ✓          | ✗         | 5 min      |
| LM Studio         | ✓    | ✓      | ⚠️    | ⚠️     | ✗   | ⚠️       | ⚠️         | ✓         | 5 min      |
| llama.cpp         | ✓    | ✓      | ⚠️    | ⚠️     | ✗   | ⚠️       | ⚠️         | ✓         | 10 min     |

**Legend:**

- ✓ Full Support
- ⚠️ Partial/Model-Dependent
- ✗ Not Supported

^1^ Anthropic supports both API Key and OAuth authentication. Free tier access is available via Claude subscription (OAuth). See [Anthropic Deep Dive](#2-anthropic) for details.

---

## Pricing Comparison

### Pay-per-Token Providers

| Provider             | Input (per 1M tokens) | Output (per 1M tokens) | Vision         | Best Value Model              |
| -------------------- | --------------------- | ---------------------- | -------------- | ----------------------------- |
| **OpenAI**           | $2.50 - $60.00        | $10.00 - $180.00       | $5.00 - $60.00 | GPT-4o-mini: $0.15/$0.60      |
| **Anthropic** ^2^    | $3.00 - $15.00        | $15.00 - $75.00        | Same           | Claude Haiku: $0.25/$1.25     |
| **Google AI Studio** | FREE - $7.00          | FREE - $21.00          | FREE - $7.00   | Gemini 2.5 Flash: FREE        |
| **Google Vertex**    | $0.35 - $35.00        | $1.05 - $105.00        | $0.35 - $35.00 | Gemini 2.5 Flash: $0.35/$1.05 |
| **Amazon Bedrock**   | $3.00 - $15.00        | $15.00 - $75.00        | $3.00 - $15.00 | Claude Haiku: $0.25/$1.25     |
| **Azure OpenAI**     | $2.50 - $60.00        | $10.00 - $180.00       | $5.00 - $60.00 | GPT-4o-mini: $0.15/$0.60      |
| **Mistral**          | $0.25 - $8.00         | $0.75 - $24.00         | $0.25 - $8.00  | Mistral Small: $0.20/$0.60    |
| **HuggingFace**      | FREE - $1.00          | FREE - $1.00           | N/A            | Qwen 2.5 72B: FREE            |
| **OpenRouter**       | $0.00 - $60.00        | $0.00 - $180.00        | Varies         | Many free models              |
| **DeepSeek**         | $0.14 - $2.19         | $0.28 - $8.75          | N/A            | deepseek-chat: $0.14/$0.28    |
| **NVIDIA NIM**       | Varies by model       | Varies by model        | Varies         | Free credits for new users    |

^2^ Anthropic also offers subscription-based pricing as an alternative to per-token API pricing: Free tier (limited), Pro ($20/mo), Max ($100+/mo with 5x-20x usage). NeuroLink supports both API key and OAuth (subscription) authentication. See [Anthropic Deep Dive](#2-anthropic).

### Self-Hosted / Custom Pricing

| Provider              | Model  | Cost Structure           | Notes                                             |
| --------------------- | ------ | ------------------------ | ------------------------------------------------- |
| **Amazon SageMaker**  | Custom | Instance hours + storage | Varies by instance type (ml.g5.xlarge: ~$1.41/hr) |
| **LiteLLM**           | Proxy  | Backend provider costs   | No additional fee, proxy overhead only            |
| **Ollama**            | Local  | Hardware costs only      | FREE (uses local compute)                         |
| **OpenAI Compatible** | Custom | Backend-dependent        | Varies by endpoint provider                       |
| **LM Studio**         | Local  | Hardware costs only      | FREE (uses local compute)                         |
| **llama.cpp**         | Local  | Hardware costs only      | FREE (uses local compute)                         |

### Free Tier Details

**Anthropic (via Claude subscription):**

- Free tier available via OAuth authentication (claude.ai account)
- Limited daily messages and lower rate limits
- Access to Claude Haiku models
- No API key required (uses OAuth 2.0 flow)

**Google AI Studio:**

- 15 requests/minute
- 1,500 requests/day
- Up to 1M tokens/day
- Gemini 2.5 Flash completely FREE

**HuggingFace:**

- Rate-limited free tier
- 1,000 requests/month on free models
- Inference API access

**Mistral:**

- Limited free tier for testing
- Mistral Small free quota

**Ollama:**

- Completely FREE
- Uses local compute
- No API limits

**LM Studio:**

- Completely FREE
- Uses local compute (GPU or CPU)
- No API limits or network dependency
- Requires LM Studio desktop app

**llama.cpp:**

- Completely FREE
- Uses local compute (GPU or CPU)
- No API limits or network dependency
- Requires llama-server binary

**OpenRouter:**

- Many FREE models available:
  - Google Gemini 2.0 Flash (free)
  - Meta Llama 3.3 70B (free)
  - Qwen models (free)

---

## Detailed Feature Comparison

### Text Generation

**All providers support text generation**, but quality varies:

**Tier 1 (Highest Quality):**

- OpenAI GPT-4o, GPT-5 series
- Anthropic Claude 4.5 series
- Google Gemini 3 Pro

**Tier 2 (High Quality):**

- Azure OpenAI (same as OpenAI)
- Google Gemini 2.5 Pro
- Anthropic Claude 4.0 Sonnet

**Tier 3 (Good Quality):**

- Mistral Large
- Amazon Bedrock (Claude models)
- OpenRouter (Claude/GPT-4 routing)

**Tier 4 (Variable Quality):**

- HuggingFace (model-dependent)
- Ollama (model-dependent)
- LiteLLM (backend-dependent)

---

### Streaming Support

**Full Streaming (Real-time SSE):**

- ✓ OpenAI
- ✓ Anthropic
- ✓ Google AI Studio
- ✓ Google Vertex
- ✓ Amazon Bedrock
- ✓ Azure OpenAI
- ✓ Mistral
- ✓ HuggingFace
- ✓ LiteLLM
- ✓ Ollama
- ✓ OpenAI Compatible
- ✓ OpenRouter
- ✓ DeepSeek
- ✓ NVIDIA NIM
- ✓ LM Studio
- ✓ llama.cpp

**Partial/Limited Streaming:**

- ⚠️ Amazon SageMaker (not fully implemented in v8.26.1)

---

### Tool Calling / Function Calling

**Native Full Support:**

- ✓ OpenAI - Industry-leading function calling
- ✓ Anthropic - Advanced tool use, parallel execution
- ✓ Azure OpenAI - Same as OpenAI
- ✓ Mistral - Native function calling
- ✓ Google Vertex - Gemini + Claude models
- ✓ Google AI Studio - Gemini models
- ✓ Amazon Bedrock - Converse API tool support
- ✓ LiteLLM - Proxies to backend providers
- ✓ DeepSeek - Both deepseek-chat and deepseek-reasoner

**Model-Dependent Support:**

- ⚠️ NVIDIA NIM - Depends on hosted model (Llama 3.x: yes; embedding-only models: no)
- ⚠️ LM Studio - Depends on loaded model (Llama 3.1+, Mistral 7B Instruct v0.3, etc.)
- ⚠️ llama.cpp - Requires `--jinja` server flag; depends on loaded model
- ⚠️ HuggingFace - Only specific models:
  - Llama 3.1+ series
  - Hermes 3 models
  - CodeLlama 34B
  - Mistral 7B Instruct v0.3
- ⚠️ Ollama - Only compatible models:
  - Llama 3.1+
  - Gemma 3 with tool training
- ⚠️ OpenRouter - Check model capabilities:
  - Claude models: ✓
  - GPT-4 models: ✓
  - Gemini models: ✓
  - Many others vary
- ⚠️ OpenAI Compatible - Depends on backend
- ⚠️ Amazon SageMaker - Depends on custom endpoint

---

### Vision / Multimodal Capabilities

**Native Vision Support:**

**Tier 1 (Best Vision):**

- **OpenAI** - GPT-4o, GPT-5 series, O-series
  - 10 images max
  - PNG, JPEG, WEBP, GIF
- **Anthropic** - Claude 4.5 Sonnet/Haiku, Claude 4.0 Opus/Sonnet
  - 20 images max
  - Excellent vision quality
- **Google Vertex/AI Studio** - Gemini 2.5+, 3.x
  - 16 images max
  - Native multimodal architecture

**Tier 2 (Good Vision):**

- **Azure OpenAI** - Same models as OpenAI
  - 10 images max
- **Mistral** - Small 2506, Pixtral
  - 10 images max (conservative)

**Model-Dependent Vision:**

- ⚠️ **LiteLLM** - Depends on backend (e.g., GPT-4o via LiteLLM = vision)
- ⚠️ **Ollama** - LLaVA, Llama 3.2 Vision, Gemini models
- ⚠️ **OpenAI Compatible** - Backend-dependent
- ⚠️ **OpenRouter** - Model-dependent (Claude, GPT-4o, Gemini support vision)
- ⚠️ **Amazon Bedrock** - Claude models support vision
- ⚠️ **NVIDIA NIM** - Depends on hosted model (e.g., Phi-3-vision, Llama 3.2 Vision)
- ⚠️ **LM Studio** - Depends on loaded model (LLaVA, Llama 3.2 Vision, Qwen-VL, etc.)
- ⚠️ **llama.cpp** - Depends on loaded model (LLaVA, Llama 3.2 Vision, etc.)

**No Vision Support:**

- ✗ HuggingFace
- ✗ Amazon SageMaker
- ✗ DeepSeek (API does not accept image input)

---

### PDF Document Processing

**Native PDF Support:**

- ✓ **Anthropic** - Native PDF understanding (best)
- ✓ **Google AI Studio** - Gemini PDF processing
- ✓ **Google Vertex** - Gemini + Claude PDF support
- ✓ **Amazon Bedrock** - Claude models

**No PDF Support (Requires Preprocessing):**

- ✗ OpenAI
- ✗ Azure OpenAI
- ✗ Mistral
- ✗ HuggingFace
- ✗ LiteLLM
- ✗ Ollama
- ✗ OpenAI Compatible
- ✗ OpenRouter
- ✗ Amazon SageMaker
- ✗ DeepSeek
- ✗ NVIDIA NIM
- ✗ LM Studio
- ✗ llama.cpp

---

### Extended Thinking / Reasoning

**Native Extended Thinking:**

- ✓ **Anthropic** - All Claude 4.0+ models (best)
  - Claude Sonnet 4, Opus 4, Opus 4.1, Sonnet 4.5, Opus 4.5, Haiku 4.5, Sonnet 4.6, Opus 4.6
  - Thinking levels: minimal, low, medium, high
  - Transparent reasoning process
  - Available on Pro and Max subscription tiers (not Free)
- ✓ **Google AI Studio** - Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 3 Flash, Gemini 3.1 Pro
  - Thinking levels: minimal, low, medium, high
  - Configurable thinking budget
- ✓ **Google Vertex** - Same as AI Studio (Gemini only, not Claude)

**Native Extended Thinking (continued):**

- ✓ **DeepSeek** - deepseek-reasoner (R1) model exposes chain-of-thought natively; deepseek-chat supports opt-in thinking mode
- ✓ **NVIDIA NIM** - Hosted Nemotron-Reasoning and DeepSeek-R1 models; controlled via `thinkingLevel` option

**Model-Dependent Thinking:**

- ⚠️ **LM Studio** - Depends on loaded model (Qwen3, DeepSeek-R1-distill variants expose reasoning)
- ⚠️ **llama.cpp** - Depends on loaded model (DeepSeek-R1-distill GGUF variants expose reasoning)

**No Extended Thinking:**

- ✗ OpenAI (standard reasoning only)
- ✗ Azure OpenAI
- ✗ Amazon Bedrock
- ✗ Amazon SageMaker
- ✗ Mistral
- ✗ HuggingFace
- ✗ LiteLLM
- ✗ Ollama
- ✗ OpenAI Compatible
- ✗ OpenRouter

---

### Structured Output / JSON Schema

**Full Support (Tools + Schema Together):**

- ✓ **OpenAI** - Native JSON mode
- ✓ **Anthropic** - Full schema + tools
- ✓ **Azure OpenAI** - Same as OpenAI
- ✓ **Amazon Bedrock** - Schema validation
- ✓ **Mistral** - JSON schema support
- ✓ **LiteLLM** - Proxies to backend
- ✓ **OpenAI Compatible** - OpenAI-compatible endpoints
- ✓ **OpenRouter** - Model-dependent
- ✓ **DeepSeek** - JSON schema support via OpenAI-compatible API

**Partial Support (Tools OR Schema, Not Both):**

- ⚠️ **Google AI Studio** - ❌ Cannot combine
  - Must use `disableTools: true` with schemas
  - Gemini API limitation
- ⚠️ **Google Vertex** - ❌ Cannot combine (Gemini models only)
  - Claude models on Vertex CAN combine
  - Gemini models have same limitation as AI Studio

**Model-Dependent Structured Output:**

- ⚠️ **NVIDIA NIM** - Model-dependent reliability; capable frontier models work well
- ⚠️ **LM Studio** - Model-dependent reliability; small local models may struggle with strict schemas
- ⚠️ **llama.cpp** - Model-dependent reliability; small local models may struggle with strict schemas

**No Structured Output:**

- ✗ HuggingFace
- ✗ Ollama
- ✗ Amazon SageMaker

---

## Provider Deep Dive

### 1. OpenAI

**Provider ID:** `openai`
**Default Model:** `gpt-4o-mini`

**Strengths:**

- Industry-leading model quality
- Best-in-class developer experience
- Extensive ecosystem and integrations
- Excellent documentation
- Reliable uptime and performance

**Weaknesses:**

- Expensive at scale
- No free tier
- No PDF support
- No extended thinking

**Best For:**

- Production applications requiring highest quality
- Critical customer-facing features
- Complex reasoning tasks
- When budget allows premium pricing

**Pricing:**

- GPT-4o: $2.50/$10.00 per 1M tokens
- GPT-4o-mini: $0.15/$0.60 per 1M tokens
- GPT-5 series: $15.00-$60.00 input, $45.00-$180.00 output

---

### 2. Anthropic

**Provider ID:** `anthropic`
**Default Model:** `claude-sonnet-4-6`
**Auth Methods:** API Key, OAuth 2.0 (unique among providers)

**Strengths:**

- **Extended thinking** - Best reasoning capabilities
- **Native PDF support** - Document understanding
- **Dual auth support** - API key for developers, OAuth for subscription users
- **Subscription tiers** - Free, Pro ($20/mo), Max ($100+/mo) as alternatives to per-token pricing
- 200K token context window
- Strong safety features
- Excellent for analysis and research

**Weaknesses:**

- Higher cost than some alternatives (API pricing)
- Smaller ecosystem than OpenAI
- Limited regional availability
- Subscription tiers have model access restrictions (e.g., Opus requires Max tier)

**Best For:**

- Complex reasoning and analysis
- Document processing workflows
- Agentic workflows with tools
- When extended thinking is valuable
- Subscription users who prefer flat-rate pricing over per-token costs

**Pricing:**

_Per-Token API Pricing:_

- Claude Haiku 4.5: $0.25/$1.25 per 1M tokens
- Claude Sonnet 4.5: $3.00/$15.00 per 1M tokens
- Claude Opus 4.5: $15.00/$75.00 per 1M tokens

_Subscription Pricing (via OAuth):_

- **Free**: Limited daily messages, Sonnet access
- **Pro** ($20/mo): Higher limits, priority access, extended thinking
- **Max** ($100+/mo): 5x-20x usage, Opus access, highest rate limits

---

### 3. Google AI Studio

**Provider ID:** `google-ai` / `googleAiStudio`
**Default Model:** `gemini-2.5-flash`

**Strengths:**

- **Generous FREE tier** - 1M tokens/day free
- **Extended thinking** - Gemini 2.5+, 3.0
- **PDF support** - Native document processing
- Fast inference (Gemini Flash models)
- Simple setup (just API key)

**Weaknesses:**

- Cannot combine tools + JSON schema (Gemini limitation)
- Rate limits on free tier
- Newer platform (less mature than OpenAI)

**Best For:**

- Startups and developers (free tier)
- Prototyping and experimentation
- Budget-conscious production apps
- When extended thinking + PDF support needed

**Pricing:**

- Gemini 2.5 Flash: **FREE** (up to 1M tokens/day)
- Gemini 2.5 Pro: $1.25/$5.00 per 1M tokens
- Gemini 3 Flash: **FREE** (up to 1M tokens/day)
- Gemini 3 Pro: $7.00/$21.00 per 1M tokens

---

### 4. Google Vertex AI

**Provider ID:** `vertex`
**Default Model:** `claude-sonnet-4-6`

**Strengths:**

- **Dual provider** - Gemini + Claude models
- Enterprise-grade reliability
- GCP integration
- Multiple authentication methods
- Claude models support tools + schema together

**Weaknesses:**

- Complex setup (service accounts)
- Gemini models cannot combine tools + schema
- Higher latency than AI Studio
- Requires GCP project

**Best For:**

- Enterprise Google Cloud users
- When you need both Gemini AND Claude
- Production deployments requiring SLAs
- Regulated industries

**Pricing:**

- Gemini 2.5 Flash: $0.35/$1.05 per 1M tokens
- Gemini 3 Pro: $7.00/$21.00 per 1M tokens
- Claude on Vertex: Same as Bedrock pricing

---

### 5. Amazon Bedrock

**Provider ID:** `bedrock`
**Default Model:** env-based (`BEDROCK_MODEL`); recommend `anthropic.claude-sonnet-4-6`

**Strengths:**

- Multiple model providers (Claude, Titan, Cohere, Llama)
- AWS integration
- Enterprise security and compliance
- Pay-as-you-go pricing

**Weaknesses:**

- Complex AWS setup
- Regional model availability varies
- No extended thinking support
- Requires IAM configuration

**Best For:**

- AWS-based enterprises
- Multi-model strategies
- Compliance-heavy industries (HIPAA, SOC2)
- When you need Claude + Llama + others

**Pricing:**

- Claude Haiku: $0.25/$1.25 per 1M tokens
- Claude Sonnet: $3.00/$15.00 per 1M tokens
- Claude Opus: $15.00/$75.00 per 1M tokens
- Amazon Titan: $0.30/$0.40 per 1M tokens

---

### 6. Amazon SageMaker

**Provider ID:** `sagemaker`
**Default Model:** env-based (`SAGEMAKER_MODEL`)

**Strengths:**

- Custom model deployment
- Fine-tuned models
- Enterprise control
- Autoscaling infrastructure

**Weaknesses:**

- **Streaming not fully implemented** (v8.26.1)
- Complex setup (requires SageMaker endpoints)
- Higher operational overhead
- No multimodal support

**Best For:**

- Custom fine-tuned models
- Enterprise ML teams
- When you need full model control
- Specialized domain models

**Pricing:**

- Instance-based: ml.g5.xlarge ~$1.41/hour
- ml.g5.2xlarge ~$2.03/hour
- Plus storage and data transfer costs

---

### 7. Azure OpenAI

**Provider ID:** `azure`
**Default Model:** `gpt-4o-mini`

**Strengths:**

- Enterprise security and compliance
- Microsoft ecosystem integration
- SLA guarantees
- Same models as OpenAI

**Weaknesses:**

- Most complex setup of all providers
- Requires Azure subscription
- Deployment configuration required
- Limited regional availability

**Best For:**

- Enterprise Microsoft shops
- When you need SLAs and support
- Azure-based infrastructure
- Regulated industries

**Pricing:**

- Same as OpenAI pricing
- Billed through Azure subscription
- GPT-4o: $2.50/$10.00 per 1M tokens
- GPT-4o-mini: $0.15/$0.60 per 1M tokens

---

### 8. Mistral

**Provider ID:** `mistral`
**Default Model:** `mistral-large-latest`

**Strengths:**

- GDPR compliant (European data centers)
- Competitive pricing
- Vision support (Small 2506+)
- Open-weight models available

**Weaknesses:**

- Smaller model selection than OpenAI
- Less ecosystem support
- Vision only on specific models
- No PDF or extended thinking

**Best For:**

- European compliance needs (GDPR)
- Cost-conscious deployments
- When you prefer European hosting
- Open-source friendly organizations

**Pricing:**

- Mistral Small: $0.20/$0.60 per 1M tokens
- Mistral Medium: $2.50/$7.50 per 1M tokens
- Mistral Large: $8.00/$24.00 per 1M tokens

---

### 9. HuggingFace

**Provider ID:** `huggingface`
**Default Model:** `Qwen/Qwen2.5-72B-Instruct`

**Strengths:**

- Access to 100,000+ models
- Open-source focus
- Community-driven
- Free tier available

**Weaknesses:**

- Variable model quality
- Tool calling only on specific models
- No vision or multimodal
- Rate limits on free tier

**Best For:**

- Research and experimentation
- Open-source projects
- Testing cutting-edge models
- Budget-constrained projects

**Pricing:**

- Free tier: 1,000 requests/month
- Inference API: From FREE to ~$1.00 per 1M tokens
- PRO tier: $9/month for higher limits

---

### 10. LiteLLM

**Provider ID:** `litellm`
**Default Model:** `openai/gpt-4o-mini`

**Strengths:**

- Access to 100+ models via proxy
- Unified interface for all providers
- Cost tracking and analytics
- Load balancing and failover

**Weaknesses:**

- Requires proxy server running
- Adds proxy overhead
- Configuration complexity
- Capabilities depend on backend

**Best For:**

- Multi-provider strategies
- Cost optimization and tracking
- Load balancing across providers
- A/B testing different models

**Pricing:**

- No additional cost (uses backend provider pricing)
- Self-hosted proxy is FREE
- Cloud-hosted option available

---

### 11. Ollama

**Provider ID:** `ollama`
**Default Model:** `llama3.2:latest`

**Strengths:**

- **Completely FREE** (local execution)
- Maximum privacy (no data sent to cloud)
- Works offline
- Fast local inference
- No API rate limits

**Weaknesses:**

- Requires local compute resources
- Model quality varies
- Manual model management
- Vision only on specific models

**Best For:**

- Privacy-critical applications
- Offline/air-gapped environments
- Cost-sensitive projects
- Development and testing

**Pricing:**

- **FREE** (hardware costs only)
- Requires local GPU for best performance
- No API costs or rate limits

---

### 12. OpenAI Compatible

**Provider ID:** `openai-compatible`
**Default Model:** Auto-discovered

**Strengths:**

- Works with any OpenAI-compatible endpoint
- vLLM, FastChat, LocalAI support
- Custom deployment flexibility
- Auto-discovers available models

**Weaknesses:**

- Capabilities entirely backend-dependent
- No standardized capability detection
- Configuration varies by provider
- Authentication varies

**Best For:**

- Custom deployments (vLLM, FastChat)
- Internal model serving
- Private cloud deployments
- When you control the backend

**Pricing:**

- Depends entirely on backend provider
- Self-hosted: Infrastructure costs only
- Cloud-hosted: Provider-specific pricing

---

### 13. OpenRouter

**Provider ID:** `openrouter`
**Default Model:** `anthropic/claude-3-5-sonnet`

**Strengths:**

- Access to 300+ models from 60+ providers
- Many **FREE models** available
- Automatic failover
- Unified API for all models
- Cost tracking

**Weaknesses:**

- Tool support varies by model
- Vision support varies by model
- Credit-based pricing system
- Model availability can change

**Best For:**

- Access to many providers via one API
- Cost optimization (free models available)
- Rapid prototyping
- When you want provider flexibility

**Pricing:**

- **Free models available:**
  - Google Gemini 2.0 Flash: FREE
  - Meta Llama 3.3 70B: FREE
  - Qwen models: FREE
- **Paid models:**
  - Claude 3.5 Sonnet: $3.00/$15.00 per 1M tokens
  - GPT-4o: $2.50/$10.00 per 1M tokens

---

### 14. DeepSeek

**Provider ID:** `deepseek`
**Default Model:** `deepseek-chat`
**Aliases:** `ds`

**Strengths:**

- Very competitive pricing (among the cheapest frontier-quality models)
- deepseek-reasoner (R1) — strong open-weight reasoning model
- OpenAI-compatible API — minimal integration overhead
- Tool calling supported on both models

**Weaknesses:**

- No vision / multimodal support
- Cloud-only (data sent to DeepSeek servers in China — consider for compliance)
- No PDF support

**Best For:**

- Cost-sensitive text and reasoning workloads
- Agentic tool-calling pipelines where budget matters
- Experimenting with open-weight-quality reasoning at low cost

**Pricing:**

- deepseek-chat (V3): ~$0.14/$0.28 per 1M tokens
- deepseek-reasoner (R1): ~$0.55/$2.19 per 1M tokens

---

### 15. NVIDIA NIM

**Provider ID:** `nvidia-nim`
**Default Model:** `meta/llama-3.3-70b-instruct`
**Aliases:** `nvidia`, `nim`

**Strengths:**

- Access to NVIDIA-hosted Llama, Mistral, Nemotron, DeepSeek models
- Thinking/reasoning supported on Nemotron-Reasoning and DeepSeek-R1 models
- Vision supported on vision-capable models (Phi-3-vision, Llama 3.2 Vision)
- OpenAI-compatible API with NIM-specific extras (top_k, min_p, reasoning_budget)
- Graceful retry on 400 errors — drops unsupported extras automatically

**Weaknesses:**

- Tool and vision capability depends entirely on the specific hosted model
- Requires NVIDIA NGC API key
- No PDF support

**Best For:**

- Running NVIDIA-optimized Llama/Mistral/Nemotron models in the cloud
- Reasoning workloads via hosted DeepSeek-R1 or Nemotron
- Developers already in the NVIDIA ecosystem (NGC, DGX Cloud)

**Pricing:**

- Varies by model; new accounts receive free credits
- See https://build.nvidia.com/models for per-model pricing

---

### 16. LM Studio

**Provider ID:** `lm-studio`
**Default Model:** Auto-discovered from running server
**Aliases:** `lmstudio`, `lms`

**Strengths:**

- **Completely FREE** (local execution via LM Studio desktop app)
- Maximum privacy — no data sent to cloud
- Auto-discovers the currently loaded model via `/v1/models`
- Vision supported on compatible models (LLaVA, Llama 3.2 Vision, Qwen-VL, etc.)
- Tool calling supported on compatible models

**Weaknesses:**

- Requires LM Studio app and a loaded model
- Model quality and capability depend entirely on what is loaded
- No PDF support
- Small local models may give inconsistent structured output

**Best For:**

- Privacy-critical local inference
- Offline / air-gapped environments
- Development and experimentation without cloud costs
- Testing multiple open-weight models via a GUI

**Pricing:**

- **FREE** (hardware costs only)
- Requires local GPU for best performance

---

### 17. llama.cpp

**Provider ID:** `llamacpp`
**Default Model:** Auto-discovered from running llama-server
**Aliases:** `llama.cpp`, `llama-cpp`

**Strengths:**

- **Completely FREE** (local execution via llama-server)
- Maximum privacy — no data sent to cloud
- GGUF model support — run quantized models on CPU or GPU
- Auto-discovers loaded model via `/v1/models`
- Vision supported on compatible models (LLaVA, Llama 3.2 Vision)
- Tool calling supported when server started with `--jinja` flag

**Weaknesses:**

- Requires building / downloading llama-server and a GGUF model
- Tool calling requires `--jinja` flag at server startup
- Model quality depends on the GGUF model loaded
- No PDF support
- Small local models may give inconsistent structured output

**Best For:**

- Maximum privacy and air-gapped deployments
- CPU inference without a GPU
- Running heavily quantized models at low resource cost
- Power users who want direct control over model serving

**Pricing:**

- **FREE** (hardware costs only)
- No API costs or rate limits

---

## Use Case Recommendations

### For Startups (Limited Budget)

**🥇 Best Choice: Google AI Studio**

- Generous FREE tier (1M tokens/day)
- Extended thinking support
- PDF processing
- Professional quality

**🥈 Alternative: OpenRouter**

- Many free models
- Access to premium models when needed
- Cost tracking

**🥉 Alternative: Mistral**

- Competitive pricing
- Good quality
- GDPR compliant

---

### For Enterprises

**🥇 Best Choice: Amazon Bedrock**

- Enterprise security (AWS)
- Multiple model providers
- HIPAA/SOC2 compliant
- SLAs available

**🥈 Alternative: Azure OpenAI**

- Microsoft ecosystem integration
- Enterprise security
- SLA guarantees

**🥉 Alternative: Google Vertex**

- GCP integration
- Dual provider (Gemini + Claude)
- Enterprise-grade

---

### For Privacy-Conscious Users

**🥇 Best Choice: Ollama**

- 100% local execution
- No data sent to cloud
- Works offline
- Completely FREE

**🥈 Alternative: LM Studio**

- 100% local execution via desktop app
- No data sent to cloud
- GUI-driven model management

**🥉 Alternative: llama.cpp**

- 100% local execution — even CPU-only deployments
- Maximum control over model serving
- Completely FREE

**Also Consider: Mistral**

- GDPR compliant
- European data centers
- No training on user data

---

### For Developers/Researchers

**🥇 Best Choice: HuggingFace**

- 100,000+ models
- Open-source focus
- Cutting-edge research models
- Community support

**🥈 Alternative: LiteLLM**

- Test multiple providers easily
- Cost tracking
- Unified interface

---

### For Complex Reasoning

**🥇 Best Choice: Anthropic**

- **Extended thinking** (best)
- 200K context window
- Native PDF support
- Advanced tool use

**🥈 Alternative: Google AI Studio**

- Extended thinking (Gemini 2.5+, 3)
- FREE tier
- PDF support

---

### For Multimodal (Vision + Text + PDF)

**🥇 Best Choice: Anthropic**

- Best vision quality (20 images)
- Native PDF support
- Extended thinking

**🥈 Alternative: Google AI Studio**

- Good vision (16 images)
- PDF support
- Extended thinking
- FREE tier

**🥉 Alternative: OpenAI**

- Excellent vision (10 images)
- Industry-leading quality
- No PDF support

---

## Cost Optimization Strategies

### 1. Tier-Based Strategy

```typescript
// Use free tier for development
const devProvider = "google-ai"; // FREE

// Use mid-tier for staging
const stagingProvider = "mistral"; // Low cost

// Use premium for production
const prodProvider = "anthropic"; // High quality
```

### 2. Task-Based Routing

```typescript
// Simple tasks → Cheap models
if (taskComplexity === "simple") {
  provider = "google-ai"; // FREE Gemini Flash
}

// Complex reasoning → Premium models
if (taskComplexity === "complex") {
  provider = "anthropic"; // Extended thinking
}

// Vision tasks → Vision-capable models
if (hasImages) {
  provider = "openai"; // Good vision
}
```

### 3. Hybrid Approach

```typescript
// Use local for privacy-sensitive
if (sensitiveData) {
  provider = "ollama"; // Local, FREE — or "lm-studio" / "llamacpp"
}

// Use cloud for complex tasks
if (needsAdvancedReasoning) {
  provider = "anthropic"; // Extended thinking
}

// Use DeepSeek for cost-efficient reasoning
if (needsReasoningButBudgetConstrained) {
  provider = "deepseek"; // Low-cost frontier-quality reasoning
  model = "deepseek-reasoner";
}
```

---

## Quick Decision Tree

```
Need highest quality?
├─ Yes → OpenAI or Anthropic
└─ No → Continue
    │
    Need extended thinking?
    ├─ Yes → Anthropic (best) or Google AI Studio (free)
    └─ No → Continue
        │
        Need complete privacy?
        ├─ Yes → Ollama / LM Studio / llama.cpp (local, free)
        └─ No → Continue
            │
            Need PDF processing?
            ├─ Yes → Anthropic or Google AI Studio or Vertex
            └─ No → Continue
                │
                On AWS?
                ├─ Yes → Bedrock
                └─ No → Continue
                    │
                    On Azure?
                    ├─ Yes → Azure OpenAI
                    └─ No → Continue
                        │
                        Need free tier?
                        ├─ Yes → Google AI Studio (best) or Anthropic (OAuth) or OpenRouter or HuggingFace
                        └─ No → Continue
                            │
                            Need EU compliance?
                            ├─ Yes → Mistral AI (GDPR)
                            └─ No → Continue
                                │
                                Need many models?
                                ├─ Yes → OpenRouter (300+ models) or HuggingFace (100k+ models)
                                └─ No → OpenAI (industry standard)
```

---

## Security & Compliance

### Most Secure

1. **Ollama** - Completely local, no cloud transmission
2. **Azure OpenAI** - Enterprise security, Microsoft backing
3. **Amazon Bedrock** - AWS security features, HIPAA-ready

### Compliance Certifications

| Provider         | GDPR | HIPAA | SOC2 | ISO 27001 |
| ---------------- | ---- | ----- | ---- | --------- |
| OpenAI           | ✓    | ✓\*   | ✓    | ✓         |
| Anthropic ^3^    | ✓    | ✓\*   | ✓    | ✓         |
| Google AI Studio | ✓    | ✗     | ✓    | ✓         |
| Google Vertex    | ✓    | ✓\*   | ✓    | ✓         |
| Amazon Bedrock   | ✓    | ✓\*   | ✓    | ✓         |
| Azure OpenAI     | ✓    | ✓\*   | ✓    | ✓         |
| Mistral          | ✓    | ✗     | ✓    | ✓         |
| Ollama           | ✓    | ✓     | N/A  | N/A       |

\* HIPAA compliance requires Business Associate Agreement (BAA)

^3^ Anthropic supports API Key and OAuth 2.0 authentication. OAuth uses PKCE flow with automatic token refresh. Credentials stored in `~/.neurolink/tokens.json` with 0600 permissions.

---

## Performance Benchmarks

### Average Latency (Time to First Token)

| Provider         | TTFT (ms) | Tokens/sec | Quality Score |
| ---------------- | --------- | ---------- | ------------- |
| Ollama (local)   | 50-200    | 30-50      | 8.5/10        |
| OpenAI           | 300-800   | 40-60      | 9.5/10        |
| Anthropic        | 400-900   | 35-55      | 9.4/10        |
| Google AI Studio | 300-700   | 45-65      | 9.0/10        |
| Azure OpenAI     | 350-850   | 40-60      | 9.5/10        |
| Mistral          | 300-700   | 40-55      | 8.8/10        |
| OpenRouter       | 400-1000  | 30-50      | 8.5-9.5/10    |

_Note: Benchmarks vary by model, region, and load_

---

## Migration Guide

### From OpenAI to Anthropic

**Why migrate:**

- Extended thinking
- PDF support
- Better for complex analysis
- Subscription-based pricing option (Pro $20/mo, Max $100+/mo) as alternative to per-token

**Code changes:**

```typescript
// Before
const result = await neurolink.generate({
  provider: "openai",
  model: "gpt-4o",
  prompt: "Analyze this document",
});

// After (API key auth - same as before)
const result = await neurolink.generate({
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  prompt: "Analyze this document",
  thinkingLevel: "high", // New capability
});

// After (OAuth subscription auth - auto-detected from stored credentials)
// Run `neurolink auth login --provider anthropic` first to authenticate
const result = await neurolink.generate({
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  prompt: "Analyze this document",
  thinkingLevel: "high",
});
```

### From Paid to Free (Google AI Studio)

**Why migrate:**

- FREE tier (1M tokens/day)
- Extended thinking
- PDF support

**Cost savings:**

- OpenAI GPT-4o: ~$15/day for 1M tokens
- Google AI Studio: **$0/day for 1M tokens**
- **Savings: $450/month**

---

## Conclusion

**Choose based on priorities:**

1. **Budget Priority** → Google AI Studio (free) or OpenRouter (free models) or Anthropic Free tier (via OAuth)
2. **Quality Priority** → OpenAI or Anthropic
3. **Privacy Priority** → Ollama / LM Studio / llama.cpp (local)
4. **Reasoning Priority** → Anthropic (extended thinking) or DeepSeek-R1 (cost-efficient)
5. **Document Priority** → Anthropic or Google AI Studio (PDF support)
6. **Compliance Priority** → Azure OpenAI or Bedrock
7. **Flexibility Priority** → OpenRouter (300+ models) or NVIDIA NIM (curated NVIDIA-hosted models)
8. **Flat-Rate Pricing** → Anthropic subscription (Pro $20/mo, Max $100+/mo)
9. **Zero Cloud Cost** → LM Studio or llama.cpp (local execution)

**NeuroLink Advantage:**

- Switch providers anytime (single line of code)
- Use multiple providers simultaneously
- Test and compare providers easily
- No vendor lock-in

See also:

- [Provider Capabilities Audit](./provider-capabilities-audit.md) - Detailed technical capabilities
- [Provider Selection Wizard](../guides/provider-selection.md) - Interactive decision guide
- [Claude Subscription Support](../features/claude-subscription.md) - OAuth authentication and subscription tiers for Anthropic
