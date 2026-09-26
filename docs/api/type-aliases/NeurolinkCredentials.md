[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkCredentials

# Type Alias: NeurolinkCredentials

> **NeurolinkCredentials** = `object`

Per-provider credential overrides for generate() / stream() calls.

When set on `NeurolinkConstructorConfig.credentials`, applies as the default
for all calls from that NeuroLink instance. When set on
`GenerateOptions.credentials` or `StreamOptions.credentials`, overrides the
instance default for that single call.

Unset providers fall through to environment variables (existing behaviour).

## Properties

### openai?

> `optional` **openai?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### anthropic?

> `optional` **anthropic?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### oauthToken?

> `optional` **oauthToken?**: `string`

---

### googleAiStudio?

> `optional` **googleAiStudio?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### vertex?

> `optional` **vertex?**: `object`

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

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### litellm?

> `optional` **litellm?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### openaiCompatible?

> `optional` **openaiCompatible?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ollama?

> `optional` **ollama?**: `object`

#### baseURL?

> `optional` **baseURL?**: `string`

#### apiKey?

> `optional` **apiKey?**: `string`

---

### nvidiaNim?

> `optional` **nvidiaNim?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### lmStudio?

> `optional` **lmStudio?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### llamacpp?

> `optional` **llamacpp?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### apiRoute?

> `optional` **apiRoute?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### baseten?

> `optional` **baseten?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cerebras?

> `optional` **cerebras?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cloudflare?

> `optional` **cloudflare?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### accountId?

> `optional` **accountId?**: `string`

---

### deepseek?

> `optional` **deepseek?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### fireworks?

> `optional` **fireworks?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### friendli?

> `optional` **friendli?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### gmicloud?

> `optional` **gmicloud?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### groq?

> `optional` **groq?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### huggingFace?

> `optional` **huggingFace?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### inceptionLabs?

> `optional` **inceptionLabs?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ioIntelligence?

> `optional` **ioIntelligence?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### mancer?

> `optional` **mancer?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### mistral?

> `optional` **mistral?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### perplexity?

> `optional` **perplexity?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### sambanova?

> `optional` **sambanova?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### together?

> `optional` **together?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### upstage?

> `optional` **upstage?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### xai?

> `optional` **xai?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cohere?

> `optional` **cohere?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### replicate?

> `optional` **replicate?**: `object`

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

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### jina?

> `optional` **jina?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### stability?

> `optional` **stability?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ideogram?

> `optional` **ideogram?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### recraft?

> `optional` **recraft?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### typesafe?

> `optional` **typesafe?**: `object`

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

#### gatewayURL?

> `optional` **gatewayURL?**: `string`

The gateway transport's evaluation-model route. Defaults to
`TYPESAFE_GATEWAY_URL`, then Vercel's own route.

---

### laya?

> `optional` **laya?**: `object`

Laya (Convai, open weights) — the `decide` inference type. There is no
built-in endpoint: `baseURL` (or LAYA_BASE_URL) is required, pointing at a
Laya server or a proxy route to one; requests go to `<baseURL>/predict`.

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`
