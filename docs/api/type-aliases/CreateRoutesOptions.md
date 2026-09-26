[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateRoutesOptions

# Type Alias: CreateRoutesOptions

> **CreateRoutesOptions** = `object`

Options for createAllRoutes / createRoutes.

## Properties

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

---

### getRoutes?

> `optional` **getRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]

---

### proxy?

> `optional` **proxy?**: `boolean`

Enable every proxy door: Claude, OpenAI, Codex and Gemini.

---

### claudeProxy?

> `optional` **claudeProxy?**: `boolean`

---

### openaiProxy?

> `optional` **openaiProxy?**: `boolean`

---

### codexProxy?

> `optional` **codexProxy?**: `boolean`

Enable the Codex door on its own.

Codex was reachable only from `neurolink proxy start` until this existed —
`createAllRoutes` mounted two of the doors, so an SDK consumer could not
expose it even deliberately.

---

### geminiProxy?

> `optional` **geminiProxy?**: `boolean`

Enable the Gemini door on its own, for the same reason.
