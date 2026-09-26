[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:3113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3113)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:3114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3114)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:3115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3115)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:3116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3116)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:3117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3117)

#### Returns

`void`
