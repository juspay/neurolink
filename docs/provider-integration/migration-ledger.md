# Provider Descriptor Migration Ledger

Inventory taken at `origin/release` @ `2cefa3ae4115f817f75a415b6bc70fc3ecaed2d3`. TypeSafe was added afterwards (#1761) and is included below; the 25-entry count matches `origin/release` @ `f536fd091`.

All 25 entries in `HAND_DESCRIPTORS` (`src/lib/factories/providerDescriptors.ts:45-526`) were inventoried against their live implementation files. This ledger records, per provider, why it is (or isn't) a JSON-catalog migration candidate, so "add a provider" work doesn't re-litigate the same analysis per PR.

Every verdict allows one thing regardless of class: the **static descriptor metadata** (name, aliases, default model, credential env var names, setup URL) can always move into a class-backed JSON record. "Must remain class" means the _execution_ — the inference loop (`generate`/`stream`/`decide`, per the provider's `inferenceKinds`), auth, media pipelines — cannot be reduced to declarative catalog data; it does not mean the provider is exempt from descriptor consolidation.

## JSON-ready now (1)

| Provider  | Note                                                                                                                                                                                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mistral` | Already `ConfiguredOpenAICompatProvider`, driven by `catalog/mistral.json`. Remove the hand descriptor once its data conflicts are resolved: descriptor `setupUrl` disagrees with the JSON, the descriptor omits a model env var the JSON expects, and it carries timeout/priority/key-format fields the current descriptor builder doesn't derive from JSON yet. |

## Schema extension needed (2)

| Provider      | What the catalog schema is missing                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `huggingface` | Alternate credential env vars (`HUGGINGFACE_API_KEY` with `HF_TOKEN` fallback), `toolSupport: model-dependent`, timeouts, auto-select priority. Closest direct-vendor class-removal candidate once these fields exist. |
| `deepseek`    | A narrowly-scoped `response_format` downgrade quirk (json_object coercion). No arbitrary executable hooks — this should be one named catalog quirk field, not a scripting escape hatch.                                |

## Shared adapter needed (9)

Three adapter families, not nine one-off migrations:

**Local-runtime adapter** (`ollama`, `lm-studio`, `llamacpp`) — one OpenAI-compatible local-runtime adapter with optional auth, model discovery/probe, actionable transport errors, timeout policy, optional embeddings. Vendor-specific pull/diagnostic guidance becomes adapter data.

**Embedding-only adapter** (`voyage`, `jina`, `cohere`) — one embedding-only provider adapter parameterized by path, request shape, batch size, response-extraction/index policy, unsupported-surface messages. `jina` extends it with an optional rerank operation profile (don't force reranking into the boolean capability shape). `cohere` composes this with a generic OpenAI chat adapter (it has both `/compatibility/v1` chat and native `/v2/embed`); preserve its batch limit and body-field quirks in the embedding profile.

**Image-generation adapter** (`stability`, `ideogram`, `recraft`) — one image-generation adapter family: explicit multipart vs JSON request profile, base64-vs-URL response profile, custom auth-header support, model-path mapping as data. SSRF and bounded-read policy remain shared mandatory behavior, not per-vendor opt-outs.

## Must remain class (12)

| Provider     | Why                                                                                                                                                                                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bedrock`    | AWS SigV4/Converse protocol, custom loop, not OpenAI-compatible. Tier 4.                                                                                                                                                                                                                                                                                                   |
| `openai`     | Chat portion is catalog-shaped, but embeddings, image generation, and OpenAI-specific telemetry/errors are executable behavior.                                                                                                                                                                                                                                            |
| `vertex`     | Two native protocols (Google GenAI + Anthropic-on-Vertex) and multiple modality pipelines behind one provider identity.                                                                                                                                                                                                                                                    |
| `anthropic`  | Native Messages API auth/message/tool semantics are executable protocol behavior.                                                                                                                                                                                                                                                                                          |
| `azure`      | Custom routing, auth, and per-deployment capability can't be represented without turning JSON into executable hook data.                                                                                                                                                                                                                                                   |
| `sagemaker`  | Tier 4 — signed SDK invocation and arbitrary endpoint response parsing are explicitly outside the catalog/adapter boundary.                                                                                                                                                                                                                                                |
| `nvidia-nim` | Conditional body builder and response-aware retry are real hooks; a one-off JSON mini-language would violate the catalog boundary.                                                                                                                                                                                                                                         |
| `litellm`    | Runtime discovery, telemetry, and SSE/model-access parsing are substantial; also an aggregator — schedule after direct-vendor work regardless.                                                                                                                                                                                                                             |
| `openrouter` | Dynamic per-routed-model capabilities and router headers are runtime behavior; aggregator, so it doesn't count toward the first-class target anyway.                                                                                                                                                                                                                       |
| `replicate`  | Async prediction lifecycle (not chat completions) plus cross-media handler integration is custom; descriptor JSON must not imply media-handler registrations belong to the LLM descriptor.                                                                                                                                                                                 |
| `google-ai`  | Native Gemini + media + embedding pipelines aren't declaratively OpenAI-compatible — but flagged as the best early proof-of-concept for class-backed JSON _metadata_, since its auth is simpler than the cloud-IAM providers.                                                                                                                                              |
| `typesafe`   | Decision-only (`inferenceKinds: ["decide"]`, no `generate`/`stream`): a dual-transport (direct + Vercel AI Gateway) wire protocol with its own question vocabulary (`noul` for boolean) and token-budget quirks — nothing here is OpenAI-compatible chat shape, so it isn't catalog-JSON candidate material by a different route than the generate/stream providers above. |

## Must remain core class (1)

| Provider            | Why                                                                                                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai-compatible` | This is the generic protocol surface itself, not a direct vendor. It should consume shared descriptor/config primitives but must never become a fixed-vendor JSON row — collapsing it into the catalog would conflate "the adapter" with "an entry in the adapter's catalog." |

## Suggested execution order

1. **`mistral`** — low-risk once the conflicts above are resolved, JSON-ready-now; proves the removal path for a hand descriptor that already has a JSON twin.
2. **`huggingface`, `deepseek`** — smallest schema extensions (few named fields), each unlocks one direct-vendor class removal.
3. **Three shared adapters** (local-runtime, embedding-only, image-generation) — each unlocks 3 providers at once; build once, migrate three.
4. **`google-ai`** descriptor-only JSON metadata — proof of concept for moving static descriptor data out of a "must remain class" provider without touching its execution.
5. Direct-vendor "must remain class" providers (`bedrock`, `openai`, `vertex`, `anthropic`, `azure`, `sagemaker`, `nvidia-nim`) get descriptor-only JSON metadata migrations, execution untouched — lower priority, cosmetic consolidation only.
6. Aggregators (`litellm`, `openrouter`), the core adapter (`openai-compatible`), and `typesafe` are excluded from the first-class-count migration priority entirely — the first three add no direct-vendor coverage however they're implemented, and `typesafe` is a `decide`-only provider with no `generate`/`stream` surface to migrate at all.
