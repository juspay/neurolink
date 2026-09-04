[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2453)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2454)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2455)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2456)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2457)

#### Returns

`void`
