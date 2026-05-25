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

### [xAI Grok](xai.md)

**Grok 3 / 3 Mini / 2 / 2 Vision via api.x.ai**

- 🧠 Grok 3 — flagship reasoning + coding
- ⚡ Grok 3 Mini — faster + cheaper
- 👁️ Grok 2 Vision — multimodal text + images
- 🔑 API key from [console.x.ai](https://console.x.ai/)
- 🔄 Aliases: `grok`

[Setup Guide →](xai.md)

### [Groq](groq.md)

**Sub-100ms inference via LPU acceleration**

- ⚡ <100ms TTFT — fastest hosted inference available
- 🦙 Llama 3.3 70B Versatile (default), Llama 3.1 8B Instant, Mixtral, Gemma 2
- 👁️ Llama 3.2 vision-preview variants for multimodal
- 🔑 API key from [console.groq.com/keys](https://console.groq.com/keys)

[Setup Guide →](groq.md)

### Together AI

**Hosted open-model gateway**

- 📚 Llama 3.3 / 3.1 (8B–405B), Mixtral, Qwen 2.5, DeepSeek R1/V3, WizardLM
- ⚡ Turbo variants for low latency
- 🔑 API key from [api.together.xyz/settings/api-keys](https://api.together.xyz/settings/api-keys)
- 🔄 Aliases: `together`

### Fireworks AI

**Fast open-model serving**

- 🔥 Llama v3.1 70B/405B, Mixtral 8x22B, Qwen 2.5 Coder, DeepSeek V3
- 👁️ Phi-3-Vision and Llama 3.2 vision variants
- 🔑 API key from [fireworks.ai/account/api-keys](https://fireworks.ai/account/api-keys)

### Perplexity

**Sonar models with built-in web grounding**

- 🌐 sonar / sonar-pro / sonar-reasoning / sonar-deep-research
- 📚 Built-in web search + citations
- 🔑 API key from [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
- 🔄 Aliases: `pplx`

### Cloudflare Workers AI

**Edge-served open models**

- 🌍 Lowest cost tier — bills per "neuron" not token
- 🦙 Llama 3.3 70B FP8, Llama 3.1, Mistral, Qwen, Gemma
- 🔑 Token from [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) (Workers AI Read+Write)
- ⚠️ Requires both `CLOUDFLARE_API_KEY` AND `CLOUDFLARE_ACCOUNT_ID`
- 🔄 Aliases: `workers-ai`, `cf-ai`

### Cohere

**Command R / R+ chat + Embed v3 / Rerank v3 (RAG-essential)**

- 💬 Command R+ flagship + Command R + Command R7B
- 🔍 Embed v3 (English / multilingual) + Rerank v3 — top-tier RAG
- 🔑 API key from [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)

### [Replicate](replicate.md)

**Multi-modal gateway — LLM + image + video + avatar + music in one auth**

- 🎯 One `REPLICATE_API_TOKEN` for 5 modalities
- 📚 Llama 3.1 70B/405B, Mistral, Mixtral
- 🎨 FLUX 1.1 Pro, SDXL, Stable Diffusion 3.5
- 🎬 Wan-Alpha video, MuseTalk avatar, MusicGen music
- 🔑 Token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)

[Setup Guide →](replicate.md)

---

## 🔍 Embedding-Only Providers

Specialised embedding providers for RAG / retrieval pipelines (no chat):

### [Voyage AI](voyage.md)

**Top-tier RAG embeddings**

- 📊 voyage-3-large flagship; voyage-3.5 default; voyage-code-3 for code
- 🌍 voyage-multilingual-2 + domain-tuned (finance, law)
- 🔑 API key from [dash.voyageai.com/api-keys](https://dash.voyageai.com/api-keys)

[Setup Guide →](voyage.md)

### Jina AI

**Embeddings + reranking**

- 📊 jina-embeddings-v3 multilingual flagship
- 🔄 jina-reranker-v2 for retrieval reranking
- 🔍 jina-colbert-v2 late-interaction retrieval
- 🔑 API key from [jina.ai](https://jina.ai/?sui=apikey)

---

## 🎨 Direct Image Generation

Specialised image-gen providers (in addition to Vertex Imagen / OpenAI DALL-E / Anthropic / Bedrock):

### [Stability AI](stability.md)

**Stable Image Ultra/Core + SD 3.5 family**

- 🎨 Stable Image Ultra (flagship), Core (fast), SD 3.5 Large/Large-Turbo/Medium
- 🖼️ PNG output, aspect-ratio + negative-prompt + seed support
- 🔑 API key from [platform.stability.ai/account/keys](https://platform.stability.ai/account/keys)
- 🔄 Aliases: `stability-ai`, `sd`

[Setup Guide →](stability.md)

### Ideogram

**Strong typography + design-focused image generation**

- 📝 V3 default; V2/V2-Turbo/V1 also supported
- 🎨 magic_prompt + style + aspect_ratio controls
- 🔑 API key from [developer.ideogram.ai](https://developer.ideogram.ai/)

### Recraft

**Vector / illustration-focused image generation**

- 🎨 recraftv3 (raster), recraftv3-svg (vector), recraftv2
- 📐 OpenAI-compat shape + style + size controls
- 🔑 API token from [recraft.ai/api](https://www.recraft.ai/api)

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

## 🎙️ Voice Providers {#voice-providers}

Synthesize speech, transcribe audio, or run live voice sessions. Voice providers are separate from LLM providers — they handle audio I/O rather than text generation.

### Text-to-Speech (TTS)

#### [OpenAI TTS](./openai-tts.md)

**Highest-quality text-to-speech**

- 🎙️ Voices: alloy, echo, fable, onyx, nova, shimmer
- 🎵 Models: tts-1 (fast) and tts-1-hd (high quality)
- 🎼 Formats: MP3, WAV, OGG, Opus
- 🔑 Auth: API Key (`OPENAI_API_KEY`)

[Setup Guide →](./openai-tts.md)

#### [ElevenLabs](./elevenlabs.md)

**Best multilingual and voice-cloning TTS**

- 🌍 Supports 30+ languages with natural prosody
- 🎭 Custom voice cloning from short audio samples
- 🎼 Formats: MP3, WAV (raw PCM, surfaced as `pcm16`), Opus (Ogg container)
- 🔑 Auth: API Key (`ELEVENLABS_API_KEY`)

[Setup Guide →](./elevenlabs.md)

#### [Google TTS](../provider-setup.md)

**1M characters/month free tier**

- 💰 Generous free tier for standard voices
- 🌍 380+ voices across 50+ languages
- 🎼 Formats: MP3, WAV, OGG
- 🔑 Auth: Service Account

[Setup Guide →](../provider-setup.md)

#### [Azure TTS](./azure-speech.md)

**Enterprise TTS with full SSML support**

- 🏢 Fine-grained prosody control via SSML
- 🌍 400+ neural voices, 140+ languages
- 🎼 Formats: MP3, WAV (PCM), Opus (Ogg container)
- 🔑 Auth: API Key + Region

[Setup Guide →](./azure-speech.md)

#### [Fish Audio](./fish-audio.md)

**Low-cost TTS with 15s voice cloning**

- 💰 ~80% cheaper than ElevenLabs
- 🎭 15-second reference audio → custom voice
- 🌍 14 languages
- 🎼 Formats: MP3, WAV, PCM16 (raw)
- 🔑 Auth: API Key (`FISH_AUDIO_API_KEY`)

[Setup Guide →](./fish-audio.md)

#### [Cartesia](./cartesia.md)

**Low-latency Sonic models — synchronous + streaming**

- ⚡ Sub-second turnaround on the synchronous `/tts/bytes` endpoint
- 🌊 Separate WebSocket streaming flow via `CartesiaStream` (voice server)
- 🎭 Voice cloning via dashboard upload
- 🎼 Formats: MP3 (44.1 kHz), WAV (PCM s16le @ 44.1 kHz), PCM16 (raw @ 24 kHz)
- 🔑 Auth: API Key (`CARTESIA_API_KEY`)

[Setup Guide →](./cartesia.md)

---

### Speech-to-Text (STT)

#### [Whisper (OpenAI)](../provider-setup.md#whisper)

**Highest transcription accuracy**

- 🎯 Best-in-class accuracy on diverse audio
- 🌍 Multilingual with automatic language detection
- 🎼 Formats: WAV, MP3, M4A, FLAC, OGG, OPUS, WEBM, MP4, MPEG, MPGA
- 🔑 Auth: API Key (`OPENAI_API_KEY`)

[Setup Guide →](../provider-setup.md#whisper)

#### [Deepgram](./deepgram.md)

**Real-time streaming transcription via WebSocket**

- ⚡ Sub-300 ms word-level results over WebSocket
- 🌊 REST batch and WebSocket streaming modes
- 🎼 Formats: WAV, MP3, OGG, FLAC
- 🔑 Auth: API Key (`DEEPGRAM_API_KEY`)

[Setup Guide →](./deepgram.md)

#### [Google STT](../provider-setup.md)

**125+ languages with speaker diarization**

- 🌍 Best fit for existing Google Cloud users
- 👥 Speaker diarization and multi-channel audio
- 🎼 Formats: WAV, FLAC, MP3, OGG
- 🔑 Auth: API Key (`GOOGLE_AI_API_KEY` / `GEMINI_API_KEY`) **or** Service Account (`GOOGLE_APPLICATION_CREDENTIALS`)

[Setup Guide →](../provider-setup.md)

#### [Azure STT](./azure-speech.md)

**Enterprise STT with custom model training**

- 🏢 Batch transcription and custom model support
- 🔒 Compliance controls for regulated industries
- 🎼 Formats: WAV (PCM), Ogg/Opus — convert MP3 to WAV first
- 🔑 Auth: API Key + Region

[Setup Guide →](./azure-speech.md)

---

### Realtime Voice

Realtime providers maintain a persistent bidirectional WebSocket connection, enabling low-latency spoken conversation with the AI model.

#### [OpenAI Realtime](../provider-setup.md#openai-realtime)

**Low-latency bidirectional voice over WebSocket**

- ⚡ Full-duplex audio stream with GPT-4o
- 🎵 Voice activity detection (VAD) built-in
- 🎼 Formats: WAV, Opus
- 🔑 Auth: API Key (`OPENAI_API_KEY`)

[Setup Guide →](../provider-setup.md#openai-realtime)

#### [Gemini Live](../provider-setup.md)

**Google's native realtime voice API**

- ⚡ Native multimodal realtime session with Gemini
- 🎵 Supports audio + video input simultaneously
- 🎼 Formats: WAV, Opus
- 🔑 Auth: API Key (`GOOGLE_AI_API_KEY` or `GEMINI_API_KEY`)

[Setup Guide →](../provider-setup.md)

---

## 🎬 Video Generation

Image-to-video and text-to-video providers (use via `output: { mode: "video" }`):

- **Vertex Veo 3.1** (default) — `--videoProvider vertex`
- **Kling** (PiAPI) — `--videoProvider kling` ([details](../../provider-integration/19-adding-video-provider.md))
- **Runway** (Gen-3 Alpha / Gen-4 Turbo) — `--videoProvider runway`
- **Replicate** — Wan-Alpha + many others — `--videoProvider replicate` ([guide](replicate.md))

See [Video Generation feature page](../../features/video-generation.md) for the full SDK / CLI surface.

---

## 👤 Avatar / Lip-Sync Generation

Talking-head video synthesis from a portrait image + audio (use via `output: { mode: "avatar" }`):

- **D-ID** — `--avatarProvider d-id` (text-driven via Microsoft voices, or audio-driven)
- **HeyGen** — `--avatarProvider heygen` (HeyGen avatar catalog id required)
- **Replicate (MuseTalk)** — `--avatarProvider replicate` or `musetalk` ([guide](replicate.md))

See [`docs/provider-integration/21-adding-new-modality.md`](../../provider-integration/21-adding-new-modality.md) for the architectural pattern.

---

## 🎵 Music / Sound Generation

Music + sound-effect generation (use via `output: { mode: "music" }`):

- **Beatoven.ai** — `--musicProvider beatoven` (royalty-free background music)
- **ElevenLabs Music** — `--musicProvider elevenlabs-music` (short SFX / loops up to 22s; same `ELEVENLABS_API_KEY` as TTS)
- **Lyria 3 Pro** (Google) — `--musicProvider lyria`
- **Replicate (MusicGen)** — `--musicProvider replicate` or `musicgen` ([guide](replicate.md))

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
| [OpenAI TTS](./openai-tts.md)                                    | ❌         | ✅         | ✅     | Low     | High-quality TTS (tts-1-hd)           |
| [ElevenLabs](./elevenlabs.md)                                    | ❌         | ✅         | Varies | Low     | Multilingual TTS, voice cloning       |
| [Google TTS](../provider-setup.md)                               | ✅         | ✅         | ✅     | Low     | Cost-effective TTS, 1M chars free     |
| [Azure TTS](./azure-speech.md)                                   | ❌         | ✅         | ✅     | Low     | Enterprise TTS, SSML support          |
| [Fish Audio](./fish-audio.md)                                    | ❌         | ✅         | Varies | Low     | Low-cost TTS, voice cloning, 14 langs |
| [Cartesia](./cartesia.md)                                        | ❌         | ✅         | Varies | Low     | Low-latency Sonic models              |
| [Whisper](../provider-setup.md#whisper)                          | ❌         | ✅         | ✅     | Low     | Best STT accuracy                     |
| [Deepgram](./deepgram.md)                                        | ❌         | ✅         | Varies | Low     | Real-time STT streaming (WebSocket)   |
| [Google STT](../provider-setup.md)                               | ❌         | ✅         | ✅     | Low     | STT for GCP users, 125+ languages     |
| [Azure STT](./azure-speech.md)                                   | ❌         | ✅         | ✅     | Low     | Enterprise STT, custom models         |
| [OpenAI Realtime](../provider-setup.md#openai-realtime)          | ❌         | ✅         | ✅     | Low     | Realtime bidirectional voice          |
| [Gemini Live](../provider-setup.md)                              | ❌         | ✅         | ✅     | Low     | Realtime voice + video (Gemini)       |

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
