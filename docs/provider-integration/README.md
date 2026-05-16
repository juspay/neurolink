# Provider Integration Documentation

Implementation guides for extending NeuroLink with new providers, new modalities, and new capability surfaces.

## Two reading paths

This folder contains two kinds of document:

1. **Implementation journals** (`00`-`14`) — the historical record of specific shipped features (DeepSeek/NIM/LM Studio/llama.cpp providers, voice/speech integration). Useful as concrete worked examples and when you want to know exactly what was done in a particular release.
2. **How-to guides** (`15`-`22` + `CHECKLIST`) — the canonical, generalized playbook for adding a new provider or modality of any kind. Use these when implementing something new.

If you're adding code today, start with [`CHECKLIST.md`](CHECKLIST.md) (decision tree → matching guide).

---

## Quick decision tree

```
What are you adding?

├─ A new LLM / chat provider
│  → 15-adding-llm-provider.md
│
├─ A new voice handler
│  ├─ TTS (Text-to-Speech) → 16-adding-tts-provider.md
│  ├─ STT (Speech-to-Text) → 17-adding-stt-provider.md
│  └─ Realtime (bidirectional) → 18-adding-realtime-provider.md
│
├─ A new video provider
│  → 19-adding-video-provider.md (REQUIRES one-time refactor first)
│
├─ A new image-gen provider or model
│  → 20-adding-image-gen-provider.md
│
├─ An entirely new modality (Avatar, Music, 3D, …)
│  → 21-adding-new-modality.md
│
└─ A multi-modal provider (Replicate, Together AI, …)
   → 22-adding-multimodal-provider.md
```

For a fast pre-flight checklist you can paste into your PR description, see [`CHECKLIST.md`](CHECKLIST.md).

---

## Document index

### How-to guides (the playbook)

| Doc                                                                    | Scope                                                   | When to read                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`15-adding-llm-provider.md`](15-adding-llm-provider.md)               | New chat / text-generation provider                     | Adding xAI Grok, Groq, Cohere, Together, Fireworks, Perplexity, Cloudflare Workers AI, etc. |
| [`16-adding-tts-provider.md`](16-adding-tts-provider.md)               | New text-to-speech handler                              | Adding Fish Audio, Cartesia, Murf, PlayHT, Sarvam TTS                                       |
| [`17-adding-stt-provider.md`](17-adding-stt-provider.md)               | New speech-to-text handler                              | Adding AssemblyAI, Gladia, Rev.ai, Speechmatics                                             |
| [`18-adding-realtime-provider.md`](18-adding-realtime-provider.md)     | New bidirectional voice handler                         | Adding Hume EVI, Resemble.ai realtime, custom WebSocket protocols                           |
| [`19-adding-video-provider.md`](19-adding-video-provider.md)           | New video-generation provider (incl. one-time refactor) | Adding Kling, Runway, Pika, Luma, Wan-Alpha (via Replicate)                                 |
| [`20-adding-image-gen-provider.md`](20-adding-image-gen-provider.md)   | New image-gen provider or model                         | Adding Stability, FLUX direct, Ideogram, Recraft, or new models on existing providers       |
| [`21-adding-new-modality.md`](21-adding-new-modality.md)               | A brand-new modality category                           | Adding Avatar (D-ID, HeyGen), Music (Beatoven, Lyria, ElevenLabs Music), 3D, SFX, etc.      |
| [`22-adding-multimodal-provider.md`](22-adding-multimodal-provider.md) | A provider spanning multiple modalities                 | Adding Replicate, Together AI, Fireworks AI, Cloudflare Workers AI                          |
| [`CHECKLIST.md`](CHECKLIST.md)                                         | Pasteable PR checklist                                  | Every PR — pick the §A-§H section that matches                                              |
| [`SAFETY-PRIMITIVES.md`](SAFETY-PRIMITIVES.md)                         | Cross-cutting safety helpers reference                  | Whenever you download external URLs, log responses, or wrap streaming with OTel spans       |

### Implementation journals (the worked examples)

These document specific shipped features and serve as concrete references for the patterns generalized in `15`-`22`.

| Doc                                                                    | Topic                                                                                                                             | Commit     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [`00-architecture.md`](00-architecture.md)                             | Patterns common to every provider (BaseProvider, Factory + Registry, providerConfig, AI SDK wrapping, type-engineering rules)     | —          |
| [`01-shared-changes.md`](01-shared-changes.md)                         | Master diff list for everything outside `src/lib/providers/<name>.ts` (worked example for the four cloud-OpenAI-compat providers) | `c829f4de` |
| [`02-deepseek.md`](02-deepseek.md)                                     | DeepSeek implementation — simplest cloud port; first to read                                                                      | `c829f4de` |
| [`03-nvidia-nim.md`](03-nvidia-nim.md)                                 | NVIDIA NIM implementation — most complex (extra body params, retry-on-400)                                                        | `c829f4de` |
| [`04-lm-studio.md`](04-lm-studio.md)                                   | LM Studio implementation — local server with model auto-discovery                                                                 | `c829f4de` |
| [`05-llamacpp.md`](05-llamacpp.md)                                     | llama.cpp implementation — clone of LM Studio with /health validation                                                             | `c829f4de` |
| [`06-testing.md`](06-testing.md)                                       | Test additions and validation strategy for the four cloud providers                                                               | `c829f4de` |
| [`07-implementation-order.md`](07-implementation-order.md)             | Ordered task list, milestone gates, risk mitigations                                                                              | `c829f4de` |
| [`08-feature-matrix.md`](08-feature-matrix.md)                         | Capability matrix across the four cloud providers                                                                                 | `c829f4de` |
| [`09-test-suite-spec.md`](09-test-suite-spec.md)                       | The `test/continuous-test-suite-new-providers.ts` specification                                                                   | `c829f4de` |
| [`10-test-results-final.md`](10-test-results-final.md)                 | Final test results for the four cloud providers                                                                                   | `c829f4de` |
| [`11-test-failure-investigation.md`](11-test-failure-investigation.md) | Failure-investigation trail (the 80% input-budget bug, etc.)                                                                      | `c829f4de` |
| [`12-pr-analysis.md`](12-pr-analysis.md)                               | PR analysis                                                                                                                       | `c829f4de` |
| [`13-code-review.md`](13-code-review.md)                               | Code review notes                                                                                                                 | `c829f4de` |
| [`14-voice-speech-integration.md`](14-voice-speech-integration.md)     | Voice/speech integration journal — TTS (3 providers), STT (4 providers), Realtime (2 providers)                                   | `27a31c32` |

