[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2339)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2340)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2341)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2342)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2343)

#### Returns

`void`
