[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfusePromptRef

# Type Alias: LangfusePromptRef

> **LangfusePromptRef** = `object`

## Description

A Langfuse prompt version a trace was produced with. Generations are linked to it when it has a `version` and is not a fallback.

## Properties

### name

> **name**: `string`

Prompt name in Langfuse.

---

### version?

> `optional` **version?**: `number`

Prompt version; generations are linked only when it is set.

---

### label?

> `optional` **label?**: `string`

Deployment label the version was fetched by.

---

### isFallback?

> `optional` **isFallback?**: `boolean`

Whether the prompt text is a local fallback rather than a Langfuse version.
