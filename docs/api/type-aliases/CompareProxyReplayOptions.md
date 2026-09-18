[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2697)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2698)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2699)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2700)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2701)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2702)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2703)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2704)
