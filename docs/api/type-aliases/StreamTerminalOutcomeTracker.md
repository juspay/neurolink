[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2986)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2987)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2988)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2989)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2990)

#### Returns

`void`
