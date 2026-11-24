[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkTraceContext

# Type Alias: NeurolinkTraceContext

> **NeurolinkTraceContext** = `object`

## Description

Per-call trace attributes propagated to every span created inside the call.

## Properties

### userId?

> `optional` **userId?**: `string` \| `null`

End user the trace belongs to.

---

### sessionId?

> `optional` **sessionId?**: `string` \| `null`

Session that groups related traces.

---

### conversationId?

> `optional` **conversationId?**: `string` \| `null`

Conversation identifier, recorded as trace metadata.

---

### requestId?

> `optional` **requestId?**: `string` \| `null`

Request identifier, recorded as trace metadata.

---

### traceName?

> `optional` **traceName?**: `string` \| `null`

Trace name shown in Langfuse.

---

### tags?

> `optional` **tags?**: `string`[]

Trace tags.

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`SpanContent`](SpanContent.md) \| `undefined`\>

Trace metadata; values up to 200 characters once stringified are on every observation, longer values and arrays only on the trace.

---

### observationName?

> `optional` **observationName?**: `string` \| `null`

Name of the root observation of this `generate` or `stream` call; not propagated to child observations and not the trace name.

---

### prompt?

> `optional` **prompt?**: [`LangfusePromptRef`](LangfusePromptRef.md)

Langfuse prompt the call ran with, such as a `getLangfusePrompt` result; recorded as a `prompt:` trace tag and `promptName`, `promptVersion` and `promptLabel` metadata, replacing an enclosing prompt's tag and metadata.

---

### redactIO?

> `optional` **redactIO?**: `boolean`

`true` leaves input and output out of what is sent to Langfuse for every observation started in this scope, nested scopes included, as the exporter's `redactIO` does for all traces. `false` cannot undo an enclosing scope's or the exporter's `redactIO`.
