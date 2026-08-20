[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2271)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2272)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2273)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2274)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2275)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2276)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2277)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2278)
