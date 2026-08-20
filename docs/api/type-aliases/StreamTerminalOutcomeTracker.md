[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2349)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2350)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2351)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2352)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2353)

#### Returns

`void`
