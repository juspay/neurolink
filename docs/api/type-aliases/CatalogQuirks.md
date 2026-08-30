[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogQuirks

# Type Alias: CatalogQuirks

> **CatalogQuirks** = `object`

Defined in: [types/providerCatalog.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L53)

## Properties

### timeoutErrorClass?

> `optional` **timeoutErrorClass?**: `"provider"`

Defined in: [types/providerCatalog.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L54)

---

### messageContentFormat?

> `optional` **messageContentFormat?**: `"string"`

Defined in: [types/providerCatalog.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L60)

Vendor speaks OpenAI for chat but restricts how message content is
encoded. "string": `messages[].content` must be a plain string —
the content-parts array and the `null` OpenAI uses on an assistant
message with tool_calls are both rejected with HTTP 400. Normalized by
ConfiguredOpenAICompatProvider so tool round-trips work.

---

### registryDefaultIgnoresModelEnvVar?

> `optional` **registryDefaultIgnoresModelEnvVar?**: `boolean`

Defined in: [types/providerCatalog.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L61)
