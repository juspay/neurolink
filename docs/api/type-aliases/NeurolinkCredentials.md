[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkCredentials

# Type Alias: NeurolinkCredentials

> **NeurolinkCredentials** = `object`

Defined in: [types/providers.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L184)

Per-provider credential overrides for generate() / stream() calls.

When set on `NeurolinkConstructorConfig.credentials`, applies as the default
for all calls from that NeuroLink instance. When set on
`GenerateOptions.credentials` or `StreamOptions.credentials`, overrides the
instance default for that single call.

Unset providers fall through to environment variables (existing behaviour).

## Properties

### openai?

> `optional` **openai?**: `object`

Defined in: [types/providers.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L185)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### anthropic?

> `optional` **anthropic?**: `object`

Defined in: [types/providers.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L186)

#### apiKey?

> `optional` **apiKey?**: `string`

#### oauthToken?

> `optional` **oauthToken?**: `string`

---

### googleAiStudio?

> `optional` **googleAiStudio?**: `object`

Defined in: [types/providers.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L187)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### vertex?

> `optional` **vertex?**: `object`

Defined in: [types/providers.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L188)

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

Defined in: [types/providers.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L199)

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

Defined in: [types/providers.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L205)

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

Defined in: [types/providers.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L212)

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

Defined in: [types/providers.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L223)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### litellm?

> `optional` **litellm?**: `object`

Defined in: [types/providers.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L224)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### openaiCompatible?

> `optional` **openaiCompatible?**: `object`

Defined in: [types/providers.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L225)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ollama?

> `optional` **ollama?**: `object`

Defined in: [types/providers.ts:226](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L226)

#### baseURL?

> `optional` **baseURL?**: `string`

#### apiKey?

> `optional` **apiKey?**: `string`

---

### nvidiaNim?

> `optional` **nvidiaNim?**: `object`

Defined in: [types/providers.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L227)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### lmStudio?

> `optional` **lmStudio?**: `object`

Defined in: [types/providers.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L230)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### llamacpp?

> `optional` **llamacpp?**: `object`

Defined in: [types/providers.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L231)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### apiRoute?

> `optional` **apiRoute?**: `object`

Defined in: [types/providers.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L233)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### baseten?

> `optional` **baseten?**: `object`

Defined in: [types/providers.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L234)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cerebras?

> `optional` **cerebras?**: `object`

Defined in: [types/providers.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L235)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cloudflare?

> `optional` **cloudflare?**: `object`

Defined in: [types/providers.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L236)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### accountId?

> `optional` **accountId?**: `string`

---

### deepseek?

> `optional` **deepseek?**: `object`

Defined in: [types/providers.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L237)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### fireworks?

> `optional` **fireworks?**: `object`

Defined in: [types/providers.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L238)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### friendli?

> `optional` **friendli?**: `object`

Defined in: [types/providers.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L239)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### gmicloud?

> `optional` **gmicloud?**: `object`

Defined in: [types/providers.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L240)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### groq?

> `optional` **groq?**: `object`

Defined in: [types/providers.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L241)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### huggingFace?

> `optional` **huggingFace?**: `object`

Defined in: [types/providers.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L242)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### inceptionLabs?

> `optional` **inceptionLabs?**: `object`

Defined in: [types/providers.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L243)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ioIntelligence?

> `optional` **ioIntelligence?**: `object`

Defined in: [types/providers.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L244)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### mancer?

> `optional` **mancer?**: `object`

Defined in: [types/providers.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L245)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### mistral?

> `optional` **mistral?**: `object`

Defined in: [types/providers.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L246)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### perplexity?

> `optional` **perplexity?**: `object`

Defined in: [types/providers.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L247)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### sambanova?

> `optional` **sambanova?**: `object`

Defined in: [types/providers.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L248)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### together?

> `optional` **together?**: `object`

Defined in: [types/providers.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L249)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### upstage?

> `optional` **upstage?**: `object`

Defined in: [types/providers.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L250)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### xai?

> `optional` **xai?**: `object`

Defined in: [types/providers.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L251)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### cohere?

> `optional` **cohere?**: `object`

Defined in: [types/providers.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L253)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### replicate?

> `optional` **replicate?**: `object`

Defined in: [types/providers.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L254)

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

Defined in: [types/providers.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L260)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### jina?

> `optional` **jina?**: `object`

Defined in: [types/providers.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L261)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### stability?

> `optional` **stability?**: `object`

Defined in: [types/providers.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L262)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### ideogram?

> `optional` **ideogram?**: `object`

Defined in: [types/providers.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L263)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### recraft?

> `optional` **recraft?**: `object`

Defined in: [types/providers.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L264)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

---

### typesafe?

> `optional` **typesafe?**: `object`

Defined in: [types/providers.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L266)

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

Defined in: [types/providers.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L296)

Laya (Convai, open weights) — the `decide` inference type. There is no
built-in endpoint: `baseURL` (or LAYA_BASE_URL) is required, pointing at a
Laya server or a proxy route to one; requests go to `<baseURL>/predict`.

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`
