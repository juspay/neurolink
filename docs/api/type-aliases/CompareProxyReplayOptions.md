[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2376)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2377)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2378)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2379)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2380)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2381)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2382)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2383)
