[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogQuirks

# Type Alias: CatalogQuirks

> **CatalogQuirks** = `object`

## Properties

### timeoutErrorClass?

> `optional` **timeoutErrorClass?**: `"provider"`

---

### messageContentFormat?

> `optional` **messageContentFormat?**: `"string"`

Vendor speaks OpenAI for chat but restricts how message content is
encoded. "string": `messages[].content` must be a plain string —
the content-parts array and the `null` OpenAI uses on an assistant
message with tool_calls are both rejected with HTTP 400. Normalized by
ConfiguredOpenAICompatProvider so tool round-trips work.

---

### registryDefaultIgnoresModelEnvVar?

> `optional` **registryDefaultIgnoresModelEnvVar?**: `boolean`

---

### responseFormatDowngrade?

> `optional` **responseFormatDowngrade?**: `"json-schema-to-json-object"`

Vendor rejects `response_format: { type: "json_schema" }` outright but
accepts `{ type: "json_object" }`. Normalized by
ConfiguredOpenAICompatProvider so `generate({ schema })` keeps working
(mirrors the pre-catalog `supportsStructuredOutputs: false` behavior).
