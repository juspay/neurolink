[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2338)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2339)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2340)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2341)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2342)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2343)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2344)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2345)
