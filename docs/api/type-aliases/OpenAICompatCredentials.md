[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatCredentials

# Type Alias: OpenAICompatCredentials

> **OpenAICompatCredentials** = `object`

Defined in: [types/providers.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L758)

Minimal credential shape accepted by resolveOpenAICompatConfig() and
ConfiguredOpenAICompatProvider. A structural superset of every real
per-provider NeurolinkCredentials["<key>"] slice in this family (groq,
xai, together, fireworks, perplexity, mistral, cloudflare) — all fields
optional, so passing e.g. NeurolinkCredentials["groq"] (which has no
accountId) here is always structurally valid.

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:759](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L759)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L760)

---

### accountId?

> `optional` **accountId?**: `string`

Defined in: [types/providers.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L761)
