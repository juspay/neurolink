[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamTerminalOutcomeTracker

# Type Alias: StreamTerminalOutcomeTracker

> **StreamTerminalOutcomeTracker** = `object`

Defined in: [types/proxy.ts:2459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2459)

First-writer-wins tracker for an upstream streaming response.

## Properties

### outcome

> **outcome**: `Promise`\<[`StreamTerminalOutcome`](StreamTerminalOutcome.md)\>

Defined in: [types/proxy.ts:2460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2460)

---

### complete

> **complete**: () => `void`

Defined in: [types/proxy.ts:2461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2461)

#### Returns

`void`

---

### fail

> **fail**: (`message`) => `void`

Defined in: [types/proxy.ts:2462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2462)

#### Parameters

##### message

`string`

#### Returns

`void`

---

### cancel

> **cancel**: () => `void`

Defined in: [types/proxy.ts:2463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2463)

#### Returns

`void`
