---
title: AI Provider Guides
description: Complete setup guides for all supported AI providers with configuration examples
keywords: providers, setup, configuration, API keys, authentication, anthropic, claude, openai
---

# AI Provider Guides

Complete setup guides for all supported AI providers.

---

## 🆓 Free Tier Providers

Start with zero cost using these free-tier options:

### [Hugging Face](huggingface.md)

**100,000+ open-source models**

- ✅ Free inference API
- 🌍 Largest model collection
- 🔓 Fully open source
- 📊 Models by task: chat, classification, NER, summarization

[Setup Guide →](huggingface.md)

### [Google AI Studio](google-ai.md)

**Gemini models with generous free tier**

- ✅ 1,500 requests/day free
- ⚡ Fast Gemini 2.0 Flash
- 🎯 15 requests/minute
- 💰 Pay-as-you-go option

[Setup Guide →](google-ai.md)

---

## 🤖 Direct AI Providers

Access leading AI models directly from their creators:

### [Anthropic](anthropic.md)

**Claude models with API key or OAuth authentication**

- 🧠 Claude 4.5 Opus/Sonnet/Haiku, Claude 4.0 Opus/Sonnet
- 🔐 API key or OAuth (Pro/Max subscription)
- 💭 Extended thinking for deep reasoning
- 📄 200K context window, multimodal support

[Setup Guide →](anthropic.md)

---

## 🏢 Enterprise Providers

Production-grade providers for enterprise deployments:

### [Azure OpenAI](azure-openai.md)

**Enterprise AI with Microsoft Azure**

- 🔒 SOC2, HIPAA, ISO 27001 compliant
- 🌍 Multi-region deployment (30+ regions)
- 🛡️ Private endpoints with VNet
- 💼 Enterprise SLAs

[Setup Guide →](azure-openai.md)

### [Google Vertex AI](google-vertex.md)

**Google Cloud ML platform**

- ☁️ GCP integration
- 🔐 IAM, VPC, service accounts
- 🌏 Global deployment
- 🎯 Gemini, PaLM, Codey models

[Setup Guide →](google-vertex.md)

### [AWS Bedrock](aws-bedrock.md)

**Serverless AI on AWS**

- 📦 13 foundation models (Claude, Llama, Mistral)
- 🔐 IAM, VPC integration
- 🌍 Multi-region (us-east-1, eu-west-1, ap-southeast-1)
- 💰 Pay-per-use pricing

[Setup Guide →](aws-bedrock.md)

---

## 🌍 Compliance-Focused

Providers with specific compliance certifications:

### [Mistral AI](mistral.md)

**European AI with GDPR compliance**

- 🇪🇺 EU data residency
- ✅ GDPR compliant by default
- 🔓 Open source models
- 💰 Cost-effective

[Setup Guide →](mistral.md)

---

## 🧑‍💻 Hosted Inference Providers

Access frontier models via hosted cloud inference APIs:

### [DeepSeek](../../getting-started/provider-setup.md#deepseek)

**deepseek-chat (V3) and deepseek-reasoner (R1)**

