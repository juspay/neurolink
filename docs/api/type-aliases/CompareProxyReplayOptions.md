[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2663)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2664)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2665)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2666)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2667)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2668)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2669)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2670)
