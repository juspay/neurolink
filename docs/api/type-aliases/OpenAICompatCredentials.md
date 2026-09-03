[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatCredentials

# Type Alias: OpenAICompatCredentials

> **OpenAICompatCredentials** = `object`

Defined in: [types/providers.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L717)

Minimal credential shape accepted by resolveOpenAICompatConfig() and
ConfiguredOpenAICompatProvider. A structural superset of every real
per-provider NeurolinkCredentials["<key>"] slice in this family (groq,
xai, together, fireworks, perplexity, mistral, cloudflare) — all fields
optional, so passing e.g. NeurolinkCredentials["groq"] (which has no
accountId) here is always structurally valid.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L718)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L719)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/providers.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L720)
