[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkCredentials

# Type Alias: NeurolinkCredentials

> **NeurolinkCredentials** = `object`

Defined in: [types/providers.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L179)

Per-provider credential overrides for generate() / stream() calls.

When set on `NeurolinkConstructorConfig.credentials`, applies as the default
for all calls from that NeuroLink instance. When set on
`GenerateOptions.credentials` or `StreamOptions.credentials`, overrides the
instance default for that single call.

Unset providers fall through to environment variables (existing behaviour).

## Properties

### openai?

> `optional` **openai?**: `object`

Defined in: [types/providers.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L180)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### anthropic?

> `optional` **anthropic?**: `object`

Defined in: [types/providers.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L181)

#### apiKey?

> `optional` **apiKey?**: `string`

#### oauthToken?

> `optional` **oauthToken?**: `string`

---

### googleAiStudio?

> `optional` **googleAiStudio?**: `object`

Defined in: [types/providers.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L182)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### vertex?

> `optional` **vertex?**: `object`

Defined in: [types/providers.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L183)

#### projectId?

> `optional` **projectId?**: `string`

#### location?

> `optional` **location?**: `string`

#### apiKey?

> `optional` **apiKey?**: `string`

Vertex Express Mode — simplified API-key auth

#### serviceAccountKey?

> `optional` **serviceAccountKey?**: `string`

Full service-account JSON string

#### clientEmail?

> `optional` **clientEmail?**: `string`

Inline service-account fields (alternative to serviceAccountKey)

#### privateKey?

> `optional` **privateKey?**: `string`

---

### bedrock?

> `optional` **bedrock?**: `object`

Defined in: [types/providers.ts:194](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L194)

#### accessKeyId?

> `optional` **accessKeyId?**: `string`

#### secretAccessKey?

> `optional` **secretAccessKey?**: `string`

#### sessionToken?

> `optional` **sessionToken?**: `string`

#### region?

> `optional` **region?**: `string`

---

### sagemaker?

> `optional` **sagemaker?**: `object`

Defined in: [types/providers.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L200)

#### accessKeyId?

> `optional` **accessKeyId?**: `string`

#### secretAccessKey?

> `optional` **secretAccessKey?**: `string`

#### sessionToken?

> `optional` **sessionToken?**: `string`

#### region?

> `optional` **region?**: `string`

#### endpoint?

> `optional` **endpoint?**: `string`

---

### azure?

> `optional` **azure?**: `object`

Defined in: [types/providers.ts:207](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L207)

#### apiKey?

> `optional` **apiKey?**: `string`

#### resourceName?

> `optional` **resourceName?**: `string`

#### deploymentName?

> `optional` **deploymentName?**: `string`

#### apiVersion?

> `optional` **apiVersion?**: `string`

#### useMaxCompletionTokens?

> `optional` **useMaxCompletionTokens?**: `boolean`

---

### openrouter?

> `optional` **openrouter?**: `object`

Defined in: [types/providers.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L218)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### litellm?

> `optional` **litellm?**: `object`

Defined in: [types/providers.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L219)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### openaiCompatible?

> `optional` **openaiCompatible?**: `object`

Defined in: [types/providers.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L220)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ollama?

> `optional` **ollama?**: `object`

Defined in: [types/providers.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L221)

#### baseURL?

> `optional` **baseURL?**: `string`

#### apiKey?

> `optional` **apiKey?**: `string`

---

### nvidiaNim?

> `optional` **nvidiaNim?**: `object`

Defined in: [types/providers.ts:222](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L222)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### lmStudio?

> `optional` **lmStudio?**: `object`

Defined in: [types/providers.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L225)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### llamacpp?

> `optional` **llamacpp?**: `object`

Defined in: [types/providers.ts:226](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L226)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### apiRoute?

> `optional` **apiRoute?**: `object`

Defined in: [types/providers.ts:228](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L228)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### baseten?

> `optional` **baseten?**: `object`

Defined in: [types/providers.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L229)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cerebras?

> `optional` **cerebras?**: `object`

Defined in: [types/providers.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L230)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cloudflare?

> `optional` **cloudflare?**: `object`

Defined in: [types/providers.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L231)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### accountId?

> `optional` **accountId?**: `string`

---

### deepseek?

> `optional` **deepseek?**: `object`

Defined in: [types/providers.ts:232](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L232)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### fireworks?

> `optional` **fireworks?**: `object`

Defined in: [types/providers.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L233)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### friendli?

> `optional` **friendli?**: `object`

Defined in: [types/providers.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L234)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### gmicloud?

> `optional` **gmicloud?**: `object`

Defined in: [types/providers.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L235)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### groq?

> `optional` **groq?**: `object`

Defined in: [types/providers.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L236)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### huggingFace?

> `optional` **huggingFace?**: `object`

Defined in: [types/providers.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L237)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### inceptionLabs?

> `optional` **inceptionLabs?**: `object`

Defined in: [types/providers.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L238)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ioIntelligence?

> `optional` **ioIntelligence?**: `object`

Defined in: [types/providers.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L239)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### mancer?

> `optional` **mancer?**: `object`

Defined in: [types/providers.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L240)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### mistral?

> `optional` **mistral?**: `object`

Defined in: [types/providers.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L241)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### perplexity?

> `optional` **perplexity?**: `object`

Defined in: [types/providers.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L242)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### sambanova?

> `optional` **sambanova?**: `object`

Defined in: [types/providers.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L243)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### together?

> `optional` **together?**: `object`

Defined in: [types/providers.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L244)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### upstage?

> `optional` **upstage?**: `object`

Defined in: [types/providers.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L245)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### xai?

> `optional` **xai?**: `object`

Defined in: [types/providers.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L246)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cohere?

> `optional` **cohere?**: `object`

Defined in: [types/providers.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L248)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### replicate?

> `optional` **replicate?**: `object`

Defined in: [types/providers.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L249)

#### apiToken?

> `optional` **apiToken?**: `string`

#### baseUrl?

> `optional` **baseUrl?**: `string`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### voyage?

> `optional` **voyage?**: `object`

Defined in: [types/providers.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L255)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### jina?

> `optional` **jina?**: `object`

Defined in: [types/providers.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L256)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### stability?

> `optional` **stability?**: `object`

Defined in: [types/providers.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L257)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ideogram?

> `optional` **ideogram?**: `object`

Defined in: [types/providers.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L258)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### recraft?

> `optional` **recraft?**: `object`

Defined in: [types/providers.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L259)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### typesafe?

> `optional` **typesafe?**: `object`

Defined in: [types/providers.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L261)

TypeSafe (Jev) — the `decide` inference type, not text generation.

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### transport?

> `optional` **transport?**: `"direct"` \| `"gateway"`

Which transport carries the decision request.

- `"direct"` — TypeSafe's own API, `POST /v1/systemone`.
- `"gateway"` — Vercel's AI Gateway evaluation-model endpoint, which
  bills through an existing Vercel account instead of a TypeSafe one.

Omitted resolves automatically: `gateway` when only a gateway key is
present, `direct` otherwise. The two differ on the wire — the gateway
already uses the neutral `boolean`/`probability` vocabulary, carries
the model in a header rather than the body, and omits `confidence`
entirely — but a caller sees the identical `DecisionResult` either way.

#### gatewayApiKey?

> `optional` **gatewayApiKey?**: `string`

Vercel AI Gateway key. Defaults to `AI_GATEWAY_API_KEY`.
