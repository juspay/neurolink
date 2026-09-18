[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2782)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2783)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2784)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2785)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2786)

#### Returns

`void`
