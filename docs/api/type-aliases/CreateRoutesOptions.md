[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateRoutesOptions

# Type Alias: CreateRoutesOptions

> **CreateRoutesOptions** = `object`

Defined in: [types/server.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1410)

Options for createAllRoutes / createRoutes.

## Properties

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/server.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1411)

---

### getRoutes?

> `optional` **getRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/server.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1412)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]

---

### proxy?

> `optional` **proxy?**: `boolean`

Defined in: [types/server.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1414)

Enable every proxy door: Claude, OpenAI, Codex and Gemini.

---

### claudeProxy?

> `optional` **claudeProxy?**: `boolean`

Defined in: [types/server.ts:1415](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1415)

---

### openaiProxy?

> `optional` **openaiProxy?**: `boolean`

Defined in: [types/server.ts:1416](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1416)

---

### codexProxy?

> `optional` **codexProxy?**: `boolean`

Defined in: [types/server.ts:1424](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1424)

Enable the Codex door on its own.

Codex was reachable only from `neurolink proxy start` until this existed —
`createAllRoutes` mounted two of the doors, so an SDK consumer could not
expose it even deliberately.

---

### geminiProxy?

> `optional` **geminiProxy?**: `boolean`

Defined in: [types/server.ts:1426](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1426)

Enable the Gemini door on its own, for the same reason.
