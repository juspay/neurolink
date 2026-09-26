[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2960)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2961)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2962)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2963)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2964)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2965)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2966)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2967)
