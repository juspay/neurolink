[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogQuirks

# Type Alias: CatalogQuirks

> **CatalogQuirks** = `object`

Defined in: [types/providerCatalog.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L71)

## Properties

### timeoutErrorClass?

> `optional` **timeoutErrorClass?**: `"provider"`

Defined in: [types/providerCatalog.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L72)

---

### messageContentFormat?

> `optional` **messageContentFormat?**: `"string"`

Defined in: [types/providerCatalog.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L78)

Vendor speaks OpenAI for chat but restricts how message content is
encoded. "string": `messages[].content` must be a plain string —
the content-parts array and the `null` OpenAI uses on an assistant
message with tool_calls are both rejected with HTTP 400. Normalized by
ConfiguredOpenAICompatProvider so tool round-trips work.

---

### registryDefaultIgnoresModelEnvVar?

> `optional` **registryDefaultIgnoresModelEnvVar?**: `boolean`

Defined in: [types/providerCatalog.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L79)

---

### responseFormatDowngrade?

> `optional` **responseFormatDowngrade?**: `"json-schema-to-json-object"`

Defined in: [types/providerCatalog.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L84)

Vendor rejects `response_format: { type: "json_schema" }` outright but
accepts `{ type: "json_object" }`. Normalized by
ConfiguredOpenAICompatProvider so `generate({ schema })` keeps working
(mirrors the pre-catalog `supportsStructuredOutputs: false` behavior).
