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

---

### replayReasoningContent?

> `optional` **replayReasoningContent?**: `boolean`

Vendor wants each assistant turn's `reasoning_content` sent back on
every later request of the conversation (DeepSeek documents a 400
without it once tools are in play). ConfiguredOpenAICompatProvider
turns on the replay; every other provider leaves the field off.

---

### rejectRequiredToolChoice?

> `optional` **rejectRequiredToolChoice?**: `boolean`

The endpoint accepts auto/none/named tool choices but not required.
Reject that explicit caller intent with nonempty tools before sending;
never silently downgrade it to auto. Omitted preserves existing behavior.

---

### authHeaderStyle?

> `optional` **authHeaderStyle?**: `"x-api-key"`

Vendor's chat-completions endpoint authenticates with a vendor-specific
header instead of the OpenAI-standard `Authorization: Bearer <key>`.
"x-api-key": send `X-Api-Key: <key>` and omit Authorization entirely —
Reka's OpenAPI spec declares this as its one security scheme (the
OpenAI-SDK-style examples elsewhere in its docs pass the key through a
client that still emits this header under the hood). Normalized by
ConfiguredOpenAICompatProvider.getAuthHeaders(); omitted means the
inherited Bearer default.

---

### fixedSamplingModels?

> `optional` **fixedSamplingModels?**: `string`[]

Catalog model ids whose sampling parameters the vendor fixes: passing
`temperature`, `top_p`, `presence_penalty` or `frequency_penalty` at
all is an error (Moonshot's kimi-k3, kimi-k2.7-code and kimi-k2.6).
ConfiguredOpenAICompatProvider removes those fields from every request
to these models, so the CLI's default temperature and a caller's
explicit one both stop being fatal. Each id must be a catalog key.
