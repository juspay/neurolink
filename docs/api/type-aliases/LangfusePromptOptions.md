[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfusePromptOptions

# Type Alias: LangfusePromptOptions

> **LangfusePromptOptions** = `object`

## Description

Options for `getLangfusePrompt`.

## Properties

### label?

> `optional` **label?**: `string`

Deployment label to fetch; Langfuse serves `production` when omitted.

---

### fallback

> **fallback**: `string`

Text returned when the prompt cannot be fetched as a text prompt.

---

### cacheTtlMs?

> `optional` **cacheTtlMs?**: `number`

Milliseconds before a cached prompt is refreshed in the background; defaults to 60000. The call that fetches an entry sets it for every caller of that name and label.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Milliseconds a fetch, body included, waits for Langfuse; defaults to 2000.
