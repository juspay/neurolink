[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatCredentials

# Type Alias: OpenAICompatCredentials

> **OpenAICompatCredentials** = `object`

Defined in: [types/providers.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L737)

Minimal credential shape accepted by resolveOpenAICompatConfig() and
ConfiguredOpenAICompatProvider. A structural superset of every real
per-provider NeurolinkCredentials["<key>"] slice in this family (groq,
xai, together, fireworks, perplexity, mistral, cloudflare) — all fields
optional, so passing e.g. NeurolinkCredentials["groq"] (which has no
accountId) here is always structurally valid.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:738](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L738)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:739](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L739)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/providers.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L740)
