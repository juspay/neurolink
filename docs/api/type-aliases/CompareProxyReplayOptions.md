[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CompareProxyReplayOptions

# Type Alias: CompareProxyReplayOptions

> **CompareProxyReplayOptions** = `object`

Defined in: [types/proxy.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2369)

Inputs for an explicitly authorized direct-upstream comparison.

## Properties

### execute

> **execute**: `boolean`

Defined in: [types/proxy.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2370)

---

### headerValues?

> `optional` **headerValues?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2371)

---

### bodyOverride?

> `optional` **bodyOverride?**: `string`

Defined in: [types/proxy.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2372)

---

### urlOverride?

> `optional` **urlOverride?**: `string`

Defined in: [types/proxy.ts:2373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2373)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2374)

---

### now?

> `optional` **now?**: () => `number`

Defined in: [types/proxy.ts:2375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2375)

#### Returns

`number`

---

### fetchImpl?

> `optional` **fetchImpl?**: _typeof_ `fetch`

Defined in: [types/proxy.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2376)