- 🧠 deepseek-chat — high-quality general chat at low cost
- 💭 deepseek-reasoner — R1 chain-of-thought reasoning model
- 🔑 API key from [platform.deepseek.com](https://platform.deepseek.com/api_keys)
- 🔄 Aliases: `ds`

[Setup Guide →](../../getting-started/provider-setup.md#deepseek)

### [NVIDIA NIM](../../getting-started/provider-setup.md#nvidia-nim)

**400+ models via NVIDIA's hosted and self-hosted inference platform**

- 🚀 Llama 3.3 70B Instruct (default), Mistral, Nemotron, and 400+ catalog models
- 🔧 NIM-specific extras: top_k, min_p, repetition_penalty, reasoning_budget
- 🔑 API key from [build.nvidia.com](https://build.nvidia.com/settings/api-keys)
- 🖥️ Also supports self-hosted NIM endpoints via `NVIDIA_NIM_BASE_URL`
- 🔄 Aliases: `nim`, `nvidia`

[Setup Guide →](../../getting-started/provider-setup.md#nvidia-nim)

---

## 💻 Local Providers

Run models entirely on your own hardware — no API key or internet required for inference:

### [LM Studio](../../getting-started/provider-setup.md#lm-studio)

**Run any supported model locally with a GUI app**

- 🖥️ Download and run models via the LM Studio desktop application
- 🔍 Auto-discovers the loaded model from `/v1/models` (no model name required)
- 🌐 OpenAI-compatible API at `http://localhost:1234/v1` by default
- 🆓 No API key needed for local use (key optional for reverse-proxy setups)
- 🔄 Aliases: `lmstudio`, `lms`

[Setup Guide →](../../getting-started/provider-setup.md#lm-studio)

### [llama.cpp](../../getting-started/provider-setup.md#llamacpp)

**High-performance local inference via llama-server**

- ⚡ Run GGUF models with llama-server at `http://localhost:8080/v1` by default
- 🔍 Auto-discovers the loaded model from `/v1/models`
- 🛠️ Tool support requires `--jinja` flag when starting llama-server
- 🆓 No API key needed for local use (key optional for reverse-proxy setups)
- 🔄 Aliases: `llama.cpp`

[Setup Guide →](../../getting-started/provider-setup.md#llamacpp)

---

## 🔌 Aggregators & Proxies

Access multiple providers through unified interfaces:

### [OpenRouter](openrouter.md)

**300+ models from 60+ providers**

- 🌐 Single API for all major providers (Anthropic, OpenAI, Google, Meta, etc.)
- ⚡ Automatic failover and routing
- 💰 Competitive pricing with cost optimization
- 🎯 Zero lock-in - switch models instantly
- 📊 Usage tracking dashboard
- 🆓 Free models available

[Setup Guide →](openrouter.md)

### [OpenAI Compatible](openai-compatible.md)

**OpenRouter, vLLM, LocalAI, and more**

- 🌐 100+ models through OpenRouter
- 💻 Local deployment with vLLM
- 🔓 Self-hosted with LocalAI
- 🔄 Drop-in OpenAI replacement

[Setup Guide →](openai-compatible.md)

### [LiteLLM](litellm.md)

**100+ providers through proxy**

- 🔄 Unified API for 100+ providers
- 📊 Load balancing and fallbacks
- 💰 Cost tracking
- 🎯 Model routing

[Setup Guide →](litellm.md)

---

## 🎙️ Voice Providers

Synthesize speech, transcribe audio, or run live voice sessions. Voice providers are separate from LLM providers — they handle audio I/O rather than text generation.

### Text-to-Speech (TTS)

#### [OpenAI TTS](../../guides/voice/openai-tts.md)

**Highest-quality text-to-speech**

- 🎙️ Voices: alloy, echo, fable, onyx, nova, shimmer
- 🎵 Models: tts-1 (fast) and tts-1-hd (high quality)
- 🎼 Formats: MP3, WAV, OGG, Opus
- 🔑 Auth: API Key (`OPENAI_API_KEY`)

[Setup Guide →](../../guides/voice/openai-tts.md)

#### [ElevenLabs](../../guides/voice/elevenlabs.md)

**Best multilingual and voice-cloning TTS**

- 🌍 Supports 30+ languages with natural prosody
- 🎭 Custom voice cloning from short audio samples
- 🎼 Formats: MP3
- 🔑 Auth: API Key (`ELEVENLABS_API_KEY`)

[Setup Guide →](../../guides/voice/elevenlabs.md)

#### [Google TTS](../../guides/voice/google-tts.md)

**1M characters/month free tier**

- 💰 Generous free tier for standard voices
- 🌍 380+ voices across 50+ languages
- 🎼 Formats: MP3, WAV, OGG
- 🔑 Auth: Service Account

[Setup Guide →](../../guides/voice/google-tts.md)

#### [Azure TTS](../../guides/voice/azure-tts.md)

**Enterprise TTS with full SSML support**

- 🏢 Fine-grained prosody control via SSML
- 🌍 400+ neural voices, 140+ languages
- 🎼 Formats: MP3
- 🔑 Auth: API Key + Region

[Setup Guide →](../../guides/voice/azure-tts.md)

---

### Speech-to-Text (STT)

#### [Whisper (OpenAI)](../../guides/voice/whisper.md)

**Highest transcription accuracy**

- 🎯 Best-in-class accuracy on diverse audio
- 🌍 Multilingual with automatic language detection
- 🎼 Formats: WAV, MP3, M4A, FLAC
- 🔑 Auth: API Key (`OPENAI_API_KEY`)

[Setup Guide →](../../guides/voice/whisper.md)

#### [Deepgram](../../guides/voice/deepgram.md)

**Real-time streaming transcription via WebSocket**

- ⚡ Sub-300 ms word-level results over WebSocket
- 🌊 REST batch and WebSocket streaming modes
- 🎼 Formats: WAV, MP3, OGG, FLAC
- 🔑 Auth: API Key (`DEEPGRAM_API_KEY`)

[Setup Guide →](../../guides/voice/deepgram.md)

#### [Google STT](../../guides/voice/google-stt.md)

**125+ languages with speaker diarization**

- 🌍 Best fit for existing Google Cloud users
- 👥 Speaker diarization and multi-channel audio
- 🎼 Formats: WAV, FLAC, MP3, OGG
- 🔑 Auth: Service Account

[Setup Guide →](../../guides/voice/google-stt.md)

#### [Azure STT](../../guides/voice/azure-stt.md)

**Enterprise STT with custom model training**

- 🏢 Batch transcription and custom model support
- 🔒 Compliance controls for regulated industries
- 🎼 Formats: WAV, MP3
- 🔑 Auth: API Key + Region

[Setup Guide →](../../guides/voice/azure-stt.md)

---

### Realtime Voice

Realtime providers maintain a persistent bidirectional WebSocket connection, enabling low-latency spoken conversation with the AI model.

#### [OpenAI Realtime](../../guides/voice/openai-realtime.md)

**Low-latency bidirectional voice over WebSocket**

- ⚡ Full-duplex audio stream with GPT-4o
- 🎵 Voice activity detection (VAD) built-in
- 🎼 Formats: WAV, Opus
- 🔑 Auth: API Key (`OPENAI_API_KEY`)

[Setup Guide →](../../guides/voice/openai-realtime.md)

#### [Gemini Live](../../guides/voice/gemini-live.md)

**Google's native realtime voice API**

- ⚡ Native multimodal realtime session with Gemini
- 🎵 Supports audio + video input simultaneously
- 🎼 Formats: WAV
- 🔑 Auth: API Key (`GOOGLE_AI_KEY`)

[Setup Guide →](../../guides/voice/gemini-live.md)

---

## Quick Comparison

| Provider                                                         | Free Tier  | Enterprise | GDPR   | Latency | Best For                              |
| ---------------------------------------------------------------- | ---------- | ---------- | ------ | ------- | ------------------------------------- |
| [Anthropic](anthropic.md)                                        | Limited    | ✅         | ✅     | Low     | Reasoning, coding, Claude             |
| [Hugging Face](huggingface.md)                                   | ✅         | ❌         | ✅     | Medium  | Open source, experimentation          |
| [Google AI](google-ai.md)                                        | ✅         | ✅         | ✅     | Low     | Free tier, Gemini                     |
| [Mistral AI](mistral.md)                                         | ❌         | ✅         | ✅     | Low     | EU compliance, cost                   |
| [OpenRouter](openrouter.md)                                      | ✅         | ✅         | Varies | Low     | Multi-model, automatic failover       |
| [OpenAI Compatible](openai-compatible.md)                        | Varies     | ✅         | Varies | Varies  | Flexibility, local deployment         |
| [LiteLLM](litellm.md)                                            | ❌         | ✅         | Varies | Low     | Multi-provider, unified API           |
| [Azure OpenAI](azure-openai.md)                                  | ❌         | ✅         | ✅     | Low     | Enterprise, Microsoft ecosystem       |
| [Vertex AI](google-vertex.md)                                    | ❌         | ✅         | ✅     | Low     | Enterprise, GCP ecosystem             |
| [AWS Bedrock](aws-bedrock.md)                                    | ❌         | ✅         | ✅     | Low     | Enterprise, AWS ecosystem             |
| [DeepSeek](../../getting-started/provider-setup.md#deepseek)     | ❌         | ✅         | ❌     | Low     | Cost-effective reasoning, R1 model    |
| [NVIDIA NIM](../../getting-started/provider-setup.md#nvidia-nim) | ❌         | ✅         | Varies | Low     | NVIDIA-hosted or self-hosted LLMs     |
| [LM Studio](../../getting-started/provider-setup.md#lm-studio)   | ✅ (Local) | ❌         | ✅     | Varies  | Local GUI model management            |
| [llama.cpp](../../getting-started/provider-setup.md#llamacpp)    | ✅ (Local) | ❌         | ✅     | Varies  | High-performance local GGUF inference |
| [OpenAI TTS](../../guides/voice/openai-tts.md)                   | ❌         | ✅         | ✅     | Low     | High-quality TTS (tts-1-hd)           |
| [ElevenLabs](../../guides/voice/elevenlabs.md)                   | ❌         | ✅         | Varies | Low     | Multilingual TTS, voice cloning       |
| [Google TTS](../../guides/voice/google-tts.md)                   | ✅         | ✅         | ✅     | Low     | Cost-effective TTS, 1M chars free     |
| [Azure TTS](../../guides/voice/azure-tts.md)                     | ❌         | ✅         | ✅     | Low     | Enterprise TTS, SSML support          |
| [Whisper](../../guides/voice/whisper.md)                         | ❌         | ✅         | ✅     | Low     | Best STT accuracy                     |
| [Deepgram](../../guides/voice/deepgram.md)                       | ❌         | ✅         | Varies | Low     | Real-time STT streaming (WebSocket)   |
| [Google STT](../../guides/voice/google-stt.md)                   | ❌         | ✅         | ✅     | Low     | STT for GCP users, 125+ languages     |
| [Azure STT](../../guides/voice/azure-stt.md)                     | ❌         | ✅         | ✅     | Low     | Enterprise STT, custom models         |
| [OpenAI Realtime](../../guides/voice/openai-realtime.md)         | ❌         | ✅         | ✅     | Low     | Realtime bidirectional voice          |
| [Gemini Live](../../guides/voice/gemini-live.md)                 | ❌         | ✅         | ✅     | Low     | Realtime voice + video (Gemini)       |

---

## Setup Strategies

### Strategy 1: Free Tier First (Recommended for Development)

=== "SDK Usage"

    ```typescript
    const ai = new NeuroLink({
    providers: [
    {
    name: 'google-ai',
    priority: 1,
    config: { apiKey: process.env.GOOGLE_AI_KEY },
    quotas: { daily: 1500 }
    },
    {
    name: 'openai',
    priority: 2,
    config: { apiKey: process.env.OPENAI_API_KEY }
    }
    ],
    failoverConfig: { enabled: true, fallbackOnQuota: true }
    });

        const result = await ai.generate({
          input: { text: "Hello world" }
        });
        ```

=== "CLI Usage"

    ```bash
    # Set up environment variables
    export GOOGLE_AI_KEY="your-key"
    export OPENAI_API_KEY="your-key"

        # Use with automatic failover
        npx @juspay/neurolink generate "Hello world" \
          --provider google-ai
        ```

### Strategy 2: Multi-Region Enterprise

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "azure-us",
      region: "us-east",
      config: {
        /* Azure US */
      },
    },
    {
      name: "azure-eu",
      region: "eu-west",
      config: {
        /* Azure EU */
      },
    },
    {
      name: "bedrock-us",
      region: "us-east",
      config: {
        /* Bedrock US */
      },
    },
  ],
  loadBalancing: "latency-based",
});
```

### Strategy 3: GDPR Compliance

```typescript
const ai = new NeuroLink({
  providers: [
    {
      name: "mistral",
      priority: 1,
      config: { apiKey: process.env.MISTRAL_API_KEY },
    },
    {
      name: "azure-eu",
      priority: 2,
      config: {
        /* Azure EU region */
      },
    },
  ],
  compliance: {
    framework: "GDPR",
    dataResidency: "EU",
  },
});
```

---

## Next Steps

1. **Choose a provider** based on your requirements (free tier, compliance, region)
2. **Follow the setup guide** to get your API key
3. **Configure NeuroLink** with the provider
4. **Test the integration** with a simple request
5. **Add failover** for production reliability

---

## Related Documentation

- **[Multi-Provider Failover](../../guides/enterprise/multi-provider-failover.md)** - High availability patterns
- **[Cost Optimization](../../guides/enterprise/cost-optimization.md)** - Reduce costs by 80-95%
- **[Compliance & Security](../../guides/enterprise/compliance.md)** - GDPR, SOC2, HIPAA
- **[Load Balancing](../../guides/enterprise/load-balancing.md)** - Distribution strategies
- **[Voice Providers Comparison](../../reference/provider-comparison.md#voice-providers)** - TTS, STT, and Realtime capability matrix
- **[Voice Provider Selection](../../reference/provider-selection.md#text-to-speech-tts)** - Choosing the right voice provider
