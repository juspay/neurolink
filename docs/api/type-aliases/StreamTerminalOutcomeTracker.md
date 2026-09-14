[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2746)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2747)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2748)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2749)

#### Returns

`void`
