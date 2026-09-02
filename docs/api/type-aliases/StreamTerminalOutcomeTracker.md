[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2447)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2448)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2449)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2450)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2451)

#### Returns

`void`
