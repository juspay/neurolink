[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2381)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2382)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2383)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2384)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2385)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2386)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2387)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2388)
