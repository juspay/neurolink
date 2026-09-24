[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:3103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3103)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:3104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3104)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:3105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3105)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:3106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3106)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:3107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3107)

#### Returns

`void`
