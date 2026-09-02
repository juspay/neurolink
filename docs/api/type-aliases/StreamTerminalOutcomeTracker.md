[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2438)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2439)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2440)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2441)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2442)

#### Returns

`void`