---

## Critical rules (quick reference)

These rules are baked into the codebase and enforced by ESLint. Violating any of them blocks CI.

| #   | Rule                                               | Enforced by                                                   |
| --- | -------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Dynamic imports inside the registry only           | (convention; failure surfaces as circular-dep error at build) |
| 2   | Types in canonical `src/lib/types/` location       | `neurolink/no-local-type-alias`                               |
| 5   | Backward compatibility — public API additive only  | (convention; reviewer-enforced)                               |
| 6   | `formatProviderError` must `return`, never `throw` | (convention; loud at runtime)                                 |
| 7   | Use `type`, never `interface`                      | `neurolink/no-interface`                                      |
| 8   | No "Types" suffix in type filenames                | `neurolink/no-types-suffix-filename`                          |
| 9   | Globally unique exported type names (use prefixes) | `neurolink/unique-type-names`                                 |
| 10  | Types barrel uses `export *` only                  | `neurolink/types-barrel-exports-only`                         |
| 11  | No local `types/` directories                      | `neurolink/no-local-types-folder`                             |
| 12  | No type re-exports from non-type files             | `neurolink/no-type-export-outside-types`                      |
| 13  | Internal types imported from barrel only           | `neurolink/barrel-type-imports`                               |

Full text and rationale lives in the project [`CLAUDE.md`](https://github.com/juspay/neurolink/blob/release/CLAUDE.md). The how-to guides (15-22) reference these rules where relevant.

---

## Reference commits

When in doubt, look at how it was done before:

| Commit     | Adds                                       | Best for                                                                  |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `c829f4de` | DeepSeek, NVIDIA NIM, LM Studio, llama.cpp | Multi-provider PRs that share infrastructure (§01-shared-changes pattern) |
| `27a31c32` | Voice/Speech (3 TTS + 4 STT + 2 Realtime)  | New modality with multiple providers (handler-registry pattern)           |
| `8918f8ef` | LiteLLM provider                           | Single-provider PR with full documentation (41 files)                     |
| `3041d26f` | OpenAI Compatible                          | Minimal-comprehensive provider (cleanest 11-file diff)                    |
| `9ef4ebee` | Amazon SageMaker                           | Multi-file provider directory (only when truly needed)                    |

---

## Status of major shipped work

| Area                     | Status                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM providers (21+)      | Stable — xAI Grok, Groq, Cohere, Together AI, Fireworks, Perplexity, Cloudflare, Voyage, Jina, Replicate + all previous cloud/local            |
| TTS handlers (6)         | Stable — Google, OpenAI, ElevenLabs, Azure, Cartesia, Fish Audio                                                                               |
| STT handlers (4)         | Stable — OpenAI Whisper, Deepgram, Google, Azure                                                                                               |
| Realtime handlers (2)    | Registered, partial SDK surface — OpenAI Realtime, Gemini Live                                                                                 |
| Image gen (7+ providers) | Stable — Stability AI, Ideogram, Recraft, OpenAI image-gen, plus Vertex / Anthropic / Bedrock pathways (see `20-adding-image-gen-provider.md`) |
| Video gen (4 providers)  | Stable — Vertex Veo, Kling (via PiAPI), Runway, Replicate (see `19-adding-video-provider.md`)                                                  |
| Avatar                   | Implemented — D-ID, HeyGen, Replicate MuseTalk (see `21-adding-new-modality.md`)                                                               |
| Music                    | Implemented — Google Lyria, Beatoven, ElevenLabs Music, Replicate MusicGen (see `21-adding-new-modality.md`)                                   |
| Multi-modal providers    | Implemented — Replicate spans LLM + video + avatar + music (see `22-adding-multimodal-provider.md`)                                            |

If you're picking up any of the "Not implemented" items, the matching how-to guide has the full plan.

---

## Need help?

- Read the matching how-to guide first (15-22).
- Cross-reference the most similar shipped feature's implementation journal (02-14).
- For ESLint rule violations, see [`00-architecture.md`](00-architecture.md) Pattern 6.
- Open a GitHub Discussion: https://github.com/juspay/neurolink/discussions
- Open an issue: https://github.com/juspay/neurolink/issues
