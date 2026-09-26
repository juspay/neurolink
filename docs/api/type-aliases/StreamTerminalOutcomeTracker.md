[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:3053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3053)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:3054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3054)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:3055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3055)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:3056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3056)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:3057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3057)

#### Returns

`void`
